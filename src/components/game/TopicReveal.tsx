import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, AlertTriangle, Clock } from "lucide-react";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

interface TopicRevealProps {
  topic: string;
  forbiddenWords: string[];
  timeLimit?: number;
  onReady?: () => void;
}

export function TopicReveal({ topic, forbiddenWords, timeLimit = 120, onReady }: TopicRevealProps) {
  const [stage, setStage] = useState<"sealed" | "opening" | "revealed">("sealed");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("opening"), 1000);
    const timer2 = setTimeout(() => setStage("revealed"), 2500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
      <AnimatePresence mode="wait">
        {stage === "sealed" && (
          <motion.div
            key="sealed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, rotateX: 30 }}
            className="relative"
          >
            {/* Sealed envelope */}
            <div className="w-80 h-48 bg-gradient-to-br from-amber-900/80 to-amber-950 rounded-lg border-2 border-amber-700/50 shadow-2xl flex items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[160px] border-r-[160px] border-b-[60px] border-l-transparent border-r-transparent border-b-amber-800/80" />
              <ClassifiedStamp type="top-secret" className="absolute" animate={false} />
            </div>
            <p className="text-center mt-4 font-mono text-muted-foreground animate-pulse">
              UNSEALING CLASSIFIED FILE...
            </p>
          </motion.div>
        )}

        {stage === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="font-mono text-2xl text-accent"
            >
              DECLASSIFYING...
            </motion.div>
            <div className="mt-4 w-64 h-1 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5 }}
                className="h-full bg-primary"
              />
            </div>
          </motion.div>
        )}

        {stage === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* File header */}
            <div className="bg-card border-2 border-primary/30 rounded-t-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-muted-foreground">CASE FILE #2847-X</span>
                <ClassifiedStamp type="classified" className="text-xs" animate={true} />
              </div>
              <div className="h-px bg-border my-3" />
              
              {/* The secret topic */}
              <div className="text-center py-4">
                <p className="font-mono text-xs text-muted-foreground mb-2">YOUR SECRET TOPIC:</p>
                <motion.h2
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="text-3xl font-bold text-primary text-glow-cyan"
                >
                  {topic}
                </motion.h2>
              </div>
            </div>

            {/* Forbidden words section */}
            <div className="bg-destructive/10 border-2 border-t-0 border-destructive/30 rounded-b-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-mono text-sm text-destructive font-bold">FORBIDDEN WORDS</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {forbiddenWords.map((word, i) => (
                  <motion.span
                    key={word}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/20 border border-destructive/40 rounded font-mono text-sm text-destructive"
                  >
                    <X className="w-3 h-3" />
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Timer info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-2 mt-4 text-muted-foreground"
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">Time Limit: {Math.floor(timeLimit / 60)}:{(timeLimit % 60).toString().padStart(2, '0')}</span>
            </motion.div>

            {/* Ready button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={onReady}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-6 py-4 bg-primary text-primary-foreground rounded-lg font-mono font-bold uppercase tracking-wider hover:shadow-[0_0_30px_hsl(180_100%_50%/0.5)] transition-all"
            >
              BEGIN MISSION
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
