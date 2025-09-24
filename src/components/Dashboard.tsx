
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChatInterface } from "./ChatInterface";
import { MessageSquare, X, Plus } from "lucide-react";
import { ChatHeader } from "./ChatHeader";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import { LogOut } from "lucide-react";

interface ChatWindow {
  id: string;
  title: string;
  isMinimized: boolean;
}

export const Dashboard = () => {
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const createNewChat = () => {
    const newChat: ChatWindow = {
      id: `chat-${Date.now()}`,
      title: `Chat${chatWindows.length + 1}`,
      isMinimized: false,
    };
    setChatWindows([...chatWindows, newChat]);
  };

  const closeChat = (chatId: string) => {
    setChatWindows(chatWindows.filter(chat => chat.id !== chatId));
  };

  const toggleMinimize = (chatId: string) => {
    setChatWindows(chatWindows.map(chat => 
      chat.id === chatId ? { ...chat, isMinimized: !chat.isMinimized } : chat
    ));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <ChatHeader />
      
      <div className="max-w-6xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Chat Dashboard
            </CardTitle>            
            <CardDescription>
              Welcome to your AI assistant dashboard. Start a new conversation to get help with anything!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createNewChat} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Start New Chat
            </Button>
            
            {chatWindows.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Active Chats ({chatWindows.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chatWindows.map((chat) => (
                    <Card key={chat.id} className="relative flex flex-col">
                      <CardHeader className="pb-2 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{chat.title}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleMinimize(chat.id)}
                            >
                              {chat.isMinimized ? "+" : "-"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => closeChat(chat.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {!chat.isMinimized && (
                        <CardContent className="p-0 flex-1 flex">
                          <div className="h-96 w-full border-0 rounded-lg overflow-hidden">
                            <ChatInterface key={chat.id} name={chat.title} />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};