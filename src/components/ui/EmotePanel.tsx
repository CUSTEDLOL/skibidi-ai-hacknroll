import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";
import { socket } from "@/socket";

interface EmotePanelProps {
  lobbyId: string;
  playerId: string;
  className?: string;
}

interface FloatingEmote {
  id: string;
  emote: string;
  playerName: string;
  x: number;
  y: number;
}

const EMOTES = [
  { emoji: "👍", label: "Thumbs Up" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "😂", label: "Laughing" },
  { emoji: "🎉", label: "Party" },
  { emoji: "❌", label: "Wrong" },
  { emoji: "✅", label: "Correct" },
  { emoji: "🔥", label: "Fire" },
];

export function EmotePanel({ lobbyId, playerId, className = "" }: EmotePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [floatingEmotes, setFloatingEmotes] = useState<FloatingEmote[]>([]);
  const [cooldown, setCooldown] = useState(false);

  const handleEmoteSend = (emote: string) => {
    if (cooldown) return;

    // Send emote to server
    socket.emit("emote:send", {
      lobbyId,
      emote,
    });

    // Set cooldown (1 second)
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1000);

    // Close panel after sending
    setIsExpanded(false);
  };

  // Listen for incoming emotes
  useEffect(() => {
    const handleEmoteReceived = (data: { emote: string; playerName: string; playerId: string }) => {
      // Don't show our own emotes as floating
      if (data.playerId === playerId) return;

      const newEmote: FloatingEmote = {
        id: `${Date.now()}-${Math.random()}`,
        emote: data.emote,
        playerName: data.playerName,
        x: Math.random() * 60 + 20, // Random position between 20-80%
        y: Math.random() * 40 + 30, // Random position between 30-70%
      };

      setFloatingEmotes((prev) => [...prev, newEmote]);

      // Remove after animation
      setTimeout(() => {
        setFloatingEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
      }, 3000);
    };

    socket.on("emote:receive", handleEmoteReceived);

    return () => {
      socket.off("emote:receive", handleEmoteReceived);
    };
  }, [playerId]); // Added playerId as dependency


  return (
    <>
      {/* Floating Emotes Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {floatingEmotes.map((emote) => (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1.5, y: -100 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute"
              style={{ left: `${emote.x}%`, top: `${emote.y}%` }}
            >
              <div className="text-6xl drop-shadow-lg">{emote.emote}</div>
              <div className="text-xs font-mono text-white bg-black/50 px-2 py-1 rounded mt-2 text-center">
                {emote.playerName}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emote Panel */}
      <div className={`relative ${className}`}>
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={cooldown}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-full p-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2 ${
            cooldown ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Smile className="w-4 h-4 text-accent" />
          <span className="font-mono text-sm font-bold">REACTIONS</span>
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-lg p-3 shadow-2xl z-50"
            >
              <div className="grid grid-cols-4 gap-2">
                {EMOTES.map((emote) => (
                  <motion.button
                    key={emote.emoji}
                    onClick={() => handleEmoteSend(emote.emoji)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded hover:bg-muted transition-colors text-3xl"
                    title={emote.label}
                  >
                    {emote.emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
