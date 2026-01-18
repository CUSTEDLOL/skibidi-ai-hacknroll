import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { socket } from "@/socket";

interface TimerProps {
  lobbyId: string;
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  initialSeconds?: number; // Fallback if backend not connected yet
}

export function Timer({
  lobbyId,
  initialSeconds = 120,
  onComplete,
  size = "md",
  className = "",
}: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);

  const percentage = (seconds / totalSeconds) * 100;
  const radius = size === "sm" ? 30 : size === "md" ? 45 : 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    // Start local countdown
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen for timer sync from backend
    const handleTimerSync = (data: {
      timeRemaining: number;
      roundNumber: number;
    }) => {
      // Only sync if significant drift (> 2 seconds)
      setSeconds((currentSeconds) => {
        const drift = Math.abs(currentSeconds - data.timeRemaining);
        if (drift > 2) {
          return data.timeRemaining;
        }
        return currentSeconds;
      });

      if (data.timeRemaining <= 0) {
        onComplete?.();
      }
    };

    const handleRoundStarted = (data: { timeLimit: number }) => {
      setTotalSeconds(data.timeLimit);
      setSeconds(data.timeLimit);
    };

    const handleRoundEnded = () => {
      setSeconds(0);
      onComplete?.();
    };

    socket.on("round:timer_sync", handleTimerSync);
    socket.on("round:started", handleRoundStarted);
    socket.on("round:ended", handleRoundEnded);

    // Fetch initial round state on mount (for reconnections)
    fetch(`http://127.0.0.1:5000/api/round/state/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        // Only update if there's an active round
        if (data.roundState && data.timeRemaining !== undefined) {
          setSeconds(data.timeRemaining);
          if (data.roundState.timeLimit) {
            setTotalSeconds(data.roundState.timeLimit);
          }
        } else {
          // No active round yet - use initialSeconds fallback
          console.log("[Timer] No active round yet, using fallback timer");
        }
      })
      .catch((err) => {
        console.log("[Timer] Error fetching round state:", err);
        // Continue with fallback initialSeconds
      });

    return () => {
      clearInterval(interval);
      socket.off("round:timer_sync", handleTimerSync);
      socket.off("round:started", handleRoundStarted);
      socket.off("round:ended", handleRoundEnded);
    };
  }, [lobbyId, onComplete]);

  useEffect(() => {
    setIsWarning(seconds <= 30);
  }, [seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
