import { useState, useEffect } from "react";
import { Volume2, VolumeX, Music, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BeatIndicator } from "./BeatIndicator";

interface RhythmControlProps {
  bpm: number;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMetronomeToggle?: (enabled: boolean) => void;
  onBeat?: () => void;
}

export function RhythmControl({
  bpm,
  isPlaying,
  onTogglePlay,
  onVolumeChange,
  onMetronomeToggle,
  onBeat,
}: RhythmControlProps) {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange(50);
    } else {
      handleVolumeChange(0);
    }
  };

  const toggleMetronome = () => {
    const newValue = !metronomeEnabled;
    setMetronomeEnabled(newValue);
    onMetronomeToggle?.(newValue);
  };

  return (
    <div className="relative">
      {/* Beat Indicator - Always Visible */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="relative focus:outline-none"
      >
        <BeatIndicator 
          bpm={bpm} 
          isPlaying={isPlaying} 
          onBeat={onBeat}
        />
        
        {/* Status indicator */}
        <div className="absolute -top-1 -right-1">
          {isPlaying ? (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          ) : (
            <div className="w-3 h-3 bg-muted-foreground/50 rounded-full" />
          )}
        </div>
      </button>

      {/* Control Panel - Expandable */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-4 min-w-[250px] z-50"
          >
            <p className="font-mono text-xs text-muted-foreground mb-3">RHYTHM CONTROLS</p>

            {/* Volume Control */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Volume</span>
                <button
                  onClick={toggleMute}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0%</span>
                <span className="text-primary font-bold">{volume}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Metronome Toggle */}
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs">Metronome Click</span>
              </div>
              <button
                onClick={toggleMetronome}
                className={`
                  w-10 h-5 rounded-full transition-all relative
                  ${metronomeEnabled ? "bg-accent" : "bg-muted-foreground/30"}
                `}
              >
                <motion.div
                  animate={{ x: metronomeEnabled ? 20 : 2 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>

            {/* Audio Status */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span className="font-mono text-muted-foreground">
                  {isPlaying ? "Audio Active" : "Audio Paused"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
