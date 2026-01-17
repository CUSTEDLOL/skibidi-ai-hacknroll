import { motion, AnimatePresence } from "framer-motion";
import { X, Search, FileQuestion, Eye, Target, ArrowRight } from "lucide-react";
import { GlowButton } from "../ui/GlowButton";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Search,
    title: "SEARCHER Gets a Secret",
    description: "One player becomes the Searcher and receives a secret topic with forbidden words they cannot use.",
    color: "primary",
  },
  {
    icon: Eye,
    title: "Search for Clues",
    description: "The Searcher uses Google to find results that hint at the topic without revealing it directly.",
    color: "primary",
  },
  {
    icon: FileQuestion,
    title: "GUESSER Analyzes",
    description: "Search results are shown to the Guesser with heavy redactions hiding key information.",
    color: "accent",
  },
  {
    icon: Target,
    title: "Guess the Topic",
    description: "The Guesser pieces together clues from redacted results to figure out the secret topic.",
    color: "accent",
  },
];

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-card border-2 border-border rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-mono text-xl font-bold text-foreground">HOW TO PLAY</h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Intro */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-muted-foreground"
              >
                A game of clues, redactions, and deduction. Can you decode the internet?
              </motion.p>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg"
                  >
                    <div className={`w-12 h-12 rounded-full bg-${step.color}/20 flex items-center justify-center flex-shrink-0`}>
                      <step.icon className={`w-6 h-6 text-${step.color}`} />
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-foreground mb-1">
                        {i + 1}. {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Example */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-4 bg-primary/10 border border-primary/30 rounded-lg"
              >
                <h4 className="font-mono text-sm font-bold text-primary mb-2">EXAMPLE</h4>
                <p className="text-sm text-muted-foreground">
                  Secret Topic: <span className="text-primary">"Eiffel Tower"</span><br />
                  Forbidden: tower, paris, france, iron<br />
                  Good Search: "famous landmark romantic city 1889"
                </p>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="flex justify-center p-6 border-t border-border">
              <GlowButton onClick={onClose} variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                Got It!
              </GlowButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
