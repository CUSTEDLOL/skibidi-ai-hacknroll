import { motion } from "framer-motion";
import { Users, Crown, Search } from "lucide-react";
import { Player } from "@/lib/playerUtils";

interface PlayerLeaderboardProps {
  players: Player[];
  currentPlayerId: string;
  className?: string;
}

export function PlayerLeaderboard({
  players,
  currentPlayerId,
  className = "",
}: PlayerLeaderboardProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-accent" />
        <h2 className="font-mono font-semibold text-foreground text-sm">
          ROOM ROSTER
        </h2>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player) => {
          const isMe = player.id === currentPlayerId;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between p-2 rounded border ${
                isMe 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/10 border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-1.5 h-1.5 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={`font-mono text-sm truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                  {player.username} {isMe && "(YOU)"}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {player.role === "searcher" && (
                  <div className="p-1 bg-accent/20 rounded" title="Searcher">
                    <Search className="w-3 h-3 text-accent" />
                  </div>
                )}
                {player.isHost && (
                  <div className="p-1 bg-yellow-500/20 rounded" title="Host">
                    <Crown className="w-3 h-3 text-yellow-500" />
                  </div>
                )}
                <span className="font-mono font-bold text-sm text-foreground">
                  {player.score || 0}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
