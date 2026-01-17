import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Background } from "@/components/layout/Background";
import { RoleCard } from "@/components/ui/RoleCard";

const SelectRole = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: "searcher" | "guesser") => {
    if (role === "searcher") {
      navigate("/game/searcher-briefing");
    } else {
      navigate("/game/guesser-active");
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Background />
      <Header />

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="absolute top-24 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO LOBBY
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-mono text-3xl font-bold text-foreground mb-2">
            SELECT YOUR ROLE
          </h1>
          <p className="font-mono text-muted-foreground">
            Choose your mission assignment
          </p>
        </motion.div>

        {/* Role Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-6 w-full max-w-2xl"
        >
          <RoleCard
            role="searcher"
            onClick={() => handleRoleSelect("searcher")}
          />
          <RoleCard
            role="guesser"
            onClick={() => handleRoleSelect("guesser")}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default SelectRole;
