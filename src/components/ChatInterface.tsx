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
      text: "Hello! I'm your AI assistant. How can I help you today?",
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

  const getBotResponse = async (userMessage: string): Promise<{ text: string; products?: any[]; heading?: string; listItems?: string[] }> => {
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
        tenantID:'thewholetruthfoods.com',
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
    console.log("Extracted content:", content);
    
    // Check if content contains heading and list format
    if (typeof content === 'string' && content.includes('heading:')) {
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
    
    // Try to parse content as JSON first (for properly formatted responses)
    try {
      const parsedContent = JSON.parse(content);
      
      // Check if it's a product JSON structure
      if (parsedContent.products && Array.isArray(parsedContent.products)) {
        return { 
          text: parsedContent.summary || "Here are the products I found:", 
          products: parsedContent.products 
        };
      }
    } catch (e) {
      // If JSON parsing fails, check if content is already an array (cached responses)
      if (Array.isArray(content) && content.length > 0 && content[0].title) {
        return { text: "Here are the products I found:", products: content };
      }
      
      // If not JSON and not array, treat as regular text
      console.log("Content is not JSON, treating as text");
    }
    
    // Return as regular text response
    return { text: content };
  };

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

    try {
      const botResponse = await getBotResponse(messageText);
      // console.log("Bot response:", botResponse );
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponse.text,
        isUser: false,
        timestamp: new Date().toISOString(),
        products: botResponse.products,
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