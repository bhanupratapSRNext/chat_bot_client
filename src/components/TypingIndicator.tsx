import { useState, useEffect } from "react";

const loadingMessages = [
  "Checking on that....",
  "Processing your request....",
  "Almost there...",
  "Searching for the best options...",
  "Gathering information...",
];

export const TypingIndicator = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start mb-4 animate-slide-in-up">
      <div className="flex-shrink-0 mr-3">
        {/* <div className="w-10 h-10 rounded-full bg-chat-gradient flex items-center justify-center shadow-message"> */}
          {/* <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg> */}
        {/* </div> */}
      </div>
      
      <div className="bg-chat-bot-bubble text-foreground px-4 py-3 rounded-2xl rounded-bl-md shadow-message max-w-xs lg:max-w-md">
        <div className="flex items-center space-x-2">
          <span className="text-sm">{loadingMessages[currentMessageIndex]}</span>
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};