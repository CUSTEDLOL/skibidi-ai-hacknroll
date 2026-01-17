import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { Timer } from "@/components/ui/Timer";
import { TerminalInput } from "@/components/ui/TerminalInput";
import {
  SearchResult,
  SearchResultSkeleton,
} from "@/components/ui/SearchResult";
import { ClassifiedStamp } from "@/components/ui/ClassifiedStamp";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { PlayerLeaderboard } from "@/components/ui/PlayerLeaderboard";
import { LeaveGameButton } from "@/components/ui/LeaveGameButton";
import { EmotePanel } from "@/components/ui/EmotePanel";
import { X, Search, Lightbulb, Send } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  search,
  validateQuery,
  getRandomTopic,
  type SearchResponse,
} from "@/lib/api";
import { toast } from "sonner";
import {
  getOrCreatePlayerId,
  getOrCreatePlayerName,
  type Player,
} from "@/lib/playerUtils";
import { socket } from "@/socket";

interface RedactedTerm {
  start: number;
  end: number;
  word: string;
}

interface SearchResultData {
  source: string;
  title: string;
  snippet: string;
  confidence: number;
  link?: string;
  displayLink?: string;
  redactedTerms?: {
    title: RedactedTerm[];
    snippet: RedactedTerm[];
  };
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
  const [selectedQueryIndex, setSelectedQueryIndex] = useState<number | null>(
    null,
  );

  // Game state
  const playerId = getOrCreatePlayerId();
  const playerName = getOrCreatePlayerName();

  // Mock lobby data (replace with actual websocket data later)
  const lobbyId = (location.state as any)?.lobbyId || "demo-lobby";
  const [players, setPlayers] = useState<Player[]>([
    {
      id: playerId,
      username: playerName,
      score: 0,
      isHost: true,
      role: "searcher",
      isReady: true,
    },
    {
      id: "p2",
      username: "Agent Cipher",
      score: 0,
      isHost: false,
      role: "guesser",
      isReady: true,
    },
    {
      id: "p3",
      username: "Neon Shadow",
      score: 0,
      isHost: false,
      role: "guesser",
      isReady: true,
    },
  ]);

  // Get game state from location state or use defaults
  const secretTopic = (location.state as any)?.secretTopic || "Moon Landing";
  const forbiddenWords = (location.state as any)?.forbiddenWords || [
    "moon",
    "apollo",
    "armstrong",
    "nasa",
    "space",
  ];
  const round = (location.state as any)?.round || 1;
  const totalRounds = (location.state as any)?.totalRounds || 5;
  const timeLimit = (location.state as any)?.timeLimit || 120;
  const maxSearches = (location.state as any)?.maxSearches || 3;

  // Handle pregenerated initial search if provided
  const initialSearchResults = (location.state as any)?.initialSearchResults;

  const searchesRemaining = maxSearches - searchHistory.length;

  // WebSocket event listeners
  useEffect(() => {
    // Listen for search results from backend
    const handleSearchResult = (data: {
      query: string;
      results: any[];
      count: number;
      valid: boolean;
      query_index: number;
      message?: string;
      violations?: string[];
    }) => {
      if (!data.valid) {
        toast.error(data.message || "Invalid search query");
        setIsSearching(false);
        return;
      }

      // Transform results to match our UI format
      const transformedResults: SearchResultData[] = data.results.map(
        (result, index) => ({
          source: result.displayLink || new URL(result.link || "").hostname,
          title: result.title || "",
          snippet: result.snippet || "",
          confidence: 85 - index * 5,
          link: result.link,
          displayLink: result.displayLink,
          redactedTerms: result.redactedTerms, // Include redaction indicators
        }),
      );

      // Add to search history
      const historyItem: SearchHistoryItem = {
        query: data.query,
        results: transformedResults,
        timestamp: Date.now(),
      };

      setSearchHistory((prev) => [...prev, historyItem]);
      setCurrentResults(transformedResults);
      setIsSearching(false);
      setShowResults(true);
      setSelectedQueryIndex(data.query_index);
      toast.success(`Found ${data.count} results`);
    };

    const handleQuerySelected = (data: {
      query_index: number;
      sent_results: number[];
      message: string;
    }) => {
      toast.success(data.message);
    };

    const handleError = (data: { message: string }) => {
      toast.error(data.message);
      setIsSearching(false);
    };

    socket.on("search_result", handleSearchResult);
    socket.on("query_selected", handleQuerySelected);
    socket.on("error", handleError);

    return () => {
      socket.off("search_result", handleSearchResult);
      socket.off("query_selected", handleQuerySelected);
      socket.off("error", handleError);
    };
  }, [searchHistory.length]);

