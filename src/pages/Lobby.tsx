import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import { api, ApiError, type LobbyData, type PlayerData } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { getOrCreateUserId, getOrCreatePlayerName, clearCurrentLobby, getCurrentLobby } from "@/lib/userUtils";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

const Lobby = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const userId = getOrCreateUserId();
  const playerName = getOrCreatePlayerName();

  // Load initial lobby data
  useEffect(() => {
    const loadLobby = async () => {
      const currentLobby = getCurrentLobby();
      if (!currentLobby) {
        toast.error("No lobby found. Please join a lobby first.");
        navigate("/");
        return;
      }

      try {
        const response = await api.getLobby(currentLobby.lobbyId);
        setLobby(response.lobby);
      } catch (error) {
        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load lobby.");
        }
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadLobby();
  }, [navigate]);

  // Socket connection for real-time updates
  const handleLobbyUpdate = useCallback((updatedLobby: LobbyData) => {
    setLobby(updatedLobby);
    
    // Check if game started
    if (updatedLobby.status === 'in_game' && updatedLobby.gameId) {
      // Find current player's role
      const currentPlayer = updatedLobby.players.find(p => p.id === userId);
      if (currentPlayer?.role === 'searcher') {
        navigate('/game/searcher-briefing');
      } else {
        navigate('/game/guesser-active');
      }
    }
  }, [userId, navigate]);

  const handleSocketError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const handleConnect = useCallback(() => {
    toast.success("Connected to lobby");
  }, []);

  const handleDisconnect = useCallback(() => {
    toast.warning("Disconnected from lobby. Reconnecting...");
  }, []);

  const currentLobby = getCurrentLobby();
  const { isConnected, isConnecting, leaveLobby } = useSocket({
    lobbyId: currentLobby?.lobbyId || '',
    userId,
    onLobbyUpdate: handleLobbyUpdate,
    onError: handleSocketError,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  // Determine if current user is host
  const isHost = lobby?.players?.[0]?.id === userId;
  const canStart = lobby && lobby.players.length >= 2;

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied! Share with friends");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !lobby) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: userId,
      playerName,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
  };

  const handleLeaveLobby = () => {
    leaveLobby();
    clearCurrentLobby();
    navigate("/");
  };

  const handleStartGame = async () => {
    if (!lobby || !canStart || !currentLobby) return;
    
    setIsStarting(true);
    
    try {
      // Get game config from localStorage or use defaults
      const pendingConfig = localStorage.getItem('pending_game_config');
      const config = pendingConfig ? JSON.parse(pendingConfig) : {
        difficulty: 'medium',
        rounds: 5,
        timePerRound: 90,
        isRhythmEnabled: false,
      };
      
      await api.startGame(currentLobby.lobbyId, {
        difficulty: config.difficulty,
        rounds: config.rounds,
        timePerRound: config.timePerRound,
        isRhythmEnabled: config.rhythmMode || false,
      });
      
      // Clean up pending config
      localStorage.removeItem('pending_game_config');
      
      // Navigation will happen via socket update
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to start game.");
      }
      setIsStarting(false);
    }
  };

  const getDifficultyStars = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      default: return '⭐⭐';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '1:30';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen scanlines flex items-center justify-center">
        <Background />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="font-mono text-muted-foreground">Loading lobby...</div>
        </div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen scanlines flex items-center justify-center">
        <Background />
        <div className="font-mono text-muted-foreground">Lobby not found</div>
      </div>
    );
  }

  // Get game config from localStorage or use defaults
  const pendingConfig = localStorage.getItem('pending_game_config');
  const gameConfig = pendingConfig ? JSON.parse(pendingConfig) : lobby.gameConfig || {
    difficulty: 'medium',
    rounds: 5,
    timePerRound: 90,
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center px-4 py-20">
        {/* Connection Status & Top Actions */}
        <div className="w-full max-w-2xl flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {isConnecting ? (
              <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting...
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2 text-green-500 font-mono text-xs">
                <Wifi className="w-3 h-3" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive font-mono text-xs">
                <WifiOff className="w-3 h-3" />
                Disconnected
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        {/* Lobby Code Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <ClassifiedStamp type="classified" className="mb-4" />
          <h1 className="font-mono text-xl text-muted-foreground mb-2">LOBBY CODE</h1>
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
                PLAYERS ({lobby.players.length}/{gameConfig.maxPlayers || 4})
              </h2>
            </div>
            
            <div className="space-y-2">
              <AnimatePresence>
                {lobby.players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-mono text-foreground flex-1">{player.name}</span>
                    {index === 0 && (
                      <div className="flex items-center gap-1 text-accent">
                        <Crown className="w-4 h-4" />
                        <span className="font-mono text-xs">HOST</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Empty slots */}
              {Array.from({ length: (gameConfig.maxPlayers || 4) - lobby.players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border border-dashed border-border"
                >
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span className="font-mono text-muted-foreground">Waiting for player...</span>
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
                <h2 className="font-mono font-semibold text-foreground">GAME SETTINGS</h2>
              </div>
              {isHost && (
                <button 
                  onClick={() => navigate('/create-room')}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  ⚙️ EDIT SETTINGS
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">Difficulty:</span>
                <span className="font-mono text-sm text-foreground">
                  {getDifficultyStars(gameConfig.difficulty)} {gameConfig.difficulty || 'medium'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">Rounds:</span>
                <span className="font-mono text-sm text-foreground">
                  {gameConfig.rounds === -1 ? '∞' : gameConfig.rounds || 5}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">Time:</span>
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
                  {lobby.isPublic ? 'Public' : 'Private'}
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
                    <span className="text-primary">{msg.playerName}:</span>{' '}
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
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    STARTING...
                  </>
                ) : canStart ? (
                  'START GAME →'
                ) : (
                  'NEED 2+ PLAYERS'
                )}
              </GlowButton>
            ) : (
              <div className="flex-1 py-4 bg-card border border-border rounded-lg font-mono text-sm
                flex items-center justify-center text-muted-foreground">
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
