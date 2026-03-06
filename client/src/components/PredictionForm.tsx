/**
 * PredictionForm.tsx — Multi-section health assessment form.
 * Collects clinical data + self-reported biomarker inputs,
 * validates everything before calling the backend /api/predict.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Heart,
  Wind,
  Eye,
  Activity,
  Mic,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HealthFormData } from "@/services/api";

// ── Tooltip wrapper ───────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <Info
        className="w-3.5 h-3.5 text-muted-foreground cursor-pointer"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs rounded-lg px-3 py-1.5 whitespace-nowrap z-20 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

// ── Slider input ──────────────────────────────────────────────────────────
interface SliderInputProps {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}

function SliderInput({
  label,
  tooltip,
  value,
  onChange,
  min = 0,
  max = 10,
  lowLabel = "None",
  highLabel = "Severe",
}: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = pct < 33 ? "#22c55e" : pct < 66 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1">
          {label}
          <Tip text={tooltip} />
        </label>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ── Number input ──────────────────────────────────────────────────────────
interface NumInputProps {
  label: string;
  tooltip: string;
  value: number | string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}

function NumInput({
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
  unit,
  placeholder,
}: NumInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1">
        {label}
        <Tip text={tooltip} />
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring pr-12"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl border border-black/5 p-6 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ── Default form state ─────────────────────────────────────────────────────
const DEFAULT_FORM: HealthFormData = {
  fatigue: 3,
  breathing: 7,
  eyeInstability: 2,
  voiceInstability: 2,
  symmetry: 8,
  skinQuality: 7,
  age: 35,
  gender: "male",
  bloodPressure: 120,
  cholesterol: 180,
  glucose: 90,
  bmi: 24,
  smoking: false,
  exercise: 1,
};

// ── Validation ────────────────────────────────────────────────────────────
function validate(form: HealthFormData): string | null {
  if (form.age < 1 || form.age > 120) return "Age must be between 1 and 120.";
  if (form.bloodPressure < 60 || form.bloodPressure > 300)
    return "Blood pressure must be between 60 and 300 mmHg.";
  if (form.cholesterol < 50 || form.cholesterol > 600)
    return "Cholesterol must be between 50 and 600 mg/dL.";
  if (form.glucose < 30 || form.glucose > 600)
    return "Blood glucose must be between 30 and 600 mg/dL.";
  if (form.bmi < 10 || form.bmi > 80) return "BMI must be between 10 and 80.";
  return null;
}

// ── Main component ────────────────────────────────────────────────────────
interface PredictionFormProps {
  onSubmit: (data: HealthFormData) => void;
  loading: boolean;
  error: string | null;
}

export default function PredictionForm({
  onSubmit,
  loading,
  error,
}: PredictionFormProps) {
  const [form, setForm] = useState<HealthFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const set = <K extends keyof HealthFormData>(
    key: K,
    value: HealthFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const err = validate(form);
    if (err) {
      setValidationError(err);
      return;
    }
    onSubmit(form);
  };

  const displayError = validationError ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 w-full max-w-2xl mx-auto"
    >
      {/* ── Section 1: Clinical Info ── */}
      <Section
        icon={User}
        title="Clinical Information"
        subtitle="Basic health demographics"
      >
        <div className="grid grid-cols-2 gap-4">
          <NumInput
            label="Age"
            tooltip="Your current age in years"
            value={form.age}
            onChange={(v) => set("age", v)}
            min={1}
            max={120}
            unit="yrs"
            placeholder="35"
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Gender</label>
            <select
              value={form.gender}
              onChange={(e) =>
                set("gender", e.target.value as "male" | "female")
              }
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <NumInput
            label="Blood Pressure"
            tooltip="Systolic blood pressure (top number)"
            value={form.bloodPressure}
            onChange={(v) => set("bloodPressure", v)}
            min={60}
            max={300}
            unit="mmHg"
            placeholder="120"
          />
          <NumInput
            label="Cholesterol"
            tooltip="Total cholesterol level in your blood"
            value={form.cholesterol}
            onChange={(v) => set("cholesterol", v)}
            min={50}
            max={600}
            unit="mg/dL"
            placeholder="180"
          />
          <NumInput
            label="Blood Glucose"
            tooltip="Fasting blood sugar level"
            value={form.glucose}
            onChange={(v) => set("glucose", v)}
            min={30}
            max={600}
            unit="mg/dL"
            placeholder="90"
          />
          <NumInput
            label="BMI"
            tooltip="Body Mass Index = weight(kg) / height(m)²"
            value={form.bmi}
            onChange={(v) => set("bmi", v)}
            min={10}
            max={80}
            placeholder="24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Smoking */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.smoking}
              onChange={(e) => set("smoking", e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm font-medium">Current smoker</span>
          </label>

          {/* Exercise */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Exercise Level</label>
            <select
              value={form.exercise}
              onChange={(e) =>
                set("exercise", Number(e.target.value) as 0 | 1 | 2 | 3)
              }
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={0}>None</option>
              <option value={1}>Light (1–2×/week)</option>
              <option value={2}>Moderate (3–4×/week)</option>
              <option value={3}>Active (5+×/week)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* ── Section 2: Facial Biomarkers ── */}
      <Section
        icon={Eye}
        title="Facial & Skin Indicators"
        subtitle="How you look and feel visually today"
      >
        <div className="space-y-5">
          <SliderInput
            label="Fatigue Level"
            tooltip="How physically tired or drained do you feel right now?"
            value={form.fatigue}
            onChange={(v) => set("fatigue", v)}
            lowLabel="Fresh"
            highLabel="Exhausted"
          />
          <SliderInput
            label="Eye Discomfort / Blinking"
            tooltip="Do your eyes feel irritated, heavy, or do you blink frequently?"
            value={form.eyeInstability}
            onChange={(v) => set("eyeInstability", v)}
            lowLabel="Normal"
            highLabel="Very uncomfortable"
          />
          <SliderInput
            label="Facial Symmetry"
            tooltip="Do both sides of your face feel balanced? (drooping, asymmetry etc.)"
            value={form.symmetry}
            onChange={(v) => set("symmetry", v)}
            lowLabel="Asymmetric"
            highLabel="Fully symmetric"
          />
          <SliderInput
            label="Skin / Complexion Quality"
            tooltip="Rate your skin tone appearance today — pallor, redness, or dullness"
            value={form.skinQuality}
            onChange={(v) => set("skinQuality", v)}
            lowLabel="Very poor"
            highLabel="Excellent"
          />
        </div>
      </Section>

      {/* ── Section 3: Respiratory / Vocal ── */}
      <Section
        icon={Wind}
        title="Respiratory & Vocal Indicators"
        subtitle="Breathing patterns and voice quality"
      >
        <div className="space-y-5">
          <SliderInput
            label="Breathing Quality"
            tooltip="How easy and comfortable is your breathing right now?"
            value={form.breathing}
            onChange={(v) => set("breathing", v)}
            lowLabel="Very difficult"
            highLabel="Effortless"
          />
          <SliderInput
            label="Voice Steadiness"
            tooltip="Does your voice sound shaky, strained, or different from normal?"
            value={form.voiceInstability}
            onChange={(v) => set("voiceInstability", v)}
            lowLabel="Steady"
            highLabel="Very shaky"
          />
        </div>
      </Section>

      {/* ── Section 4: Symptoms ── */}
      <Section
        icon={Heart}
        title="Symptoms Checklist"
        subtitle="Select any symptoms you are currently experiencing"
      >
        <div className="grid grid-cols-2 gap-2.5">
          {[
            "Chest pain or pressure",
            "Shortness of breath",
            "Irregular heartbeat",
            "Frequent headaches",
            "Dizziness or fainting",
            "Excessive thirst",
            "Unexplained fatigue",
            "Blurred vision",
            "Numbness / tingling",
            "Frequent urination",
          ].map((symptom) => (
            <label
              key={symptom}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                aria-label={symptom}
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {symptom}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── Error display ── */}
      {displayError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{displayError}</p>
        </motion.div>
      )}

      {/* ── Submit ── */}
      <div className="flex justify-center pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-14 px-10 text-lg rounded-full premium-shadow group gap-3"
        >
          <Activity className="w-5 h-5" />
          {loading ? "Analyzing…" : "Predict Disease Risk"}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </form>
  );
}
