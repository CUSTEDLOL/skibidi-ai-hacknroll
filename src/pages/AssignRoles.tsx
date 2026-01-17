import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Eye, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { getOrCreatePlayerId, type Lobby, type Player } from "@/lib/playerUtils";

const AssignRoles = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [rolesRevealed, setRolesRevealed] = useState(false);
  const playerId = getOrCreatePlayerId();

  useEffect(() => {
    const storedLobby = localStorage.getItem('current_lobby');
    if (storedLobby) {
      setLobby(JSON.parse(storedLobby));
    }
  }, []);

  useEffect(() => {
    // Reveal roles after a delay
    const revealTimer = setTimeout(() => {
      setRolesRevealed(true);
    }, 1500);

    return () => clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    if (!rolesRevealed) return;

    // Start countdown after roles revealed
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Navigate based on role
          const currentPlayer = lobby?.players.find(p => p.id === playerId);
          if (currentPlayer?.role === 'searcher') {
            navigate('/game/searcher-briefing');
          } else {
            navigate('/game/guesser-active');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [rolesRevealed, lobby, playerId, navigate]);

  const currentPlayer = lobby?.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {/* Spinning Animation */}
          {!rolesRevealed ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 mx-auto mb-8 border-4 border-primary border-t-transparent rounded-full"
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mb-8"
            >
              <Zap className="w-24 h-24 mx-auto text-accent" />
            </motion.div>
          )}

          <h1 className="font-mono text-2xl md:text-3xl font-bold text-foreground mb-8">
            {rolesRevealed ? '⚡ ROLES ASSIGNED' : '⚡ ASSIGNING ROLES...'}
          </h1>

          {/* Player Roles */}
          <div className="space-y-4 mb-8">
            {lobby?.players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rolesRevealed ? index * 0.2 : 0 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  player.id === playerId
                    ? 'bg-primary/20 border-primary'
                    : 'bg-card border-border'
                }`}
              >
                <span className="font-mono text-foreground">{player.username}</span>
                
                {rolesRevealed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.3 }}
                    className="flex items-center gap-2"
                  >
                    {player.role === 'searcher' ? (
                      <>
                        <span className="font-mono text-primary font-bold">SEARCHER</span>
                        <Search className="w-5 h-5 text-primary" />
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-accent font-bold">GUESSER</span>
                        <Eye className="w-5 h-5 text-accent" />
                      </>
                    )}
                  </motion.div>
                ) : (
                  <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Your Role Highlight */}
          {rolesRevealed && currentPlayer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mb-8"
            >
              <p className="font-mono text-muted-foreground mb-2">YOUR ROLE</p>
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg ${
                currentPlayer.role === 'searcher'
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-accent/20 border-2 border-accent'
              }`}>
                {currentPlayer.role === 'searcher' ? (
                  <>
                    <Search className="w-6 h-6 text-primary" />
                    <span className="font-mono text-xl font-bold text-primary">SEARCHER</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-6 h-6 text-accent" />
                    <span className="font-mono text-xl font-bold text-accent">GUESSER</span>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Countdown */}
          {rolesRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="font-mono text-muted-foreground"
            >
              Starting in{' '}
              <span className="text-2xl text-primary font-bold">{countdown}</span>
              ...
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AssignRoles;
