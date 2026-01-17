import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Copy,
  LogOut,
  Settings,
  Send,
  Crown,
  Users,
  Clock,
  Zap,
  Globe,
  Lock,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  createLobby,
  joinLobby,
  getLobby,
  getLobbyByCode,
  startGame,
  type LobbyInfo,
} from "@/lib/api";
import { socket } from "@/socket";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  playerId: string;
  message: string;
  timestamp: string;
}

const Lobby = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerId = localStorage.getItem("player_id") || "";
  const lobbyIdRef = useRef<string | null>(null);
  const isGameStartingRef = useRef(false);

  // Load lobby data and join via WebSocket
  useEffect(() => {
    const loadLobby = async () => {
      if (!code) {
        toast.error("Invalid lobby code");
        navigate("/");
        return;
      }

      if (!playerId) {
        toast.error("No player ID found. Please join a lobby first.");
        navigate("/");
        return;
      }

      try {
        // Get lobby details from stored settings or fetch from API
        const storedSettings = localStorage.getItem("current_lobby_settings");
        let lobbyId = "";
        let lobbyData;
        let lobbyNotFound = false;

        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.lobbyId && parsed.lobbyCode === code) {
            lobbyId = parsed.lobbyId;
          }
        }

        // If no lobbyId in storage, fetch lobby by code (if code exists)
        if (!lobbyId && code) {
          try {
            // Fetch lobby by code
            lobbyData = await getLobbyByCode(code);
            lobbyId = lobbyData.lobby.lobbyId;
          } catch (err) {
            console.log("Lobby not found, will create new one");
            lobbyNotFound = true;
          }
        } else {
          try {
            // Fetch full lobby details by ID
            lobbyData = await getLobby(lobbyId);
          } catch (err) {
            console.log("Lobby not found by ID, will create new one");
            lobbyNotFound = true;
          }
        }

        // If lobby doesn't exist or data is invalid, create a new one
        if (lobbyNotFound || !lobbyData || !lobbyData.lobby || !code) {
          toast.info("Creating new lobby...");

          // Create a new lobby
          const newLobbyResponse = await createLobby({ isPublic: true });
          lobbyId = newLobbyResponse.lobbyId;

          // Get player name from storage or use a default
          const playerName =
            localStorage.getItem("player_username") || "Player";

          // Join the newly created lobby
          const joinResponse = await joinLobby(newLobbyResponse.lobbyCode, {
            playerName,
          });

          // Store the new player ID and lobby settings
          localStorage.setItem("player_id", joinResponse.userId);
          localStorage.setItem("player_username", joinResponse.playerName);
          localStorage.setItem(
            "current_lobby_settings",
            JSON.stringify({
              lobbyId: newLobbyResponse.lobbyId,
              lobbyCode: newLobbyResponse.lobbyCode,
              settings: {
                difficulty: "medium",
                rounds: 5,
                timePerRound: 90,
                rhythmMode: false,
              },
            }),
          );

          // Fetch the complete lobby data
          lobbyData = await getLobby(lobbyId);

          // Navigate to the new lobby code if different from current
          if (newLobbyResponse.lobbyCode !== code) {
            navigate(`/lobby/${newLobbyResponse.lobbyCode}`, { replace: true });
            return;
          }
        }

        lobbyIdRef.current = lobbyId;
        setLobby(lobbyData.lobby);

        // Store lobbyId in current_lobby_settings for persistence
        const existingSettings = localStorage.getItem("current_lobby_settings");
        const parsedSettings = existingSettings
          ? JSON.parse(existingSettings)
          : {};
        localStorage.setItem(
          "current_lobby_settings",
          JSON.stringify({
            ...parsedSettings,
            lobbyId,
            lobbyCode: code,
          }),
        );

        // Connect to WebSocket and join lobby room
        if (socket.connected) {
          socket.emit("lobby:join", {
            lobbyId,
            userId: playerId,
          });
        } else {
          socket.connect();
          socket.once("connect", () => {
            socket.emit("lobby:join", {
              lobbyId,
              userId: playerId,
            });
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load/create lobby:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load lobby",
        );
        setIsLoading(false);
        // Navigate back after a delay
        setTimeout(() => navigate("/"), 2000);
      }
    };

    loadLobby();

    // WebSocket event handlers
    const handleLobbyState = (data: { lobby: LobbyInfo }) => {
      setLobby(data.lobby);
    };

    const handlePlayerJoined = (data: {
      playerId: string;
      playerName: string;
      message: string;
    }) => {
      toast.success(data.message || `${data.playerName} joined the lobby`);
      // The lobby:state event will be sent separately to update the player list
    };

    const handlePlayerLeft = (data: {
      playerId: string;
      playerName: string;
      message: string;
    }) => {
      toast.info(data.message || `${data.playerName} left the lobby`);
      // The lobby:state event will be sent separately to update the player list
    };

    const handlePlayerDisconnected = (data: {
      playerId: string;
      playerName: string;
      message: string;
    }) => {
      toast.warning(data.message || `${data.playerName} disconnected`);
      // The lobby:state event will be sent separately to update connection status
    };

    const handleError = (data: { error: string }) => {
      toast.error(data.error || "An error occurred");
    };

    const handleGameStarted = (data: {
      gameId: string;
      gameConfig: {
        difficulty: string;
        rounds: number;
        timePerRound: number;
        isRhythmEnabled: boolean;
      };
      players: Array<{ playerId: string; role: string }>;
      message: string;
    }) => {
      console.log("Game started event received:", data);
      // Find current player's role
      const myPlayer = data.players.find((p) => p.playerId === playerId);

      // Get lobbyId from current_lobby_settings
      const settings = localStorage.getItem("current_lobby_settings");
      const actualLobbyId =
        lobbyIdRef.current || (settings ? JSON.parse(settings).lobbyId : null);

      if (myPlayer?.role) {
        // Mark as game starting to prevent lobby:leave
        isGameStartingRef.current = true;

        // Navigate based on role
        if (myPlayer.role === "searcher") {
          navigate("/game/searcher-briefing", {
            state: {
              lobbyId: lobbyIdRef.current,
              lobbyCode: code,
              gameConfig: data.gameConfig,
            },
          });
        } else if (myPlayer.role === "guesser") {
          navigate("/game/guesser-active", {
            state: {
              lobbyId: lobbyIdRef.current,
              lobbyCode: code,
              gameConfig: data.gameConfig,
            },
          });
        }
      }
    };

    socket.on("lobby:state", handleLobbyState);
    socket.on("lobby:player_joined", handlePlayerJoined);
    socket.on("lobby:player_left", handlePlayerLeft);
    socket.on("lobby:player_disconnected", handlePlayerDisconnected);
    socket.on("error", handleError);
    socket.on("game:started", handleGameStarted);

    // Cleanup
    return () => {
      socket.off("lobby:state", handleLobbyState);
      socket.off("lobby:player_joined", handlePlayerJoined);
      socket.off("lobby:player_left", handlePlayerLeft);
      socket.off("lobby:player_disconnected", handlePlayerDisconnected);
      socket.off("error", handleError);
      socket.off("game:started", handleGameStarted);

      // Leave lobby on unmount ONLY if game is NOT starting
      if (
        lobbyIdRef.current &&
        socket.connected &&
        !isGameStartingRef.current
      ) {
        socket.emit("lobby:leave", { lobbyId: lobbyIdRef.current });
      }
    };
  }, [code, playerId, navigate]);

  // Check if current player is host
  const isHost = lobby?.players[0]?.playerId === playerId;
  const canStart =
    lobby && lobby.players.length >= 2 && lobby.status === "waiting";

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied! Share with friends");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  const handleLeaveLobby = async () => {
    if (lobbyIdRef.current && socket.connected) {
      socket.emit("lobby:leave", { lobbyId: lobbyIdRef.current });
    }
    // Clean up localStorage
    localStorage.removeItem("player_id");
    localStorage.removeItem("player_username");
    localStorage.removeItem("current_lobby_settings");
    navigate("/");
  };

  const handleStartGame = async () => {
    if (!lobby || !canStart || !lobbyIdRef.current) return;

    setIsStarting(true);

    try {
      // Get settings from localStorage if available
      const storedSettings = localStorage.getItem("current_lobby_settings");
      let gameConfig = {
        difficulty: "medium",
        rounds: 5,
        timePerRound: 90,
        isRhythmEnabled: false,
      };

      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.settings) {
          gameConfig = {
            difficulty: parsed.settings.difficulty || "medium",
            rounds: parsed.settings.rounds || 5,
            timePerRound: parsed.settings.timePerRound || 90,
            isRhythmEnabled: parsed.settings.rhythmMode || false,
          };
        }
      }

      const result = await startGame(lobbyIdRef.current, gameConfig);

      // Mark as game starting to prevent lobby:leave
      isGameStartingRef.current = true;

      // Navigate to role assignment or game screen
      // The backend assigns roles, so we can navigate based on the player's role
      const myPlayer = result.players.find((p) => p.playerId === playerId);

      // Get lobbyId from current_lobby_settings
      const settings = localStorage.getItem("current_lobby_settings");
      const actualLobbyId =
        lobbyIdRef.current || (settings ? JSON.parse(settings).lobbyId : null);

      if (myPlayer?.role === "searcher") {
        navigate("/game/searcher-briefing", {
          state: {
            lobbyId: lobbyIdRef.current,
            lobbyCode: code,
            gameConfig: gameConfig,
          },
        });
      } else if (myPlayer?.role === "guesser") {
        navigate("/game/guesser-active", {
          state: {
            lobbyId: lobbyIdRef.current,
            lobbyCode: code,
            gameConfig: gameConfig,
          },
        });
      } else {
        navigate(`/lobby/${code}/assign-roles`);
      }
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start game",
      );
      setIsStarting(false);
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "⭐";
      case "medium":
        return "⭐⭐";
      case "hard":
        return "⭐⭐⭐";
      default:
        return "⚙️";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen scanlines flex items-center justify-center">
        <Background />
        <div className="font-mono text-muted-foreground">Loading lobby...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen scanlines flex items-center justify-center">
        <Background />
        <div className="font-mono text-destructive">Failed to load lobby</div>
      </div>
    );
  }

  const gameConfig = lobby.gameConfig || {
    difficulty: "medium",
    rounds: 5,
    timePerRound: 90,
    isRhythmEnabled: false,
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center px-4 py-20">
        {/* Top Actions */}
        <div className="w-full max-w-2xl flex items-center justify-end gap-2 mb-4">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg
              hover:border-primary/50 transition-colors font-mono text-sm"
          >
            <Copy className="w-4 h-4" />
            SHARE CODE
          </button>
          <button
            onClick={handleLeaveLobby}
            className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg
              hover:border-destructive/50 transition-colors font-mono text-sm text-destructive"
          >
            <LogOut className="w-4 h-4" />
            LEAVE
          </button>
        </div>

        {/* Lobby Code Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <ClassifiedStamp type="classified" className="mb-4" />
          <h1 className="font-mono text-xl text-muted-foreground mb-2">
            LOBBY CODE
          </h1>
          <div className="font-mono text-4xl md:text-5xl font-bold text-primary tracking-[0.3em]">
            {code}
          </div>
        </motion.div>

        <div className="w-full max-w-2xl space-y-4">
          {/* Players List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-semibold text-foreground">
                PLAYERS ({lobby.players.length}/2)
              </h2>
            </div>

            <div className="space-y-2">
              {lobby.players.map((player, index) => {
                const isConnected = player.isConnected === true; // Explicitly check for true
                const isInGame = lobby.status === "in_game";
                const isWaiting = lobby.status === "waiting";

                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      !isConnected ? "bg-muted/20 opacity-60" : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : isWaiting
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`font-mono flex-1 ${
                        isConnected
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {player.playerName}
                      {!isConnected && isWaiting && (
                        <span className="text-xs ml-2 text-yellow-600">
                          (CONNECTING...)
                        </span>
                      )}
                      {!isConnected && isInGame && (
                        <span className="text-xs ml-2 text-destructive">
                          (DISCONNECTED)
                        </span>
                      )}
                    </span>
                    {index === 0 && (
                      <div className="flex items-center gap-1 text-accent">
                        <Crown className="w-4 h-4" />
                        <span className="font-mono text-xs">HOST</span>
                      </div>
                    )}
                    {player.role && (
                      <span className="font-mono text-xs text-primary">
                        {player.role.toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Empty slots */}
              {Array.from({ length: 2 - lobby.players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border border-dashed border-border"
                >
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span className="font-mono text-muted-foreground">
                    Waiting for player...
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Game Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                <h2 className="font-mono font-semibold text-foreground">
                  GAME SETTINGS
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  Difficulty:
                </span>
                <span className="font-mono text-sm text-foreground">
                  {getDifficultyStars(gameConfig.difficulty)}{" "}
                  {gameConfig.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">
                  Rounds:
                </span>
                <span className="font-mono text-sm text-foreground">
                  {gameConfig.rounds}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">
                  Time:
                </span>
                <span className="font-mono text-sm text-foreground">
                  {formatTime(gameConfig.timePerRound)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lobby.isPublic ? (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="font-mono text-sm text-foreground">
                  {lobby.isPublic ? "Public" : "Private"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Chat */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-semibold text-foreground">CHAT</h2>
            </div>

            <div className="h-32 overflow-y-auto mb-3 space-y-2 scrollbar-thin">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground font-mono text-sm py-4">
                  No messages yet...
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="font-mono text-sm">
                    <span className="text-primary">{msg.playerId}:</span>{" "}
                    <span className="text-foreground">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type message..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm
                  focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-primary/20 border border-primary/50 rounded-lg
                  hover:bg-primary/30 transition-colors"
              >
                <Send className="w-4 h-4 text-primary" />
              </button>
            </div>
          </motion.div>

          {/* Role Assignment Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-accent/10 border border-accent/30 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-sm text-foreground">
                  Roles will be assigned when host starts game
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  1 Searcher + remaining players as Guessers
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 pt-4"
          >
            <button
              onClick={handleLeaveLobby}
              className="flex-1 py-4 bg-muted border border-border rounded-lg font-mono text-sm
                hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              LEAVE LOBBY
            </button>

            {isHost ? (
              <GlowButton
                onClick={handleStartGame}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={!canStart || isStarting}
              >
                {isStarting
                  ? "STARTING..."
                  : canStart
                    ? "START GAME →"
                    : "NEED 2+ PLAYERS"}
              </GlowButton>
            ) : (
              <div
                className="flex-1 py-4 bg-card border border-border rounded-lg font-mono text-sm
                flex items-center justify-center text-muted-foreground"
              >
                Waiting for host to start...
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
