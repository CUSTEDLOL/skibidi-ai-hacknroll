import { motion } from "framer-motion";
import { Music, Volume2 } from "lucide-react";

interface AudioEnablePromptProps {
  onEnable: () => void;
}

export function AudioEnablePrompt({ onEnable }: AudioEnablePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-card border-2 border-accent rounded-xl p-4 shadow-lg max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-foreground">Rhythm Mode Active</h3>
            <p className="text-xs text-muted-foreground">Audio initialization required</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Click below to enable audio and start the rhythm system
        </p>
        
        <button
          onClick={onEnable}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-foreground 
            rounded-lg font-mono font-bold hover:bg-accent/90 transition-all shadow-[0_0_20px_hsl(var(--accent)/0.3)]
            animate-pulse"
        >
          <Volume2 className="w-4 h-4" />
          Enable Audio
        </button>
      </div>
    </motion.div>
  );
}
