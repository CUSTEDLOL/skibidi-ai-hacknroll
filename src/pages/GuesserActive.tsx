import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { FileText, BarChart3, Calendar, User, MapPin, MessageSquare, HelpCircle } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import { toast } from "sonner";

interface ExtractedClue {
  type: "date" | "person" | "location" | "quote";
  value: string;
  icon: React.ReactNode;
}

interface RedactedResult {
  source: string;
  title: string;
  snippet: string;
  link?: string;
}

const GuesserActive = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redactedResults, setRedactedResults] = useState<RedactedResult[]>([]);

  // Get game state from location state or use defaults
  const round = (location.state as any)?.round || 1;
  const totalRounds = (location.state as any)?.totalRounds || 5;
  const timeLimit = (location.state as any)?.timeLimit || 120;
  const maxAttempts = (location.state as any)?.maxAttempts || 5;

  const attemptsRemaining = maxAttempts - guessHistory.length;

  // Load redacted results from location state or WebSocket
  useEffect(() => {
    const resultsFromState = (location.state as any)?.redactedResults;
    if (resultsFromState && Array.isArray(resultsFromState)) {
      setRedactedResults(resultsFromState);
    } else {
      // Default demo data if nothing provided
      setRedactedResults([
        {
          source: "wikipedia.org",
          title: "The █████ █████ was a historic event",
          snippet: "In July 1969, the world witnessed a historic moment when █████ became the first person to walk on the █████...",
        },
        {
          source: "history.com",
          title: "█████ Program Achievement",
          snippet: "The ambitious program achieved its goal when █████ said 'That's one small step for man, one giant leap for mankind'...",
        },
        {
          source: "space.com",
          title: "One Small Step for Mankind",
          snippet: "The Eagle has landed at Tranquility Base, marking humanity's greatest achievement in exploration...",
        },
      ]);
    }
  }, [location.state]);

  // Extract clues from redacted results (simple extraction for demo)
  const extractedClues: ExtractedClue[] = [];
  redactedResults.forEach((result) => {
    const text = `${result.title} ${result.snippet}`;
    
    // Extract dates (4-digit years)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch && !extractedClues.find(c => c.type === "date" && c.value === yearMatch[0])) {
      extractedClues.push({
        type: "date",
        value: yearMatch[0],
        icon: <Calendar className="w-4 h-4" />,
      });
    }
    
    // Extract locations (capitalized words that might be places)
    const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
    if (locationMatch && locationMatch[0].length > 3 && 
        !extractedClues.find(c => c.type === "location" && c.value === locationMatch[0])) {
      extractedClues.push({
        type: "location",
        value: locationMatch[0],
        icon: <MapPin className="w-4 h-4" />,
      });
    }
  });

  // Add some default clues if none extracted
  if (extractedClues.length === 0) {
    extractedClues.push(
      { type: "date", value: "1969", icon: <Calendar className="w-4 h-4" /> },
      { type: "person", value: "NASA", icon: <User className="w-4 h-4" /> },
      { type: "location", value: "Tranquility Base", icon: <MapPin className="w-4 h-4" /> },
      { type: "quote", value: "Eagle has landed", icon: <MessageSquare className="w-4 h-4" /> }
    );
  }

  const handleGuess = async (guess: string) => {
    if (attemptsRemaining <= 0) {
      toast.error("No attempts remaining");
      return;
    }

    if (guessHistory.includes(guess)) {
      toast.error("You've already tried that guess");
      return;
    }

    setGuessHistory(prev => [...prev, guess]);
    setIsSubmitting(true);

    try {
      // In a real app, this would submit to backend API
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if guess is correct (this would come from backend)
      // For demo, we'll navigate to results
      navigate("/game/round-result", {
        state: {
          guess,
          guessHistory,
          round,
          correct: false, // Would come from backend
        },
      });
    } catch (error: any) {
      console.error("Failed to submit guess:", error);
      toast.error(error.message || "Failed to submit guess");
      setIsSubmitting(false);
    }
  };

  const handleRequestHint = () => {
    // In real app, would reveal more clues at cost of points
    toast.info("Hint requested (would cost 25 points)");
  };

  const handleTimeUp = () => {
    navigate("/game/round-result", {
      state: {
        guessHistory,
        round,
        timeUp: true,
      },
    });
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
              ATTEMPTS: <span className="text-primary">{attemptsRemaining}</span>/{maxAttempts}
            </div>
          </div>
          <Timer seconds={timeLimit} onComplete={handleTimeUp} size="md" />
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
                  <h3 className="font-mono text-sm font-bold text-foreground mb-2">
                    {result.title}
                  </h3>
                  <p className="font-mono text-sm text-foreground leading-relaxed">
                    {result.snippet}
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
