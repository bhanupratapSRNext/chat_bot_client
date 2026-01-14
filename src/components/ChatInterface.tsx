import { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  name: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
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

  const parseTableData = (text: string): TableData | null => {
    // Check if text contains the table start marker
    if (!text.includes('#Categories:')) {
      return null;
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const headers: string[] = [];
    const rows: string[][] = [];

    for (const line of lines) {
      if (line.startsWith('#Categories:')) {
        // Extract category headers
        const categoriesText = line.substring('#Categories:'.length).trim();
        const categories = categoriesText.split('|').map(cat => 
          cat.trim().replace(/^\*|\*$/g, '') // Remove * markers
        );
        headers.push('', ...categories); // Empty first column header for the row labels
      } else if (line.startsWith('#')) {
        // DYNAMIC PARSING: Handle any line starting with # (Parameter, Use Case, Material, etc.)
        const colonIndex = line.indexOf(':');
        
        // Ensure we have a valid label and it's not the Categories line we already processed
        if (colonIndex !== -1 && !line.startsWith('#Categories:')) {
          const rowLabel = line.substring(1, colonIndex).trim(); // Extract label (e.g. "Use Case")
          const paramText = line.substring(colonIndex + 1).trim();
          
          const values = paramText.split('|').map(val => 
            val.trim().replace(/^\*|\*$/g, '') // Remove * markers
          );
          
          // Add the row label as the first cell in the row
          rows.push([rowLabel, ...values]);
        }
      }
    }

    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }

    return null;
  };

const getBotResponse = async (
  userMessage: string,
  onStreamUpdate?: (content: string) => void,
  onProductUpdate?: (products: any[], categories?: any[]) => void,
  onListUpdate?: (heading: string | null, listItems: string[]) => void,
  onTableUpdate?: (tableData: TableData) => void  // NEW: Table callback
): Promise<{ 
  text: string; 
  products?: any[]; 
  categories?: any[]; 
  heading?: string; 
  listItems?: string[]; 
  followUpQuestions?: string[];
  tableData?: TableData;  // NEW: Add table data to response
}> => {
  const response = await fetch('/api/runs/stream', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_name: "ecommerce-router",          
      mode: "sync",                  
      session_id: sessionId,
      tenantID: '3',
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

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const data = await response.json();
    const content = data.output?.[0]?.parts?.[0]?.content;
    return parseResponseContent(content);
  }

  const reader = response.body?.getReader(); 
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';
  let finalContent = '';
  let extractedCategories: any[] | null = null;
  let hasError = false;
  let errorMessage = '';
  
  let jsonBuffer = '';
  let isReceivingJson = false;
  let jsonParsed = false;
  let extractedSummary = '';
  let displayedProducts = new Set<string>();
  let currentCategories: any[] = [];
  let extractedFollowUpQuestions: string[] = [];

  // NEW: Track table data
  let detectedTableData: TableData | null = null;

  const extractHeadingAndListItems = (text: string): { heading: string | null; listItems: string[] } => {
    const result: { heading: string | null; listItems: string[] } = {
      heading: null,
      listItems: []
    };
    
    if (text.includes('heading:')) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const headingMatch = text.match(/heading:\s*"([^"]+)"/);
      result.heading = headingMatch ? headingMatch[1] : null;
      const listItemRegex = /\[\s*"([^"]+)"\s*\]/;
      
      lines.forEach(line => {
        const match = line.match(listItemRegex);
        if (match) {
          const itemText = match[1];
          if (!result.listItems.includes(itemText)) {
            result.listItems.push(itemText);
          }
        }
      });
    }
    
    return result;
  };

  const extractSummaryFromPartialJson = (jsonStr: string): string | null => {
    const summaryStartPattern = /"summary"\s*:\s*"/;
    const summaryStartMatch = jsonStr.match(summaryStartPattern);
    
    if (!summaryStartMatch) return null;
    
    const startIndex = summaryStartMatch.index! + summaryStartMatch[0].length;
    let summaryValue = '';
    let inEscape = false;
    
    for (let i = startIndex; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (inEscape) {
        if (char === 'n') summaryValue += '\n';
        else if (char === 'r') summaryValue += '\r';
        else if (char === 't') summaryValue += '\t';
        else if (char === '"') summaryValue += '"';
        else if (char === '\\') summaryValue += '\\';
        else summaryValue += '\\' + char;
        inEscape = false;
        continue;
      }
      
      if (char === '\\') {
        inEscape = true;
        continue;
      }
      
      if (char === '"') {
        break;
      }
      
      summaryValue += char;
    }
    
    return summaryValue || null;
  };

  const extractProductsFromPartialJson = (jsonStr: string): any[] => {
    const newProducts: any[] = [];
    
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.categories && Array.isArray(parsed.categories)) {
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
      // JSON incomplete
    }
    
    const productPattern = /\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+)\s*(?:,\s*"source_url"\s*:\s*"([^"]+)")?(?:\s*,\s*"product_image"\s*:\s*"([^"]*)")?\s*\}/g;
    let productMatch;
    
    while ((productMatch = productPattern.exec(jsonStr)) !== null) {
      const productKey = `${productMatch[1]}_${productMatch[2]}`;
      
      if (!displayedProducts.has(productKey)) {
        const beforeProduct = jsonStr.substring(0, productMatch.index);
        const categoryMatch = beforeProduct.match(/"category_name"\s*:\s*"([^"]+)"/g);
        let categoryName = "Products";
        
        if (categoryMatch && categoryMatch.length > 0) {
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

  const updateCategoriesWithNewProducts = (newProducts: Array<{product: any, categoryName: string}>) => {
    if (newProducts.length === 0) return;
    
    newProducts.forEach(({product, categoryName}) => {
      let category = currentCategories.find(cat => cat.category_name === categoryName);
      if (!category) {
        category = {
          category_name: categoryName,
          products: []
        };
        currentCategories.push(category);
      }
      
      const productExists = category.products.some(
        (p: any) => p.title === product.title && p.price === product.price
      );
      if (!productExists) {
        category.products.push(product);
      }
    });
    
    if (onProductUpdate) {
      onProductUpdate([], [...currentCategories]);
    }
  };

  const tryParseAccumulatedJson = (): boolean => {
    if (!jsonBuffer || jsonParsed) return false;
    
    const partialSummary = extractSummaryFromPartialJson(jsonBuffer);
    if (partialSummary && partialSummary.length > extractedSummary.length) {
      extractedSummary = partialSummary;
      if (onStreamUpdate) {
        onStreamUpdate(partialSummary);
      }
    }
    
    const newProducts = extractProductsFromPartialJson(jsonBuffer);
    if (newProducts.length > 0) {
      updateCategoriesWithNewProducts(newProducts);
    }
    
    try {
      const parsed = JSON.parse(jsonBuffer);
      
      if (parsed && typeof parsed === 'object') {
        if (parsed.categories && Array.isArray(parsed.categories)) {
          extractedCategories = parsed.categories;
          extractedSummary = parsed.summary || extractedSummary || '';
          
          if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions)) {
            extractedFollowUpQuestions = parsed.follow_up_questions;
          }
          
          jsonParsed = true;
          currentCategories = parsed.categories;
          
          if (onProductUpdate) {
            onProductUpdate([], parsed.categories);
          }
          
          if (extractedSummary && onStreamUpdate) {
            onStreamUpdate(extractedSummary);
          }
          
          return true;
        }
      }
    } catch (e) {
      return false;
    }
    
    return false;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      let currentEventType = '';
      let currentEventData = '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) {
          if (currentEventType && currentEventData) {
            try {
              const eventData = JSON.parse(currentEventData);
              const eventType = eventData.type;
              const eventPayload = eventData.data || {};
              
              if (eventType === 'content' && eventPayload.content !== undefined) {
                const content = eventPayload.content;
                const metadata = eventPayload.metadata || {};

                if (metadata.is_json === true || metadata.content_type === 'application/json') {
                  if (!isReceivingJson) {
                    isReceivingJson = true;
                    jsonBuffer = '';
                    displayedProducts.clear();
                    currentCategories = [];

                    if (onProductUpdate) {
                      onProductUpdate([], []);
                    }
                  }

                  jsonBuffer += content;

                  if (!jsonParsed) {
                    tryParseAccumulatedJson();
                  }

                  continue;
                }

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

                // NEW: Check for table data in accumulated text
                const parsedTable = parseTableData(accumulatedText);
                if (parsedTable) {
                  detectedTableData = parsedTable;
                  if (onTableUpdate) {
                    onTableUpdate(parsedTable);
                  }
                  // Don't show raw text when we have table data
                  continue;
                }

                const { heading, listItems } = extractHeadingAndListItems(accumulatedText);
                if (heading && listItems.length > 0 && onListUpdate) {
                  onListUpdate(heading, listItems);
                } else {
                  const textToShow = extractedSummary || finalContent || accumulatedText;
                  if (onStreamUpdate) {
                    onStreamUpdate(textToShow);
                  }
                }

                if (currentCategories.length > 0 && onProductUpdate) {
                  onProductUpdate([], [...currentCategories]);
                }

              } else if (eventType === 'complete') {
                if (!jsonParsed && jsonBuffer) {
                  tryParseAccumulatedJson();
                }

                finalContent = extractedSummary || finalContent || accumulatedText;
                
              } else if (eventType === 'error') {
                hasError = true;
                errorMessage = eventPayload.error || eventPayload.content || 'An error occurred';
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

  if (isReceivingJson && !jsonParsed && jsonBuffer) {
    tryParseAccumulatedJson();
  }

  const finalText = finalContent || extractedSummary || accumulatedText;
  const parsedTextContent = parseResponseContent(accumulatedText);
  
  // NEW: Check for table data in final content
  if (!detectedTableData) {
    detectedTableData = parseTableData(finalText);
  }
  
  if (extractedCategories && extractedCategories.length > 0) {
    return {
      text: finalText || parsedTextContent.text || "Here are the products I found:",
      categories: extractedCategories,
      heading: parsedTextContent.heading,
      listItems: parsedTextContent.listItems,
      followUpQuestions: extractedFollowUpQuestions.length > 0 ? extractedFollowUpQuestions : parsedTextContent.followUpQuestions,
      tableData: detectedTableData || undefined  // NEW
    };
  }
  
  return {
    ...parsedTextContent,
    followUpQuestions: extractedFollowUpQuestions.length > 0 ? extractedFollowUpQuestions : parsedTextContent.followUpQuestions,
    tableData: detectedTableData || undefined  // NEW
  };
};

function parseResponseContent(content: string | any): { 
  text: string; 
  products?: any[]; 
  categories?: any[]; 
  heading?: string; 
  listItems?: string[]; 
  followUpQuestions?: string[];
  tableData?: TableData;  // NEW
} {
  if (typeof content === 'object' && content !== null) {
    if (content.categories && Array.isArray(content.categories)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        categories: content.categories,
        followUpQuestions: content.follow_up_questions && Array.isArray(content.follow_up_questions) ? content.follow_up_questions : undefined
      };
    }
    
    if (content.products && Array.isArray(content.products)) {
      return { 
        text: content.summary || "Here are the products I found:", 
        products: content.products,
        followUpQuestions: content.follow_up_questions && Array.isArray(content.follow_up_questions) ? content.follow_up_questions : undefined
      };
    }
    
    if (Array.isArray(content) && content.length > 0 && content[0].title) {
      return { text: "Here are the products I found:", products: content };
    }
  }
  
  if (typeof content === 'string') {
    // NEW: Check for table format first
    const tableData = parseTableData(content);
    if (tableData) {
      return { text: "", tableData };
    }

    if (content.includes('heading:')) {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      
      const headingMatch = content.match(/heading:\s*"([^"]+)"/);
      const heading = headingMatch ? headingMatch[1] : null;
      
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
    
    try {
      const parsedContent = JSON.parse(content);
      
      if (parsedContent.categories && Array.isArray(parsedContent.categories)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          categories: parsedContent.categories,
          followUpQuestions: parsedContent.follow_up_questions && Array.isArray(parsedContent.follow_up_questions) ? parsedContent.follow_up_questions : undefined
        };
      }
      
      if (parsedContent.products && Array.isArray(parsedContent.products)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          products: parsedContent.products,
          followUpQuestions: parsedContent.follow_up_questions && Array.isArray(parsedContent.follow_up_questions) ? parsedContent.follow_up_questions : undefined
        };
      }
    } catch (e) {
      // Not JSON
    }
  }
  
  return { text: typeof content === 'string' ? content : JSON.stringify(content) };
}

  const handleSendMessage = async (messageText: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const botMessageId = `bot-${Date.now()}`;
    let botMessageCreated = false;

    try {
      const botResponse = await getBotResponse(
        messageText, 
        (streamingContent: string) => {
          if (!botMessageCreated && streamingContent.trim()) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: streamingContent,
              isUser: false,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, newBotMessage]);
          } else if (botMessageCreated) {
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: streamingContent }
                : msg
            ));
          }
        },
        (products: any[], categories?: any[]) => {
          if (!botMessageCreated) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: '',
              isUser: false,
              timestamp: new Date().toISOString(),
              categories: (categories && categories.length > 0) ? categories : (products.length > 0 ? [{
                category_name: "Products",
                products: products
              }] : undefined),
            };
            setMessages(prev => [...prev, newBotMessage]);
          } else {
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
        (heading: string | null, listItems: string[]) => {
          if (!botMessageCreated) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: '',
              isUser: false,
              timestamp: new Date().toISOString(),
              heading: heading || undefined,
              listItems: listItems.length > 0 ? listItems : undefined,
            };
            setMessages(prev => [...prev, newBotMessage]);
          } else {
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { 
                    ...msg, 
                    text: '',
                    heading: heading || msg.heading,
                    listItems: listItems.length > 0 ? listItems : msg.listItems
                  }
                : msg
            ));
          }
        },
        // NEW: Table update callback
        (tableData: TableData) => {
          if (!botMessageCreated) {
            botMessageCreated = true;
            const newBotMessage: ChatMessage = {
              id: botMessageId,
              text: '',
              isUser: false,
              timestamp: new Date().toISOString(),
              tableData: tableData,
            };
            setMessages(prev => [...prev, newBotMessage]);
          } else {
            setMessages(prev => prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: '', tableData }
                : msg
            ));
          }
        }
      );
      
      setIsLoading(false);
      
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
          tableData: botResponse.tableData,  // NEW
        };
        setMessages(prev => [...prev, finalBotMessage]);
      } else {
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
          tableData: botResponse.tableData,  // NEW
        };

        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? finalBotMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      
      if (!botMessageCreated) {
        const errorMessage: ChatMessage = {
          id: botMessageId,
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
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