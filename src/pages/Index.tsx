import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { getOrCreatePlayerId } from "@/lib/playerUtils";
import { joinRandomPublicLobby, joinLobby } from "@/lib/api";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleQuickJoin = async () => {
    setIsSearching(true);
    try {
      const playerId = getOrCreatePlayerId();
      const result = await joinRandomPublicLobby({
        playerName: playerId,
        userId: playerId,
      });
      navigate(`/lobby/${result.lobbyCode}`);
    } catch (error: any) {
      console.error("Failed to join random lobby:", error);
      toast.error(error.message || "Failed to join lobby");
      setIsSearching(false);
    }
  };

  const handleJoinWithCode = async (code: string) => {
    try {
      const playerId = getOrCreatePlayerId();
      await joinLobby(code, {
        playerName: playerId,
        userId: playerId,
      });
      navigate(`/lobby/${code}`);
    } catch (error: any) {
      console.error("Failed to join lobby:", error);
      toast.error(error.message || "Failed to join lobby");
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
        onDailyChallenge={() => {}}
        onLeaderboard={() => {}}
        isSearching={isSearching}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
};

export default Index;
