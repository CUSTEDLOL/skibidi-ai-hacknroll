import { motion } from "framer-motion";
import { User, Trophy, Volume2, VolumeX, Settings } from "lucide-react";
import { useState } from "react";
import { GlitchText } from "../ui/GlitchText";
import { XPBar } from "../ui/StatCard";

interface HeaderProps {
  username?: string;
  level?: number;
  xp?: number;
  maxXp?: number;
  wins?: number;
  losses?: number;
}

export function Header({ 
  username = "AGENT_X", 
  level = 7, 
  xp = 650, 
  maxXp = 1000,
  wins = 23,
  losses = 8
}: HeaderProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <GlitchText 
            text="REDACTED" 
            className="text-2xl font-bold text-primary" 
          />
        </motion.div>

        {/* Center - XP Bar (desktop only) */}
        <div className="hidden md:block flex-1 max-w-xs mx-8">
          <XPBar current={xp} max={maxXp} level={level} />
        </div>

        {/* Right side - Stats and Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          {/* Win/Loss Record */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="font-mono text-sm">
              <span className="text-success">{wins}W</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive">{losses}L</span>
            </span>
          </div>

          {/* Sound Toggle */}
          <motion.button
            onClick={() => setSoundEnabled(!soundEnabled)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.button>

          {/* User Profile */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="font-mono text-xs text-muted-foreground">AGENT</p>
              <p className="font-mono text-sm font-bold text-foreground">{username}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
