import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";
import { Music } from "lucide-react";

interface BeatIndicatorProps {
  bpm: number;
  isPlaying: boolean;
  onBeat?: () => void;
  className?: string;
}

export function BeatIndicator({ bpm, isPlaying, onBeat, className = "" }: BeatIndicatorProps) {
  const controls = useAnimation();
  const [beatPhase, setBeatPhase] = useState<'idle' | 'beat'>('idle');

  useEffect(() => {
    if (!isPlaying) {
      controls.start({
        scale: 1,
        backgroundColor: 'hsl(var(--muted))',
      });
      return;
    }

    const beatInterval = (60 / bpm) * 1000; // Convert BPM to milliseconds

    const triggerBeat = () => {
      setBeatPhase('beat');
      
      // Trigger callback
      onBeat?.();

      // Animate: scale up and turn green
      controls.start({
        scale: [1, 1.3, 1],
        backgroundColor: [
          'hsl(var(--muted))',
          'hsl(142 76% 36%)', // green
          'hsl(var(--muted))',
        ],
        transition: {
          duration: 0.3,
          ease: 'easeOut',
        },
      });

      // Reset phase after animation
      setTimeout(() => setBeatPhase('idle'), 300);
    };

    // Initial beat
    triggerBeat();

    // Set up interval for subsequent beats
    const intervalId = setInterval(triggerBeat, beatInterval);

    return () => clearInterval(intervalId);
  }, [bpm, isPlaying, controls, onBeat]);

  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={controls}
        className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 border-border shadow-lg"
        style={{
          backgroundColor: 'hsl(var(--muted))',
        }}
      >
        <Music className="w-4 h-4 text-muted-foreground mb-1" />
        <span className="font-mono text-xs font-bold text-foreground">
          {bpm}
        </span>
        <span className="font-mono text-[8px] text-muted-foreground">
          BPM
        </span>
      </motion.div>

      {/* Pulse ring effect when playing */}
      {isPlaying && beatPhase === 'beat' && (
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border-2 border-green-500"
        />
      )}
    </div>
  );
}
