import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex mb-4 animate-slide-in-up",
      message.isUser ? "justify-end" : "justify-start"
    )}>
      {!message.isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-full bg-chat-gradient flex items-center justify-center shadow-message">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
        </div>
      )}
      
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-message relative transition-all duration-300 hover:shadow-lg",
        message.isUser 
          ? "bg-chat-user-bubble text-white ml-auto rounded-br-md" 
          : "bg-chat-bot-bubble text-foreground rounded-bl-md"
      )}>
        <p className="text-sm leading-relaxed">{message.text}</p>
        <span className={cn(
          "text-xs mt-1 block",
          message.isUser ? "text-white/70" : "text-muted-foreground"
        )}>
          {formatTime(message.timestamp)}
        </span>
      </div>

      {message.isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-message">
            <svg
              className="w-6 h-6 text-foreground"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};