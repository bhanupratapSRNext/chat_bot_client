/**
 * MiniChatbot - A self-contained, fully independent chatbot component
 * 
 * DEPENDENCIES:
 * - react (useState, useRef, useEffect)
 * - lucide-react (for icons: MessageCircle, Send, X, Loader2, ExternalLink, ShoppingCart)
 * 
 * CONFIGURATION:
 * 1. Update the API endpoint in getBotResponse() to match your backend
 * 2. Update the tenantID in the API call
 * 3. Customize styles by modifying the className strings
 * 
 * USAGE:
 * Simply import and add <MiniChatbot /> to your React app
 */

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, ExternalLink, ShoppingCart } from "lucide-react";

// Utility function for className merging
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Simple toast notification system
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; description: string; variant?: string }>>([]);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return { toast, toasts, setToasts };
};

// Fallback image as data URI
const NoImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

// Inline UI Components
const Button = ({ 
  children, 
  onClick, 
  variant = "default", 
  size = "default", 
  disabled, 
  type = "button",
  className = "" 
}: any) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-gray-100",
  };
  const sizes: any = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    icon: "h-10 w-10",
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }: any) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

const Card = ({ children, className = "" }: any) => {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
};

interface Product {
  title: string;
  price: number;
  source_url: string;
  product_image: string;
}

interface CategoryGroup {
  category_name: string;
  products: Product[];
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  products?: Product[];
  categories?: CategoryGroup[];
  heading?: string;
  listItems?: string[];
}

export const MiniChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast, toasts, setToasts } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getBotResponse = async (userMessage: string): Promise<{ text: string; products?: any[]; categories?: any[]; heading?: string; listItems?: string[] }> => {
    const userId = localStorage.getItem("user_id");
    const sessionId = userId || "guest";

    const response = await fetch('/api/runs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        agent_name: "router",          
        mode: "sync",                  
        session_id: sessionId,
        tenantID: 'thewholetruthfoods.com',
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

    const data = await response.json();
    const content = data.output?.[0]?.parts?.[0]?.content;
    
    if (typeof content === 'object' && content !== null) {
      if (content.categories && Array.isArray(content.categories)) {
        return { 
          text: content.summary || "Here are the products I found:", 
          categories: content.categories 
        };
      }
      
      if (content.products && Array.isArray(content.products)) {
        return { 
          text: content.summary || "Here are the products I found:", 
          products: content.products 
        };
      }
      
      if (Array.isArray(content) && content.length > 0 && content[0].title) {
        return { text: "Here are the products I found:", products: content };
      }
    }
    
    if (typeof content === 'string') {
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
            categories: parsedContent.categories 
          };
        }
        
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
    
    return { text: typeof content === 'string' ? content : JSON.stringify(content) };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: message.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const botResponse = await getBotResponse(message.trim());
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponse.text,
        isUser: false,
        timestamp: new Date().toISOString(),
        products: botResponse.products,
        categories: botResponse.categories,
        heading: botResponse.heading,
        listItems: botResponse.listItems,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openUrl = (url?: string | null) => {
    if (!url) return;
    const safeUrl = url.startsWith("http") ? url : `https://${url}`;
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  };

  const ProductCardMini = ({ product }: { product: Product }) => {
    const imgSrc =
      product.product_image &&
      typeof product.product_image === "string" &&
      product.product_image.trim() !== "" &&
      !product.product_image.toLowerCase().includes("null")
        ? product.product_image.trim()
        : NoImage;

    return (
      <Card className="overflow-hidden hover:shadow-md transition">
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <img
                src={imgSrc}
                alt={product.title ?? "product image"}
                className="w-full h-32 object-cover border-b rounded"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src !== (NoImage as unknown as string)) {
                    target.src = NoImage as unknown as string;
                  }
                }}
              />
              <h3 className="font-semibold text-xs line-clamp-2 leading-tight mt-2">
                {product.title}
              </h3>
            </div>
          </div>

          <div className="flex items-end justify-between pt-2 border-t">
            <div>
              <p className="text-lg font-bold text-primary">₹ {product.price}</p>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => openUrl(product.source_url)}
              className="gap-1 text-xs px-2 py-1 h-7"
            >
              <ShoppingCart className="w-3 h-3" />
              View
              <ExternalLink className="w-2 h-2" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-background border rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex mb-4 animate-slide-in-up",
                  msg.isUser ? "justify-end" : "justify-start"
                )}
              >
                {!msg.isUser && (
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full bg-chat-gradient flex items-center justify-center shadow-message">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                  </div>
                )}
                
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl shadow-message relative transition-all duration-300",
                    msg.isUser 
                      ? "max-w-[70%] bg-chat-user-bubble text-white ml-auto rounded-br-md" 
                      : "max-w-[85%] bg-chat-bot-bubble text-foreground rounded-bl-md"
                  )}
                >
                  {msg.text && <p className="text-xs leading-relaxed mb-1">{msg.text}</p>}
                  
                  {msg.heading && (
                    <h3 className="text-sm font-semibold mb-2 text-foreground">{msg.heading}</h3>
                  )}
                  
                  {msg.listItems && msg.listItems.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {msg.listItems.map((item, idx) => (
                        <li key={idx} className="flex items-start text-xs leading-relaxed">
                          <span className="text-primary mr-2 mt-1 flex-shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {msg.categories && msg.categories.length > 0 && (
                    <div className="space-y-4 mt-3">
                      {msg.categories.map((category, catIdx) => (
                        <div key={catIdx} className="space-y-2">
                          <h4 className="text-xs font-semibold text-foreground border-b pb-1">
                            {category.category_name}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {category.products.map((product, prodIdx) => (
                              <ProductCardMini key={`${catIdx}-${prodIdx}`} product={product} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {msg.products && msg.products.length > 0 && !msg.categories && (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {msg.products.map((product, idx) => (
                        <ProductCardMini key={idx} product={product} />
                      ))}
                    </div>
                  )}
                  
                  <span className={cn(
                    "text-[10px] mt-1 block",
                    msg.isUser ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {msg.isUser && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shadow-message">
                      <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-4 animate-slide-in-up">
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-chat-gradient flex items-center justify-center shadow-message">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                </div>
                <div className="bg-chat-bot-bubble text-foreground px-3 py-2 rounded-2xl rounded-bl-md shadow-message">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-chat-input-bg border-t border-border p-3 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-input border-border text-sm"
              />
              <Button
                type="submit"
                disabled={!message.trim() || isLoading}
                size="icon"
                className="bg-send-button hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-20 right-6 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border p-4 shadow-lg animate-slide-in-up bg-white",
              t.variant === "destructive" ? "border-red-500 bg-red-50" : "border-gray-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className={cn("font-semibold text-sm", t.variant === "destructive" ? "text-red-900" : "text-gray-900")}>
                  {t.title}
                </h3>
                <p className={cn("text-sm mt-1", t.variant === "destructive" ? "text-red-700" : "text-gray-600")}>
                  {t.description}
                </p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
