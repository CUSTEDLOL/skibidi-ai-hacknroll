import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FileText, Sparkles, HelpCircle, Calendar, User, MapPin, Hash } from "lucide-react";
import { Timer } from "../ui/Timer";
import { TerminalInput } from "../ui/TerminalInput";
import { SearchResult } from "../ui/SearchResult";
import { GlowButton } from "../ui/GlowButton";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

export interface RedactedResult {
  source: string;
  title: string;
  snippet: string;
  confidence?: number;
}

export interface ExtractedClue {
  type: string;
  value: string;
}

interface GuesserScreenProps {
  round: number;
  totalRounds: number;
  guessesRemaining: number;
  redactedResults?: RedactedResult[];
  extractedClues?: ExtractedClue[];
  onGuess?: (guess: string) => void;
  onRequestHint?: () => void;
  timeLimit?: number;
}

const clueIcons: Record<string, typeof Calendar> = {
  date: Calendar,
  person: User,
  location: MapPin,
  number: Hash,
};

export function GuesserScreen({
  round,
  totalRounds,
  guessesRemaining,
  redactedResults = [],
  extractedClues = [],
  onGuess,
  onRequestHint,
  timeLimit = 120,
}: GuesserScreenProps) {
  const [guessHistory, setGuessHistory] = useState<{ guess: string; correct: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);

  const handleGuess = async (guess: string) => {
    setIsSubmitting(true);

    // Add to history (correctness will be determined by parent component)
    setGuessHistory(prev => [...prev, { guess, correct: false }]);

    // Show wrong animation temporarily
    setShowWrongAnimation(true);
    setTimeout(() => setShowWrongAnimation(false), 500);

    setIsSubmitting(false);
    onGuess?.(guess);
  };

  return (
    <div className={`min-h-screen pt-20 pb-8 px-4 ${showWrongAnimation ? 'error-shake' : ''}`}>
      <div className="container mx-auto max-w-6xl">
        {/* Top HUD */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          {/* Round Info */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-card border border-border rounded-lg">
              <span className="font-mono text-sm text-muted-foreground">ROUND </span>
              <span className="font-mono text-lg font-bold text-primary">{round}/{totalRounds}</span>
            </div>
            <ClassifiedStamp type="redacted" className="hidden sm:block" animate={false} />
          </div>

          {/* Timer */}
          <Timer seconds={timeLimit} size="sm" />

          {/* Guesses Remaining */}
          <div className="px-4 py-2 bg-card border border-border rounded-lg">
            <span className="font-mono text-sm text-muted-foreground">ATTEMPTS: </span>
            <span className={`font-mono text-lg font-bold ${guessesRemaining <= 2 ? 'text-destructive' : 'text-accent'}`}>
              {guessesRemaining - guessHistory.length}/{guessesRemaining}
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Results Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Results Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-mono text-lg font-bold text-foreground">CLASSIFIED INTEL</span>
              </div>
              <span className="font-mono text-sm text-muted-foreground">
                {redactedResults.length} documents recovered
              </span>
            </motion.div>

            {/* Redacted Results */}
            <div className="space-y-4">
              {redactedResults.length > 0 ? (
                redactedResults.map((result, i) => (
                  <SearchResult
                    key={i}
                    {...result}
                    isRedacted={true}
                    delay={i * 0.2}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 bg-card border border-border rounded-lg"
                >
                  <p className="font-mono text-muted-foreground">
                    Waiting for intel from the searcher...
                  </p>
                </motion.div>
              )}
            </div>

            {/* Guess Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-4"
            >
              <h3 className="font-mono text-sm text-muted-foreground mb-3">ENTER YOUR HYPOTHESIS</h3>
              <TerminalInput
                placeholder="What is the secret topic?"
                onSubmit={handleGuess}
                type="guess"
                disabled={isSubmitting || guessHistory.length >= guessesRemaining}
              />
            </motion.div>

            {/* Guess History */}
            <AnimatePresence>
              {guessHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <h4 className="font-mono text-sm text-muted-foreground">PREVIOUS ATTEMPTS</h4>
                  {guessHistory.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                        item.correct 
                          ? 'bg-success/20 border border-success/40' 
                          : 'bg-destructive/20 border border-destructive/40'
                      }`}
                    >
                      <span className="font-mono text-lg">
                        {item.correct ? '✓' : '✗'}
                      </span>
                      <span className="font-mono text-sm">{item.guess}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Extracted Clues */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-primary/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm text-primary font-bold">EXTRACTED INTEL</span>
              </div>
              {extractedClues.length > 0 ? (
                <ul className="space-y-3">
                  {extractedClues.map((clue, i) => {
                    const IconComponent = clueIcons[clue.type] || Hash;
                    return (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-mono text-sm text-foreground">{clue.value}</span>
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <p className="font-mono text-xs text-muted-foreground italic">
                  No intel extracted yet
                </p>
              )}
            </motion.div>

            {/* Request Hint */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span className="font-mono text-sm text-muted-foreground">NEED HELP?</span>
              </div>
              <GlowButton
                onClick={onRequestHint}
                variant="amber"
                size="sm"
                className="w-full"
              >
                Request Intel (-25 pts)
              </GlowButton>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Additional context will be partially declassified
              </p>
            </motion.div>

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-xs text-muted-foreground font-mono p-4 border border-border/50 rounded-lg"
            >
              Analyze the redacted documents and piece together the clues to discover the secret topic
            </motion.div>
          </div>
        </div>
      </div>

      {/* Wrong guess overlay effect */}
      <AnimatePresence>
        {showWrongAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-destructive/10 pointer-events-none z-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
