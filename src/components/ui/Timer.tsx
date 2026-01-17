import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Timer({ seconds: initialSeconds, onComplete, size = "md", className = "" }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);
  
  const percentage = (seconds / initialSeconds) * 100;
  const radius = size === "sm" ? 30 : size === "md" ? 45 : 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  useEffect(() => {
    setIsWarning(seconds <= 30);
  }, [seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sizeClasses = {
    sm: { container: "w-20 h-20", text: "text-lg" },
    md: { container: "w-28 h-28", text: "text-2xl" },
    lg: { container: "w-36 h-36", text: "text-3xl" },
  };

  return (
    <div className={`relative ${sizeClasses[size].container} ${className}`}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth="4"
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke={isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth="4"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5 }}
          className={isWarning ? "animate-pulse" : ""}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={`font-mono font-bold ${sizeClasses[size].text} ${isWarning ? "text-destructive text-glow-red" : "text-primary text-glow-cyan"}`}
          animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {formatTime(seconds)}
        </motion.span>
      </div>
    </div>
  );
}
