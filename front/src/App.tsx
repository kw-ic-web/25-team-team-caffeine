import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import { WalkingCat } from "./components/WalkingCat";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Goals from "./pages/Goals";
import Calendar from "./pages/Calendar";
import Pets from "./pages/Pets";
import Community from "./pages/Community";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import GoalsArchive from "./pages/GoalsArchive";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

export default App;
