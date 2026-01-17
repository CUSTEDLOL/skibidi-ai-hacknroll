import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { RoleSelectionScreen } from "@/components/screens/RoleSelectionScreen";
import { SearcherScreen } from "@/components/screens/SearcherScreen";
import { GuesserScreen } from "@/components/screens/GuesserScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { TopicReveal } from "@/components/game/TopicReveal";
import { RoundResult } from "@/components/game/RoundResult";

type GameScreen = "home" | "role-select" | "topic-reveal" | "searcher" | "guesser" | "results";

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("home");
  const [selectedRole, setSelectedRole] = useState<"searcher" | "guesser" | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Demo data
  const demoTopic = "Moon Landing";
  const demoForbiddenWords = ["moon", "apollo", "armstrong", "nasa", "space"];

  const handleStartGame = () => {
    setCurrentScreen("role-select");
  };

  const handleRoleSelect = (role: "searcher" | "guesser") => {
    setSelectedRole(role);
    setCurrentScreen("topic-reveal");
  };

  const handleTopicReady = () => {
    if (selectedRole === "searcher") {
      setCurrentScreen("searcher");
    } else {
      setCurrentScreen("guesser");
    }
  };

  const handleSubmitSearch = () => {
    // In a real app, this would send results to the guesser
    setCurrentScreen("results");
  };

  const handleGuess = (guess: string) => {
    // Check if guess is correct
    if (guess.toLowerCase() === demoTopic.toLowerCase()) {
      setCurrentScreen("results");
    }
  };

  const handleContinue = () => {
    setCurrentScreen("home");
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen scanlines crt-flicker">
      <Background />
      <Header />
      
      <AnimatePresence mode="wait">
        {currentScreen === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <HomeScreen
              onStartGame={handleStartGame}
              onHowToPlay={() => setShowHowToPlay(true)}
            />
          </motion.div>
        )}

        {currentScreen === "role-select" && (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <RoleSelectionScreen
              onBack={() => setCurrentScreen("home")}
              onContinue={handleRoleSelect}
            />
          </motion.div>
        )}

        {currentScreen === "topic-reveal" && (
          <motion.div
            key="topic-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4 pt-20"
          >
            <TopicReveal
              topic={demoTopic}
              forbiddenWords={demoForbiddenWords}
              onReady={handleTopicReady}
            />
          </motion.div>
        )}

        {currentScreen === "searcher" && (
          <motion.div
            key="searcher"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <SearcherScreen
              secretTopic={demoTopic}
              forbiddenWords={demoForbiddenWords}
              round={2}
              totalRounds={5}
              searchesRemaining={3}
              onSubmit={handleSubmitSearch}
            />
          </motion.div>
        )}

        {currentScreen === "guesser" && (
          <motion.div
            key="guesser"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <GuesserScreen
              round={2}
              totalRounds={5}
              guessesRemaining={5}
              onGuess={handleGuess}
            />
          </motion.div>
        )}

        {currentScreen === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4 pt-20"
          >
            <RoundResult
              success={true}
              secretTopic={demoTopic}
              scores={{
                base: 100,
                speedBonus: 50,
                efficiency: 25,
                firstTry: 100,
              }}
              timeUsed={85}
              totalTime={120}
              guessAttempts={2}
              onContinue={handleContinue}
              onRematch={() => setCurrentScreen("role-select")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </div>
  );
};

export default Index;
