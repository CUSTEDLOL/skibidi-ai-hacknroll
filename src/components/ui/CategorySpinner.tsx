import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  History, 
  Clapperboard, 
  Microscope, 
  Trophy, 
  MapPin, 
  Gamepad2,
  Music,
  BookOpen
} from "lucide-react";

interface Category {
  name: string;
  icon: typeof History;
  difficulty: number;
}

const categories: Category[] = [
  { name: "History", icon: History, difficulty: 3 },
  { name: "Pop Culture", icon: Clapperboard, difficulty: 2 },
  { name: "Science", icon: Microscope, difficulty: 4 },
  { name: "Sports", icon: Trophy, difficulty: 2 },
  { name: "Geography", icon: MapPin, difficulty: 3 },
  { name: "Gaming", icon: Gamepad2, difficulty: 2 },
  { name: "Music", icon: Music, difficulty: 3 },
  { name: "Literature", icon: BookOpen, difficulty: 4 },
];

interface CategorySpinnerProps {
  onSelect?: (category: Category) => void;
  isSpinning?: boolean;
  onSpinComplete?: () => void;
}

export function CategorySpinner({ onSelect, isSpinning: externalSpinning, onSpinComplete }: CategorySpinnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const spin = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setSelectedCategory(null);
    
    let spins = 0;
    const totalSpins = 20 + Math.floor(Math.random() * 10);
    let delay = 50;

    const spinInterval = () => {
      setCurrentIndex(prev => (prev + 1) % categories.length);
      spins++;
      
      if (spins < totalSpins) {
        // Gradually slow down
        delay = 50 + Math.pow(spins / totalSpins, 2) * 200;
        setTimeout(spinInterval, delay);
      } else {
        setIsSpinning(false);
        const finalCategory = categories[(currentIndex + 1) % categories.length];
        setSelectedCategory(finalCategory);
        onSelect?.(finalCategory);
        onSpinComplete?.();
      }
    };

    setTimeout(spinInterval, delay);
  };

  useEffect(() => {
    if (externalSpinning) {
      spin();
    }
  }, [externalSpinning]);

  const currentCategory = categories[currentIndex];
  const Icon = currentCategory.icon;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Spinner display */}
      <div className="relative">
        {/* Decorative frame */}
        <div className="absolute -inset-4 border-2 border-primary/30 rounded-xl" />
        <div className="absolute -inset-2 border border-primary/20 rounded-lg" />
        
        {/* Main display */}
        <motion.div
          animate={isSpinning ? { 
            boxShadow: [
              "0 0 20px hsl(180 100% 50% / 0.3)",
              "0 0 40px hsl(180 100% 50% / 0.5)",
              "0 0 20px hsl(180 100% 50% / 0.3)",
            ]
          } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="w-64 h-32 bg-card border-2 border-primary/50 rounded-lg flex items-center justify-center overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: isSpinning ? 0.1 : 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <Icon className={`w-10 h-10 ${selectedCategory ? 'text-primary' : 'text-foreground'}`} />
              <span className={`font-mono text-lg font-bold ${selectedCategory ? 'text-primary text-glow-cyan' : 'text-foreground'}`}>
                {currentCategory.name.toUpperCase()}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Selection indicators */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-primary text-2xl">▶</div>
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-primary text-2xl">◀</div>
      </div>

      {/* Spin button */}
      <motion.button
        onClick={spin}
        disabled={isSpinning}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          px-8 py-3 rounded-lg font-mono font-bold uppercase tracking-wider
          transition-all duration-300
          ${isSpinning 
            ? 'bg-secondary text-muted-foreground cursor-not-allowed' 
            : 'bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(180_100%_50%/0.5)]'
          }
        `}
      >
        {isSpinning ? 'SPINNING...' : selectedCategory ? 'SPIN AGAIN' : 'SPIN CATEGORY'}
      </motion.button>

      {/* Selected category details */}
      <AnimatePresence>
        {selectedCategory && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <p className="font-mono text-sm text-muted-foreground">
              Difficulty: {"★".repeat(selectedCategory.difficulty)}{"☆".repeat(5 - selectedCategory.difficulty)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
