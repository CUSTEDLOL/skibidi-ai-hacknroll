import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useAudio } from "@/contexts/AudioContext";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "amber";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function GlowButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  icon,
}: GlowButtonProps) {
  const { playHover, playClick } = useAudio();

  const variants = {
    primary: {
      base: "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground",
      glow: "shadow-[0_0_30px_hsl(175_100%_45%/0.5),0_0_60px_hsl(175_100%_45%/0.2)]",
      hover: "hover:shadow-[0_0_40px_hsl(175_100%_45%/0.7),0_0_80px_hsl(175_100%_45%/0.3)]",
    },
    secondary: {
      base: "bg-card/80 backdrop-blur-sm text-foreground border border-primary/30",
      glow: "",
      hover: "hover:border-primary/60 hover:bg-card",
    },
    danger: {
      base: "bg-gradient-to-br from-destructive via-destructive to-destructive/80 text-destructive-foreground",
      glow: "shadow-[0_0_30px_hsl(0_85%_55%/0.5),0_0_60px_hsl(0_85%_55%/0.2)]",
      hover: "hover:shadow-[0_0_40px_hsl(0_85%_55%/0.7),0_0_80px_hsl(0_85%_55%/0.3)]",
    },
    amber: {
      base: "bg-gradient-to-br from-accent via-accent to-accent/80 text-accent-foreground",
      glow: "shadow-[0_0_30px_hsl(38_100%_55%/0.5),0_0_60px_hsl(38_100%_55%/0.2)]",
      hover: "hover:shadow-[0_0_40px_hsl(38_100%_55%/0.7),0_0_80px_hsl(38_100%_55%/0.3)]",
    },
  };

  const sizes = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-6 py-3.5 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const handleClick = () => {
    if (!disabled) {
      playClick();
      onClick?.();
    }
  };

  const handleHover = () => {
    if (!disabled) {
      playHover();
    }
  };

  const variantStyles = variants[variant];

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
      className={`
        relative font-mono font-semibold uppercase tracking-wider rounded-xl
        transition-all duration-300 flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles.base}
        ${variantStyles.glow}
        ${variantStyles.hover}
        ${sizes[size]}
        ${className}
      `}
    >
      {/* Inner highlight */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />
      
      {icon && <span className="relative">{icon}</span>}
      <span className="relative">{children}</span>
    </motion.button>
  );
}