import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { GameConfigScreen } from "@/components/screens/GameConfigScreen";
import { RoleSelectionScreen } from "@/components/screens/RoleSelectionScreen";
import { SearcherScreen } from "@/components/screens/SearcherScreen";
import { GuesserScreen } from "@/components/screens/GuesserScreen";
import { HowToPlayModal } from "@/components/screens/HowToPlayModal";
import { TopicReveal } from "@/components/game/TopicReveal";
import { RoundResult } from "@/components/game/RoundResult";
import { GameConfig, DEFAULT_CONFIG } from "@/lib/gameConfig";

type GameScreen = "home" | "game-config" | "role-select" | "topic-reveal" | "searcher" | "guesser" | "results";

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("home");
  const [selectedRole, setSelectedRole] = useState<"searcher" | "guesser" | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  // Demo data
  const demoTopic = "Moon Landing";
  const demoForbiddenWords = ["moon", "apollo", "armstrong", "nasa", "space"];

  const handleStartGame = () => {
    setCurrentScreen("game-config");
  };

  const handleConfigContinue = (config: GameConfig) => {
    setGameConfig(config);
    setCurrentScreen("role-select");
  };

  const handleRoleSelect = (role: "searcher" | "guesser" | "random") => {
    // Resolve random role
    if (role === "random") {
      const actualRole = Math.random() < 0.5 ? "searcher" : "guesser";
      setSelectedRole(actualRole);
    } else {
      setSelectedRole(role);
    }
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
    setGameConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="min-h-screen scanlines">
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

        {currentScreen === "game-config" && (
          <motion.div
            key="game-config"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <GameConfigScreen
              onBack={() => setCurrentScreen("home")}
              onContinue={handleConfigContinue}
              initialConfig={gameConfig}
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
              onBack={() => setCurrentScreen("game-config")}
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
              totalRounds={gameConfig.rounds === 'endless' ? 999 : gameConfig.rounds}
              searchesRemaining={3}
              rhythmMode={gameConfig.rhythmMode}
              bpm={gameConfig.bpm}
              timeLimit={gameConfig.timePerRound}
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
              totalRounds={gameConfig.rounds === 'endless' ? 999 : gameConfig.rounds}
              guessesRemaining={5}
              rhythmMode={gameConfig.rhythmMode}
              bpm={gameConfig.bpm}
              timeLimit={gameConfig.timePerRound}
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
