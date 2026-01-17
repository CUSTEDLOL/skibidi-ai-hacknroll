import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { FileText, BarChart3, Calendar, User, MapPin, MessageSquare, HelpCircle } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";

interface ExtractedClue {
  type: "date" | "person" | "location" | "quote";
  value: string;
  icon: React.ReactNode;
}

const GuesserActive = () => {
  const navigate = useNavigate();
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo data
  const round = 2;
  const totalRounds = 5;
  const attemptsRemaining = 5 - guessHistory.length;

  const redactedResults = [
    {
      source: "wikipedia.org",
      content: "The █████ █████ was a historic event in 1969 when █████ became the first person to walk on the █████...",
    },
    {
      source: "history.com",
      content: "NASA's █████ program achieved its goal when █████ said 'That's one small step for man, one giant leap for mankind'...",
    },
    {
      source: "space.com",
      content: "The Eagle has landed at Tranquility Base, marking humanity's greatest achievement in exploration...",
    },
  ];

  const extractedClues: ExtractedClue[] = [
    { type: "date", value: "1969", icon: <Calendar className="w-4 h-4" /> },
    { type: "person", value: "NASA", icon: <User className="w-4 h-4" /> },
    { type: "location", value: "Tranquility Base", icon: <MapPin className="w-4 h-4" /> },
    { type: "quote", value: "Eagle has landed", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const handleGuess = async (guess: string) => {
    setGuessHistory(prev => [...prev, guess]);
    setIsSubmitting(true);

    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Navigate to results (in real app, would check correctness)
    navigate("/game/round-result");
  };

  const handleRequestHint = () => {
    // In real app, would reveal more clues at cost of points
    console.log("Hint requested");
  };

  const handleTimeUp = () => {
    navigate("/game/round-result");
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen pt-20 pb-8 px-4">
        {/* Top HUD */}
        <div className="flex items-center justify-between max-w-6xl mx-auto mb-6">
          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-muted-foreground">
              ROUND <span className="text-primary">{round}</span>/{totalRounds}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              ATTEMPTS: <span className="text-primary">{attemptsRemaining}</span>/5
            </div>
          </div>
          <Timer seconds={120} onComplete={handleTimeUp} size="md" />
          <ClassifiedStamp type="classified" className="text-xs" animate={false} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Classified Document Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="font-mono text-lg font-bold text-foreground">CLASSIFIED DOCUMENT</h2>
            </motion.div>

            {/* Redacted Results */}
            <div className="space-y-4">
              {redactedResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="bg-card border border-border rounded-lg p-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                  <p className="font-mono text-xs text-muted-foreground mb-2">
                    Source: {result.source}
                  </p>
                  <p className="font-mono text-sm text-foreground leading-relaxed">
                    {result.content}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Guess Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <TerminalInput
                onSubmit={handleGuess}
                placeholder="Enter your hypothesis..."
                disabled={attemptsRemaining <= 0 || isSubmitting}
                type="guess"
              />
              
              <GlowButton
                onClick={handleRequestHint}
                variant="secondary"
                size="md"
                icon={<HelpCircle className="w-4 h-4" />}
                className="w-full"
              >
                Request Hint (-25 points)
              </GlowButton>
            </motion.div>

            {/* Guess History */}
            {guessHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
              >
                <p className="font-mono text-sm text-destructive font-bold mb-2">PREVIOUS ATTEMPTS:</p>
                <ul className="space-y-1">
                  {guessHistory.map((guess, index) => (
                    <li key={index} className="font-mono text-sm text-destructive/70 line-through">
                      {guess}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Extracted Intel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-accent" />
              <span className="font-mono text-sm font-bold">EXTRACTED INTEL</span>
            </div>
            
            <div className="space-y-3">
              {extractedClues.map((clue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-2 p-2 bg-secondary/30 rounded border border-border/50"
                >
                  <div className="text-primary">{clue.icon}</div>
                  <span className="font-mono text-xs text-foreground">{clue.value}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground">
                Clues are automatically extracted from visible text. Use them to form your hypothesis.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GuesserActive;
