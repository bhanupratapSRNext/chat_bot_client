import { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";

export const ChatInterface = () => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getBotResponse = async (userMessage: string): Promise<string> => {
    const response = await fetch('http://localhost:8080/get', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          msg: userMessage,
      }),
    });
    // console.log(response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
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
      const botResponseText = await getBotResponse(messageText);

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        isUser: false,
        timestamp: new Date().toISOString(),
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border-border/50 overflow-hidden">
        <ChatHeader />
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}
          
          {isLoading && <TypingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </Card>
    </div>
  );
};