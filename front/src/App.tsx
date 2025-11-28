import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation.tsx";
import { WalkingCat } from "./components/WalkingCat.tsx";
import Home from "./pages/Home.tsx";
import Auth from "./pages/Auth.tsx";
import Goals from "./pages/Goals.tsx";
import Calendar from "./pages/Calendar.tsx";
import Pets from "./pages/Pets.tsx";
import Community from "./pages/Community.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import NotFound from "./pages/NotFound.tsx";
import GoalsArchive from "./pages/GoalsArchive.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import { PetProvider } from "@/contexts/PetContext.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <WalkingCat />
            <Navigation />
            <div className="pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/pets" element={<Pets />} />
                <Route path="/community" element={<Community />} />
                <Route path="/chat/:roomId" element={<ChatRoom />} />
                <Route path="/goals/archive" element={<GoalsArchive />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </PetProvider> 
  </QueryClientProvider>
);

export default App;
