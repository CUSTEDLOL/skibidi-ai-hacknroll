import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlowButton } from "./GlowButton";

interface LeaveGameButtonProps {
  onLeave?: () => void;
  className?: string;
}

export function LeaveGameButton({ onLeave, className = "" }: LeaveGameButtonProps) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmLeave = () => {
    if (onLeave) {
      onLeave();
    }
    // Default behavior if no onLeave handler: navigate home
    navigate("/");
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg
          hover:bg-destructive/20 hover:border-destructive/50 transition-colors font-mono text-xs text-destructive ${className}`}
      >
        <LogOut className="w-3 h-3" />
        LEAVE
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-destructive/50 rounded-lg p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-mono font-bold text-lg">ABORT MISSION?</h3>
              </div>
              
              <p className="font-mono text-sm text-muted-foreground mb-6">
                Are you sure you want to leave the current game? All progress will be lost.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground font-mono text-sm hover:bg-muted"
                >
                  CANCEL
                </button>
                <GlowButton
                  onClick={handleConfirmLeave}
                  variant="danger"
                  className="flex-1 text-sm"
                >
                  CONFIRM LEAVE
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
