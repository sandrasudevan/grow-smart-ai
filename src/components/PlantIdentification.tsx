import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, X, Leaf, Droplets, Sun, Bug, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PlantResult {
  name: string;
  confidence: number;
  scientificName?: string;
  health: 'healthy' | 'diseased' | 'pest' | 'nutrient-deficiency';
  care: {
    watering: string;
    sunlight: string;
    fertilizer: string;
    pruning: string;
  };
  issues?: string[];
  recommendations: string[];
}

export function PlantIdentification() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const { toast } = useToast();

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      console.log('Sending plant identification request...');
      const { data, error } = await supabase.functions.invoke('identify-plant', {
        body: formData
      });

      console.log('Plant identification response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to plant identification service. Please check your internet connection.",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        console.error('Plant identification error:', data.error);
        toast({
          title: "Identification Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data.plantName) {
        toast({
          title: "No Plant Identified",
          description: "Could not identify the plant in the image. Please try a clearer photo.",
          variant: "destructive",
        });
        return;
      }

      // Enhanced mapping with better care categorization and Plant.id data
      const careInstructions = data.careInstructions || "Follow general plant care guidelines";
      const mappedResult: PlantResult = {
        name: data.plantName,
        confidence: data.confidence,
        scientificName: data.scientificName,
        health: determineHealthStatus(data.confidence, data.healthStatus),
        care: {
          watering: extractWateringAdvice(careInstructions),
          sunlight: extractSunlightAdvice(careInstructions),
          fertilizer: extractFertilizerAdvice(careInstructions),
          pruning: extractPruningAdvice(careInstructions)
        },
        recommendations: generateSmartRecommendations(data.plantName, data.confidence, careInstructions)
      };

      setResult(mappedResult);
      
      // Save to database for user history
      await saveToHistory(data);
      
      toast({
        title: "Plant Identified!",
        description: `${mappedResult.name} identified with ${mappedResult.confidence}% confidence.`,
      });
    } catch (error) {
      // Plant analysis failed
      toast({
        title: "Analysis Failed",
        description: "An unexpected error occurred. Please try again with a clearer image.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions for better data extraction
  const determineHealthStatus = (confidence: number, healthStatus: string): PlantResult['health'] => {
    if (confidence > 80) return 'healthy';
    if (confidence > 60) return 'nutrient-deficiency';
    if (healthStatus?.toLowerCase().includes('low')) return 'nutrient-deficiency';
    return 'healthy';
  };

  const extractWateringAdvice = (instructions: string): string => {
    const waterKeywords = ['water', 'moisture', 'watering', 'irrigation'];
    const sentences = instructions.split('.').filter(s => 
      waterKeywords.some(keyword => s.toLowerCase().includes(keyword))
    );
    return sentences[0]?.trim() || "Water regularly based on soil moisture level";
  };

  const extractSunlightAdvice = (instructions: string): string => {
    const sunKeywords = ['sun', 'light', 'shade', 'sunlight'];
    const sentences = instructions.split('.').filter(s => 
      sunKeywords.some(keyword => s.toLowerCase().includes(keyword))
    );
    return sentences[0]?.trim() || "Provide appropriate sunlight based on plant type";
  };

  const extractFertilizerAdvice = (instructions: string): string => {
    const fertilizerKeywords = ['fertilizer', 'feed', 'nutrition', 'nutrients'];
    const sentences = instructions.split('.').filter(s => 
      fertilizerKeywords.some(keyword => s.toLowerCase().includes(keyword))
    );
    return sentences[0]?.trim() || "Use balanced fertilizer during growing season";
  };

  const extractPruningAdvice = (instructions: string): string => {
    const pruningKeywords = ['prune', 'trim', 'harvest', 'deadhead'];
    const sentences = instructions.split('.').filter(s => 
      pruningKeywords.some(keyword => s.toLowerCase().includes(keyword))
    );
    return sentences[0]?.trim() || "Prune dead or damaged parts as needed";
  };

  const generateSmartRecommendations = (plantName: string, confidence: number, instructions: string): string[] => {
    const recommendations = [];
    
    if (confidence < 70) {
      recommendations.push("Consider taking a clearer photo for better identification");
    }
    
    // Extract key recommendations from instructions
    const sentences = instructions.split('.').filter(s => s.trim().length > 10);
    recommendations.push(...sentences.slice(0, 3).map(s => s.trim()));
    
    // Add plant-specific tips
    const lowerName = plantName.toLowerCase();
    if (lowerName.includes('succulent') || lowerName.includes('cactus')) {
      recommendations.push("Allow soil to dry completely between waterings");
    } else if (lowerName.includes('herb')) {
      recommendations.push("Harvest regularly to encourage new growth");
    } else if (lowerName.includes('vegetable')) {
      recommendations.push("Monitor for pests during growing season");
    }
    
    return recommendations.filter(r => r.length > 5).slice(0, 5);
  };

  const saveToHistory = async (data: any) => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Skip saving if user is not authenticated
        return;
      }

      const { error } = await supabase
        .from('plant_identifications')
        .insert({
          user_id: user.id,
          plant_name: data.plantName,
          confidence_score: data.confidence,
          care_instructions: data.careInstructions,
          health_status: data.healthStatus,
        });
      
      if (error) {
        // Failed to save identification to history
      }
    } catch (err) {
      // Identification save failed
    }
  };

  const resetImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
  };

  const getHealthIcon = (health: PlantResult['health']) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'diseased':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'pest':
        return <Bug className="w-5 h-5 text-orange-500" />;
      case 'nutrient-deficiency':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getHealthColor = (health: PlantResult['health']) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'diseased':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pest':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'nutrient-deficiency':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Embedded Plant ID Tool */}
      <Card className="p-6">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Advanced Plant Identification</h2>
          </div>
          <p className="text-muted-foreground">
            Professional plant identification tool with detailed analysis
          </p>
        </div>
        
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src="https://g8h3ilcvqop7.manus.space/"
            className="w-full h-full border-0"
            title="Plant Identification Tool"
            allow="camera; microphone"
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Leaf className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Alternative Plant Identification</h2>
            </div>
            <p className="text-muted-foreground">
              Upload a photo of your plant for instant identification and care advice
            </p>
          </div>

        {/* Image Upload Area */}
        {!imagePreview ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Upload Plant Photo</h3>
                <p className="text-muted-foreground mb-4">
                  Take a clear photo of leaves, flowers, or the whole plant
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="farmer" asChild>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </label>
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: JPG, PNG, WebP (Max 10MB)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={imagePreview}
                alt="Plant to identify"
                className="w-full h-64 object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={resetImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Analysis Button */}
            {!result && (
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                variant="farmer"
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing Plant...
                  </>
                ) : (
                  <>
                    <Leaf className="w-4 h-4 mr-2" />
                    Identify Plant
                  </>
                )}
              </Button>
            )}

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={33} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  Analyzing plant characteristics...
                </p>
              </div>
            )}
          </div>
        )}

          {/* Results */}
          {result && (
            <div className="space-y-6 border-t pt-6">
              {/* Plant Identification */}
              <div className="text-center space-y-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {result.confidence}% Confidence
                </Badge>
                <h3 className="text-2xl font-bold text-primary">{result.name}</h3>
                {result.scientificName && (
                  <p className="text-muted-foreground italic">{result.scientificName}</p>
                )}
                
                {/* Health Status */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getHealthColor(result.health)}`}>
                  {getHealthIcon(result.health)}
                  <span className="font-medium capitalize">
                    {result.health.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Care Instructions */}
              <Tabs defaultValue="care" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="care">Care Guide</TabsTrigger>
                  <TabsTrigger value="recommendations">Tips</TabsTrigger>
                </TabsList>
                
                <TabsContent value="care" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex gap-3 p-3 rounded-lg bg-blue-50 border">
                      <Droplets className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Watering</h4>
                        <p className="text-sm text-blue-700">{result.care.watering}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 border">
                      <Sun className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-yellow-900">Sunlight</h4>
                        <p className="text-sm text-yellow-700">{result.care.sunlight}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 rounded-lg bg-green-50 border">
                      <Leaf className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-green-900">Fertilizer</h4>
                        <p className="text-sm text-green-700">{result.care.fertilizer}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-3">
                  {result.recommendations.map((tip, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <p className="text-sm">{tip}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              {/* New Analysis Button */}
              <Button
                onClick={resetImage}
                variant="outline"
                className="w-full"
              >
                Analyze Another Plant
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}