import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Clock,
  Target,
  Music,
  ChevronDown,
  Sparkles,
  Gauge,
  Star,
  Skull,
  Settings2,
} from "lucide-react";
import { GlowButton } from "../ui/GlowButton";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";
import {
  GameConfig,
  Difficulty,
  RoundCount,
  Category,
  DIFFICULTY_PRESETS,
  CATEGORY_OPTIONS,
  ROUND_OPTIONS,
  DEFAULT_CONFIG,
  applyDifficultyPreset,
  formatTime,
} from "@/lib/gameConfig";

interface GameConfigScreenProps {
  onBack?: () => void;
  onContinue?: (config: GameConfig) => void;
  initialConfig?: GameConfig;
}

const difficultyIcons: Record<Difficulty, React.ReactNode> = {
  easy: <Sparkles className="w-5 h-5" />,
  medium: <Gauge className="w-5 h-5" />,
  hard: <Star className="w-5 h-5" />,
  veryHard: <Skull className="w-5 h-5" />,
  custom: <Settings2 className="w-5 h-5" />,
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "text-green-400 border-green-400/50 bg-green-400/10",
  medium: "text-primary border-primary/50 bg-primary/10",
  hard: "text-orange-400 border-orange-400/50 bg-orange-400/10",
  veryHard: "text-red-400 border-red-400/50 bg-red-400/10",
  custom: "text-purple-400 border-purple-400/50 bg-purple-400/10",
};

export function GameConfigScreen({
  onBack,
  onContinue,
  initialConfig = DEFAULT_CONFIG,
}: GameConfigScreenProps) {
  const [config, setConfig] = useState<GameConfig>(initialConfig);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDifficultySelect = (difficulty: Difficulty) => {
    if (difficulty === "custom") {
      setConfig((prev) => ({ ...prev, difficulty: "custom" }));
    } else {
      setConfig(applyDifficultyPreset(config, difficulty));
    }
  };

  const handleRoundSelect = (rounds: RoundCount) => {
    setConfig((prev) => ({ ...prev, rounds }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timePerRound = parseInt(e.target.value);
    setConfig((prev) => ({
      ...prev,
      timePerRound,
      difficulty: "custom",
    }));
  };

  const handleRhythmToggle = () => {
    setConfig((prev) => ({ ...prev, rhythmMode: !prev.rhythmMode }));
  };

  const handleCategoryChange = (category: Category) => {
    setConfig((prev) => ({ ...prev, category }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <ClassifiedStamp type="classified" className="mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Mission Parameters
        </h1>
        <p className="font-mono text-muted-foreground">
          Configure your operation settings
        </p>
      </motion.div>

      <div className="w-full max-w-4xl space-y-8">
        {/* Difficulty Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-mono text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            DIFFICULTY LEVEL
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["easy", "medium", "hard", "veryHard", "custom"] as Difficulty[]).map(
              (diff) => {
                const isSelected = config.difficulty === diff;
                const preset = diff !== "custom" ? DIFFICULTY_PRESETS[diff] : null;

                return (
                  <motion.button
                    key={diff}
                    onClick={() => handleDifficultySelect(diff)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all
                      ${isSelected ? difficultyColors[diff] : "border-border bg-card hover:border-muted-foreground"}
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className={isSelected ? "" : "text-muted-foreground"}>
                        {difficultyIcons[diff]}
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {preset?.name || "Custom"}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="difficulty-indicator"
                        className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center"
                      >
                        <span className="text-[10px]">✓</span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              }
            )}
          </div>

          {/* Difficulty description */}
          <AnimatePresence mode="wait">
            {config.difficulty !== "custom" && (
              <motion.p
                key={config.difficulty}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 text-sm text-muted-foreground text-center font-mono"
              >
                {DIFFICULTY_PRESETS[config.difficulty].description}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Round Count */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-mono text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            ROUNDS
          </h2>
          <div className="flex flex-wrap gap-2">
            {ROUND_OPTIONS.map((rounds) => (
              <button
                key={rounds}
                onClick={() => handleRoundSelect(rounds)}
                className={`
                  px-6 py-3 rounded-lg font-mono text-sm font-bold transition-all
                  ${
                    config.rounds === rounds
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:border-primary/50"
                  }
                `}
              >
                {rounds === "endless" ? "∞" : rounds}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Time Per Round */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-mono text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            TIME PER ROUND: <span className="text-primary">{formatTime(config.timePerRound)}</span>
          </h2>
          <input
            type="range"
            min={30}
            max={300}
            step={15}
            value={config.timePerRound}
            onChange={handleTimeChange}
            className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(var(--primary))]"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono mt-1">
            <span>30s</span>
            <span>5min</span>
          </div>
        </motion.section>

        {/* Rhythm Mode & Category */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Rhythm Mode */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-mono font-bold">Rhythm Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {config.rhythmMode ? `${config.bpm} BPM` : "Disabled"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRhythmToggle}
                className={`
                  w-14 h-7 rounded-full transition-all relative
                  ${config.rhythmMode ? "bg-accent" : "bg-muted"}
                `}
              >
                <motion.div
                  animate={{ x: config.rhythmMode ? 28 : 4 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                />
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-mono text-sm text-muted-foreground mb-2">CATEGORY</p>
            <select
              value={config.category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-sm
                focus:outline-none focus:border-primary/50"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </motion.section>

        {/* Advanced Options */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            <span className="font-mono text-sm">Advanced Options</span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-3 gap-4 mt-4 p-4 bg-card border border-border rounded-xl">
                  {/* Forbidden Words */}
                  <div>
                    <label className="font-mono text-xs text-muted-foreground">
                      Forbidden Words
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={config.forbiddenWordCount}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          forbiddenWordCount: parseInt(e.target.value) || 3,
                          difficulty: "custom",
                        }))
                      }
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 font-mono
                        focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  {/* Fuzzy Match */}
                  <div>
                    <label className="font-mono text-xs text-muted-foreground">
                      Match Accuracy: {config.fuzzyMatchThreshold}%
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={config.fuzzyMatchThreshold}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fuzzyMatchThreshold: parseInt(e.target.value),
                          difficulty: "custom",
                        }))
                      }
                      className="w-full mt-2"
                    />
                  </div>

                  {/* Hints */}
                  <div>
                    <label className="font-mono text-xs text-muted-foreground">
                      Hints Per Game
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={config.hintsPerGame === "unlimited" ? 99 : config.hintsPerGame}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hintsPerGame: parseInt(e.target.value) || 0,
                          difficulty: "custom",
                        }))
                      }
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 font-mono
                        focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Config Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-card/50 border border-border rounded-xl p-4"
        >
          <p className="font-mono text-xs text-muted-foreground mb-2">MISSION SUMMARY</p>
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <span className="px-2 py-1 bg-primary/20 rounded">{config.difficulty.toUpperCase()}</span>
            <span className="px-2 py-1 bg-muted rounded">
              {config.rounds === "endless" ? "Endless" : `${config.rounds} rounds`}
            </span>
            <span className="px-2 py-1 bg-muted rounded">{formatTime(config.timePerRound)}/round</span>
            <span className="px-2 py-1 bg-muted rounded">{config.forbiddenWordCount} forbidden</span>
            {config.rhythmMode && (
              <span className="px-2 py-1 bg-accent/20 text-accent rounded">{config.bpm} BPM</span>
            )}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-4 pt-4"
        >
          <GlowButton
            onClick={onBack}
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </GlowButton>
          <GlowButton
            onClick={() => onContinue?.(config)}
            variant="primary"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Continue
          </GlowButton>
        </motion.div>
      </div>
    </div>
  );
}
