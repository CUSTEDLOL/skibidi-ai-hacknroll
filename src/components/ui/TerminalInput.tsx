import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Search, Send, Lock } from "lucide-react";

interface TerminalInputProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  forbiddenWords?: string[];
  className?: string;
  type?: "search" | "guess";
}

export function TerminalInput({
  placeholder = "Enter command...",
  onSubmit,
  disabled = false,
  forbiddenWords = [],
  className = "",
  type = "search",
}: TerminalInputProps) {
  const [value, setValue] = useState("");
  const [hasForbiddenWord, setHasForbiddenWord] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lowerValue = value.toLowerCase();
    const forbidden = forbiddenWords.some(word => 
      lowerValue.includes(word.toLowerCase())
    );
    setHasForbiddenWord(forbidden);
  }, [value, forbiddenWords]);

  const handleSubmit = async () => {
    if (!value.trim() || disabled || hasForbiddenWord) return;
    
    setIsEncrypting(true);
    
    // Simulate encryption delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsEncrypting(false);
    onSubmit?.(value);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      <div
        className={`
          relative flex items-center gap-3 p-4 rounded-lg
          bg-card border-2 transition-all duration-300
          ${hasForbiddenWord 
            ? "border-destructive shadow-[0_0_20px_hsl(0_85%_55%/0.3)]" 
            : "border-primary/30 focus-within:border-primary focus-within:shadow-[0_0_20px_hsl(180_100%_50%/0.3)]"
          }
        `}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="font-mono text-sm text-primary">SECURE_TERMINAL&gt;</span>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isEncrypting}
          placeholder={placeholder}
          className={`
            flex-1 bg-transparent font-mono text-foreground
            placeholder:text-muted-foreground focus:outline-none
            disabled:cursor-not-allowed
          `}
        />

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {value.length}/100
          </span>
          
          <motion.button
            onClick={handleSubmit}
            disabled={disabled || !value.trim() || hasForbiddenWord || isEncrypting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              p-2 rounded-md font-mono text-sm uppercase tracking-wider
              flex items-center gap-2 transition-all
              ${hasForbiddenWord
                ? "bg-destructive/20 text-destructive cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isEncrypting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                <span>Encrypting...</span>
              </>
            ) : (
              <>
                {type === "search" ? <Search className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>{type === "search" ? "Transmit" : "Submit"}</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {hasForbiddenWord && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-0 text-sm font-mono text-destructive flex items-center gap-2"
        >
          <span className="animate-pulse">⚠</span>
          FORBIDDEN WORD DETECTED - Query rejected
        </motion.div>
      )}

      {isEncrypting && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8 }}
          className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full"
        />
      )}
    </motion.div>
  );
}
