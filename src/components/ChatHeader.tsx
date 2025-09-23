
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { logout } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const ChatHeader = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="bg-chat-header-bg border-b border-border p-4 rounded-t-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-chat-gradient flex items-center justify-center shadow-message animate-bounce-in">
              <svg
                className="w-7 h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chat-online rounded-full border-2 border-chat-header-bg animate-pulse"></div>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground text-lg">AI Chatbot</h3>
            <p className="text-sm text-muted-foreground">Ask me anything! I'm here to help.</p>
          </div>
        </div>
           <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};