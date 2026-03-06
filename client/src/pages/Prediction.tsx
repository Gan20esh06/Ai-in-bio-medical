/**
 * Prediction.tsx — Disease Prediction page.
 * Renders the health form, manages loading/error state,
 * calls the API, and shows the result card.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, ShieldCheck, Lock, ChevronRight } from "lucide-react";
import PredictionForm from "@/components/PredictionForm";
import ResultCard from "@/components/ResultCard";
import Loader from "@/components/Loader";
import {
  predictFromForm,
  type HealthFormData,
  type PredictionResponse,
} from "@/services/api";

type Phase = "form" | "loading" | "result";

export default function Prediction() {
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [formData, setFormData] = useState<HealthFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: HealthFormData) => {
    setFormData(data);
    setError(null);
    setPhase("loading");

    try {
      const res = await predictFromForm(data);
      setResult(res);
      setPhase("result");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Prediction failed. Please try again.";
      setError(msg);
      setPhase("form");
    }
  };

  const handleRetry = () => {
    setResult(null);
    setFormData(null);
    setError(null);
    setPhase("form");
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
          {phase === "form" && (
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
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="glass-card rounded-2xl border border-black/5 p-8"
            >
              <Loader message="Analyzing health data using AI…" />

              {/* Steps indicator */}
              <div className="flex justify-center gap-8 mt-4">
                {[
                  "Preprocessing features",
                  "Running ML model",
                  "Generating report",
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.6 }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <ChevronRight className="w-3 h-3 text-primary" />
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "result" && result && formData && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ResultCard
                result={result}
                form={formData}
                onRetry={handleRetry}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
