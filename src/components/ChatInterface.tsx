import { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useToast } from "@/hooks/use-toast";
import { log } from "console";

interface ChatInterfaceProps {
  name: string;
}
export const ChatInterface = ({name}:ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hello! I'm your AI assistant. What do you need help with today?",
      isUser: false,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const sessionId = name;
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

const getBotResponse = async (
  userMessage: string,
  onStreamUpdate?: (content: string) => void,
  onProductUpdate?: (products: any[], categories?: any[]) => void,
  onListUpdate?: (heading: string | null, listItems: string[]) => void
): Promise<{ text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[]; followUpQuestions?: string[] }> => {
  const response = await fetch('/api/runs/stream', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_name: "ecommerce-router",          
      mode: "sync",                  
      session_id: sessionId,
      tenantID: 'srstore.in',
      input: [{
        role: "user",                 
        parts: [{
          content_type: "text/plain", 
          content: userMessage        
        }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Check if response is SSE stream
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Fallback to non-streaming
    const data = await response.json();
    const content = data.output?.[0]?.parts?.[0]?.content;
    
    return parseResponseContent(content);
  }

  // Process SSE stream
  const reader = response.body?.getReader(); 
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = ''; // For streaming text content (after JSON is complete)
  let finalContent = '';
  let extractedCategories: any[] | null = null;
  let hasError = false;
  let errorMessage = '';
  
  // For character-by-character JSON streaming
  let jsonBuffer = ''; // Accumulate JSON chunks
  let isReceivingJson = false; // Track if we're currently receiving JSON
  let jsonParsed = false; // Track if JSON has been successfully parsed
  let extractedSummary = ''; // Store summary from parsed JSON
  let displayedProducts = new Set<string>(); // Track which products we've already displayed (by title+price)
  let currentCategories: any[] = []; // Track current categories state for progressive updates
  let extractedFollowUpQuestions: string[] = []; // Store follow-up questions from parsed JSON

  // Helper function to extract heading and list items from streaming text
  const extractHeadingAndListItems = (text: string): { heading: string | null; listItems: string[] } => {
    const result: { heading: string | null; listItems: string[] } = {
      heading: null,
      listItems: []
    };
    
    // Check if content contains heading and list format
    if (text.includes('heading:')) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Extract heading using regex
      const headingMatch = text.match(/heading:\s*"([^"]+)"/);
      result.heading = headingMatch ? headingMatch[1] : null;
      
      // Extract list items (lines that start with [ and end with ])
      const listItemRegex = /\[\s*"([^"]+)"\s*\]/;
      
      lines.forEach(line => {
        const match = line.match(listItemRegex);
        if (match) {
          const itemText = match[1];
          // Only add if not already in the list (avoid duplicates)
          if (!result.listItems.includes(itemText)) {
            result.listItems.push(itemText);
          }
        }
      });
    }
    
    return result;
  };

  // Helper function to extract summary from partial JSON, including incomplete strings
  const extractSummaryFromPartialJson = (jsonStr: string): string | null => {
    // Try to extract summary field even if JSON is incomplete
    // Look for "summary": "..." pattern
    // Handle both complete and incomplete summary strings
    
    // First, try to find the summary field start
    const summaryStartPattern = /"summary"\s*:\s*"/;
    const summaryStartMatch = jsonStr.match(summaryStartPattern);
    
    if (!summaryStartMatch) return null;
    
    const startIndex = summaryStartMatch.index! + summaryStartMatch[0].length;
    let summaryValue = '';
    let inEscape = false;
    
    // Extract the summary value character by character
    // Handle escaped characters and find the end of the string (or end of buffer)
    for (let i = startIndex; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (inEscape) {
        // Handle escape sequences
        if (char === 'n') summaryValue += '\n';
        else if (char === 'r') summaryValue += '\r';
        else if (char === 't') summaryValue += '\t';
        else if (char === '"') summaryValue += '"';
        else if (char === '\\') summaryValue += '\\';
        else summaryValue += '\\' + char; // Unknown escape, keep both
        inEscape = false;
        continue;
      }
      
      if (char === '\\') {
        inEscape = true;
        continue;
      }
      
      if (char === '"') {
        // Found the end of the summary string
        break;
      }
      
      summaryValue += char;
    }
    
    // Return the summary value (even if incomplete)
    return summaryValue || null;
  };

  // Helper function to extract products from partial JSON
  // This tries to find complete product objects that can be parsed individually
  const extractProductsFromPartialJson = (jsonStr: string): any[] => {
    const newProducts: any[] = [];
    
    // Try to parse the entire JSON first (if it's complete)
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.categories && Array.isArray(parsed.categories)) {
        // JSON is complete, extract all products
        parsed.categories.forEach((category: any) => {
          if (category.category_name && Array.isArray(category.products)) {
            category.products.forEach((product: any) => {
              if (product && product.title && product.price !== undefined) {
                const productKey = `${product.title}_${product.price}`;
                if (!displayedProducts.has(productKey)) {
                  displayedProducts.add(productKey);
                  newProducts.push({
                    product: {
                      title: product.title,
                      price: product.price,
                      source_url: product.source_url || '',
                      product_image: product.product_image || ''
                    },
                    categoryName: category.category_name
                  });
                }
              }
            });
          }
        });
        return newProducts;
      }
    } catch (e) {
      // JSON is incomplete, try to find complete product objects
    }
    
    // If JSON is incomplete, try to find complete product objects
    // Look for patterns like: {"title": "...", "price": ..., "source_url": "..."}
    // We'll search for product-like objects that have title and price
    
    // Find all potential product objects by looking for complete JSON objects
    // that contain "title" and "price" fields
    const productPattern = /\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+)\s*(?:,\s*"source_url"\s*:\s*"([^"]+)")?(?:\s*,\s*"product_image"\s*:\s*"([^"]*)")?\s*\}/g;
    let productMatch;
    
    // Also try to find which category this product belongs to
    // Look backwards from the product to find the nearest category_name
    while ((productMatch = productPattern.exec(jsonStr)) !== null) {
      const productKey = `${productMatch[1]}_${productMatch[2]}`;
      
      if (!displayedProducts.has(productKey)) {
        // Try to find the category name for this product
        // Look backwards from the product match to find "category_name"
        const beforeProduct = jsonStr.substring(0, productMatch.index);
        const categoryMatch = beforeProduct.match(/"category_name"\s*:\s*"([^"]+)"/g);
        let categoryName = "Products"; // Default category name
        
        if (categoryMatch && categoryMatch.length > 0) {
          // Get the last (most recent) category name before this product
          const lastCategoryMatch = categoryMatch[categoryMatch.length - 1];
          const categoryNameMatch = lastCategoryMatch.match(/"category_name"\s*:\s*"([^"]+)"/);
          if (categoryNameMatch) {
            categoryName = categoryNameMatch[1];
          }
        }
        
        displayedProducts.add(productKey);
        newProducts.push({
          product: {
            title: productMatch[1],
            price: parseInt(productMatch[2]),
            source_url: productMatch[3] || '',
            product_image: productMatch[4] || ''
          },
          categoryName
        });
      }
    }
    
    return newProducts;
  };

  // Helper function to update categories with new products
  const updateCategoriesWithNewProducts = (newProducts: Array<{product: any, categoryName: string}>) => {
    if (newProducts.length === 0) return;
    
    // Update currentCategories with new products
    newProducts.forEach(({product, categoryName}) => {
      // Find or create the category
      let category = currentCategories.find(cat => cat.category_name === categoryName);
      if (!category) {
        category = {
          category_name: categoryName,
          products: []
        };
        currentCategories.push(category);
      }
      
      // Add product if not already in the category
      const productExists = category.products.some(
        (p: any) => p.title === product.title && p.price === product.price
      );
      if (!productExists) {
        category.products.push(product);
      }
    });
    
    // Update UI with updated categories
    if (onProductUpdate) {
      onProductUpdate([], [...currentCategories]);
    }
  };

  // Helper function to try parsing accumulated JSON
  const tryParseAccumulatedJson = (): boolean => {
    if (!jsonBuffer || jsonParsed) return false;
    
    // First, try to extract summary from partial JSON for progressive display
    // This allows us to show the summary text while JSON is still streaming
    const partialSummary = extractSummaryFromPartialJson(jsonBuffer);
    if (partialSummary && partialSummary.length > extractedSummary.length) {
      // Only update if the summary is longer (more complete)
      extractedSummary = partialSummary;
      // Show summary text as it becomes available (or updates)
      if (onStreamUpdate) {
        onStreamUpdate(partialSummary);
      }
    }
    
    // Try to extract products from partial JSON for progressive display
    const newProducts = extractProductsFromPartialJson(jsonBuffer);
    if (newProducts.length > 0) {
      updateCategoriesWithNewProducts(newProducts);
    }
    
    // Try to parse the complete JSON
    try {
      const parsed = JSON.parse(jsonBuffer);
      
      // Check if it's the expected structure with summary and categories
      if (parsed && typeof parsed === 'object') {
        if (parsed.categories && Array.isArray(parsed.categories)) {
          // Successfully parsed the complete JSON structure
          extractedCategories = parsed.categories;
          
          extractedSummary = parsed.summary || extractedSummary || '';
          
          // Extract follow-up questions if present
          if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions)) {
            extractedFollowUpQuestions = parsed.follow_up_questions;
          }
          
          jsonParsed = true;
          
          // Update currentCategories with final parsed data
          currentCategories = parsed.categories;
          
          // Update UI immediately with final categories
          if (onProductUpdate) {
            onProductUpdate([], parsed.categories);
          }
          
          // Update UI with final summary text
          if (extractedSummary && onStreamUpdate) {
            onStreamUpdate(extractedSummary);
          }
          
          return true;
        }
      }
    } catch (e) {
      // JSON is incomplete, continue accumulating
      // The summary and product extraction above will handle progressive display
      return false;
    }
    
    return false;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events - events come in format:
      // event: <event_type>
      // data: <json_data>
      // (empty line)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      let currentEventType = '';
      let currentEventData = '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) {
          // Empty line = end of event, process it
          if (currentEventType && currentEventData) {
            try {
              const eventData = JSON.parse(currentEventData);
              const eventType = eventData.type;
              const eventPayload = eventData.data || {};
              
              // Handle different event types
              if (eventType === 'content' && eventPayload.content !== undefined) {
  const content = eventPayload.content;
  const metadata = eventPayload.metadata || {};

  // 🔥 JSON streaming (categories / products)
  if (metadata.is_json === true || metadata.content_type === 'application/json') {

    if (!isReceivingJson) {
      isReceivingJson = true;
      jsonBuffer = '';
      displayedProducts.clear();
      currentCategories = [];

      // Create bot message immediately
      if (onProductUpdate) {
        onProductUpdate([], []);
      }
    }

    jsonBuffer += content;

    if (!jsonParsed) {
      tryParseAccumulatedJson(); // progressive list-wise parsing
    }

    continue;
  }

  // JSON just finished → finalize once
  if (isReceivingJson && !jsonParsed) {
    tryParseAccumulatedJson();
    isReceivingJson = false;
  }

  
   if (accumulatedText.length > 0 && content.startsWith(accumulatedText) && content.length > accumulatedText.length) {
    accumulatedText = content;
  } 
  else if (accumulatedText === content) {
    continue;
  } 
  else {
    accumulatedText += content;
  }

  // 🔥 Parse for heading and list items in real-time
  const { heading, listItems } = extractHeadingAndListItems(accumulatedText);
  if (heading && listItems.length > 0 && onListUpdate) {
    // Immediately update UI with heading and list items
    onListUpdate(heading, listItems);
    // Don't show raw text when we have heading/listItems - they will be displayed in formatted way
    // Skip onStreamUpdate to avoid showing raw string format
  } else {
    // Only show text if we don't have heading/listItems
    // Prefer streamed summary over raw text
    const textToShow =
      extractedSummary ||
      finalContent ||
      accumulatedText;

    if (onStreamUpdate) {
      onStreamUpdate(textToShow);
    }
  }

  // 🔥 Keep pushing categories as they grow
  if (currentCategories.length > 0 && onProductUpdate) {
    onProductUpdate([], [...currentCategories]);
  }

} else if (eventType === 'complete') {
  // 🟢 COMPLETE EVENT = final safety only (NO UI)
  if (!jsonParsed && jsonBuffer) {
    tryParseAccumulatedJson();
  }

  finalContent =
    extractedSummary ||
    finalContent ||
    accumulatedText;
  
}
 else if (eventType === 'error') {
                hasError = true;
                errorMessage = eventPayload.error || eventPayload.content || 'An error occurred';
              }
              // Log other events for debugging
              if (eventType !== 'content' && eventType !== 'complete') {
                // Event logged for debugging if needed
              }
            } catch (e) {
              console.warn('Failed to parse SSE event data:', currentEventData, e);
            }
          }
          currentEventType = '';
          currentEventData = '';
          continue;
        }

        if (trimmed.startsWith('event:')) {
          currentEventType = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('data:')) {
          currentEventData = trimmed.substring(5).trim();
        }
      }
    }
  } catch (error) {
    console.error('Error reading SSE stream:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (hasError) {
    throw new Error(errorMessage);
  }

  // Try one final parse of JSON buffer if we haven't parsed it yet
  if (isReceivingJson && !jsonParsed && jsonBuffer) {
    tryParseAccumulatedJson();
  }

  // Use final content from complete event if available, otherwise use extracted summary or accumulated text
  const finalText = finalContent || extractedSummary || accumulatedText;
  
  // Parse accumulated text for heading and list items (if present)
  const parsedTextContent = parseResponseContent(accumulatedText);
  
  // If we have categories from parsed JSON, use them (highest priority)
  if (extractedCategories && extractedCategories.length > 0) {
    return {
      text: finalText || parsedTextContent.text || "Here are the products I found:",
      categories: extractedCategories,
      heading: parsedTextContent.heading,
      listItems: parsedTextContent.listItems,
      followUpQuestions: extractedFollowUpQuestions.length > 0 ? extractedFollowUpQuestions : parsedTextContent.followUpQuestions
    };
  }
  
  // Fallback: use parsed text content (which handles heading and list items)
  return {
    ...parsedTextContent,
    followUpQuestions: extractedFollowUpQuestions.length > 0 ? extractedFollowUpQuestions : parsedTextContent.followUpQuestions
  };
};

