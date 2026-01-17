import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { GlowButton } from "@/components/ui/GlowButton";
import { getRandomTopics, TopicData } from "@/lib/topicData";
import { Target, AlertTriangle, Fingerprint } from "lucide-react";
import { selectTopic } from "@/lib/api";
import { toast } from "sonner";
import { getOrCreatePlayerId } from "@/lib/playerUtils";

const SearcherBriefing = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicData | null>(null);

  useEffect(() => {
    // Fetch random topics from our static DB
    const randomTopics = getRandomTopics(4);
    setTopics(randomTopics);
  }, []);

  const handleTopicSelect = (topic: TopicData) => {
    setSelectedTopic(topic);
  };

  const handleConfirmMission = async () => {
    if (!selectedTopic) return;

    // Get lobbyId from current_lobby_settings
    const settings = localStorage.getItem("current_lobby_settings");
    let lobbyId = null;
    if (settings) {
      const parsed = JSON.parse(settings);
      lobbyId = parsed.lobbyId;
    }

    if (!lobbyId) {
      // No lobbyId found, redirect to home
      navigate("/");
      return;
    }

    try {
      const playerId = getOrCreatePlayerId();

      // Call backend to initialize round and start timer
      const result = await selectTopic({
        lobbyId,
        userId: playerId,
        topic: selectedTopic.title,
        forbiddenWords: selectedTopic.forbiddenWords,
        roundNumber: 1,
        timeLimit: 120,
      });

      // Navigate to SearcherActive with the selected topic and real backend results
      navigate("/game/searcher-active", {
        state: {
          secretTopic: selectedTopic.title,
          forbiddenWords: selectedTopic.forbiddenWords,
          initialSearchResults: result.initialResults,
          round: 1,
          totalRounds: 5,
          timeLimit: 120,
          maxSearches: 5,
          lobbyId,
        },
      });
    } catch (error: any) {
      console.error("Failed to start mission:", error);
      toast.error(
        error.message || "Failed to start mission. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block relative">
              <ClassifiedStamp
                type="top-secret"
                className="absolute -top-6 -right-12 rotate-12"
              />
              <h1 className="text-3xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary animate-pulse">
                MISSION SELECTION
              </h1>
            </div>
            <p className="mt-4 font-mono text-muted-foreground">
              Select an intelligence target for this operation.
            </p>
          </div>

          {/* Grid of Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {topics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleTopicSelect(topic)}
                className={`group relative p-6 bg-card border rounded-lg cursor-pointer transition-all duration-300 ${
                  selectedTopic?.id === topic.id
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded bg-muted/50 border border-white/5">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${
                      topic.difficulty === "easy"
                        ? "border-green-500/50 text-green-500"
                        : topic.difficulty === "medium"
                          ? "border-yellow-500/50 text-yellow-500"
                          : "border-red-500/50 text-red-500"
                    }`}
                  >
                    {topic.difficulty}
                  </div>
                </div>

                <h3 className="font-mono text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {topic.title}
                </h3>

                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <AlertTriangle className="w-3 h-3" />
                  {topic.forbiddenWords.length} FORBIDDEN KEYWORDS
                </div>

                {selectedTopic?.id === topic.id && (
                  <motion.div
                    layoutId="selection-ring"
                    className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Confirm Button */}
          <div className="flex justify-center">
            <GlowButton
              onClick={handleConfirmMission}
              disabled={!selectedTopic}
              size="lg"
              className="w-full md:w-auto min-w-[300px]"
              icon={<Fingerprint className="w-5 h-5" />}
            >
              {selectedTopic ? "CONFIRM TARGET" : "SELECT A TARGET"}
            </GlowButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SearcherBriefing;
