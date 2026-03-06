/**
 * ResultCard.tsx — Displays AI prediction results with risk level,
 * confidence, feature contribution chart, and recommendations.
 */
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCcw,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { PredictionResponse, HealthFormData } from "@/services/api";

// ── Helpers ──────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  low: {
    color: "#22c55e",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "Low Risk",
    Icon: CheckCircle2,
  },
  moderate: {
    color: "#f59e0b",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Moderate Risk",
    Icon: AlertTriangle,
  },
  high: {
    color: "#ef4444",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "High Risk",
    Icon: ShieldAlert,
  },
} as const;

function getRiskConfig(level: string) {
  const key = level?.toLowerCase();
  return RISK_CONFIG[key as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.moderate;
}

function getRecommendation(level: string, form: HealthFormData): string {
  const age = form.age;
  const base: Record<string, string> = {
    low: "Your health indicators are within a healthy range. Maintain regular exercise, a balanced diet, and annual check-ups.",
    moderate:
      "Some risk indicators are elevated. Consider consulting a general practitioner for a comprehensive health assessment within 3 months.",
    high: "Multiple risk indicators are elevated. We strongly recommend scheduling an appointment with a specialist soon. Do not delay seeking medical advice.",
  };
  const extras: string[] = [];
  if (age > 45)
    extras.push("Age-related cardiovascular screening is recommended.");
  if (form.smoking)
    extras.push(
      "Smoking cessation can significantly reduce your risk profile.",
    );
  if (form.bmi > 30)
    extras.push(
      "Maintaining a healthy BMI reduces strain on multiple organ systems.",
    );
  if (form.bloodPressure > 140)
    extras.push("Monitor blood pressure regularly — consider a DASH diet.");
  if (form.cholesterol > 240)
    extras.push("A lipid panel test and dietary changes are advisable.");
  const rec = base[level?.toLowerCase()] ?? base.moderate;
  return extras.length > 0 ? `${rec} ${extras[0]}` : rec;
}

const FEATURE_LABELS: Record<string, string> = {
  face_fatigue: "Facial Fatigue",
  symmetry_score: "Facial Symmetry",
  blink_instability: "Eye Instability",
  brightness_variance: "Skin Quality",
  voice_stress: "Voice Stress",
  breathing_score: "Breathing",
  pitch_instability: "Pitch Stability",
  cardio_stress: "Cardio Stress",
  metabolic_score: "Metabolic",
  combined_risk: "Combined Risk",
};

// ── Component ─────────────────────────────────────────────────────────────
interface ResultCardProps {
  result: PredictionResponse;
  form: HealthFormData;
  onRetry: () => void;
}

export default function ResultCard({ result, form, onRetry }: ResultCardProps) {
  const cfg = getRiskConfig(result.risk_level);
  const Icon = cfg.Icon;
  const recommendation =
    result.recommendation ?? getRecommendation(result.risk_level, form);
  const confidence = Math.round((result.confidence_score ?? 0) * 100);
  const riskPercent = Math.round(result.overall_risk ?? 0);

  // Top contributing features for bar chart
  const topFeatures = Object.entries(result.feature_contribution ?? {})
    .filter(([k]) => FEATURE_LABELS[k])
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 6)
    .map(([key, val]) => ({
      name: FEATURE_LABELS[key] ?? key,
      value: Math.abs(Math.round(val * 100)) / 100,
    }));

  // Radial gauge data
  const gaugeData = [{ value: riskPercent, fill: cfg.color }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* ── Primary result card ── */}
      <div
        className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-6 flex flex-col sm:flex-row gap-6 items-center`}
      >
        {/* Radial gauge */}
        <div className="w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius={40}
              outerRadius={68}
              data={gaugeData}
              startAngle={210}
              endAngle={-30}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: "#e5e7eb" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <h2
            className="text-4xl font-bold font-display mb-1"
            style={{ color: cfg.color }}
          >
            {riskPercent}%
          </h2>
          <p className="text-muted-foreground text-sm mb-3">
            Overall disease risk score &nbsp;•&nbsp; Confidence:{" "}
            <strong>{confidence}%</strong>
          </p>
          {result.drift_warning && (
            <p className="text-xs text-amber-600 bg-amber-100 rounded-full px-3 py-1 inline-block">
              ⚠ Input values are outside the model's typical training
              distribution — interpret with caution.
            </p>
          )}
        </div>
      </div>

      {/* ── Recommendation ── */}
      <div className="glass-card rounded-2xl p-5 flex gap-4 border border-black/5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">AI Recommendation</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation}
          </p>
        </div>
      </div>

      {/* ── Feature contribution chart ── */}
      {topFeatures.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-black/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Key Risk Factors</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={topFeatures}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f0f0f0"
              />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip
                formatter={(v: number) => [v.toFixed(3), "Contribution"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {topFeatures.map((_, i) => (
                  <Cell key={i} fill={`hsl(213, 82%, ${55 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Risk Score", value: `${riskPercent}%`, color: cfg.color },
          { label: "Confidence", value: `${confidence}%`, color: "#1a73e8" },
          { label: "Risk Level", value: cfg.label, color: cfg.color },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass-card rounded-xl p-4 text-center border border-black/5"
          >
            <p
              className="text-2xl font-bold font-display"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
        ⚕ This AI assessment is for informational purposes only and does not
        constitute medical advice. Always consult a qualified healthcare
        professional for diagnosis and treatment.
      </p>

      {/* ── Actions ── */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onRetry}
          className="rounded-full px-6 gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Start New Assessment
        </Button>
      </div>
    </motion.div>
  );
}
