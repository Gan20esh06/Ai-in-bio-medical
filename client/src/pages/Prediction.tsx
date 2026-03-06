/**
 * Prediction.tsx — Disease Prediction page.
 * Collects health form data, saves it to context,
 * then navigates to the Face Scan step.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, ShieldCheck, Lock, ChevronRight } from "lucide-react";
import PredictionForm from "@/components/PredictionForm";
import { useScanResults } from "@/context/ScanContext";
import type { HealthFormData } from "@/services/api";

export default function Prediction() {
  const [, setLocation] = useLocation();
  const { setPredictData, clearResults } = useScanResults();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (data: HealthFormData) => {
    setError(null);
    // Clear any previous scan results
    clearResults();
    // Save predict form data into context
    setPredictData(data);
    console.log("[Prediction] Form data saved to context:", data);
    // Navigate to face scan step
    setLocation("/face-scan");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            AI Disease Risk Analysis
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold font-display tracking-tight mb-3">
            Health Assessment
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
            Answer the questions below. Our AI analyses your biomarker patterns
            and clinical data to generate a personalised risk score.
          </p>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
            {[
              { icon: ShieldCheck, label: "No data stored" },
              { icon: Lock, label: "Secure processing" },
              { icon: BrainCircuit, label: "ML-powered" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-primary/60" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Phase transitions ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PredictionForm
              onSubmit={handleSubmit}
              loading={false}
              error={error}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
