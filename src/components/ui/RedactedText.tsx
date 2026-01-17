import { motion } from "framer-motion";
import { useState } from "react";

interface RedactedTextProps {
  text: string;
  revealed?: boolean;
  className?: string;
  onClick?: () => void;
}

export function RedactedText({ text, revealed = false, className = "", onClick }: RedactedTextProps) {
  const [isRevealed, setIsRevealed] = useState(revealed);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsRevealed(true);
  };

  if (isRevealed) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-primary font-medium ${className}`}
      >
        {text}
      </motion.span>
    );
  }

  return (
    <motion.span
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      className={`redacted cursor-pointer transition-all hover:opacity-80 ${className}`}
    >
      {"█".repeat(Math.min(text.length, 20))}
    </motion.span>
  );
}

export function RedactedBlock({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-black rounded-sm"
          style={{ width: `${60 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  );
}
