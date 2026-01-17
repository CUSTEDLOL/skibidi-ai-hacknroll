import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { PlayerLeaderboard } from "@/components/ui/PlayerLeaderboard";
import { LeaveGameButton } from "@/components/ui/LeaveGameButton";
import { EmotePanel } from "@/components/ui/EmotePanel";
import {
  FileText,
  BarChart3,
  Calendar,
  User,
  MapPin,
  MessageSquare,
  HelpCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import { toast } from "sonner";
import {
  getOrCreatePlayerId,
  getOrCreatePlayerName,
  type Player,
} from "@/lib/playerUtils";
import { makeGuess, getLobby } from "@/lib/api";
import { socket } from "@/socket";

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
  const [isWaitingForSearcher, setIsWaitingForSearcher] = useState(true);

  // Game state
  const playerId = getOrCreatePlayerId();
  const playerName = getOrCreatePlayerName();

  // Get lobbyId from location state or fallback to current_lobby_settings
  const getLobbyId = (): string | null => {
    const stateId = (location.state as any)?.lobbyId;
    if (stateId) return stateId;

    const settings = localStorage.getItem("current_lobby_settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.lobbyId || null;
    }
    return null;
  };

  const lobbyId = getLobbyId();

  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (lobbyId) {
      getLobby(lobbyId).then((data) => {
        if (data.lobby) {
          const lobbyPlayers = data.lobby.players.map((p: any) => ({
            id: p.playerId,
            username: p.playerName,
            score: p.score || 0,
            isHost: data.lobby.players[0].playerId === p.playerId,
            role: p.role || "guesser",
            isReady: true,
          }));
          setPlayers(lobbyPlayers);
        }
      });
    }
  }, [lobbyId]);

  // Get game state from location state or use defaults
  const round = (location.state as any)?.round || 1;
  const totalRounds = (location.state as any)?.totalRounds || 5;
  const timeLimit = (location.state as any)?.timeLimit || 120;
  // const maxAttempts = (location.state as any)?.maxAttempts || 5; // Unlimited attempts

  // const attemptsRemaining = maxAttempts - guessHistory.length; // Unlimited

  // Listen for round start and redacted results
  useEffect(() => {
    // Check initial state - maybe round already started?
    fetch(`http://127.0.0.1:5000/api/round/state/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.roundState && data.roundState.isActive) {
          setIsWaitingForSearcher(false);
        }
      })
      .catch(() => {
        // Ignore errors, wait for socket event
      });

    const handleRoundStarted = () => {
      setIsWaitingForSearcher(false);
      toast.success("Mission Briefing Received! Round Starting...");
    };

    const handleRedactedResults = (data: { results: any[] }) => {
      setRedactedResults(
        data.results.map((r) => ({
          source: new URL(r.link).hostname,
          title: r.title,
          snippet: r.snippet,
          link: r.link,
        })),
      );
    };

    socket.on("round:started", handleRoundStarted);
    socket.on("round:redacted_results", handleRedactedResults);

    return () => {
      socket.off("round:started", handleRoundStarted);
      socket.off("round:redacted_results", handleRedactedResults);
    };
  }, [lobbyId]);

  // Redirect if no lobbyId found
  useEffect(() => {
    if (!lobbyId) {
      toast.error("No active game found. Please join or create a lobby.");
      navigate("/");
    }
  }, [lobbyId, navigate]);

  // Return early if no lobbyId (after all hooks)
  if (!lobbyId) {
    return null;
  }

  // Extract clues from redacted results (simple extraction for demo)
  const extractedClues: ExtractedClue[] = [];
  redactedResults.forEach((result) => {
    const text = `${result.title} ${result.snippet}`;

    // Extract dates (4-digit years)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (
      yearMatch &&
      !extractedClues.find((c) => c.type === "date" && c.value === yearMatch[0])
    ) {
      extractedClues.push({
        type: "date",
        value: yearMatch[0],
        icon: <Calendar className="w-4 h-4" />,
      });
    }

    // Extract locations (capitalized words that might be places)
    const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
    if (
      locationMatch &&
      locationMatch[0].length > 3 &&
      !extractedClues.find(
        (c) => c.type === "location" && c.value === locationMatch[0],
      )
    ) {
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
      {
        type: "location",
        value: "Tranquility Base",
        icon: <MapPin className="w-4 h-4" />,
      },
      {
        type: "quote",
        value: "Eagle has landed",
        icon: <MessageSquare className="w-4 h-4" />,
      },
    );
  }

  const handleGuess = async (guess: string) => {
    if (guessHistory.includes(guess)) {
      toast.error("You've already tried that guess");
      return;
    }

    setGuessHistory((prev) => [...prev, guess]);
    setIsSubmitting(true);

    try {
      // In a real app, this would submit to backend API
      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

  if (isWaitingForSearcher) {
    return (
      <div className="min-h-screen scanlines">
        <Background />
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-center space-y-6 p-8 bg-card border border-border rounded-lg max-w-md mx-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                <ClassifiedStamp type="top-secret" animate={true} />
              </div>
            </div>
            <h2 className="text-2xl font-mono font-bold text-primary animate-pulse">
              AWAITING MISSION BRIEFING
            </h2>
            <p className="font-mono text-muted-foreground">
              The Searcher is currently selecting an intelligence target.
              <br />
              Stand by for encrypted transmission...
            </p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      {/* Leave Game Button */}
      <div className="fixed top-24 left-4 z-50">
        <LeaveGameButton />
      </div>

      <div className="min-h-screen pt-20 pb-8 px-4">
        {/* Top HUD */}
        <div className="flex items-center justify-between max-w-7xl mx-auto mb-6 pl-20 pr-4">
          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-muted-foreground">
              ROUND <span className="text-primary">{round}</span>/{totalRounds}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              GUESSES:{" "}
              <span className="text-primary">{guessHistory.length}</span>
            </div>
          </div>
          <Timer
            lobbyId={lobbyId}
            initialSeconds={timeLimit}
            onComplete={handleTimeUp}
            size="md"
          />
          <ClassifiedStamp
            type="classified"
            className="text-xs"
            animate={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Classified Document Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="font-mono text-lg font-bold text-foreground">
                CLASSIFIED DOCUMENT
              </h2>
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
                disabled={isSubmitting}
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
                <p className="font-mono text-sm text-destructive font-bold mb-2">
                  PREVIOUS ATTEMPTS:
                </p>
                <ul className="space-y-1">
                  {guessHistory.map((guess, index) => (
                    <li
                      key={index}
                      className="font-mono text-sm text-destructive/70 line-through"
                    >
                      {guess}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4 h-full flex flex-col">
            {/* Player Leaderboard */}
            <PlayerLeaderboard
              players={players}
              currentPlayerId={playerId}
              className="flex-shrink-0"
            />

            {/* Chat Panel */}
            <ChatPanel
              lobbyId={lobbyId}
              playerId={playerId}
              className="flex-shrink-0"
            />

            {/* Extracted Intel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-lg p-4 flex-1"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent" />
                <span className="font-mono text-sm font-bold">
                  EXTRACTED INTEL
                </span>
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
                    <span className="font-mono text-xs text-foreground">
                      {clue.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="font-mono text-xs text-muted-foreground">
                  Clues are automatically extracted from visible text. Use them
                  to form your hypothesis.
                </p>
              </div>
            </motion.div>

            {/* Emote Panel */}
            <EmotePanel
              lobbyId={lobbyId}
              playerId={playerId}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuesserActive;
