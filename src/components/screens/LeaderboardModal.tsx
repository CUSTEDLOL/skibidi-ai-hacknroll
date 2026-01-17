import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Medal, Crown } from "lucide-react";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  avatar: string;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Agent Cipher", score: 2850, avatar: "🕵️‍♂️" },
  { rank: 2, name: "Neon Shadow", score: 2720, avatar: "🦸‍♀️" },
  { rank: 3, name: "Quantum_Leap", score: 2680, avatar: "🤖" },
  { rank: 4, name: "Redacted_User", score: 2540, avatar: "👻" },
  { rank: 5, name: "NullPointer", score: 2490, avatar: "💻" },
  { rank: 6, name: "Deep_State", score: 2310, avatar: "👁️" },
  { rank: 7, name: "Glitch_Mode", score: 2150, avatar: "👾" },
  { rank: 8, name: "Zero_Day", score: 1980, avatar: "🐞" },
  { rank: 9, name: " Firewall", score: 1850, avatar: "🧱" },
  { rank: 10, name: "Guest_User", score: 1200, avatar: "👤" },
];

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card border border-primary/30 rounded-lg p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="font-mono font-bold text-xl text-foreground flex items-center gap-2">
                    TOP AGENTS
                    <ClassifiedStamp type="top-secret" className="scale-50 origin-left" animate={false} />
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">Global Daily Rankings</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors group"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors relative z-10" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              {MOCK_LEADERBOARD.map((entry, index) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    index < 3 
                      ? 'bg-accent/5 border-accent/20' 
                      : 'bg-card/50 border-border/50 hover:bg-card/80'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center font-mono font-bold text-lg">
                    {index === 0 && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />}
                    {index === 1 && <Medal className="w-5 h-5 text-gray-400 fill-gray-400/20" />}
                    {index === 2 && <Medal className="w-5 h-5 text-amber-600 fill-amber-600/20" />}
                    {index > 2 && <span className="text-muted-foreground">#{entry.rank}</span>}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xl select-none">{entry.avatar}</span>
                    <span className={`font-mono ${index < 3 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {entry.name}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="font-mono font-bold text-primary">
                    {entry.score.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* User Rank Footer (Optional Mock) */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono text-sm">YOUR RANK</span>
                </div>
                <div className="font-mono text-muted-foreground">
                  UNRANKED
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
