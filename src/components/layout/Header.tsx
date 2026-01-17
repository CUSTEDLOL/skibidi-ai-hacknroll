import { motion } from "framer-motion";
import { User, Trophy, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlitchText } from "../ui/GlitchText";
import { XPBar } from "../ui/StatCard";
import { useAudio } from "@/contexts/AudioContext";

interface HeaderProps {
  username?: string;
  level?: number;
  xp?: number;
  maxXp?: number;
  wins?: number;
  losses?: number;
  isLoggedIn?: boolean;
}

export function Header({
  username,
  level,
  xp,
  maxXp,
  wins,
  losses,
  isLoggedIn = false,
}: HeaderProps) {
  const { isMuted, toggleMute } = useAudio();
  const navigate = useNavigate();

  const hasStats = wins !== undefined && losses !== undefined;
  const hasXp = xp !== undefined && maxXp !== undefined && level !== undefined;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - Clickable for home navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GlitchText
            text="REDACTED"
            className="text-2xl font-bold text-primary hover:text-shadow-cyan transition-all duration-200"
          />
        </motion.div>

        {/* Center - XP Bar (desktop only, only when logged in with data) */}
        {hasXp && (
          <div className="hidden md:block flex-1 max-w-xs mx-8">
            <XPBar current={xp} max={maxXp} level={level} />
          </div>
        )}

        {/* Right side - Stats and Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          {/* Win/Loss Record - Only show when data exists */}
          {hasStats && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="font-mono text-sm">
                <span className="text-success">{wins}W</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-destructive">{losses}L</span>
              </span>
            </div>
          )}

          {/* Sound Toggle */}
          <motion.button
            onClick={toggleMute}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
          >
            {!isMuted ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.button>

          {/* User Profile - Only show when logged in */}
          {isLoggedIn && username && (
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
          )}
        </motion.div>
      </div>
    </header>
  );
}
