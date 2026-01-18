import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Home, KeyRound, HelpCircle, X, Loader2, User, Zap, Shield, Target } from "lucide-react";
import { GlowButton } from "../ui/GlowButton";
import { AnimatedGlitchText } from "../ui/GlitchText";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";
import { getOrCreatePlayerName } from "@/lib/playerUtils";

interface HomeScreenProps {
  onQuickJoin?: (playerName: string) => void;
  onCreateRoom?: (playerName: string) => void;
  onJoinWithCode?: (code: string, playerName: string) => void;
  onHowToPlay?: () => void;
  isSearching?: boolean;
}

export function HomeScreen({
  onQuickJoin,
  onCreateRoom,
  onJoinWithCode,
  onHowToPlay,
  isSearching = false,
}: HomeScreenProps) {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute top-20 left-10 text-primary/10 font-mono text-xs hidden lg:block"
        >
          {"// DECRYPT_PROTOCOL_v2.1"}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="absolute bottom-20 right-10 text-primary/10 font-mono text-xs hidden lg:block"
        >
          {"[SECURE_CONNECTION]"}
        </motion.div>
      </div>

      {/* Main Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-10 relative"
      >
        {/* Glowing backdrop for title */}
        <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 -z-10" />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <ClassifiedStamp type="top-secret" className="mb-6" />
        </motion.div>
        
        <AnimatedGlitchText text="REDACTED" />
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 font-mono text-lg text-muted-foreground max-w-md mx-auto"
        >
          Can you decode the internet?
        </motion.p>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-4 mt-6"
        >
          {[
            { icon: Target, label: "Clues" },
            { icon: Shield, label: "Deception" },
            { icon: Zap, label: "Speed" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70"
            >
              <item.icon className="w-3 h-3 text-primary/60" />
              <span>{item.label}</span>
            </motion.div>
          ))}
        </motion.div>
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
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="ENTER CODENAME (Optional)"
              className="w-full pl-12 pr-4 py-4 bg-card/80 backdrop-blur-sm border border-border rounded-xl font-mono text-sm
                focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 
                placeholder:text-muted-foreground/40 text-foreground transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* Quick Join - Primary CTA with enhanced styling */}
        <motion.button
          onClick={handleQuickJoinClick}
          disabled={isSearching}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
          
          <div className="relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-card via-card to-card/80 
            border border-primary/40 rounded-xl overflow-hidden
            group-hover:border-primary/80 transition-all duration-300 disabled:opacity-50">
            
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {isSearching ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="font-mono text-sm font-bold text-foreground tracking-wider">SEARCHING FOR GAME...</span>
                <span className="font-mono text-xs text-muted-foreground">Finding available lobbies</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-primary group-hover:text-primary transition-colors" />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 w-8 h-8 border-2 border-primary/50 rounded-full"
                  />
                </div>
                <span className="font-mono text-sm font-bold text-foreground tracking-wider">QUICK JOIN</span>
                <span className="font-mono text-xs text-muted-foreground">Jump into a random game</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Create Room & Enter Code Row */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={handleCreateRoomClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center gap-2 p-5 bg-card/80 backdrop-blur-sm border border-border rounded-xl
              group-hover:border-primary/40 transition-all duration-300">
              <Home className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              <span className="font-mono text-sm font-bold text-foreground tracking-wide">CREATE ROOM</span>
              <span className="font-mono text-xs text-muted-foreground">Host a new game</span>
            </div>
          </motion.button>

          <motion.button
            onClick={() => setShowCodeModal(true)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-l from-accent/10 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center gap-2 p-5 bg-card/80 backdrop-blur-sm border border-border rounded-xl
              group-hover:border-accent/40 transition-all duration-300">
              <KeyRound className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              <span className="font-mono text-sm font-bold text-foreground tracking-wide">ENTER CODE</span>
              <span className="font-mono text-xs text-muted-foreground">Join with code</span>
            </div>
          </motion.button>
        </div>

        {/* How to Play */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-2"
        >
          <motion.button
            onClick={onHowToPlay}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-muted-foreground hover:text-foreground 
              font-mono text-sm transition-colors duration-300 group"
          >
            <HelpCircle className="w-4 h-4 group-hover:text-primary transition-colors" />
            <span>How to Play</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Bottom tagline with enhanced styling */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-0 right-0 flex justify-center"
      >
        <div className="flex items-center gap-3 text-muted-foreground/40 font-mono text-xs">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/30" />
          <span className="tracking-widest">A GAME OF CLUES AND DECEPTION</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-primary/30" />
        </div>
      </motion.div>

      {/* Enter Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm relative"
            >
              {/* Modal glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-2xl blur-xl" />
              
              <div className="relative bg-card border border-border rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-mono font-bold text-foreground">ENTER ROOM CODE</h2>
                  </div>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
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
                    className="w-full px-4 py-5 bg-background border-2 border-border rounded-xl font-mono text-2xl 
                      text-center tracking-[0.5em] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground/20 uppercase transition-all duration-300"
                    maxLength={6}
                    autoFocus
                  />
                  {roomCode.length === 6 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-success/20 rounded-full flex items-center justify-center"
                    >
                      <span className="text-success text-sm">✓</span>
                    </motion.div>
                  )}
                </div>

                {codeError && (
                  <p className="font-mono text-sm text-destructive mb-4">{codeError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="flex-1 px-4 py-3 bg-muted border border-border rounded-xl font-mono text-sm
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}