import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, X, History, Lightbulb, Send, Search, PenLine, Plus, Trash2 } from "lucide-react";
import { Timer } from "../ui/Timer";
import { TerminalInput } from "../ui/TerminalInput";
import { SearchResult as SearchResultCard, SearchResultSkeleton } from "../ui/SearchResult";
import { GlowButton } from "../ui/GlowButton";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";
import { RhythmControl } from "../ui/RhythmControl";
import { useRhythm } from "@/hooks/use-rhythm";
import { AudioEnablePrompt } from "../ui/AudioEnablePrompt";
import { AnimatePresence } from "framer-motion";

export interface SearchResultData {
  source: string;
  title: string;
  snippet: string;
  confidence?: number;
}

type InputMode = "search" | "keyword";

interface SearcherScreenProps {
  secretTopic: string;
  forbiddenWords: string[];
  round: number;
  totalRounds: number;
  searchesRemaining: number;
  rhythmMode?: boolean;
  bpm?: number;
  onSearch?: (query: string) => Promise<SearchResultData[]>;
  onSubmit?: () => void;
  onSendKeywords?: (keywords: string[]) => void;
  timeLimit?: number;
}

export function SearcherScreen({
  secretTopic,
  forbiddenWords,
  round,
  totalRounds,
  searchesRemaining,
  rhythmMode = false,
  bpm = 120,
  onSearch,
  onSubmit,
  onSendKeywords,
  timeLimit = 120,
}: SearcherScreenProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResultData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // Rhythm system
  const rhythm = useRhythm(bpm, rhythmMode);

  // Initialize audio on mount if rhythm mode enabled
  useEffect(() => {
    if (rhythmMode && rhythm.needsUserGesture) {
      // Audio will be initialized on first user interaction
      const handleClick = () => {
        rhythm.initializeAudio();
        document.removeEventListener('click', handleClick);
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [rhythmMode, rhythm]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setShowResults(false);
    setSearchHistory(prev => [...prev, query]);

    try {
      if (onSearch) {
        const searchResults = await onSearch(query);
        setResults(searchResults);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    }

    setIsSearching(false);
    setShowResults(true);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    
    if (!trimmed) return;
    
    // Check for forbidden words
    const foundForbidden = forbiddenWords.find(fw => 
      trimmed.includes(fw.toLowerCase())
    );
    
    if (foundForbidden) {
      setKeywordError(`Cannot use forbidden word: "${foundForbidden}"`);
      return;
    }
    
    if (keywords.length >= 5) {
      setKeywordError("Maximum 5 keywords allowed");
      return;
    }
    
    if (keywords.includes(trimmed)) {
      setKeywordError("Keyword already added");
      return;
    }
    
    setKeywords(prev => [...prev, trimmed]);
    setKeywordInput("");
    setKeywordError(null);
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  };

  const handleSendKeywords = () => {
    if (keywords.length > 0) {
      onSendKeywords?.(keywords);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      {/* Audio Enable Prompt */}
      <AnimatePresence>
        {rhythmMode && rhythm.needsUserGesture && (
          <AudioEnablePrompt onEnable={rhythm.initializeAudio} />
        )}
      </AnimatePresence>

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

          {/* Center Group: Timer and Rhythm */}
          <div className="flex items-center gap-4">
            <Timer seconds={timeLimit} size="sm" />
            
            {/* Rhythm Control */}
            {rhythmMode && (
              <RhythmControl
                bpm={bpm}
                isPlaying={rhythm.isPlaying}
                onVolumeChange={rhythm.setVolume}
                onMetronomeToggle={rhythm.toggleMetronome}
              />
            )}
          </div>

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

            {/* Mode Toggle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex gap-2"
            >
              <button
                onClick={() => setInputMode("search")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm font-bold transition-all ${
                  inputMode === "search"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:border-primary/50"
                }`}
              >
                <Search className="w-4 h-4" />
                Search Mode
              </button>
              <button
                onClick={() => setInputMode("keyword")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm font-bold transition-all ${
                  inputMode === "keyword"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border hover:border-accent/50"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Enter Keywords
              </button>
            </motion.div>

            {/* Search Terminal */}
            {inputMode === "search" && (
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
            )}

            {/* Keyword Entry */}
            {inputMode === "keyword" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-card border border-accent/30 rounded-xl p-4">
                  <p className="font-mono text-xs text-muted-foreground mb-3">
                    ENTER CUSTOM HINTS (Max 5)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => {
                        setKeywordInput(e.target.value);
                        setKeywordError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                      placeholder="Type a keyword or hint..."
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-lg font-mono text-sm
                        focus:outline-none focus:border-accent/50 placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleAddKeyword}
                      disabled={!keywordInput.trim()}
                      className="px-4 py-3 bg-accent text-accent-foreground rounded-lg font-mono font-bold
                        hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {keywordError && (
                    <p className="mt-2 text-sm text-destructive font-mono flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {keywordError}
                    </p>
                  )}

                  {/* Keyword List */}
                  {keywords.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="font-mono text-xs text-muted-foreground">
                        YOUR KEYWORDS ({keywords.length}/5)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-accent/20 border border-accent/40 rounded-lg font-mono text-sm"
                          >
                            {keyword}
                            <button
                              onClick={() => handleRemoveKeyword(keyword)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Send Keywords Button */}
                {keywords.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center"
                  >
                    <GlowButton
                      onClick={handleSendKeywords}
                      variant="amber"
                      size="lg"
                      icon={<Send className="w-5 h-5" />}
                    >
                      Send Keywords to Guesser
                    </GlowButton>
                  </motion.div>
                )}
              </motion.div>
            )}

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
                  {results.length > 0 ? (
                    <>
                      <p className="font-mono text-sm text-muted-foreground">
                        DECLASSIFIED RESULTS ({results.length})
                      </p>
                      {results.map((result, i) => (
                        <SearchResultCard
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
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 bg-card border border-border rounded-lg"
                    >
                      <p className="font-mono text-muted-foreground">
                        No results found. Try a different search query.
                      </p>
                    </motion.div>
                  )}
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
