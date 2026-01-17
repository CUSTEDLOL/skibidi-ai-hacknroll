import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Clock, Users, Globe, Lock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import { DIFFICULTY_PRESETS, CATEGORIES } from "@/lib/playerUtils";
import { api, ApiError } from "@/lib/api";
import { getOrCreateUserId, getOrCreatePlayerName, setCurrentLobby } from "@/lib/userUtils";
import { toast } from "sonner";

type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';

const CreateRoom = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [rounds, setRounds] = useState(5);
  const [timePerRound, setTimePerRound] = useState(90);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState('general');
  const [rhythmMode, setRhythmMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Advanced options
  const [forbiddenWordsCount, setForbiddenWordsCount] = useState(5);
  const [redactionIntensity, setRedactionIntensity] = useState<'low' | 'medium' | 'high'>('medium');

  const roundOptions = [1, 3, 5, 10];
  const playerOptions = [2, 3, 4, 5, 6, 8];

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    if (newDifficulty !== 'custom') {
      const preset = DIFFICULTY_PRESETS[newDifficulty];
      setTimePerRound(preset.timePerRound);
      setForbiddenWordsCount(preset.forbiddenWordsCount);
    }
    if (newDifficulty === 'custom') {
      setShowAdvanced(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    
    try {
      const userId = getOrCreateUserId();
      const playerName = getOrCreatePlayerName();
      
      const response = await api.createLobby({
        isPublic,
        playerName,
        userId,
      });
      
      // Store lobby info and game config locally
      setCurrentLobby(response.lobbyId, response.lobbyCode);
      
      // Store game config for when starting the game
      localStorage.setItem('pending_game_config', JSON.stringify({
        difficulty,
        rounds,
        timePerRound,
        maxPlayers,
        category,
        rhythmMode,
        forbiddenWordsCount,
        redactionIntensity,
      }));
      
      toast.success(`Room created! Code: ${response.lobbyCode}`);
      navigate(`/lobby/${response.lobbyCode}`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create room. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center px-4 py-20">
        {/* Back Button */}
        <div className="w-full max-w-2xl mb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO MENU
          </button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <ClassifiedStamp type="classified" className="mb-4" />
          <h1 className="font-mono text-2xl font-bold text-foreground mb-2">MISSION PARAMETERS</h1>
          <p className="font-mono text-sm text-muted-foreground">Configure your operation settings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl space-y-6"
        >
          {/* Difficulty Selection */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              DIFFICULTY LEVEL
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'custom'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  className={`p-3 rounded-lg border font-mono text-sm transition-all ${
                    difficulty === level
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold capitalize">{level}</div>
                    <div className="text-xs mt-1">
                      {level === 'easy' && '⭐'}
                      {level === 'medium' && '⭐⭐'}
                      {level === 'hard' && '⭐⭐⭐'}
                      {level === 'custom' && '⚙️'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-3">
              {DIFFICULTY_PRESETS[difficulty].description}
            </p>
          </div>

          {/* Rounds */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              ROUNDS
            </h2>
            <div className="flex gap-2">
              {roundOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRounds(r)}
                  className={`flex-1 p-3 rounded-lg border font-mono text-sm transition-all ${
                    rounds === r
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Time Per Round */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              TIME PER ROUND: {formatTime(timePerRound)}
            </h2>
            <input
              type="range"
              min={30}
              max={300}
              step={30}
              value={timePerRound}
              onChange={(e) => setTimePerRound(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between font-mono text-xs text-muted-foreground mt-2">
              <span>0:30</span>
              <span>5:00</span>
            </div>
          </div>

          {/* Lobby Settings */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              LOBBY SETTINGS
            </h2>
            
            {/* Max Players */}
            <div className="mb-4">
              <label className="font-mono text-sm text-muted-foreground mb-2 block">Max Players</label>
              <div className="flex gap-2">
                {playerOptions.map((p) => (
                  <button
                    key={p}
                    onClick={() => setMaxPlayers(p)}
                    className={`flex-1 p-2 rounded-lg border font-mono text-sm transition-all ${
                      maxPlayers === p
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Type */}
            <div className="mb-4">
              <label className="font-mono text-sm text-muted-foreground mb-2 block">Room Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 p-3 rounded-lg border font-mono text-sm transition-all flex items-center justify-center gap-2 ${
                    isPublic
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 p-3 rounded-lg border font-mono text-sm transition-all flex items-center justify-center gap-2 ${
                    !isPublic
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="font-mono text-sm text-muted-foreground mb-2 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-background border border-border rounded-lg font-mono text-sm
                  focus:outline-none focus:border-primary/50 text-foreground"
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
                <h3 className="font-mono font-semibold text-foreground">🎵 Rhythm Mode</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {rhythmMode ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button
                onClick={() => setRhythmMode(!rhythmMode)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  rhythmMode ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-foreground transition-transform ${
                    rhythmMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-lg
              hover:border-primary/30 transition-colors font-mono text-sm text-muted-foreground"
          >
            <span>{showAdvanced ? '▲' : '▼'} Advanced Options</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-4"
              >
                <div>
                  <label className="font-mono text-sm text-muted-foreground mb-2 block">
                    Forbidden Words Count: {forbiddenWordsCount}
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    value={forbiddenWordsCount}
                    onChange={(e) => setForbiddenWordsCount(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <label className="font-mono text-sm text-muted-foreground mb-2 block">Redaction Intensity</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setRedactionIntensity(level)}
                        className={`flex-1 p-2 rounded-lg border font-mono text-sm capitalize transition-all ${
                          redactionIntensity === level
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  CREATING...
                </>
              ) : (
                'CREATE ROOM →'
              )}
            </GlowButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateRoom;
