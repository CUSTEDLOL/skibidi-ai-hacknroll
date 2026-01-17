import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { RoundResult as RoundResultComponent } from "@/components/game/RoundResult";

const RoundResult = () => {
  const navigate = useNavigate();

  // Demo data - in real app this would come from game state
  const success = true;
  const secretTopic = "Moon Landing";
  const scores = {
    base: 100,
    speedBonus: 50,
    efficiency: 25,
    firstTry: 100,
  };

  const handleContinue = () => {
    // Check if more rounds left
    // For demo, go to final results
    navigate("/game/final-results");
  };

  const handleRematch = () => {
    navigate("/select-role");
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center px-4 pt-20"
      >
        <RoundResultComponent
          success={success}
          secretTopic={secretTopic}
          scores={scores}
          timeUsed={85}
          totalTime={120}
          guessAttempts={2}
          onContinue={handleContinue}
          onRematch={handleRematch}
        />
      </motion.div>
    </div>
  );
};

export default RoundResult;
