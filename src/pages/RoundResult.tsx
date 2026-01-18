import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { RoundResult as RoundResultComponent } from "@/components/game/RoundResult";
import { PlayerLeaderboard } from "@/components/ui/PlayerLeaderboard";
import { getLobby } from "@/lib/api";
import { getOrCreatePlayerId } from "@/lib/playerUtils";
import { Loader2 } from "lucide-react";
import { socket } from "@/socket";

const RoundResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const playerId = getOrCreatePlayerId();

  // Get lobby info from localStorage
  const getLobbyInfo = () => {
    const settings = localStorage.getItem("current_lobby_settings");
    if (settings) {
      return JSON.parse(settings);
    }
    return null;
  };

  const lobbyInfo = getLobbyInfo();
  const lobbyCode = lobbyInfo?.lobbyCode || "";
  const lobbyId = lobbyInfo?.lobbyId || (location.state as any)?.lobbyId;

  useEffect(() => {
    const fetchLobby = () => {
      if (lobbyId) {
        getLobby(lobbyId).then((data) => {
          if (data.lobby) {
            updateLobbyState(data.lobby);
          }
        });
      }
    };

    const updateLobbyState = (lobby: any) => {
      // Transform players for leaderboard (ensure score exists)
      const players = lobby.players.map((p: any) => ({
        id: p.playerId,
        username: p.playerName,
        score: p.score || 0,
        guessCount: p.guessCount || 0,
        isHost: lobby.players[0].playerId === p.playerId,
        role: p.role || "guesser",
        isReady: true,
      }));
      setLobbyPlayers(players);

      // Check if current user is host
      if (lobby.players.length > 0) {
        setIsHost(lobby.players[0].playerId === playerId);
      }
    };

    fetchLobby();

    const handleLobbyState = (data: { lobby: any }) => {
      updateLobbyState(data.lobby);
    };

    socket.on("lobby:state", handleLobbyState);

    return () => {
      socket.off("lobby:state", handleLobbyState);
    };
  }, [lobbyId, playerId]);

  // Get game state from location or defaults
  const round = (location.state as any)?.round || 1;
  const totalRounds =
    (location.state as any)?.totalRounds || lobbyInfo?.settings?.rounds || 5;
  const success = (location.state as any)?.reason === "success";
  const timeUsed = (location.state as any)?.timeUsed || 0;

  const currentPlayer = lobbyPlayers.find((p: any) => p.id === playerId);
  const guessAttempts = currentPlayer?.guessCount || 0;

  // Use passed score breakdown if available, else demo
  // Note: Backend emits breakdown to socket, but navigation state might not have it unless passed.
  // Ideally we should fetch score from backend or use what's passed.
  // For now, we'll default to demo if missing, but `success` flag logic helps.

  const scores = success
    ? {
        base: 100,
        speedBonus: 50,
        efficiency: 25,
        firstTry: 100,
      }
    : undefined;

  const handleContinue = () => {
    if (round < totalRounds) {
      // Proceed to next round via Assign Roles
      if (lobbyCode) {
        navigate(`/lobby/${lobbyCode}/assign-roles`);
      } else {
        navigate("/");
      }
    } else {
      navigate("/game/final-results");
    }
  };

  return (
    <div className="min-h-screen scanlines overflow-y-auto">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-24 pb-10 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start justify-center"
        >
          {/* Main Result Card */}
          <div className="flex-1 w-full">
            <RoundResultComponent
              success={success}
              secretTopic={"CLASSIFIED"} // Hide actual topic unless we want to reveal it. Usually reveal.
              scores={scores}
              timeUsed={timeUsed}
              totalTime={120}
              guessAttempts={guessAttempts}
              onContinue={isHost ? handleContinue : undefined}
            />
            {!isHost && (
              <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground font-mono animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for Host to continue...
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="w-full md:w-80 flex-shrink-0">
            <PlayerLeaderboard
              players={lobbyPlayers}
              currentPlayerId={playerId}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RoundResult;
