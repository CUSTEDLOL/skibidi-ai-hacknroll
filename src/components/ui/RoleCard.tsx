import { motion } from "framer-motion";
import { Search, FileQuestion } from "lucide-react";

interface RoleCardProps {
  role: "searcher" | "guesser";
  selected?: boolean;
  onClick?: () => void;
}

export function RoleCard({ role, selected = false, onClick }: RoleCardProps) {
  const roles = {
    searcher: {
      title: "SEARCHER",
      icon: Search,
      description: "Find clues without revealing the secret",
      color: "primary",
      bgGradient: "from-primary/20 to-primary/5",
      borderColor: "border-primary",
    },
    guesser: {
      title: "GUESSER",
      icon: FileQuestion,
      description: "Decode the truth from fragments",
      color: "accent",
      bgGradient: "from-accent/20 to-accent/5",
      borderColor: "border-accent",
    },
  };

  const config = roles[role];
  const Icon = config.icon;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative cursor-pointer w-full max-w-xs"
    >
      <motion.div
        className={`
          relative p-6 rounded-xl border-2 transition-all duration-300
          bg-gradient-to-br ${config.bgGradient}
          ${selected ? `${config.borderColor} shadow-[0_0_30px_hsl(var(--${config.color})/0.3)]` : "border-border hover:border-muted-foreground"}
        `}
      >
        {/* Selected indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center"
          >
            <span className="text-success-foreground text-lg">✓</span>
          </motion.div>
        )}

        {/* Icon */}
        <div className={`w-16 h-16 rounded-full bg-${config.color}/20 flex items-center justify-center mb-4 mx-auto`}>
          <Icon className={`w-8 h-8 text-${config.color}`} />
        </div>

        {/* Title */}
        <h3 className={`font-mono text-xl font-bold text-center mb-2 text-${config.color}`}>
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm text-center mb-4">
          {config.description}
        </p>

        {/* Select button indicator */}
        <div className={`text-center font-mono text-xs ${selected ? `text-${config.color}` : 'text-muted-foreground'}`}>
          {selected ? '✓ SELECTED' : 'SELECT ROLE'}
        </div>

        {/* Decorative corners */}
        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${config.borderColor} rounded-tl-lg`} />
        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${config.borderColor} rounded-tr-lg`} />
        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${config.borderColor} rounded-bl-lg`} />
        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${config.borderColor} rounded-br-lg`} />
      </motion.div>
    </motion.div>
  );
}
