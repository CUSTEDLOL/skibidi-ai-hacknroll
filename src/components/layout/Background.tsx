import { motion } from "framer-motion";

export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient - deeper and more atmospheric */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-[hsl(220_20%_2%)]" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-radial from-primary/20 via-primary/5 to-transparent blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-radial from-accent/15 via-accent/5 to-transparent blur-3xl"
      />
      
      {/* Grid pattern with gradient fade */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      
      {/* Radial glow from center */}
      <div className="absolute inset-0 bg-radial-glow opacity-50" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: "100vh", 
              x: `${Math.random() * 100}%`,
              opacity: 0,
            }}
            animate={{ 
              y: "-10vh",
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "linear",
            }}
            className="absolute w-1 h-1 rounded-full bg-primary/60"
            style={{
              boxShadow: '0 0 6px hsl(175 100% 45% / 0.8)',
            }}
          />
        ))}
      </div>

      {/* Floating document cards - more subtle and elegant */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              y: "110vh", 
              x: `${15 + i * 18}%`,
              rotate: -5 + Math.random() * 10,
              opacity: 0,
            }}
            animate={{ 
              y: "-20vh",
              rotate: [-5, 5, -5],
              opacity: [0, 0.08, 0],
            }}
            transition={{
              duration: 25 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 4,
              ease: "linear",
            }}
            className="absolute w-12 h-16"
          >
            {/* Minimalist document */}
            <div className="w-full h-full bg-card/40 backdrop-blur-sm border border-primary/10 rounded-sm p-1.5 shadow-lg">
              <div className="w-full h-0.5 bg-primary/20 mb-1 rounded-full" />
              <div className="w-3/4 h-0.5 bg-muted/30 mb-1 rounded-full" />
              <div className="w-full h-0.5 bg-muted/30 mb-1 rounded-full" />
              <div className="w-2/3 h-0.5 bg-muted/30 rounded-full" />
              <div className="absolute top-0.5 right-0.5 w-2 h-2 border border-destructive/20 rounded-sm flex items-center justify-center">
                <span className="text-[4px] font-bold text-destructive/30">C</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Horizontal scan line effect */}
      <motion.div
        animate={{
          y: ["-100%", "200%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/10 rounded-tl-3xl" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/10 rounded-tr-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/10 rounded-bl-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/10 rounded-br-3xl" />

      {/* Subtle scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(175 100% 45% / 0.1) 2px, hsl(175 100% 45% / 0.1) 4px)',
        }}
      />
      
      {/* Noise texture - very subtle */}
      <div className="absolute inset-0 pointer-events-none noise-overlay opacity-[0.015]" />

      {/* Vignette effect - stronger for drama */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,hsl(220_15%_3%/0.8)_100%)]" />
    </div>
  );
}