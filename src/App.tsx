import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";
import { LanguageSelectionPage } from "./pages/LanguageSelection";
import { VoiceChatPage } from "./pages/VoiceChat";
import SmartCropRecommender from "./pages/SmartCropRecommender";
import AutomatedFarmScheduling from "./pages/AutomatedFarmScheduling";
import FarmerLearningAgent from "./pages/FarmerLearningAgent";
import { AuthRedirect } from "./components/AuthRedirect";
import { ChatInterface } from "./components/ChatInterface";
import { PlantIdentification } from "./components/PlantIdentification";
import { PlantDiseaseIdentification } from "./components/PlantDiseaseIdentification";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/language-selection" element={<LanguageSelectionPage />} />
            <Route path="/voice-chat" element={<VoiceChatPage />} />
            <Route path="/" element={<AuthRedirect />} />
            
            {/* Authentication required routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            } />
            
            {/* Main App Layout with Sidebar */}
            <Route path="/*" element={
              <ProtectedRoute requiresProfileSetup>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">AI-Powered Farm Assistant</h1>
                      </header>
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/chat" element={
                            <div className="container mx-auto p-6">
                              <ChatInterface />
                            </div>
                          } />
                          <Route path="/identify" element={
                            <div className="container mx-auto p-6">
                              <PlantIdentification />
                            </div>
                          } />
                          <Route path="/disease-identification" element={
                            <div className="container mx-auto p-6">
                              <PlantDiseaseIdentification />
                            </div>
                          } />
                          <Route path="/smart-crop-recommender" element={<SmartCropRecommender />} />
                          <Route path="/automated-farm-scheduling" element={<AutomatedFarmScheduling />} />
                          <Route path="/farmer-learning-agent" element={<FarmerLearningAgent />} />
                          <Route path="/community" element={<Community />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/calendar" element={<Calendar />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/" element={<Dashboard />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
