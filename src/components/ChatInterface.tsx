import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, User, Bot, Loader2, Sparkles, Lightbulb, Leaf, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import useVoiceCommands from '@/hooks/useVoiceCommands';
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SettingsComponent } from "@/components/Settings";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'image';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Voice commands hook
  const voiceCommands = useVoiceCommands({
    onTranscript: (transcript) => {
      setInputMessage(transcript);
    },
    onCommand: (command) => {
      if (command === 'action:help') {
        setInputMessage('What can you help me with?');
      }
    },
    continuous: false,
    language: profile?.preferred_language === 'hindi' ? 'hi-IN' : 'en-US'
  });

  // Initial welcome message
  useEffect(() => {
    const userName = profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : '';
    const locationInfo = profile?.district && profile?.state ? ` from ${profile.district}, ${profile.state}` : '';
    const cropInfo = profile?.crop_types?.length ? ` I see you grow ${profile.crop_types.join(', ')}.` : '';
    
    const welcomeMessage: Message = {
      id: '1',
      content: `🌱 Welcome to your **AI Farm Assistant**${userName}!${locationInfo ? ` I see you're${locationInfo}.` : ''}${cropInfo}

I'm your personalized agricultural assistant, ready to help with:

🌾 **Crop Management** - Planting, growing, and harvesting advice specific to your ${profile?.crop_types?.join(', ') || 'crops'}
🦠 **Disease & Pest Control** - Identify and treat plant issues in your ${profile?.region_type || 'region'}
🌡️ **Weather & Climate** - Local seasonal planning and adaptation
🌿 **Sustainable Practices** - Eco-friendly farming methods for ${profile?.soil_type || 'your soil type'}
💰 **Market Insights** - Current pricing and market trends

I can provide advice specific to your location, crops, and farming conditions. What agricultural challenge can I help you solve today?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
  }, [profile]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Create a unique loading message ID
    const loadingId = `loading-${Date.now()}`;

    try {
      // Get API key and model from localStorage
      const openRouterKey = localStorage.getItem("openRouterKey");
      const selectedModel = localStorage.getItem("selectedModel") || "meta-llama/llama-3.2-3b-instruct:free";
      
      console.log('🚀 Starting robust chat request...', { 
        hasApiKey: !!openRouterKey, 
        model: selectedModel,
        messagePreview: currentMessage.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      
      if (!openRouterKey || openRouterKey.trim() === "") {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "🔑 **API Key Required**\n\nPlease configure your OpenRouter API key to start chatting with the AI.\n\n**Steps:**\n1. Click the Settings button (⚙️) in the chat header\n2. Enter your OpenRouter API key\n3. Save and fetch models\n4. Select a model and start chatting!",
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Show enhanced loading state
      const loadingMessage: Message = {
        id: loadingId,
        content: '🤖 **Processing your request...**\n\n⚡ Connecting to AI farm expert\n🧠 Analyzing your agricultural question\n📊 Preparing comprehensive response',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Enhanced retry logic with exponential backoff
      let lastError: Error | null = null;
      let response = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt}/3: Calling chat-with-ai function...`);
          
          // Update loading message for retry attempts
          if (attempt > 1) {
            setMessages(prev => prev.map(msg => 
              msg.id === loadingId 
                ? { ...msg, content: `🔄 **Retry Attempt ${attempt}/3**\n\n⚡ Reconnecting to AI service\n🧠 Processing your question\n📊 Please wait a moment...` }
                : msg
            ));
          }

          // Create timeout promise for the entire operation
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout - Please try again')), 30000);
          });

          // Race between supabase call and timeout
          const callPromise = supabase.functions.invoke('chat-with-ai', {
            body: {
              message: currentMessage,
              model: selectedModel,
              apiKey: openRouterKey,
              userContext: profile ? {
                location: profile.location,
                district: profile.district,
                state: profile.state,
                crop_types: profile.crop_types,
                soil_type: profile.soil_type,
                region_type: profile.region_type,
                preferred_language: profile.preferred_language,
                role: profile.role
              } : null
            }
          });

          const result = await Promise.race([callPromise, timeoutPromise]);
          response = result as any;
          
          console.log(`✅ Attempt ${attempt} successful:`, { 
            hasData: !!response.data, 
            hasError: !!response.error,
            timestamp: new Date().toISOString()
          });
          
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Attempt ${attempt} failed:`, error);
          
          if (attempt < 3) {
            // Exponential backoff: wait 1s, then 2s, then 4s
            const waitTime = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));

      // Handle the response or final error
      if (!response) {
        throw lastError || new Error('All retry attempts failed');
      }

      const { data, error } = response;

      if (error) {
        console.error('💥 Supabase function error:', error);
        throw new Error(error.message || 'Failed to get AI response');
      }

      if (!data) {
        throw new Error('No response data received from AI service');
      }

      // Handle user-friendly error messages from the API
      if (data.userMessage) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.userMessage,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      if (!data.response || data.response.trim() === '') {
        throw new Error('Empty response received from AI service');
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      console.log('🎉 Successfully added AI response:', {
        responseLength: data.response.length,
        model: data.model,
        timestamp: new Date().toISOString()
      });
      
      setMessages(prev => [...prev, botResponse]);
      
      // Show success toast for good responses
      if (data.response.length > 100) {
        toast({
          title: "✅ Response Generated",
          description: "Got expert agricultural advice from your AI assistant!",
        });
      }

    } catch (error) {
      console.error('💥 Critical chat error:', error);
      
      // Remove any loading messages
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      
      // Determine error type and provide specific guidance
      let errorTitle = "Chat Error";
      let errorDescription = "An unexpected error occurred";
      let errorContent = "";

      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
          errorTitle = "⏱️ Timeout Error";
          errorDescription = "The request took too long to complete";
          errorContent = `🕐 **Connection Timeout**\n\nThe AI service is taking longer than expected to respond.\n\n**What to try:**\n1. ✅ Check your internet connection\n2. 🔄 Try asking a simpler question\n3. ⚙️ Switch to a faster AI model in Settings\n4. 🔄 Try again in a few moments\n\n*The service may be experiencing high demand.*`;
        } else if (error.message.includes('API key') || error.message.includes('401')) {
          errorTitle = "🔑 API Key Error";
          errorDescription = "Authentication failed";
          errorContent = `🔑 **Authentication Problem**\n\n${error.message}\n\n**Solutions:**\n1. ⚙️ Check your API key in Settings\n2. 🆕 Generate a new API key if needed\n3. 💳 Verify your OpenRouter account has credits\n4. 🔄 Try saving your API key again`;
        } else if (error.message.includes('credits') || error.message.includes('402')) {
          errorTitle = "💳 Credits Error";
          errorDescription = "Insufficient account credits";
          errorContent = `💳 **Insufficient Credits**\n\nYour OpenRouter account is out of credits.\n\n**Solutions:**\n1. 💰 Add credits to your OpenRouter account\n2. 🆓 Switch to a free model\n3. ⏳ Wait for free tier reset\n4. 📞 Contact OpenRouter support`;
        } else {
          errorContent = `🚨 **System Error**\n\n${error.message}\n\n**Troubleshooting:**\n1. 🌐 Check your internet connection\n2. ⚙️ Verify your API key in Settings\n3. 🔄 Try a different AI model\n4. ⏳ Wait a moment and try again\n5. 📞 Contact support if issue persists`;
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Show error toast
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    voiceCommands.toggleListening();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[700px] flex flex-col bg-gradient-to-br from-background via-background to-muted/20 rounded-xl border shadow-xl">
      {/* Enhanced Chat Header */}
      <div className="p-6 border-b bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              AI Farm Assistant Pro
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              Your intelligent agricultural companion
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Chat Settings</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto">
                  <SettingsComponent />
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              AI Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white ml-auto'
                    : 'bg-white border border-gray-100 shadow-md'
                }`}
              >
                <div className={`prose prose-sm max-w-none ${
                  message.sender === 'user' 
                    ? 'prose-invert text-white' 
                    : 'prose-slate'
                }`}>
                  <ReactMarkdown
                    components={{
                      // Enhanced paragraph rendering
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm">{children}</p>,
                      
                      // Enhanced text formatting
                      strong: ({ children }) => <strong className="font-bold text-emerald-700">{children}</strong>,
                      em: ({ children }) => <em className="italic text-emerald-600">{children}</em>,
                      
                      // Enhanced lists
                      ul: ({ children }) => <ul className="my-3 ml-4 space-y-2 list-disc marker:text-emerald-500">{children}</ul>,
                      ol: ({ children }) => <ol className="my-3 ml-4 space-y-2 list-decimal marker:text-emerald-500">{children}</ol>,
                      li: ({ children }) => <li className="text-sm leading-relaxed pl-2">{children}</li>,
                      
                      // Enhanced headings with icons
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-3 text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-2">
                          <span className="text-emerald-600">🌾</span>{children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-3 text-emerald-700 flex items-center gap-2">
                          <span className="text-emerald-500">📋</span>{children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mb-2 text-emerald-600 flex items-center gap-2">
                          <span className="text-emerald-400">▶</span>{children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>{children}
                        </h4>
                      ),
                      
                      // Enhanced blockquotes
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-emerald-300 pl-4 py-2 my-3 bg-emerald-50 italic text-emerald-800 rounded-r-lg">
                          <span className="text-emerald-600 text-lg mr-2">💡</span>
                          {children}
                        </blockquote>
                      ),
                      
                      // COMPLETELY REDESIGNED TABLE RENDERING
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-lg border border-emerald-200 shadow-sm">
                          <table className="min-w-full bg-white">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider border-r border-emerald-400 last:border-r-0">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-6 py-4 text-sm text-gray-700 border-b border-gray-100 border-r border-gray-200 last:border-r-0">
                          {children}
                        </td>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-emerald-50 transition-colors duration-150">
                          {children}
                        </tr>
                      ),
                      
                      // Enhanced code blocks
                      code: ({ children }) => (
                        <code className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-mono border">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm border border-gray-200">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.sender === 'user' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-md">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-sm text-gray-600">Analyzing your question...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ENHANCED FARMER-FRIENDLY INPUT AREA */}
      <div className="p-6 border-t bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 rounded-b-xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              placeholder="🌾 Ask me anything about farming: diseases, planting, soil health, weather, market prices..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={3}
              className="min-h-[80px] resize-none rounded-xl border-2 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 text-base p-4 bg-white/80 backdrop-blur-sm"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-white/90 text-emerald-700 border-emerald-200">
                <Lightbulb className="w-3 h-3 mr-1" />
                Farmer Tips
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleVoiceInput}
              variant={voiceCommands.isListening ? "destructive" : "outline"}
              size="lg"
              disabled={isLoading || !voiceCommands.isSupported}
              className="h-[60px] w-[60px] rounded-xl shadow-sm border-2 border-emerald-200 hover:border-emerald-300"
              title={voiceCommands.isSupported ? "🎤 Speak your farming question" : "Voice input not supported"}
            >
              {voiceCommands.isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            {voiceCommands.isListening && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="lg"
              className="h-[60px] w-[60px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg border-0 disabled:opacity-50"
              title="🚀 Send your farming question"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* FARMER-FRIENDLY QUICK TIPS */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            variant="secondary" 
            className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("What crops grow best in my soil type?")}
          >
            🌱 Crop Selection
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-blue-100 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("How do I identify plant diseases?")}
            style={{ animationDelay: '0.1s' }}
          >
            🦠 Disease Help
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-orange-100 text-orange-700 border-orange-200 cursor-pointer hover:bg-orange-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("What are current market prices?")}
            style={{ animationDelay: '0.2s' }}
          >
            💰 Market Prices
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-purple-100 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("Weather forecast for farming")}
            style={{ animationDelay: '0.3s' }}
          >
            🌤️ Weather Info
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("Best fertilizers for my crops")}
            style={{ animationDelay: '0.4s' }}
          >
            🌿 Fertilizers
          </Badge>
        </div>
        
        {/* HELPFUL INSTRUCTIONS */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Press Enter to send
            </span>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Voice input available
            </span>
          </span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            AI Model: {localStorage.getItem("selectedModel")?.split("/")[1]?.split(":")[0] || "deepseek"}
          </span>
        </div>
      </div>
    </div>
  );
}