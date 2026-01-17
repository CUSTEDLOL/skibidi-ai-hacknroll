import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { SearchResult, SearchResultSkeleton } from "@/components/ui/SearchResult";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { X, Search, Lightbulb, Send } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import { search, validateQuery, getRandomTopic, type SearchResponse } from "@/lib/api";
import { toast } from "sonner";

interface SearchResultData {
  source: string;
  title: string;
  snippet: string;
  confidence: number;
  link?: string;
  displayLink?: string;
}

interface SearchHistoryItem {
  query: string;
  results: SearchResultData[];
  timestamp: number;
}

const SearcherActive = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [currentResults, setCurrentResults] = useState<SearchResultData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedQueryIndex, setSelectedQueryIndex] = useState<number | null>(null);

  // Get game state from location state or use defaults
  const secretTopic = (location.state as any)?.secretTopic || "Moon Landing";
  const forbiddenWords = (location.state as any)?.forbiddenWords || ["moon", "apollo", "armstrong", "nasa", "space"];
  const round = (location.state as any)?.round || 1;
  const totalRounds = (location.state as any)?.totalRounds || 5;
  const timeLimit = (location.state as any)?.timeLimit || 120;
  const maxSearches = (location.state as any)?.maxSearches || 3;

  const searchesRemaining = maxSearches - searchHistory.length;

  // If no topic provided, fetch one
  useEffect(() => {
    if (!location.state?.secretTopic) {
      getRandomTopic().then((topicData) => {
        // Store in location state or use it directly
        // For now, we'll just use it - in a real app, this would come from game state
      }).catch((error) => {
        console.error("Failed to get topic:", error);
      });
    }
  }, []);

  const handleSearch = async (query: string) => {
    if (searchesRemaining <= 0) {
      toast.error("No searches remaining");
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    try {
      // First validate the query
      const validation = await validateQuery({
        query,
        forbidden_words: forbiddenWords,
      });

      if (!validation.valid) {
        toast.error(validation.message);
        setIsSearching(false);
        return;
      }

      // Perform the search
      const searchResponse: SearchResponse = await search({ query });

      // Transform results to match our UI format
      const transformedResults: SearchResultData[] = searchResponse.results.map((result, index) => ({
        source: result.displayLink || new URL(result.link).hostname,
        title: result.title,
        snippet: result.snippet,
        confidence: 85 - index * 5, // Mock confidence based on order
        link: result.link,
        displayLink: result.displayLink,
      }));

      // Add to search history
      const historyItem: SearchHistoryItem = {
        query,
        results: transformedResults,
        timestamp: Date.now(),
      };

      setSearchHistory(prev => [...prev, historyItem]);
      setCurrentResults(transformedResults);
      setIsSearching(false);
      setShowResults(true);
      setSelectedQueryIndex(searchHistory.length); // Index of the newly added search
    } catch (error: any) {
      console.error("Search failed:", error);
      toast.error(error.message || "Search failed");
      setIsSearching(false);
    }
  };

  const handleSubmitToGuesser = () => {
    if (selectedQueryIndex === null || !searchHistory[selectedQueryIndex]) {
      toast.error("Please select a search result to send");
      return;
    }

    // In a real app, this would send results to the backend/guesser via WebSocket
    // For now, navigate to round result
    const selectedSearch = searchHistory[selectedQueryIndex];
    
    // Store the selected search in location state for the next screen
    navigate("/game/round-result", {
      state: {
        selectedQuery: selectedSearch.query,
        selectedResults: selectedSearch.results,
        secretTopic,
        round,
      },
    });
  };

  const handleTimeUp = () => {
    // Auto-submit the last search if available
    if (searchHistory.length > 0 && selectedQueryIndex === null) {
      setSelectedQueryIndex(searchHistory.length - 1);
    }
    navigate("/game/round-result", {
      state: {
        selectedQuery: searchHistory[selectedQueryIndex || searchHistory.length - 1]?.query,
        selectedResults: searchHistory[selectedQueryIndex || searchHistory.length - 1]?.results,
        secretTopic,
        round,
      },
    });
  };

  const handleSelectQuery = (index: number) => {
    setSelectedQueryIndex(index);
    setCurrentResults(searchHistory[index].results);
    setShowResults(true);
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
          <Timer seconds={timeLimit} onComplete={handleTimeUp} size="md" />
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

              {showResults && !isSearching && currentResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center font-mono text-sm text-primary mb-4">
                    {selectedQueryIndex !== null 
                      ? `SELECTED QUERY: "${searchHistory[selectedQueryIndex].query}"`
                      : "SEARCH RESULTS"}
                  </div>
                  {currentResults.map((result, index) => (
                    <SearchResult
                      key={index}
                      source={result.source}
                      title={result.title}
                      snippet={result.snippet}
                      confidence={result.confidence / 100}
                      delay={index * 0.1}
                    />
                  ))}
                  {selectedQueryIndex !== null && (
                    <GlowButton
                      onClick={handleSubmitToGuesser}
                      variant="primary"
                      size="lg"
                      icon={<Send className="w-4 h-4" />}
                      className="w-full mt-4"
                    >
                      Send to Guesser
                    </GlowButton>
                  )}
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
                  {searchHistory.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectQuery(index)}
                      className={`font-mono text-xs cursor-pointer p-2 rounded transition-colors ${
                        selectedQueryIndex === index
                          ? 'bg-primary/20 text-primary border border-primary/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      }`}
                    >
                      {index + 1}. {item.query}
                      {selectedQueryIndex === index && (
                        <span className="ml-2 text-primary">✓</span>
                      )}
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
