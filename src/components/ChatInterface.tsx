import { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
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

  // const getBotResponse = async (userMessage: string): Promise<{ text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[] }> => {
  //   const response = await fetch('/api/runs', {
  //     method: 'POST',
  //     headers: { 
  //       'Content-Type': 'application/json',
  //       'Accept': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       agent_name: "ecommerce-router",          
  //       mode: "sync",                  
  //       session_id: sessionId,
  //       tenantID:'srstore.in',
  //       input: [{
  //         role: "user",                 
  //         parts: [{
  //           content_type: "text/plain", 
  //           content: userMessage        
  //         }]
  //       }]
  //     })

  //   });
    
    
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }

  //   const data = await response.json();
  //   const content = data.output?.[0]?.parts?.[0]?.content;
  //   console.log("Extracted content:", content);
  //   console.log("Content type:", typeof content);
    
  //   // If content is already an object (already parsed JSON)
  //   if (typeof content === 'object' && content !== null) {
  //     // Check if it's a category-based product structure (new format)
  //     if (content.categories && Array.isArray(content.categories)) {
  //       return { 
  //         text: content.summary || "Here are the products I found:", 
  //         categories: content.categories 
  //       };
  //     }
      
  //     // Check if it's a product JSON structure (old format)
  //     if (content.products && Array.isArray(content.products)) {
  //       return { 
  //         text: content.summary || "Here are the products I found:", 
  //         products: content.products 
  //       };
  //     }
      
  //     // If it's already an array of products
  //     if (Array.isArray(content) && content.length > 0 && content[0].title) {
  //       return { text: "Here are the products I found:", products: content };
  //     }
  //   }
    
  //   // If content is a string, try to parse it
  //   if (typeof content === 'string') {
  //     // Check if content contains heading and list format
  //     if (content.includes('heading:')) {
  //       const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  //       const headingMatch = content.match(/heading:\s*"([^"]+)"/);
  //       const heading = headingMatch ? headingMatch[1] : null;
        
  //       // Extract list items (lines that start with [ and end with ])
  //       const listItems: string[] = [];
  //       const listItemRegex = /\[\s*"([^"]+)"\s*\]/;
        
  //       lines.forEach(line => {
  //         const match = line.match(listItemRegex);
  //         if (match) {
  //           listItems.push(match[1]);
  //         }
  //       });
        
  //       if (heading && listItems.length > 0) {
  //         return { 
  //           text: "", 
  //           heading, 
  //           listItems 
  //         };
  //       }
  //     }
      
  //     // Try to parse content as JSON
  //     try {
  //       const parsedContent = JSON.parse(content);
        
  //       // Check if it's a category-based product structure (new format)
  //       if (parsedContent.categories && Array.isArray(parsedContent.categories)) {
  //         return { 
  //           text: parsedContent.summary || "Here are the products I found:", 
  //           categories: parsedContent.categories 
  //         };
  //       }
        
  //       // Check if it's a product JSON structure (old format)
  //       if (parsedContent.products && Array.isArray(parsedContent.products)) {
  //         return { 
  //           text: parsedContent.summary || "Here are the products I found:", 
  //           products: parsedContent.products 
  //         };
  //       }
  //     } catch (e) {
  //       console.log("Content is not valid JSON, treating as text");
  //     }
  //   }
    
  //   // Return as regular text response
  //   return { text: typeof content === 'string' ? content : JSON.stringify(content) };
  // };


