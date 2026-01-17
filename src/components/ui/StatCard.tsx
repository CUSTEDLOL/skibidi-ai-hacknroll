import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = "" }: StatCardProps) {
  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`
        bg-card border border-border rounded-lg p-4
        hover:border-primary/50 transition-all duration-300
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono ${trend ? trendColors[trend] : "text-foreground"}`}>
          {value}
        </span>
      </div>
    </motion.div>
  );
}

export function XPBar({ current, max, level }: { current: number; max: number; level: number }) {
  const percentage = (current / max) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-muted-foreground">CLEARANCE LEVEL</span>
        <span className="font-mono text-sm text-primary font-bold">LVL {level}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-primary/70"
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>{current} XP</span>
        <span>{max} XP</span>
      </div>
    </div>
  );
}
