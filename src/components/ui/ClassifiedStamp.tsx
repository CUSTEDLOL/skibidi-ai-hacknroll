import { motion } from "framer-motion";

interface ClassifiedStampProps {
  type?: "classified" | "top-secret" | "confidential" | "redacted";
  className?: string;
  animate?: boolean;
}

export function ClassifiedStamp({ type = "classified", className = "", animate = true }: ClassifiedStampProps) {
  const stamps = {
    "classified": {
      text: "CLASSIFIED",
      className: "text-destructive border-destructive",
    },
    "top-secret": {
      text: "TOP SECRET",
      className: "text-accent border-accent",
    },
    "confidential": {
      text: "CONFIDENTIAL",
      className: "text-primary border-primary",
    },
    "redacted": {
      text: "[REDACTED]",
      className: "text-muted-foreground border-muted-foreground",
    },
  };

  const stamp = stamps[type];
  const baseClassName = `font-mono font-bold text-sm md:text-base uppercase tracking-widest border-2 px-3 py-1 inline-block transform ${stamp.className} ${className}`;

  if (!animate) {
    return <div className={baseClassName}>{stamp.text}</div>;
  }

  return (
    <motion.div
      initial={{ scale: 2, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: -5 }}
      transition={{ type: "spring" as const, damping: 15, stiffness: 300 }}
      className={baseClassName}
    >
      {stamp.text}
    </motion.div>
  );
}
