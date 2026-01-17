import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />
      
      <HomeScreen
        onStartGame={() => navigate("/select-role")}
        onHowToPlay={() => setShowHowToPlay(true)}
      />

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </div>
  );
};

export default Index;