// Helper function to parse response content (same as your original logic)
function parseResponseContent(content: string | any): { text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[]; followUpQuestions?: string[] } {
  // If content is already an object (already parsed JSON)
  if (typeof content === 'object' && content !== null) {
    // Check if it's a category-based product structure (new format)
    if (content.categories && Array.isArray(content.categories)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        categories: content.categories,
        followUpQuestions: content.follow_up_questions && Array.isArray(content.follow_up_questions) ? content.follow_up_questions : undefined
      };
    }
    
    // Check if it's a product JSON structure (old format)
    if (content.products && Array.isArray(content.products)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        products: content.products,
        followUpQuestions: content.follow_up_questions && Array.isArray(content.follow_up_questions) ? content.follow_up_questions : undefined
      };
    }
    
    // If it's already an array of products
    if (Array.isArray(content) && content.length > 0 && content[0].title) {
      return { text: "Here are the products I found:", products: content };
    }
  }
  
  // If content is a string, try to parse it
  if (typeof content === 'string') {
    // Check if content contains heading and list format
    if (content.includes('heading:')) {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      
      const headingMatch = content.match(/heading:\s*"([^"]+)"/);
      const heading = headingMatch ? headingMatch[1] : null;
      
      // Extract list items (lines that start with [ and end with ])
      const listItems: string[] = [];
      const listItemRegex = /\[\s*"([^"]+)"\s*\]/;
      
      lines.forEach(line => {
        const match = line.match(listItemRegex);
        if (match) {
          listItems.push(match[1]);
        }
      });
      
      if (heading && listItems.length > 0) {
        return { 
          text: "", 
          heading, 
          listItems 
        };
      }
    }
    
    // Try to parse content as JSON
    try {
      const parsedContent = JSON.parse(content);
      
      // Check if it's a category-based product structure (new format)
      if (parsedContent.categories && Array.isArray(parsedContent.categories)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          categories: parsedContent.categories,
          followUpQuestions: parsedContent.follow_up_questions && Array.isArray(parsedContent.follow_up_questions) ? parsedContent.follow_up_questions : undefined
        };
      }
      
      // Check if it's a product JSON structure (old format)
      if (parsedContent.products && Array.isArray(parsedContent.products)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          products: parsedContent.products,
          followUpQuestions: parsedContent.follow_up_questions && Array.isArray(parsedContent.follow_up_questions) ? parsedContent.follow_up_questions : undefined
        };
      }
    } catch (e) {
      // Content is not valid JSON, treating as text
    }
  }
  
  // Return as regular text response
  return { text: typeof content === 'string' ? content : JSON.stringify(content) };
}

  const handleSendMessage = async (messageText: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create bot message ID for streaming (but don't create the message yet)
    const botMessageId = `bot-${Date.now()}`;
    let botMessageCreated = false;

    try {
      // Stream response with progressive updates
      const botResponse = await getBotResponse(
        messageText, 
        // Text streaming callback
        (streamingContent: string) => {
          // Create bot message on first content chunk, then update it
          if (!botMessageCreated && streamingContent.trim()) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: streamingContent,
              isUser: false,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, newBotMessage]);
            // Keep isLoading true until complete event arrives
          } else if (botMessageCreated) {
            // Update the bot message as content streams in
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: streamingContent }
                : msg
            ));
          }
        },
        // Product streaming callback - update products as they arrive
        (products: any[], categories?: any[]) => {
          // Ensure bot message exists
          if (!botMessageCreated) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: '', // Will be updated when text arrives
              isUser: false,
              timestamp: new Date().toISOString(),
              categories: (categories && categories.length > 0) ? categories : (products.length > 0 ? [{
                category_name: "Products",
                products: products
              }] : undefined),
            };
            setMessages(prev => [...prev, newBotMessage]);
            // Keep isLoading true until complete event arrives
          } else {
            // Update existing message with new products/categories
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { 
                    ...msg, 
                    categories: (categories && categories.length > 0) ? categories : (products.length > 0 ? [{
                      category_name: "Products",
                      products: products
                    }] : msg.categories)
                  }
                : msg
            ));
          }
        },
        // List items streaming callback - update heading and list items as they arrive
        (heading: string | null, listItems: string[]) => {
          // Ensure bot message exists
          if (!botMessageCreated) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: '', // Empty text when we have heading/listItems to avoid showing raw string
              isUser: false,
              timestamp: new Date().toISOString(),
              heading: heading || undefined,
              listItems: listItems.length > 0 ? listItems : undefined,
            };
            setMessages(prev => [...prev, newBotMessage]);
          } else {
            // Update existing message with heading and list items
            // Clear text field to avoid showing raw string format
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { 
                    ...msg, 
                    text: '', // Clear text when we have heading/listItems
                    heading: heading || msg.heading,
                    listItems: listItems.length > 0 ? listItems : msg.listItems
                  }
                : msg
            ));
          }
        }
      );
      
      // Response complete - enable input again
      setIsLoading(false);
      
      // If no content was streamed (shouldn't happen, but handle it)
      if (!botMessageCreated) {
        const finalBotMessage: ChatMessage = {
          id: botMessageId,
          text: botResponse.text || 'No response received',
          isUser: false,
          timestamp: new Date().toISOString(),
          products: botResponse.products,
          categories: botResponse.categories,
          heading: botResponse.heading,
          listItems: botResponse.listItems,
          followUpQuestions: botResponse.followUpQuestions,
        };
        setMessages(prev => [...prev, finalBotMessage]);
      } else {
        // Finalize the bot message with parsed content
        const finalBotMessage: ChatMessage = {
          id: botMessageId,
          text: botResponse.text,
          isUser: false,
          timestamp: new Date().toISOString(),
          products: botResponse.products,
          categories: botResponse.categories,
          heading: botResponse.heading,
          listItems: botResponse.listItems,
          followUpQuestions: botResponse.followUpQuestions,
        };

        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? finalBotMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      
      // Create error message if bot message wasn't created yet
      if (!botMessageCreated) {
        const errorMessage: ChatMessage = {
          id: botMessageId,
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        // Update existing bot message with error
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: 'Sorry, I encountered an error. Please try again.' }
            : msg
        ));
      }
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((message) => (
          <ChatMessageComponent key={message.id} message={message} onFollowUpClick={handleSendMessage} />
        ))}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};