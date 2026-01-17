import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Trophy, Clock, Target, Zap, Star, Share2, RotateCcw } from "lucide-react";
import { GlowButton } from "../ui/GlowButton";

interface Score {
  base: number;
  speedBonus: number;
  efficiency: number;
  firstTry: number;
}

interface RoundResultProps {
  success: boolean;
  secretTopic: string;
  scores: Score;
  timeUsed: number;
  totalTime: number;
  guessAttempts: number;
  onContinue?: () => void;
  onRematch?: () => void;
}

export function RoundResult({
  success,
  secretTopic,
  scores,
  timeUsed,
  totalTime,
  guessAttempts,
  onContinue,
  onRematch,
}: RoundResultProps) {
  const [showScores, setShowScores] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const totalScore = scores.base + scores.speedBonus + scores.efficiency + scores.firstTry;

  useEffect(() => {
    const timer = setTimeout(() => setShowScores(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showScores) {
      let start = 0;
      const duration = 1500;
      const increment = totalScore / (duration / 16);
      
      const counter = setInterval(() => {
        start += increment;
        if (start >= totalScore) {
          setAnimatedTotal(totalScore);
          clearInterval(counter);
        } else {
          setAnimatedTotal(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(counter);
    }
  }, [showScores, totalScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-8">
      {/* Big Reveal Animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 10, stiffness: 100 }}
        className="text-center"
      >
        {/* Success/Fail Banner */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`
            inline-block px-8 py-3 rounded-lg font-mono text-xl font-bold uppercase tracking-widest mb-6
            ${success 
              ? 'bg-success/20 text-success border-2 border-success shadow-[0_0_30px_hsl(160_100%_40%/0.3)]' 
              : 'bg-destructive/20 text-destructive border-2 border-destructive shadow-[0_0_30px_hsl(0_85%_55%/0.3)]'
            }
          `}
        >
          {success ? '🎯 MISSION ACCOMPLISHED' : '❌ MISSION FAILED'}
        </motion.div>

        {/* Secret Topic Reveal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <p className="font-mono text-sm text-muted-foreground mb-2">THE SECRET TOPIC WAS:</p>
          <motion.h1
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, type: "spring" }}
            className="text-4xl md:text-5xl font-bold text-primary text-glow-cyan"
          >
            {secretTopic}
          </motion.h1>
        </motion.div>
      </motion.div>

      {/* Score Breakdown */}
      <AnimatePresence>
        {showScores && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-card border border-border rounded-xl p-6"
          >
            <h3 className="font-mono text-lg font-bold text-center mb-4 text-muted-foreground">
              SCORE BREAKDOWN
            </h3>

            <div className="space-y-3">
              {[
                { label: "Base Score", value: scores.base, icon: Target, delay: 0 },
                { label: "Speed Bonus", value: scores.speedBonus, icon: Clock, delay: 0.1 },
                { label: "Efficiency", value: scores.efficiency, icon: Zap, delay: 0.2 },
                { label: "First Try Bonus", value: scores.firstTry, icon: Star, delay: 0.3 },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: item.delay }}
                  className="flex items-center justify-between py-2 border-b border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-sm text-foreground">{item.label}</span>
                  </div>
                  <span className={`font-mono font-bold ${item.value > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                    +{item.value}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Total Score */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="mt-6 pt-4 border-t-2 border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg">TOTAL</span>
                <motion.span
                  className="font-mono font-bold text-3xl text-primary text-glow-cyan"
                >
                  {animatedTotal}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Stats */}
      <AnimatePresence>
        {showScores && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-8 text-center"
          >
            <div>
              <p className="font-mono text-xs text-muted-foreground">TIME USED</p>
              <p className="font-mono text-xl font-bold text-foreground">
                {Math.floor(timeUsed / 60)}:{(timeUsed % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">GUESSES</p>
              <p className="font-mono text-xl font-bold text-foreground">{guessAttempts}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">RANK TODAY</p>
              <p className="font-mono text-xl font-bold text-accent">#47</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <AnimatePresence>
        {showScores && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-wrap gap-4 justify-center mt-4"
          >
            <GlowButton onClick={onContinue} variant="primary" pulse icon={<Trophy className="w-4 h-4" />}>
              Continue Mission
            </GlowButton>
            <GlowButton onClick={onRematch} variant="secondary" icon={<RotateCcw className="w-4 h-4" />}>
              Rematch
            </GlowButton>
            <GlowButton variant="secondary" icon={<Share2 className="w-4 h-4" />}>
              Share
            </GlowButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
