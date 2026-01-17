import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Home, KeyRound, HelpCircle, Calendar, Trophy, Sparkles, X, Loader2, User } from "lucide-react";
import { GlowButton } from "../ui/GlowButton";
import { AnimatedGlitchText } from "../ui/GlitchText";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";
import { getOrCreatePlayerName } from "@/lib/playerUtils";

interface HomeScreenProps {
  onQuickJoin?: (playerName: string) => void;
  onCreateRoom?: (playerName: string) => void;
  onJoinWithCode?: (code: string, playerName: string) => void;
  onHowToPlay?: () => void;
  onDailyChallenge?: () => void;
  onLeaderboard?: () => void;
  isSearching?: boolean;
}

export function HomeScreen({
  onQuickJoin,
  onCreateRoom,
  onJoinWithCode,
  onHowToPlay,
  onDailyChallenge,
  onLeaderboard,
  isSearching = false,
}: HomeScreenProps) {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    // Load existing name if available
    const storedName = localStorage.getItem("player_username");
    if (storedName && !storedName.startsWith("Agent ")) {
      setPlayerName(storedName);
    }
  }, []);

  const handleCodeChange = (value: string) => {
    setRoomCode(value);
    setCodeError("");
  };

  const handleJoinWithCode = () => {
    if (roomCode.length !== 6) {
      setCodeError("Code must be 6 characters");
      return;
    }
    const finalName = getOrCreatePlayerName(playerName);
    onJoinWithCode?.(roomCode, finalName);
    setShowCodeModal(false);
    setRoomCode("");
  };

  const handleQuickJoinClick = () => {
    const finalName = getOrCreatePlayerName(playerName);
    onQuickJoin?.(finalName);
  };

  const handleCreateRoomClick = () => {
    const finalName = getOrCreatePlayerName(playerName);
    onCreateRoom?.(finalName);
  };

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
        className="flex flex-col gap-4 w-full max-w-md"
      >
        {/* Player Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="relative"
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <User className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="ENTER CODENAME (Optional)"
            className="w-full pl-10 pr-4 py-3 bg-card/50 border border-border rounded-lg font-mono text-sm
              focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50 text-foreground"
          />
        </motion.div>

        {/* Quick Join - Primary CTA */}
        <motion.button
          onClick={handleQuickJoinClick}
          disabled={isSearching}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center gap-2 p-5 bg-card border border-primary/50 rounded-lg
            hover:border-primary hover:bg-primary/5 transition-all group disabled:opacity-50"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <span className="font-mono text-sm font-semibold text-foreground">SEARCHING FOR GAME...</span>
              <span className="font-mono text-xs text-muted-foreground">Finding available lobbies</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-7 h-7 text-primary group-hover:text-primary transition-colors" />
              <span className="font-mono text-sm font-semibold text-foreground">QUICK JOIN</span>
              <span className="font-mono text-xs text-muted-foreground">Jump into a random game</span>
            </>
          )}
        </motion.button>

        {/* Create Room & Enter Code Row */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={handleCreateRoomClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-lg
              hover:border-primary/50 transition-all group"
          >
            <Home className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-mono text-sm font-semibold text-foreground">CREATE ROOM</span>
            <span className="font-mono text-xs text-muted-foreground">Host a new game</span>
          </motion.button>

          <motion.button
            onClick={() => setShowCodeModal(true)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-lg
              hover:border-primary/50 transition-all group"
          >
            <KeyRound className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-mono text-sm font-semibold text-foreground">ENTER CODE</span>
            <span className="font-mono text-xs text-muted-foreground">Join with code</span>
          </motion.button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <motion.button
            onClick={onHowToPlay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-2 p-3 bg-card/50 border border-border/50 rounded-lg
              hover:border-primary/30 transition-all group"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
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
            className="relative flex flex-col items-center gap-2 p-3 bg-card/50 border border-accent/30 rounded-lg
              hover:border-accent/60 transition-all group overflow-hidden"
          >
            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-accent text-accent-foreground font-mono text-[8px] font-bold rounded-bl-lg">
              NEW
            </div>
            <Calendar className="w-5 h-5 text-accent" />
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Daily Challenge
            </span>
          </motion.button>

          <motion.button
            onClick={onLeaderboard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-2 p-3 bg-card/50 border border-border/50 rounded-lg
              hover:border-primary/30 transition-all group"
          >
            <Trophy className="w-5 h-5 text-accent" />
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Leaderboard
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Bottom tagline */}
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

      {/* Enter Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h2 className="font-mono font-bold text-foreground">ENTER ROOM CODE</h2>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="font-mono text-sm text-muted-foreground mb-4">
                Enter the 6-character code:
              </p>

              <div className="relative mb-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-4 bg-background border-2 border-border rounded-lg font-mono text-2xl 
                    text-center tracking-[0.5em] focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/30
                    uppercase"
                  maxLength={6}
                  autoFocus
                />
                {roomCode.length === 6 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-mono text-sm"
                  >
                    ✓
                  </motion.div>
                )}
              </div>

              {codeError && (
                <p className="font-mono text-sm text-destructive mb-4">{codeError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg font-mono text-sm
                    hover:bg-muted/80 transition-colors"
                >
                  CANCEL
                </button>
                <GlowButton
                  onClick={handleJoinWithCode}
                  variant="primary"
                  className="flex-1"
                  disabled={roomCode.length !== 6}
                >
                  JOIN
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
