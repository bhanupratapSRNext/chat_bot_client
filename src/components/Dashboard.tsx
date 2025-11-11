
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChatInterface } from "./ChatInterface";
import { MessageSquare, X, Plus, Settings, ChevronDown } from "lucide-react";
import { ChatHeader } from "./ChatHeader";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ChatWindow {
  id: string;
  title: string;
  isMinimized: boolean;
}

export const Dashboard = () => {
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configDetails, setConfigDetails] = useState<any>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createNewChat = () => {
    const newChat: ChatWindow = {
      id: `chat-${Date.now()}`,
      title: `Chat${chatWindows.length + 1}`,
      isMinimized: false,
    };
    setChatWindows([...chatWindows, newChat]);
    setActiveChat(newChat.id);
  };

  const openChat = (chatId: string) => {
    setActiveChat(chatId);
  };

  const closeChat = (chatId: string) => {
    setChatWindows(chatWindows.filter(chat => chat.id !== chatId));
    if (activeChat === chatId) {
      setActiveChat(null);
    }
  };

  const toggleMinimize = (chatId: string) => {
    setChatWindows(chatWindows.map(chat => 
      chat.id === chatId ? { ...chat, isMinimized: !chat.isMinimized } : chat
    ));
  };

  const fetchConfiguration = async () => {
    setIsLoadingConfig(true);
    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('token');
      
      if (!userId) {
        toast({
          title: "Error",
          description: "User ID not found",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/fetch-configuration/detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      setConfigDetails(data);
      setShowConfigDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch configuration details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const activeChatWindow = chatWindows.find(chat => chat.id === activeChat);

  if (activeChat && activeChatWindow) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveChat(null)}
            >
              ← Back to Dashboard
            </Button>
            <h2 className="text-lg font-semibold">{activeChatWindow.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => closeChat(activeChat)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface key={activeChat} name={activeChatWindow.title} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ChatHeader />
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome to AI Chat Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your conversations and configure your chatbot</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configure
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/configure')}>
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={fetchConfiguration} disabled={isLoadingConfig}>
                <MessageSquare className="w-4 h-4 mr-2" />
                {isLoadingConfig ? "Loading..." : "Fetch Configuration"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Your Chats
            </CardTitle>            
            <CardDescription>
              Start a new conversation or continue an existing one
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
                    <Card 
                      key={chat.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openChat(chat.id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{chat.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeChat(chat.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Click to open</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Details</DialogTitle>
            <DialogDescription>
              Your current configuration settings
            </DialogDescription>
          </DialogHeader>
          {configDetails && (
            <div className="space-y-4">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(configDetails, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};