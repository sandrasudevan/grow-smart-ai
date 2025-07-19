import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Bot, Key } from "lucide-react";

interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: any;
  context_length?: number;
}

export const SettingsComponent = () => {
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [huggingFaceKey, setHuggingFaceKey] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("meta-llama/llama-3.2-3b-instruct:free");
  const [loading, setLoading] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSelectedModel();
    loadSavedApiKeys();
  }, []);

  const loadSavedApiKeys = () => {
    const savedOpenRouterKey = localStorage.getItem("openRouterKey");
    const savedHuggingFaceKey = localStorage.getItem("huggingFaceKey");
    
    if (savedOpenRouterKey) {
      setOpenRouterKey(savedOpenRouterKey);
    }
    if (savedHuggingFaceKey) {
      setHuggingFaceKey(savedHuggingFaceKey);
    }
  };

  const loadSelectedModel = () => {
    const saved = localStorage.getItem("selectedModel");
    if (saved) {
      setSelectedModel(saved);
    }
  };

  const saveApiKeys = async () => {
    if (!openRouterKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OpenRouter API key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Save API keys to localStorage first
      localStorage.setItem("openRouterKey", openRouterKey);
      if (huggingFaceKey.trim()) {
        localStorage.setItem("huggingFaceKey", huggingFaceKey);
      }
      
      // Test the OpenRouter key by fetching models
      await fetchModels(openRouterKey);
      
      toast({
        title: "Success",
        description: "API keys saved successfully!",
      });
    } catch (error) {
      // API key save failed
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save API keys. Please check your OpenRouter API key.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (apiKey?: string) => {
    const keyToUse = apiKey || openRouterKey;
    
    if (!keyToUse || keyToUse.trim() === '') {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenRouter API key first",
        variant: "destructive",
      });
      return;
    }

    setFetchingModels(true);
    console.log('Fetching models from OpenRouter...');
    
    try {
      const { data, error } = await supabase.functions.invoke('get-openrouter-models', {
        body: { apiKey: keyToUse }
      });

      console.log('Models fetch response:', { hasData: !!data, hasError: !!error, data });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to fetch models from OpenRouter');
      }

      if (!data || !data.models || !Array.isArray(data.models)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from OpenRouter API');
      }

      if (data.models.length === 0) {
        throw new Error('No models available. Please check your API key permissions.');
      }

      setModels(data.models);
      
      // Auto-select a good default model if none selected
      const currentSelected = localStorage.getItem("selectedModel");
      if (!currentSelected && data.models.length > 0) {
        // Prefer free models first, then fallback to first available
        const freeModel = data.models.find((m: any) => m.id.includes(':free'));
        const defaultModel = freeModel || data.models[0];
        setSelectedModel(defaultModel.id);
        localStorage.setItem("selectedModel", defaultModel.id);
      }
      
      toast({
        title: "Models Loaded Successfully!",
        description: `Found ${data.models.length} AI models. ${data.models.filter((m: any) => m.id.includes(':free')).length} free models available.`,
      });
      
      console.log('Successfully loaded models:', {
        total: data.models.length,
        free: data.models.filter((m: any) => m.id.includes(':free')).length,
        firstFew: data.models.slice(0, 3).map((m: any) => m.id)
      });
      
    } catch (error) {
      console.error('Error fetching models:', error);
      toast({
        title: "Failed to Load Models",
        description: error instanceof Error ? error.message : "Please check your OpenRouter API key and try again.",
        variant: "destructive",
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("selectedModel", modelId);
    toast({
      title: "Model Selected",
      description: `Now using ${modelId}`,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter Configuration</CardTitle>
              <CardDescription>
                Enter your OpenRouter API key to access 350+ AI models. 
                Get your free API key from{" "}
                <a 
                  href="https://openrouter.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenRouter.ai
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                <Input
                  id="openrouter-key"
                  type="password"
                  placeholder="Enter your OpenRouter API key"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="huggingface-key">Hugging Face API Key</Label>
                <Input
                  id="huggingface-key"
                  type="password"
                  placeholder="Enter your Hugging Face API key"
                  value={huggingFaceKey}
                  onChange={(e) => setHuggingFaceKey(e.target.value)}
                />
              </div>
              <Button 
                onClick={saveApiKeys} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Saving..." : "Save & Fetch Models"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Models</CardTitle>
              <CardDescription>
                Select an AI model for your conversations. Free models are marked accordingly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {models.length} models available
                </p>
                <Button 
                  onClick={() => fetchModels()} 
                  disabled={fetchingModels}
                  variant="outline"
                  size="sm"
                >
                  {fetchingModels ? "Fetching..." : "Refresh Models"}
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {models.map((model) => (
                    <Card 
                      key={model.id}
                      className={`cursor-pointer transition-colors ${
                        selectedModel === model.id ? "ring-2 ring-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => selectModel(model.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-medium">{model.name}</h4>
                            <p className="text-sm text-muted-foreground">{model.id}</p>
                            {model.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {model.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {model.id.includes(":free") && (
                              <Badge variant="secondary">Free</Badge>
                            )}
                            {selectedModel === model.id && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </div>
                        {model.context_length && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Context: {model.context_length.toLocaleString()} tokens
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {models.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No models available. Please enter your API key first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};