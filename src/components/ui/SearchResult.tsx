import { motion } from "framer-motion";
import { ExternalLink, Shield, CheckCircle2 } from "lucide-react";

interface RedactedTerm {
  start: number;
  end: number;
  word: string;
}

interface SearchResultProps {
  source: string;
  title: string;
  snippet: string;
  confidence?: number;
  isRedacted?: boolean;
  delay?: number;
  redactedTerms?: {
    title: RedactedTerm[];
    snippet: RedactedTerm[];
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export function SearchResult({
  source,
  title,
  snippet,
  confidence = 0.7,
  isRedacted = true,
  delay = 0,
  redactedTerms,
  isSelected = false,
  onClick,
}: SearchResultProps) {
  // Function to render text with partial redaction (grey out redacted terms)
  const renderPartiallyRedactedText = (
    text: string,
    terms: RedactedTerm[] = [],
  ) => {
    if (!terms || terms.length === 0) {
      return text;
    }

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    terms.forEach((term, i) => {
      // Add text before this redacted term
      if (term.start > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>
            {text.substring(lastIndex, term.start)}
          </span>,
        );
      }

      // Add redacted term (greyed out)
      parts.push(
        <span
          key={`redacted-${i}`}
          className="text-muted-foreground/30 font-medium"
        >
          {text.substring(term.start, term.end)}
        </span>,
      );

      lastIndex = term.end;
    });

    // Add remaining text after last redacted term
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  // Function to redact text - keep some words visible (for guessers)
  const redactText = (text: string, intensity: number = 0.6) => {
    if (!isRedacted) return text;

    return text
      .split(" ")
      .map((word, i) => {
        // Keep shorter words and random selection visible
        if (word.length <= 2 || Math.random() > intensity) {
          return word;
        }
        return "█".repeat(word.length);
      })
      .join(" ");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={onClick}
      className={`relative bg-card border rounded-lg p-4 transition-all group ${
        isSelected
          ? "border-primary border-2 bg-primary/10 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          : "border-border hover:border-primary/30"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Declassifying animation overlay */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 0.8, delay: delay + 0.2 }}
        className="absolute inset-0 bg-card origin-left z-10"
      />

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 z-20"
        >
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </motion.div>
      )}

      {/* Source */}
      <div className="flex items-center gap-2 mb-2">
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">
          {source}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {redactedTerms?.title && redactedTerms.title.length > 0
          ? renderPartiallyRedactedText(title, redactedTerms.title)
          : redactText(title, 0.4)}
      </h4>

      {/* Snippet */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {redactedTerms?.snippet && redactedTerms.snippet.length > 0
          ? renderPartiallyRedactedText(snippet, redactedTerms.snippet)
          : redactText(snippet, 0.6)}
      </p>

      {/* Confidence bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>CONFIDENCE:</span>
        </div>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 0.8, delay: delay + 0.5 }}
            className={`h-full rounded-full ${
              confidence > 0.7
                ? "bg-success"
                : confidence > 0.4
                  ? "bg-accent"
                  : "bg-destructive"
            }`}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    </motion.div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="h-3 w-24 bg-secondary rounded mb-3" />
      <div className="h-5 w-3/4 bg-secondary rounded mb-2" />
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-secondary rounded" />
        <div className="h-3 w-5/6 bg-secondary rounded" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-3 w-20 bg-secondary rounded" />
        <div className="flex-1 h-1.5 bg-secondary rounded" />
      </div>
    </div>
  );
}
