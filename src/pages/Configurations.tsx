import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChatHeader } from "@/components/ChatHeader";
import { Loader2, FileText, ArrowLeft } from "lucide-react";

interface Configuration {
  id: string;
  name: string;
  created_at?: string;
  [key: string]: any;
}

export default function Configurations() {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setIsLoading(true);
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

      const response = await fetch('http://localhost:8080/list/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }

      const data = await response.json();
      setConfigurations(data.configurations || data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch configurations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfigurationDetail = async (configId: string) => {
    setIsLoadingDetail(true);
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

      const response = await fetch('http://localhost:8080/api/fetch-configuration/detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          user_id: userId,
          configuration_id: configId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration details');
      }

      const data = await response.json();
      setSelectedConfig(data);
      setShowDetailDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch configuration details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatHeader />
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Configurations</h1>
          <p className="text-muted-foreground mt-2">View and manage all your saved configurations</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : configurations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No configurations found</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/configure')}
              >
                Create Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configurations.map((config) => (
              <Card 
                key={config.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => fetchConfigurationDetail(config.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {config.name || `Configuration ${config.id}`}
                  </CardTitle>
                  {config.created_at && (
                    <CardDescription>
                      Created: {new Date(config.created_at).toLocaleDateString()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click to view details
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Details</DialogTitle>
            <DialogDescription>
              Detailed information about this configuration
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedConfig ? (
            <div className="space-y-4">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(selectedConfig, null, 2)}
              </pre>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
