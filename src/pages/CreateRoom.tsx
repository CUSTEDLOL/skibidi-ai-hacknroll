import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Zap,
  Clock,
  Users,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  DIFFICULTY_PRESETS,
  CATEGORIES,
  type GameSettings,
} from "@/lib/playerUtils";
import { socket } from "@/socket";
import { createLobby, joinLobby } from "@/lib/api";

type Difficulty = "easy" | "medium" | "hard" | "custom";

const CreateRoom = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [rounds, setRounds] = useState(5);
  const [timePerRound, setTimePerRound] = useState(90);
  const [minPlayers, setMinPlayers] = useState(2);
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState("general");
  const [rhythmMode, setRhythmMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Advanced options
  const [forbiddenWordsCount, setForbiddenWordsCount] = useState(5);
  const [redactionIntensity, setRedactionIntensity] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [hintCooldown, setHintCooldown] = useState(60);
  const [searchCooldown, setSearchCooldown] = useState(30);
  const [enableChat, setEnableChat] = useState(true);
  const [autoRotateRoles, setAutoRotateRoles] = useState(true);
  const [spectatorMode, setSpectatorMode] = useState(false);

  const roundOptions = [1, 3, 5, 10];
  const playerOptions = [2, 3, 4, 5, 6, 8];

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    if (newDifficulty !== "custom") {
      const preset = DIFFICULTY_PRESETS[newDifficulty];
      setTimePerRound(preset.timePerRound);
      setForbiddenWordsCount(preset.forbiddenWordsCount);
    }
    if (newDifficulty === "custom") {
      setShowAdvanced(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const handleCreateRoom = async () => {
    setIsCreating(true);

    try {
      // You can keep settings locally for now if your backend doesn't store them yet
      const settings: GameSettings = {
        difficulty,
        rounds,
        timePerRound,
        minPlayers,
        isPublic,
        category,
        rhythmMode,
        forbiddenWordsCount,
        redactionIntensity,
        hintCooldown,
        searchCooldown,
        enableChat,
        autoRotateRoles,
        spectatorMode,
      };

      // Create lobby on backend (backend generates lobbyCode + lobbyId)
      const lobbyData = await createLobby({ isPublic });
      const { lobbyId, lobbyCode } = lobbyData;

      // Get player name from input or storage
      const storedName = localStorage.getItem("player_username");
      
      // Now join the lobby to get userId and playerName
      const joinResult = await joinLobby(lobbyCode, { 
        playerName: storedName || undefined 
      });

      // Store userId and playerName in localStorage
      localStorage.setItem("player_id", joinResult.userId);
      localStorage.setItem("player_username", joinResult.playerName);

      // Keep settings client-side until backend supports it
      localStorage.setItem(
        "current_lobby_settings",
        JSON.stringify({
          lobbyId,
          lobbyCode,
          hostId: joinResult.userId,
          settings,
        }),
      );

      // Navigate using lobby code (URL join key)
      navigate(`/lobby/${lobbyCode}`);
    } catch (e) {
      console.error(e);
      // optionally show toast here
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center px-4 py-20 overflow-y-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="absolute top-24 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 mt-8"
        >
          <ClassifiedStamp type="classified" className="mb-4" />
          <h1 className="font-mono text-2xl md:text-3xl font-bold text-foreground mb-2">
            MISSION PARAMETERS
          </h1>
          <p className="font-mono text-muted-foreground">
            Configure your operation settings
          </p>
        </motion.div>

        {/* Settings Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-xl space-y-6"
        >
          {/* Difficulty */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-primary" />
              <h2 className="font-mono font-semibold text-foreground">
                DIFFICULTY LEVEL
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {(["easy", "medium", "hard", "custom"] as Difficulty[]).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => handleDifficultyChange(level)}
                    className={`p-3 rounded-lg border transition-all font-mono text-sm ${
                      difficulty === level
                        ? "bg-primary/20 border-primary text-foreground"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="capitalize">{level}</span>
                      <div className="flex">
                        {level === "easy" && (
                          <Star className="w-3 h-3 text-accent fill-accent" />
                        )}
                        {level === "medium" && (
                          <>
                            <Star className="w-3 h-3 text-accent fill-accent" />
                            <Star className="w-3 h-3 text-accent fill-accent" />
                          </>
                        )}
                        {level === "hard" && (
                          <>
                            <Star className="w-3 h-3 text-accent fill-accent" />
                            <Star className="w-3 h-3 text-accent fill-accent" />
                            <Star className="w-3 h-3 text-accent fill-accent" />
                          </>
                        )}
                        {level === "custom" && (
                          <Settings className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>

            <p className="font-mono text-xs text-muted-foreground">
              {DIFFICULTY_PRESETS[difficulty].description}
            </p>
          </div>

          {/* Rounds */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-accent" />
              <h2 className="font-mono font-semibold text-foreground">
                ROUNDS
              </h2>
            </div>

            <div className="flex gap-2">
              {roundOptions.map((num) => (
                <button
                  key={num}
                  onClick={() => setRounds(num)}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all font-mono text-sm ${
                    rounds === num
                      ? "bg-primary/20 border-primary text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setRounds(-1)}
                className={`flex-1 py-2 px-3 rounded-lg border transition-all font-mono text-sm ${
                  rounds === -1
                    ? "bg-primary/20 border-primary text-foreground"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                ∞
              </button>
            </div>
          </div>

          {/* Time Per Round */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-mono font-semibold text-foreground">
                  TIME PER ROUND
                </h2>
              </div>
              <span className="font-mono text-lg text-primary">
                {formatTime(timePerRound)}
              </span>
            </div>

            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={timePerRound}
              onChange={(e) => setTimePerRound(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between mt-2">
              <span className="font-mono text-xs text-muted-foreground">
                30s
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                5min
              </span>
            </div>
          </div>

          {/* Lobby Settings */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="font-mono font-semibold text-foreground">
                LOBBY SETTINGS
              </h2>
            </div>

            {/* Min Players */}
            <div className="mb-4">
              <label className="font-mono text-sm text-muted-foreground mb-2 block">
                Min Players
              </label>
              <div className="flex gap-2">
                {playerOptions.map((num) => (
                  <button
                    key={num}
                    onClick={() => setMinPlayers(num)}
                    className={`flex-1 py-2 rounded-lg border transition-all font-mono text-sm ${
                      minPlayers === num
                        ? "bg-primary/20 border-primary text-foreground"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Type */}
            <div className="mb-4">
              <label className="font-mono text-sm text-muted-foreground mb-2 block">
                Room Type
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-mono text-sm ${
                    isPublic
                      ? "bg-primary/20 border-primary text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-mono text-sm ${
                    !isPublic
                      ? "bg-primary/20 border-primary text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="font-mono text-sm text-muted-foreground mb-2 block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-3 px-4 bg-background border border-border rounded-lg font-mono text-sm
                  focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rhythm Mode Toggle */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono font-semibold text-foreground">
                  🎵 Rhythm Mode
                </h3>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {rhythmMode ? "Enabled - Music synced gameplay" : "Disabled"}
                </p>
              </div>
              <button
                onClick={() => setRhythmMode(!rhythmMode)}
                className={`w-14 h-7 rounded-full transition-all relative ${
                  rhythmMode ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                    rhythmMode ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <span className="font-mono font-semibold text-muted-foreground">
                Advanced Options
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 space-y-4">
                    {/* Forbidden Words Count */}
                    <div>
                      <label className="font-mono text-sm text-muted-foreground mb-2 block">
                        Forbidden Words: {forbiddenWordsCount}
                      </label>
                      <input
                        type="range"
                        min={3}
                        max={10}
                        value={forbiddenWordsCount}
                        onChange={(e) =>
                          setForbiddenWordsCount(Number(e.target.value))
                        }
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>

                    {/* Redaction Intensity */}
                    <div>
                      <label className="font-mono text-sm text-muted-foreground mb-2 block">
                        Redaction Intensity
                      </label>
                      <div className="flex gap-2">
                        {(["low", "medium", "high"] as const).map((level) => (
                          <button
                            key={level}
                            onClick={() => setRedactionIntensity(level)}
                            className={`flex-1 py-2 rounded-lg border transition-all font-mono text-sm capitalize ${
                              redactionIntensity === level
                                ? "bg-primary/20 border-primary text-foreground"
                                : "bg-card border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggle options */}
                    <div className="space-y-3">
                      {[
                        {
                          label: "Enable Chat",
                          value: enableChat,
                          setter: setEnableChat,
                        },
                        {
                          label: "Auto-Rotate Roles",
                          value: autoRotateRoles,
                          setter: setAutoRotateRoles,
                        },
                        {
                          label: "Spectator Mode",
                          value: spectatorMode,
                          setter: setSpectatorMode,
                        },
                      ].map(({ label, value, setter }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between"
                        >
                          <span className="font-mono text-sm text-muted-foreground">
                            {label}
                          </span>
                          <button
                            onClick={() => setter(!value)}
                            className={`w-10 h-5 rounded-full transition-all relative ${
                              value ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                                value ? "left-5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 pb-8">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-4 bg-muted border border-border rounded-lg font-mono text-sm
                hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
            <GlowButton
              onClick={handleCreateRoom}
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={isCreating}
            >
              {isCreating ? "CREATING..." : "CREATE ROOM →"}
            </GlowButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateRoom;
