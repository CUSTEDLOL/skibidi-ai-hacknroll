import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { joinRandomPublicLobby, joinLobby } from "@/lib/api";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleQuickJoin = async (playerName: string) => {
    setIsSearching(true);
    try {
      const result = await joinRandomPublicLobby({ playerName });
      // Store userId and playerName in localStorage for this session
      localStorage.setItem("player_id", result.userId);
      localStorage.setItem("player_username", result.playerName);
      navigate(`/lobby/${result.lobbyCode}`);
    } catch (error) {
      console.error("Failed to join random lobby:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join lobby",
      );
      setIsSearching(false);
    }
  };

  const handleJoinWithCode = async (code: string, playerName: string) => {
    try {
      const result = await joinLobby(code, { playerName });
      // Store userId and playerName in localStorage for this session
      localStorage.setItem("player_id", result.userId);
      localStorage.setItem("player_username", result.playerName);
      navigate(`/lobby/${code}`);
    } catch (error) {
      console.error("Failed to join lobby:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join lobby",
      );
    }
  };

  const handleCreateRoom = (playerName: string) => {
     // Store name before navigating
     localStorage.setItem("player_username", playerName);
     navigate("/create-room");
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />
      <HomeScreen
        onQuickJoin={handleQuickJoin}
        onCreateRoom={handleCreateRoom}
        onJoinWithCode={handleJoinWithCode}
        onHowToPlay={() => setShowHowToPlay(true)}
        isSearching={isSearching}
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </div>
  );
};

export default Index;
