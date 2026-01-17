import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "amber";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function GlowButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  pulse = false,
  disabled = false,
  className = "",
  icon,
}: GlowButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(180_100%_50%/0.5)]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-primary/30",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_20px_hsl(0_85%_55%/0.5)]",
    amber: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_20px_hsl(40_100%_50%/0.5)]",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        font-mono font-semibold uppercase tracking-wider rounded-md
        transition-all duration-300 flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${pulse ? "pulse-glow" : ""}
        ${className}
      `}
    >
      {icon}
      {children}
    </motion.button>
  );
}
