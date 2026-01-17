import { motion } from "framer-motion";
import { Play, Users, HelpCircle, Calendar, Trophy, Sparkles } from "lucide-react";
import { GlowButton } from "../ui/GlowButton";
import { AnimatedGlitchText } from "../ui/GlitchText";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

interface HomeScreenProps {
  onStartGame?: () => void;
  onJoinGame?: () => void;
  onHowToPlay?: () => void;
  onDailyChallenge?: () => void;
  onLeaderboard?: () => void;
}

export function HomeScreen({
  onStartGame,
  onJoinGame,
  onHowToPlay,
  onDailyChallenge,
  onLeaderboard,
}: HomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Main Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <ClassifiedStamp type="top-secret" className="mb-4" />
        <AnimatedGlitchText text="REDACTED" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 font-mono text-lg text-muted-foreground max-w-md mx-auto"
        >
          Can you decode the internet?
        </motion.p>
      </motion.div>

      {/* Main Menu */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        {/* Primary CTA */}
        <GlowButton 
          onClick={onStartGame} 
          variant="primary" 
          size="lg" 
          pulse 
          icon={<Play className="w-5 h-5" />}
          className="w-full"
        >
          Start New Game
        </GlowButton>

        {/* Join Game */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Enter room code..."
            className="flex-1 px-4 py-3 bg-card border-2 border-border rounded-lg font-mono text-sm 
              focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
          />
          <GlowButton onClick={onJoinGame} variant="secondary" icon={<Users className="w-4 h-4" />}>
            Join
          </GlowButton>
        </motion.div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.button
            onClick={onHowToPlay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-lg
              hover:border-primary/30 transition-all group"
          >
            <HelpCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              How to Play
            </span>
          </motion.button>

          <motion.button
            onClick={onDailyChallenge}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex flex-col items-center gap-2 p-4 bg-card border border-accent/30 rounded-lg
              hover:border-accent/60 transition-all group overflow-hidden"
          >
            {/* Badge */}
            <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-accent text-accent-foreground font-mono text-[10px] font-bold rounded-bl-lg">
              NEW
            </div>
            <Calendar className="w-6 h-6 text-accent" />
            <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Daily Challenge
            </span>
          </motion.button>
        </div>

        {/* Leaderboard */}
        <motion.button
          onClick={onLeaderboard}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.01 }}
          className="flex items-center justify-center gap-3 p-3 bg-transparent border border-border/50 rounded-lg
            hover:border-primary/30 hover:bg-card/50 transition-all group mt-2"
        >
          <Trophy className="w-5 h-5 text-accent" />
          <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            View Leaderboard
          </span>
        </motion.button>
      </motion.div>

      {/* Bottom decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-0 right-0 flex justify-center"
      >
        <div className="flex items-center gap-2 text-muted-foreground/50 font-mono text-xs">
          <Sparkles className="w-3 h-3" />
          <span>A game of clues and deception</span>
          <Sparkles className="w-3 h-3" />
        </div>
      </motion.div>
    </div>
  );
}
