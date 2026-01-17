import { motion } from "framer-motion";

export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      
      {/* Radial glow */}
      <div className="absolute inset-0 bg-radial-glow" />
      
      {/* Animated floating documents */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: "100vh", 
              x: `${10 + i * 12}%`,
              rotate: Math.random() * 20 - 10,
              opacity: 0.1
            }}
            animate={{ 
              y: "-100vh",
              rotate: Math.random() * 20 - 10,
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear"
            }}
            className="absolute w-16 h-20 pointer-events-none"
          >
            {/* Mini document */}
            <div className="w-full h-full bg-card/30 border border-border/30 rounded-sm p-1">
              <div className="w-full h-1 bg-muted mb-1" />
              <div className="w-3/4 h-1 bg-muted mb-1" />
              <div className="w-full h-1 bg-muted mb-1" />
              <div className="w-1/2 h-1 bg-muted" />
              <div className="absolute top-1 right-1 w-4 h-4 border border-destructive/30 text-[6px] font-bold text-destructive/30 flex items-center justify-center">
                C
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scanlines overlay - Subtle */}
      <div className="absolute inset-0 pointer-events-none scanlines opacity-[0.1]" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.02]" />

      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(0_0%_4%)_100%)]" />
    </div>
  );
}
