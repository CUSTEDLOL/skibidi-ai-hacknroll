import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { SearchResult, SearchResultSkeleton } from "@/components/ui/SearchResult";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { X, Search, Lightbulb, Send } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";

interface SearchResultData {
  source: string;
  title: string;
  snippet: string;
  confidence: number;
}

const SearcherActive = () => {
  const navigate = useNavigate();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResultData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Demo data
  const secretTopic = "Moon Landing";
  const forbiddenWords = ["moon", "apollo", "armstrong", "nasa", "space"];
  const round = 2;
  const totalRounds = 5;
  const searchesRemaining = 3 - searchHistory.length;

  const handleSearch = async (query: string) => {
    setSearchHistory(prev => [...prev, query]);
    setIsSearching(true);
    setShowResults(false);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock results
    setResults([
      {
        source: "wikipedia.org",
        title: "The Historic █████ of 1969",
        snippet: "In July 1969, the world witnessed a historic moment when astronauts successfully completed their mission to █████...",
        confidence: 85,
      },
      {
        source: "history.com",
        title: "█████ Program Achievement",
        snippet: "The ambitious program achieved its goal when █████ became the first person to walk on the lunar surface...",
        confidence: 72,
      },
      {
        source: "space.com",
        title: "One Small Step for Mankind",
        snippet: "\"That's one small step for man, one giant leap for mankind\" - these words echoed across the world on July 20...",
        confidence: 90,
      },
    ]);

    setIsSearching(false);
    setShowResults(true);
  };

  const handleSubmitToGuesser = () => {
    // In real app, this would send results to guesser
    navigate("/game/round-result");
  };

  const handleTimeUp = () => {
    navigate("/game/round-result");
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen pt-20 pb-8 px-4">
        {/* Top HUD */}
        <div className="flex items-center justify-between max-w-6xl mx-auto mb-6">
          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-muted-foreground">
              ROUND <span className="text-primary">{round}</span>/{totalRounds}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              SEARCHES: <span className="text-primary">{searchesRemaining}</span>
            </div>
          </div>
          <Timer seconds={120} onComplete={handleTimeUp} size="md" />
          <ClassifiedStamp type="classified" className="text-xs" animate={false} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Secret Topic Display */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="text-center">
                <p className="font-mono text-xs text-muted-foreground mb-1">YOUR SECRET TOPIC</p>
                <h2 className="text-2xl font-bold text-primary text-glow-cyan">{secretTopic}</h2>
              </div>
            </motion.div>

            {/* Forbidden Words */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-sm text-destructive font-bold">⚠️ FORBIDDEN WORDS</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {forbiddenWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/20 border border-destructive/40 rounded font-mono text-sm text-destructive"
                  >
                    <X className="w-3 h-3" />
                    {word}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Search Terminal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TerminalInput
                onSubmit={handleSearch}
                placeholder="Enter your search query..."
                forbiddenWords={forbiddenWords}
                disabled={searchesRemaining <= 0 || isSearching}
              />
            </motion.div>

            {/* Search Results */}
            <div className="space-y-4">
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center font-mono text-sm text-accent animate-pulse">
                    TRANSMITTING QUERY...
                  </div>
                  {[1, 2, 3].map((i) => (
                    <SearchResultSkeleton key={i} />
                  ))}
                </motion.div>
              )}

              {showResults && !isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center font-mono text-sm text-primary mb-4">
                    QUERY SENT TO GUESSER...
                  </div>
                  {results.map((result, index) => (
                    <SearchResult
                      key={index}
                      source={result.source}
                      title={result.title}
                      snippet={result.snippet}
                      confidence={result.confidence / 100}
                      delay={index * 0.1}
                    />
                  ))}
                  <GlowButton
                    onClick={handleSubmitToGuesser}
                    variant="primary"
                    size="lg"
                    icon={<Send className="w-4 h-4" />}
                    className="w-full mt-4"
                  >
                    Send to Guesser
                  </GlowButton>
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Search History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-bold">SEARCH HISTORY</span>
              </div>
              {searchHistory.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No searches yet...</p>
              ) : (
                <ul className="space-y-2">
                  {searchHistory.map((query, index) => (
                    <li key={index} className="font-mono text-xs text-muted-foreground truncate">
                      {index + 1}. {query}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span className="font-mono text-sm font-bold">TIPS</span>
              </div>
              <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                <li>• Try related terms and synonyms</li>
                <li>• Think laterally about the topic</li>
                <li>• Consider historical context</li>
                <li>• Use descriptive adjectives</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearcherActive;
