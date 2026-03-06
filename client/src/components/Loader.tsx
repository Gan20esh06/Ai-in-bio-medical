/**
 * Loader.tsx — Animated loading spinner with status message.
 * Used while waiting for API predictions.
 */
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

interface LoaderProps {
  message?: string;
}

export default function Loader({
  message = "Analyzing health data using AI...",
}: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Pulse rings */}
      <div className="relative flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/30"
            initial={{ width: 56, height: 56, opacity: 0.8 }}
            animate={{ width: 56 + i * 28, height: 56 + i * 28, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        ))}
        <motion.div
          className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary z-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <BrainCircuit className="w-7 h-7" />
        </motion.div>
      </div>

      {/* Animated dots */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-foreground font-medium text-lg">{message}</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