  useEffect(() => {
    // If we have initial search results passed from topic selection, perform a "silent" search
    if (initialSearchResults && searchHistory.length === 0) {
      const transformedResults = initialSearchResults.map(
        (r: Record<string, any>, i: number) => ({
          source: new URL(r.url).hostname,
          title: r.title,
          snippet: r.snippet,
          confidence: 90 - i * 5,
          link: r.url,
        }),
      );

      setCurrentResults(transformedResults);
      setShowResults(true);
    }
  }, []);

  const handleSearch = (query: string) => {
    if (searchesRemaining <= 0) {
      toast.error("No searches remaining");
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    // Use WebSocket to perform search
    socket.emit("searcher_make_search", {
      room_key: lobbyId,
      query: query,
    });
  };

  const handleSubmitToGuesser = () => {
    if (selectedQueryIndex === null) {
      if (searchHistory.length === 0) {
        toast.error("Make a search first!");
        return;
      }
      // Auto-select the last search if none selected
      setSelectedQueryIndex(searchHistory.length - 1);
    }

    const indexToSend =
      selectedQueryIndex !== null
        ? selectedQueryIndex
        : searchHistory.length - 1;

    // Use WebSocket to select and send query to guessers
    socket.emit("searcher_select_query", {
      room_key: lobbyId,
      query_index: indexToSend,
    });

    toast.info("Sending to guessers...");
  };

  const handleSelectQuery = (index: number) => {
    setSelectedQueryIndex(index);
    setCurrentResults(searchHistory[index].results);
    setShowResults(true);

    // Auto-send when clicked
    socket.emit("searcher_select_query", {
      room_key: lobbyId,
      query_index: index,
    });
  };

  const handleTimeUp = () => {
    // Auto-submit the last search if available
    let lastQuery = "Time Expired";
    let lastResults: SearchResultData[] = [];

    if (searchHistory.length > 0) {
      const last = searchHistory[searchHistory.length - 1];
      lastQuery = last.query;
      lastResults = last.results;
    } else if (initialSearchResults) {
      // use initial
      lastQuery = "Initial Intelligence";
    }

    navigate("/game/round-result", {
      state: {
        selectedQuery: lastQuery,
        selectedResults: lastResults,
        secretTopic,
        round,
      },
    });
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      {/* Leave Game Button */}
      <div className="fixed top-24 left-4 z-50">
        <LeaveGameButton />
      </div>

      <div className="min-h-screen pt-20 pb-8 px-4">
        {/* Top HUD */}
        <div className="flex items-center justify-between max-w-7xl mx-auto mb-6 pl-20 pr-4">
          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-muted-foreground">
              ROUND <span className="text-primary">{round}</span>/{totalRounds}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              SEARCHES:{" "}
              <span className="text-primary">{searchesRemaining}</span>
            </div>
          </div>
          <Timer seconds={timeLimit} onComplete={handleTimeUp} size="md" />
          <ClassifiedStamp
            type="classified"
            className="text-xs"
            animate={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Secret Topic Display */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="text-center">
                <p className="font-mono text-xs text-muted-foreground mb-1">
                  YOUR SECRET TOPIC
                </p>
                <h2 className="text-2xl font-bold text-primary text-glow-cyan">
                  {secretTopic}
                </h2>
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
                <span className="font-mono text-sm text-destructive font-bold">
                  ⚠️ FORBIDDEN WORDS
                </span>
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
                      redactedTerms={result.redactedTerms}
                      isSelected={selectedQueryIndex === index}
                      onClick={() => handleSelectQuery(index)}
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

          {/* Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4 h-full flex flex-col">
            {/* Player Leaderboard */}
            <PlayerLeaderboard
              players={players}
              currentPlayerId={playerId}
              className="flex-shrink-0"
            />

            {/* Chat Panel */}
            <ChatPanel
              lobbyId={lobbyId}
              playerId={playerId}
              className="flex-shrink-0"
            />

            {/* Guesser Guesses Section (New) */}
            <div className="bg-card border border-border rounded-lg p-4 flex-1 min-h-[150px]">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="font-mono text-sm font-bold">
                  INCOMING INTEL
                </span>
              </div>
              <div className="space-y-2">
                {/* Placeholder for incoming guesses */}
                <p className="font-mono text-xs text-muted-foreground italic text-center py-4">
                  Awaiting guesses from field agents...
                </p>
              </div>
            </div>

            {/* Search History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-lg p-4 flex-shrink-0"
            >
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-bold">
                  SEARCH HISTORY
                </span>
              </div>
              {searchHistory.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  No searches yet...
                </p>
              ) : (
                <ul className="space-y-2">
                  {searchHistory.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectQuery(index)}
                      className={`font-mono text-xs cursor-pointer p-2 rounded transition-colors ${
                        selectedQueryIndex === index
                          ? "bg-primary/20 text-primary border border-primary/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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

            {/* Emote Panel */}
            <EmotePanel
              lobbyId={lobbyId}
              playerId={playerId}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearcherActive;
