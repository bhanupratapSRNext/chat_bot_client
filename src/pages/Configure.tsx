import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Database } from "lucide-react";

export default function Configure() {
  const [currentStep, setCurrentStep] = useState(1);
  const [indexName, setIndexName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dbType, setDbType] = useState<"sql" | "nosql">("sql");
  const [dbConfig, setDbConfig] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    database: "",
    url: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateIndex = async () => {
    if (!indexName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an index name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pinecone/create-index', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          index_name: indexName,
          dimension: 384,
          metric: "cosine",
          cloud: "aws",
          region: "us-east-1",
          user_id: localStorage.getItem('user_id'),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create index');
      }

      toast({
        title: "Success",
        description: "Pinecone index created successfully",
      });
      setCompletedSteps({ ...completedSteps, 1: true });
      setCurrentStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create index. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('user_id', localStorage.getItem('user_id') || '');
      formData.append('index_name', indexName);

      const response = await fetch('/api/pinecone/create-embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      toast({
        title: "Success",
        description: "PDF uploaded successfully",
      });
      setCompletedSteps({ ...completedSteps, 2: true });
      setCurrentStep(3);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseConnection = async () => {
    if (dbType === "sql") {
      if (!dbConfig.host || !dbConfig.port || !dbConfig.username || !dbConfig.password || !dbConfig.database) {
        toast({
          title: "Error",
          description: "Please fill in all SQL database credentials",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!dbConfig.url) {
        toast({
          title: "Error",
          description: "Please provide NoSQL database URL",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/connections/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: localStorage.getItem('user_id'),
          index_name: indexName,
          db_type: dbType,
          db_config: dbType === "sql" 
            ? {
                host: dbConfig.host,
                port: dbConfig.port,
                username: dbConfig.username,
                password: dbConfig.password,
                database: dbConfig.database
              }
            : { url: dbConfig.url }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save database connection');
      }

      toast({
        title: "Success",
        description: "Database connection configured and saved",
      });
      setCompletedSteps({ ...completedSteps, 3: true });
      setCurrentStep(4);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save database connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetResults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/get-results', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: localStorage.getItem('user_id'),
          index_name: indexName,
          db_type: dbType,
          db_config: dbType === "sql" 
            ? {
                host: dbConfig.host,
                port: dbConfig.port,
                username: dbConfig.username,
                password: dbConfig.password,
                database: dbConfig.database
              }
            : { url: dbConfig.url }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get results');
      }

      const data = await response.json();
      setFinalResult(data);
      
      toast({
        title: "Success",
        description: "Configuration completed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please upload a valid PDF file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/chat-bot')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Chatbot Configuration</CardTitle>
            <CardDescription>
              Step {currentStep} of 4: {
                currentStep === 1 ? "Create Pinecone Index" :
                currentStep === 2 ? "Upload PDF Document" :
                currentStep === 3 ? "Database Connection" :
                "View Results"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Create Index */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="indexName">Pinecone Index Name</Label>
                  <Input
                    id="indexName"
                    placeholder="Enter index name"
                    value={indexName}
                    onChange={(e) => setIndexName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/chat-bot')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateIndex} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Creating..." : "Next"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload PDF */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdfUpload">Upload PDF Document</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="pdfUpload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                    {uploadedFile && (
                      <span className="text-sm text-muted-foreground">
                        {uploadedFile.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={isLoading || !uploadedFile || !completedSteps[1]}
                    className="flex-1"
                  >
                    {isLoading ? "Uploading..." : "Next"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Database Connection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Database Type</Label>
                    <RadioGroup value={dbType} onValueChange={(value) => setDbType(value as "sql" | "nosql")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sql" id="sql" />
                        <Label htmlFor="sql" className="font-normal cursor-pointer">SQL Database</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nosql" id="nosql" />
                        <Label htmlFor="nosql" className="font-normal cursor-pointer">NoSQL Database</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {dbType === "sql" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          placeholder="localhost or IP address"
                          value={dbConfig.host}
                          onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          placeholder="5432"
                          value={dbConfig.port}
                          onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Database username"
                          value={dbConfig.username}
                          onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Database password"
                          value={dbConfig.password}
                          onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="database">Database Name</Label>
                        <Input
                          id="database"
                          placeholder="Database name"
                          value={dbConfig.database}
                          onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="url">Database URL</Label>
                      <Input
                        id="url"
                        placeholder="mongodb://... or https://..."
                        value={dbConfig.url}
                        onChange={(e) => setDbConfig({ ...dbConfig, url: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleDatabaseConnection}
                    disabled={isLoading || !completedSteps[2]}
                    className="flex-1"
                  >
                    {isLoading ? "Saving..." : "Next"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {!finalResult ? (
                  <>
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Ready to Process</h3>
                      <p className="text-muted-foreground">
                        Click the button below to process your data and get results
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setCurrentStep(3)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button 
                        onClick={handleGetResults} 
                        disabled={isLoading || !completedSteps[3]}
                        className="flex-1"
                      >
                        {isLoading ? "Processing..." : "Get Results"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <h3 className="font-semibold mb-2">Configuration Results</h3>
                      <pre className="text-sm overflow-auto max-h-96">
                        {JSON.stringify(finalResult, null, 2)}
                      </pre>
                    </div>
                    <Button 
                      onClick={() => navigate('/chat-bot')}
                      className="w-full"
                    >
                      Back to Dashboard
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Progress Indicator */}
            <div className="mt-8 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-12 rounded-full ${
                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
