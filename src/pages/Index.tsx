import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { getOrCreatePlayerId, generateLobbyCode } from "@/lib/playerUtils";

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleQuickJoin = () => {
    setIsSearching(true);
    getOrCreatePlayerId();
    setTimeout(() => {
      const code = generateLobbyCode();
      navigate(`/lobby/${code}`);
    }, 2000);
  };

  const handleJoinWithCode = (code: string) => {
    getOrCreatePlayerId();
    navigate(`/lobby/${code}`);
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
