import { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import { getOrCreatePlayerId, type Lobby as LobbyType, type Player, type ChatMessage } from "@/lib/playerUtils";
import { toast } from "sonner";

const Lobby = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<LobbyType | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const playerId = getOrCreatePlayerId();

  useEffect(() => {
    // Load lobby from localStorage (will be replaced with WebSocket)
    const storedLobby = localStorage.getItem('current_lobby');
    if (storedLobby) {
      const parsed = JSON.parse(storedLobby) as LobbyType;
      if (parsed.code === code) {
        setLobby(parsed);
      } else {
        // Try to join as new player
        const newPlayer: Player = {
          id: playerId,
          username: playerId,
          isHost: false,
          role: null,
        };
        parsed.players.push(newPlayer);
        localStorage.setItem('current_lobby', JSON.stringify(parsed));
        setLobby(parsed);
      }
    } else {
      // Create placeholder lobby for joining with code
      const newLobby: LobbyType = {
        code: code || '',
        hostId: playerId,
        settings: {
          difficulty: 'medium',
          rounds: 5,
          timePerRound: 90,
          maxPlayers: 4,
          isPublic: false,
          category: 'general',
          rhythmMode: false,
        },
        players: [{
          id: playerId,
          username: playerId,
          isHost: true,
          role: null,
        }],
        status: 'waiting',
        chatMessages: [],
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('current_lobby', JSON.stringify(newLobby));
      setLobby(newLobby);
    }
  }, [code, playerId]);

  const isHost = lobby?.hostId === playerId;
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
      playerId,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const updatedLobby = {
      ...lobby,
      chatMessages: [...lobby.chatMessages, newMessage],
    };
    setLobby(updatedLobby);
    localStorage.setItem('current_lobby', JSON.stringify(updatedLobby));
    setChatInput("");
  };

  const handleLeaveLobby = () => {
    localStorage.removeItem('current_lobby');
    navigate("/");
  };

  const handleStartGame = () => {
    if (!lobby || !canStart) return;
    
    setIsStarting(true);
    
    // Auto-assign roles
    const players = [...lobby.players];
    const searcherIndex = Math.floor(Math.random() * players.length);
    
    players.forEach((player, i) => {
      player.role = i === searcherIndex ? 'searcher' : 'guesser';
    });
    
    const updatedLobby = {
      ...lobby,
      players,
      status: 'starting' as const,
    };
    localStorage.setItem('current_lobby', JSON.stringify(updatedLobby));
    
    // Navigate to role assignment screen
    setTimeout(() => {
      navigate(`/lobby/${code}/assign-roles`);
    }, 500);
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      default: return '⚙️';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!lobby) {
    return (
      <div className="min-h-screen scanlines flex items-center justify-center">
        <Background />
        <div className="font-mono text-muted-foreground">Loading lobby...</div>
      </div>
    );
  }

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
                PLAYERS ({lobby.players.length}/{lobby.settings.maxPlayers})
              </h2>
            </div>
            
            <div className="space-y-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-mono text-foreground flex-1">{player.username}</span>
                  {player.isHost && (
                    <div className="flex items-center gap-1 text-accent">
                      <Crown className="w-4 h-4" />
                      <span className="font-mono text-xs">HOST</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: lobby.settings.maxPlayers - lobby.players.length }).map((_, i) => (
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
                <button className="font-mono text-xs text-primary hover:underline">
                  ⚙️ EDIT SETTINGS
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">Difficulty:</span>
                <span className="font-mono text-sm text-foreground">
                  {getDifficultyStars(lobby.settings.difficulty)} {lobby.settings.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">Rounds:</span>
                <span className="font-mono text-sm text-foreground">
                  {lobby.settings.rounds === -1 ? '∞' : lobby.settings.rounds}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">Time:</span>
                <span className="font-mono text-sm text-foreground">
                  {formatTime(lobby.settings.timePerRound)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lobby.settings.isPublic ? (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="font-mono text-sm text-foreground">
                  {lobby.settings.isPublic ? 'Public' : 'Private'}
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
              {lobby.chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground font-mono text-sm py-4">
                  No messages yet...
                </div>
              ) : (
                lobby.chatMessages.map((msg) => (
                  <div key={msg.id} className="font-mono text-sm">
                    <span className="text-primary">{msg.playerId}:</span>{' '}
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
                {isStarting ? 'STARTING...' : canStart ? 'START GAME →' : 'NEED 2+ PLAYERS'}
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
