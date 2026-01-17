import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateRoom from "./pages/CreateRoom";
import Lobby from "./pages/Lobby";
import AssignRoles from "./pages/AssignRoles";
import SearcherBriefing from "./pages/SearcherBriefing";
import SearcherActive from "./pages/SearcherActive";
import GuesserActive from "./pages/GuesserActive";
import RoundResult from "./pages/RoundResult";
import FinalResults from "./pages/FinalResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/lobby/:code" element={<Lobby />} />
          <Route path="/lobby/:code/assign-roles" element={<AssignRoles />} />
          <Route path="/game/searcher-briefing" element={<SearcherBriefing />} />
          <Route path="/game/searcher-active" element={<SearcherActive />} />
          <Route path="/game/guesser-active" element={<GuesserActive />} />
          <Route path="/game/round-result" element={<RoundResult />} />
          <Route path="/game/final-results" element={<FinalResults />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
