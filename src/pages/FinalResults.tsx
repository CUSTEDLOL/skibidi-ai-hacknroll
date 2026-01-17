import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Trophy, Star, Clock, Target, RotateCcw, BarChart3 } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";

const FinalResults = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Demo data
  const finalScore = 850;
  const roundsCompleted = 5;
  const totalRounds = 5;
  const correctGuesses = 4;
  const averageTime = "1:23";
  const globalRank = 47;

  const achievements = [
    { icon: <Star className="w-5 h-5" />, name: "Speed Demon", description: "Completed 3 rounds under 1 minute" },
    { icon: <Target className="w-5 h-5" />, name: "First Try Expert", description: "Guessed correctly on first attempt twice" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showContent) {
      const duration = 2000;
      const steps = 60;
      const increment = finalScore / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= finalScore) {
          setAnimatedScore(finalScore);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [showContent, finalScore]);

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          {/* Trophy Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="inline-block mb-4"
            >
              <Trophy className="w-16 h-16 text-accent" />
            </motion.div>
            <h1 className="font-mono text-3xl font-bold text-foreground mb-2">
              CASE CLOSED
            </h1>
            <ClassifiedStamp type="classified" className="inline-block" animate={true} />
          </motion.div>

          {/* Main Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-6 mb-6"
          >
            <div className="text-center mb-6">
              <p className="font-mono text-xs text-muted-foreground mb-2">FINAL SCORE</p>
              <motion.div
                className="text-5xl font-bold text-primary text-glow-cyan font-mono"
              >
                {animatedScore}
              </motion.div>
              <p className="font-mono text-xs text-muted-foreground mt-1">points</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground">{roundsCompleted}/{totalRounds}</p>
                <p className="font-mono text-xs text-muted-foreground">Rounds</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <Star className="w-5 h-5 text-accent mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground">{correctGuesses}</p>
                <p className="font-mono text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground">{averageTime}</p>
                <p className="font-mono text-xs text-muted-foreground">Avg Time</p>
              </div>
            </div>

            {/* Global Rank */}
            <div className="text-center p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="font-mono text-sm text-accent">
                You ranked <span className="font-bold">#{globalRank}</span> globally today
              </p>
            </div>
          </motion.div>

          {/* Achievements */}
          {showContent && achievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card border border-border rounded-lg p-4 mb-6"
            >
              <h3 className="font-mono text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                ACHIEVEMENTS UNLOCKED
              </h3>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.15 }}
                    className="flex items-center gap-3 p-2 bg-accent/10 rounded-lg"
                  >
                    <div className="text-accent">{achievement.icon}</div>
                    <div>
                      <p className="font-mono text-sm font-bold text-foreground">{achievement.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex gap-4"
          >
            <GlowButton
              onClick={() => navigate("/select-role")}
              variant="primary"
              size="lg"
              icon={<RotateCcw className="w-4 h-4" />}
              className="flex-1"
            >
              Play Again
            </GlowButton>
            <GlowButton
              onClick={() => navigate("/")}
              variant="secondary"
              size="lg"
              icon={<BarChart3 className="w-4 h-4" />}
              className="flex-1"
            >
              Leaderboard
            </GlowButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default FinalResults;
