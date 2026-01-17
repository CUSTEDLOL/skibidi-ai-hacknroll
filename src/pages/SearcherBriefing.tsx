import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { TopicReveal } from "@/components/game/TopicReveal";

const SearcherBriefing = () => {
  const navigate = useNavigate();

  // Demo data - in real app this would come from game state/context
  const topic = "Moon Landing";
  const forbiddenWords = ["moon", "apollo", "armstrong", "nasa", "space"];

  const handleReady = () => {
    navigate("/game/searcher-active");
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center px-4 pt-20"
      >
        <TopicReveal
          topic={topic}
          forbiddenWords={forbiddenWords}
          onReady={handleReady}
        />
      </motion.div>
    </div>
  );
};

export default SearcherBriefing;