const getBotResponse = async (
  userMessage: string,
  onStreamUpdate?: (content: string) => void,
  onProductUpdate?: (products: any[], categories?: any[]) => void
): Promise<{ text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[] }> => {
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
    console.log("Extracted content:", data);
    
    return parseResponseContent(content);
  }

  // Process SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = ''; // For streaming text content
  let finalContent = '';
  let extractedCategories: any[] | null = null;
  let collectedProducts: any[] = []; // Collect individual products as they stream in
  let hasError = false;
  let errorMessage = '';

  // Helper function to parse a single product JSON object
  const tryParseProduct = (content: string): any | null => {
    if (!content || typeof content !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(content.trim());
      // Check if it's a product object (has title, price, source_url, etc.)
      if (parsed && typeof parsed === 'object' && 
          (parsed.title || parsed.name || parsed.product_name) &&
          (parsed.price !== undefined || parsed.source_url)) {
        return parsed;
      }
    } catch (e) {
      // Not valid JSON
    }
    
    return null;
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
              if (eventType === 'content' && eventPayload.content) {
                const content = eventPayload.content;
                const metadata = eventPayload.metadata || {};
                
                // Check if this is a JSON product (new format: metadata.is_json === true)
                if (metadata.is_json === true || metadata.content_type === 'application/json') {
                  const product = tryParseProduct(content);
                  if (product) {
                    // Collect individual product as it arrives
                    collectedProducts.push(product);
                    console.log('📦 Product collected:', product.title || 'Unknown');
                    
                    // Update UI immediately with collected products
                    if (onProductUpdate) {
                      // Convert collected products to categories format for display
                      onProductUpdate(collectedProducts, [{
                        category_name: "Products",
                        products: collectedProducts
                      }]);
                    }
                    // Don't add product JSON to text content
                    continue;
                  }
                }
                
                // Regular text content - stream it progressively
                accumulatedText += content;
                // Update UI progressively with streaming text
                if (onStreamUpdate) {
                  onStreamUpdate(accumulatedText);
                }
              } else if (eventType === 'complete') {
                // Final content from complete event - contains structured JSON with categories
                let rawFinalContent = '';
                
                if (eventPayload.content) {
                  rawFinalContent = eventPayload.content;
                } else if (eventPayload.metadata?.response?.output) {
                  const output = eventPayload.metadata.response.output;
                  if (output?.[0]?.parts?.[0]?.content) {
                    rawFinalContent = output[0].parts[0].content;
                  }
                }
                
                if (rawFinalContent) {
                  // Try to parse as JSON (new format has categories structure)
                  try {
                    const parsed = JSON.parse(rawFinalContent);
                    if (parsed.categories && Array.isArray(parsed.categories)) {
                      // New format: has categories structure with summary
                      extractedCategories = parsed.categories;
                      // Use summary from complete event, or fallback to accumulated text
                      finalContent = parsed.summary || accumulatedText;
                      console.log('✅ Categories extracted:', parsed.categories.length, 'categories');
                      console.log('📝 Summary text:', parsed.summary?.substring(0, 50) || 'N/A');
                      
                      // Update UI immediately with final categories structure
                      if (onProductUpdate) {
                        onProductUpdate([], parsed.categories);
                      }
                    } else {
                      // Not categories format, treat as text
                      finalContent = rawFinalContent;
                    }
                  } catch (e) {
                    // Not JSON, use accumulated text (which was streamed)
                    finalContent = accumulatedText || rawFinalContent;
                  }
                  
                  // Update UI with final content (if different from accumulated)
                  if (onStreamUpdate && finalContent && finalContent !== accumulatedText) {
                    onStreamUpdate(finalContent);
                  }
                } else {
                  // No content in complete event, use accumulated text
                  finalContent = accumulatedText;
                }
              } else if (eventType === 'error') {
                hasError = true;
                errorMessage = eventPayload.error || eventPayload.content || 'An error occurred';
              }
              // Log other events for debugging
              if (eventType !== 'content' && eventType !== 'complete') {
                console.log(`Event: ${eventType}`, eventPayload);
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

  // Use final content from complete event if available, otherwise use accumulated text
  const finalText = finalContent || accumulatedText;
  
  console.log("=== FINAL RESPONSE ===");
  console.log("Final text:", finalText?.substring(0, 100));
  console.log("Collected products:", collectedProducts.length);
  console.log("Extracted categories:", extractedCategories ? extractedCategories.length : 0);
  
  // If we have categories from complete event, use them (highest priority)
  if (extractedCategories && extractedCategories.length > 0) {
    return {
      text: finalText || "Here are the products I found:",
      categories: extractedCategories
    };
  }
  
  // If we collected individual products, convert them to categories format
  if (collectedProducts.length > 0) {
    return {
      text: finalText || "Here are the products I found:",
      categories: [{
        category_name: "Products",
        products: collectedProducts
      }]
    };
  }
  
  // Fallback: parse the content as before
  const parsedResponse = parseResponseContent(finalText);
  return parsedResponse;
};

// Helper function to parse response content (same as your original logic)
function parseResponseContent(content: string | any): { text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[] } {
  console.log("Extracted content:=-", content);
  console.log("Content type:", typeof content);
  
  // If content is already an object (already parsed JSON)
  if (typeof content === 'object' && content !== null) {
    // Check if it's a category-based product structure (new format)
    if (content.categories && Array.isArray(content.categories)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        categories: content.categories 
      };
    }
    
    // Check if it's a product JSON structure (old format)
    if (content.products && Array.isArray(content.products)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        products: content.products 
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
          categories: parsedContent.categories 
        };
      }
      
      // Check if it's a product JSON structure (old format)
      if (parsedContent.products && Array.isArray(parsedContent.products)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          products: parsedContent.products 
        };
      }
    } catch (e) {
      console.log("Content is not valid JSON, treating as text");
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
              categories: categories || (products.length > 0 ? [{
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
                    categories: categories || (products.length > 0 ? [{
                      category_name: "Products",
                      products: products
                    }] : msg.categories)
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
    <div className="h-full bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
        {messages.map((message) => (
          <ChatMessageComponent key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};