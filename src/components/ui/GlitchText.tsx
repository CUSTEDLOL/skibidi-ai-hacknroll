import { motion } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
}

export function GlitchText({ text, className = "", as: Component = "span" }: GlitchTextProps) {
  return (
    <Component 
      className={`glitch relative inline-block ${className}`} 
      data-text={text}
    >
      {text}
    </Component>
  );
}

export function AnimatedGlitchText({ text, className = "" }: GlitchTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <GlitchText text={text} as="h1" className="text-6xl md:text-8xl font-bold tracking-tight text-primary" />
    </motion.div>
  );
}
