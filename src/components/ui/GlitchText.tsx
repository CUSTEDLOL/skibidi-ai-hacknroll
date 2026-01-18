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
      className={`relative ${className}`}
    >
      {/* Background glow effect */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 blur-3xl bg-primary/30 -z-10"
      />
      
      <h1 
        className="glitch relative inline-block text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter font-display"
        data-text={text}
        style={{
          textShadow: `
            0 0 40px hsl(175 100% 45% / 0.5),
            0 0 80px hsl(175 100% 45% / 0.3),
            0 0 120px hsl(175 100% 45% / 0.15)
          `,
          color: 'hsl(175 100% 45%)',
        }}
      >
        {text}
      </h1>
      
      {/* Underline accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent mt-4 mx-auto max-w-xs"
      />
    </motion.div>
  );
}