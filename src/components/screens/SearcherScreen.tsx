import { motion } from "framer-motion";
import { useState } from "react";
import { AlertTriangle, X, History, Lightbulb, Send } from "lucide-react";
import { Timer } from "../ui/Timer";
import { TerminalInput } from "../ui/TerminalInput";
import { SearchResult, SearchResultSkeleton } from "../ui/SearchResult";
import { GlowButton } from "../ui/GlowButton";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

interface SearcherScreenProps {
  secretTopic: string;
  forbiddenWords: string[];
  round: number;
  totalRounds: number;
  searchesRemaining: number;
  onSearch?: (query: string) => void;
  onSubmit?: () => void;
  timeLimit?: number;
}

// Mock search results
const mockResults = [
  {
    source: "wikipedia.org",
    title: "The historic landing that changed humanity forever",
    snippet: "On July 20th, the mission achieved what many thought impossible. The crew successfully completed their objective, marking a pivotal moment in history.",
    confidence: 0.85,
  },
  {
    source: "history.com",
    title: "One small step: The journey to another world",
    snippet: "The famous words spoken during the mission have echoed through generations. This achievement represented the culmination of years of scientific advancement.",
    confidence: 0.72,
  },
  {
    source: "nasa.gov",
    title: "Mission archives and historical documentation",
    snippet: "Official records and photographs from the historic expedition. The technology used was groundbreaking for its era and pushed the boundaries of exploration.",
    confidence: 0.68,
  },
];

export function SearcherScreen({
  secretTopic = "Moon Landing",
  forbiddenWords = ["moon", "apollo", "armstrong", "nasa", "space"],
  round = 2,
  totalRounds = 5,
  searchesRemaining = 3,
  onSearch,
  onSubmit,
  timeLimit = 120,
}: SearcherScreenProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [results, setResults] = useState<typeof mockResults>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setShowResults(false);
    setSearchHistory(prev => [...prev, query]);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setResults(mockResults);
    setIsSearching(false);
    setShowResults(true);
    onSearch?.(query);
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Top HUD */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          {/* Round Info */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-card border border-border rounded-lg">
              <span className="font-mono text-sm text-muted-foreground">ROUND </span>
              <span className="font-mono text-lg font-bold text-primary">{round}/{totalRounds}</span>
            </div>
            <ClassifiedStamp type="classified" className="hidden sm:block" animate={false} />
          </div>

          {/* Timer */}
          <Timer seconds={timeLimit} size="sm" />

          {/* Searches Remaining */}
          <div className="px-4 py-2 bg-card border border-border rounded-lg">
            <span className="font-mono text-sm text-muted-foreground">SEARCHES: </span>
            <span className="font-mono text-lg font-bold text-accent">{searchesRemaining}</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Search Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Secret Topic Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-primary/30 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-muted-foreground">YOUR SECRET TOPIC</span>
                <ClassifiedStamp type="top-secret" className="text-xs" animate={false} />
              </div>
              <h2 className="text-2xl font-bold text-primary text-glow-cyan text-center">
                {secretTopic}
              </h2>
            </motion.div>

            {/* Forbidden Words */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-mono text-sm text-destructive font-bold">FORBIDDEN WORDS</span>
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
              transition={{ delay: 0.3 }}
            >
              <TerminalInput
                placeholder="Enter your search query..."
                onSubmit={handleSearch}
                forbiddenWords={forbiddenWords}
                type="search"
              />
            </motion.div>

            {/* Search Results */}
            <div className="space-y-4">
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <p className="font-mono text-primary animate-pulse">ENCRYPTING QUERY...</p>
                  <div className="mt-4 space-y-3">
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </div>
                </motion.div>
              )}

              {showResults && (
                <>
                  <p className="font-mono text-sm text-muted-foreground">
                    DECLASSIFIED RESULTS ({results.length})
                  </p>
                  {results.map((result, i) => (
                    <SearchResult
                      key={i}
                      {...result}
                      isRedacted={false}
                      delay={i * 0.2}
                    />
                  ))}
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center pt-4"
                  >
                    <GlowButton
                      onClick={onSubmit}
                      variant="primary"
                      size="lg"
                      icon={<Send className="w-5 h-5" />}
                    >
                      Send to Guesser
                    </GlowButton>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Search History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">SEARCH HISTORY</span>
              </div>
              {searchHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No searches yet</p>
              ) : (
                <ul className="space-y-2">
                  {searchHistory.map((query, i) => (
                    <li key={i} className="font-mono text-sm text-foreground/70 truncate">
                      &gt; {query}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span className="font-mono text-sm text-accent">TIPS</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
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
}
