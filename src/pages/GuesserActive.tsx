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
import { useAudio } from "@/contexts/AudioContext";


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
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);

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
    const fetchLobby = () => {
      if (lobbyId) {
        getLobby(lobbyId).then((data) => {
          if (data.lobby) {
            updatePlayers(data.lobby);
          }
        });
      }
    };

    const updatePlayers = (lobby: any) => {
      const lobbyPlayers = lobby.players.map((p: any) => ({
        id: p.playerId,
        username: p.playerName,
        score: p.score || 0,
        isHost: lobby.players[0].playerId === p.playerId,
        role: p.role || "guesser",
        isReady: true,
      }));
      setPlayers(lobbyPlayers);
    };

    fetchLobby();

    const handleLobbyState = (data: { lobby: any }) => {
      updatePlayers(data.lobby);
    };

    socket.on("lobby:state", handleLobbyState);

    return () => {
      socket.off("lobby:state", handleLobbyState);
    };
  }, [lobbyId]);

  // Get game state from location state or use defaults
  const round = (location.state as any)?.round || 1;
  const totalRounds = (location.state as any)?.totalRounds || 5;
  const timeLimit = (location.state as any)?.timeLimit || 120;

  const { playBackgroundMusic, stopBackgroundMusic, setMusicIntensity } = useAudio();

  // Play guesser music on mount
  useEffect(() => {
    if (!isWaitingForSearcher) {
      playBackgroundMusic('guesser');
    }
    
    return () => {
      stopBackgroundMusic();
    };
  }, [isWaitingForSearcher, playBackgroundMusic, stopBackgroundMusic]);

  // Update music intensity based on time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      // Intensity increases as time runs low
      const intensity = Math.min(1, (timeLimit - 30) / timeLimit);
      setMusicIntensity(Math.max(0, intensity));
    }, 5000);

    return () => clearInterval(interval);
  }, [timeLimit, setMusicIntensity]);

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

    const handleNewResult = (data: { results: any[]; timestamp?: number }) => {
      console.log("[Guesser] Received new results from searcher:", data);
      setRedactedResults(
        data.results.map((r) => ({
          source:
            r.displayLink || (r.link ? new URL(r.link).hostname : "Unknown"),
          title: r.title || "",
          snippet: r.snippet || "",
          link: r.link,
        })),
      );
      toast.success("New intelligence received from Searcher!");
    };

    const handleRoundEnded = (data: {
      reason: string;
      roundNumber: number;
      message?: string;
      timeUsed?: number;
    }) => {
      toast.success(data.message || "Round Ended");
      navigate("/game/round-result", {
        state: {
          round: data.roundNumber,
          lobbyId,
          reason: data.reason,
          timeUsed: data.timeUsed,
        },
      });
    };

    const handleGuessResult = (data: {
      correct: boolean;
      score?: number;
      totalScore?: number;
      breakdown?: any;
      message?: string;
    }) => {
      setIsSubmitting(false);
      if (data.correct) {
        setHasGuessedCorrectly(true);
        setWaitingForOthers(true);
        toast.success("Hypothesis Confirmed! Waiting for team...");
      } else {
        toast.error(data.message || "Incorrect hypothesis");
      }
    };

    // Ensure we are joined to the lobby room for broadcasts
    if (lobbyId && playerId) {
      socket.emit("lobby:join", { lobbyId, userId: playerId });
    }

    socket.on("round:started", handleRoundStarted);
    socket.on("round:new_result", handleNewResult);
    socket.on("round:ended", handleRoundEnded);
    socket.on("round:guess_result", handleGuessResult);

    return () => {
      socket.off("round:started", handleRoundStarted);
      socket.off("round:new_result", handleNewResult);
      socket.off("round:ended", handleRoundEnded);
      socket.off("round:guess_result", handleGuessResult);
    };
  }, [lobbyId, navigate, playerId]);

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


  const handleGuess = async (guess: string) => {
    if (guessHistory.includes(guess)) {
      toast.error("You've already tried that guess");
      return;
    }

    setGuessHistory((prev) => [...prev, guess]);
    setIsSubmitting(true);

    try {
      if (!lobbyId) return;

      const result = await makeGuess({
        lobbyId,
        userId: playerId,
        guess,
      });

      if (!result.correct) {
        setIsSubmitting(false);
        toast.error("Incorrect hypothesis");
      }
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
    // Backend timer will trigger round:ended
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
              {hasGuessedCorrectly ? (
                <div className="p-6 bg-green-500/10 border border-green-500/50 rounded-lg text-center animate-pulse">
                  <div className="flex justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-green-500 font-mono mb-2">
                    HYPOTHESIS CONFIRMED
                  </h3>
                  <p className="text-sm text-green-400 font-mono mb-4">
                    Target identified correctly. Secure comms established.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for team extraction...
                  </div>
                </div>
              ) : (
                <>
                  <TerminalInput
                    onSubmit={handleGuess}
                    placeholder="Enter your hypothesis..."
                    disabled={isSubmitting || waitingForOthers}
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
                </>
              )}
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
