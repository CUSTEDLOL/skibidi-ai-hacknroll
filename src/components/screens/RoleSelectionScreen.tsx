import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RoleCard } from "../ui/RoleCard";
import { GlowButton } from "../ui/GlowButton";
import { ClassifiedStamp } from "../ui/ClassifiedStamp";

interface RoleSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (role: "searcher" | "guesser") => void;
}

export function RoleSelectionScreen({ onBack, onContinue }: RoleSelectionScreenProps) {
  const [selectedRole, setSelectedRole] = useState<"searcher" | "guesser" | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <ClassifiedStamp type="confidential" className="mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Select Your Role
        </h1>
        <p className="font-mono text-muted-foreground">
          Choose your mission specialization
        </p>
      </motion.div>

      {/* Role Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-6 mb-12"
      >
        <RoleCard
          role="searcher"
          selected={selectedRole === "searcher"}
          onClick={() => setSelectedRole("searcher")}
        />
        <RoleCard
          role="guesser"
          selected={selectedRole === "guesser"}
          onClick={() => setSelectedRole("guesser")}
        />
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-4"
      >
        <GlowButton
          onClick={onBack}
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </GlowButton>
        <GlowButton
          onClick={() => selectedRole && onContinue?.(selectedRole)}
          variant="primary"
          disabled={!selectedRole}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Continue
        </GlowButton>
      </motion.div>

      {/* Role description */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selectedRole ? 1 : 0 }}
        className="mt-8 max-w-md text-center"
      >
        {selectedRole === "searcher" && (
          <p className="text-muted-foreground font-mono text-sm">
            As the <span className="text-primary">SEARCHER</span>, you'll receive a secret topic. 
            Search Google to find clues for your partner without revealing forbidden words.
          </p>
        )}
        {selectedRole === "guesser" && (
          <p className="text-muted-foreground font-mono text-sm">
            As the <span className="text-accent">GUESSER</span>, you'll analyze redacted search results 
            and piece together clues to discover the secret topic.
          </p>
        )}
      </motion.div>
    </div>
  );
}
