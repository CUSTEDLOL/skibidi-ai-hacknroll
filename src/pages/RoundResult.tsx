import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { RoundResult as RoundResultComponent } from "@/components/game/RoundResult";
import { PlayerLeaderboard } from "@/components/ui/PlayerLeaderboard";
import { getLobby, getRoundResults } from "@/lib/api";
import { getOrCreatePlayerId } from "@/lib/playerUtils";
import { Loader2 } from "lucide-react";
import { socket } from "@/socket";

const RoundResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roundStats, setRoundStats] = useState<any>(null);
  const [timeUsed, setTimeUsed] = useState(0);
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
    if (lobbyId) {
      // Fetch round results (detailed stats)
      getRoundResults(lobbyId).then((data) => {
        const myResult = data.results.find((r: any) => r.playerId === playerId);
        setRoundStats(myResult);

        // Use time from first result (should be same for all)
        if (data.results.length > 0) {
          setTimeUsed(data.results[0].timeUsed);
        }

        // Update leaderboard with these accurate scores
        const players = data.results.map((p: any) => ({
          id: p.playerId,
          username: p.playerName,
          score: p.score, // Total score
          guessCount: p.guessCount,
          searchCount: p.searchCount,
          role: p.role,
          isHost: false, // Will verify via lobby state
          isReady: true,
        }));
        setLobbyPlayers(players);
      });

      // Also fetch lobby state for host info and realtime updates
      getLobby(lobbyId).then((data) => {
        if (data.lobby && data.lobby.players.length > 0) {
          setIsHost(data.lobby.players[0].playerId === playerId);
        }
      });
    }

    const handleLobbyState = (data: { lobby: any }) => {
      if (data.lobby && data.lobby.players.length > 0) {
        setIsHost(data.lobby.players[0].playerId === playerId);
      }
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

  // Use fetched stats or fallback
  const guessAttempts = roundStats?.guessCount || 0;
  const searchAttempts = roundStats?.searchCount || 0;

  // Construct scores object from roundStats
  const scores = roundStats?.roundBreakdown
    ? {
        base: roundStats.roundBreakdown.base || 0,
        speedBonus: roundStats.roundBreakdown.speed || 0,
        efficiency: roundStats.roundBreakdown.efficiency || 0,
        firstTry: roundStats.roundBreakdown.firstTry || 0,
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
              searchAttempts={searchAttempts}
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
