import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { api, ApiError } from "@/lib/api";
import { getOrCreateUserId, getOrCreatePlayerName, setCurrentLobby } from "@/lib/userUtils";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleQuickJoin = async () => {
    setIsSearching(true);
    
    try {
      const userId = getOrCreateUserId();
      const playerName = getOrCreatePlayerName();
      
      const response = await api.joinRandomPublicLobby({
        playerName,
        userId,
      });
      
      setCurrentLobby(response.lobbyId, response.lobbyCode);
      toast.success(response.message || "Joined lobby!");
      navigate(`/lobby/${response.lobbyCode}`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to find a game. Please try again.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinWithCode = async (code: string) => {
    try {
      const userId = getOrCreateUserId();
      const playerName = getOrCreatePlayerName();
      
      const response = await api.joinLobby(code, {
        playerName,
        userId,
      });
      
      setCurrentLobby(response.lobbyId, code);
      toast.success(response.message || "Joined lobby!");
      navigate(`/lobby/${code}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          toast.error("Lobby not found. Check the code and try again.");
        } else if (error.status === 400) {
          toast.error(error.message || "Cannot join lobby");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to join lobby. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />
      <HomeScreen
        onQuickJoin={handleQuickJoin}
        onCreateRoom={() => navigate("/create-room")}
        onJoinWithCode={handleJoinWithCode}
        onHowToPlay={() => setShowHowToPlay(true)}
        onDailyChallenge={() => toast.info("Daily Challenge coming soon!")}
        onLeaderboard={() => toast.info("Leaderboard coming soon!")}
        isSearching={isSearching}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
};

export default Index;
