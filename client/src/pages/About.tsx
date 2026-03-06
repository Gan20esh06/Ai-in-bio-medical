/**
 * About.tsx — About page explaining the project, AI models, and mission.
 */
import { motion } from "framer-motion";
import {
  BrainCircuit,
  ScanFace,
  Mic,
  Database,
  ShieldCheck,
  Lock,
  Activity,
  Heart,
  Microscope,
  Globe,
  Users,
  Award,
} from "lucide-react";

const models = [
  {
    icon: ScanFace,
    title: "Facial Biomarker Analysis",
    tech: "OpenCV + MediaPipe FaceMesh",
    description:
      "Analyses 468 facial landmarks to extract biomarkers including Eye Aspect Ratio (EAR), blink instability, facial symmetry, and skin brightness variance — all non-invasive optical indicators of systemic health.",
    features: [
      "Eye Aspect Ratio",
      "Blink Instability",
      "Facial Symmetry",
      "Skin Brightness Variance",
    ],
  },
  {
    icon: Mic,
    title: "Vocal Stress Analysis",
    tech: "Librosa + NumPy",
    description:
      "Processes audio waveforms to extract Mel-frequency cepstral coefficients (MFCCs), pitch instability metrics, RMS energy envelopes, and breathing rhythm patterns — vocal biomarkers linked to cardiovascular and neurological health.",
    features: [
      "MFCC Features",
      "Pitch Instability",
      "RMS Energy",
      "Breathing Rhythm",
    ],
  },
  {
    icon: BrainCircuit,
    title: "ML Risk Fusion Engine",
    tech: "scikit-learn RandomForest",
    description:
      "A multi-class trained RandomForest model fuses face and voice biomarkers with clinical features. The model was trained on 7 biomedical datasets and outputs a probabilistic risk score with SHAP-based feature attribution.",
    features: [
      "RandomForest Ensemble",
      "31 Engineered Features",
      "SHAP Explainability",
      "Confidence Scoring",
    ],
  },
];

const datasets = [
  {
    name: "UTKFace Dataset",
    useCase:
      "Facial attribute distributions for synthetic symmetry & brightness modelling",
  },
  {
    name: "CelebA Dataset",
    useCase: "Facial landmark & eye region reference distributions",
  },
  {
    name: "Driver Drowsiness",
    useCase: "Fatigue and blink instability pattern modelling",
  },
  {
    name: "RAVDESS Emotional Speech",
    useCase: "Pitch variation and speech stability patterns",
  },
  {
    name: "Coswara Respiratory",
    useCase: "Breathing rhythm variability simulation",
  },
  {
    name: "UCI Heart Disease",
    useCase: "Cardiovascular risk factor distributions and labels",
  },
  {
    name: "PIMA Diabetes Dataset",
    useCase: "Metabolic fatigue-stress correlation modelling",
  },
];

const principles = [
  {
    icon: ShieldCheck,
    title: "Privacy-First",
    desc: "All processing happens in-memory. No health data is stored, logged, or transmitted beyond the prediction request.",
  },
  {
    icon: Lock,
    title: "Secure Pipeline",
    desc: "End-to-end processing with no PII retention. Camera and microphone data are never persisted to disk.",
  },
  {
    icon: Microscope,
    title: "Research-Backed",
    desc: "Trained on patterns from 7 publicly available biomedical research datasets covering cardiovascular, metabolic, and neurological health markers.",
  },
  {
    icon: Globe,
    title: "Accessible",
    desc: "Designed for non-technical users. No medical background required to interpret results — clear risk levels with plain-language recommendations.",
  },
];

export default function About() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-20">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            <Activity className="w-3.5 h-3.5 mr-2" />
            About the Project
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold font-display tracking-tight">
            AI Silent Disease{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
              Predictor
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A production-grade preventive healthcare system using multimodal AI
            to assess health risk from non-invasive biomarkers — before symptoms
            appear.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 flex-wrap pt-4">
            {[
              { icon: Database, value: "7", label: "Biomedical datasets" },
              { icon: Users, value: "31", label: "Engineered features" },
              { icon: Award, value: "3", label: "AI modalities" },
              { icon: Heart, value: "100%", label: "Privacy preserved" },
            ].map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold font-display">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Mission ── */}
        <section className="glass-card rounded-3xl border border-black/5 p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Millions of people live with undetected conditions such as
            hypertension, early-stage diabetes, and cardiac arrhythmias — not
            because healthcare is unavailable, but because the subtle early
            signals go unnoticed until they become critical.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The{" "}
            <strong className="text-foreground">
              AI Silent Disease Predictor
            </strong>{" "}
            was built to change that. By combining facial biomarker extraction,
            vocal stress analysis, and a clinical-grade RandomForest model, the
            system surfaces risk indicators from everyday interactions — no
            blood tests, no hospital visits, no specialist referrals needed for
            an initial screening.
          </p>
        </section>

        {/* ── AI Models ── */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">The AI Models</h2>
            <p className="text-muted-foreground">
              Three interconnected models form the prediction pipeline
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {models.map((model, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl border border-black/5 p-6 space-y-4 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <model.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold mb-0.5">{model.title}</h3>
                  <p className="text-xs font-medium text-primary/70 mb-2">
                    {model.tech}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {model.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {model.features.map((f, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-primary/5 text-primary border border-primary/10 rounded-full px-2 py-0.5"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Datasets ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Training Datasets</h2>
            <p className="text-muted-foreground">
              The model draws from 7 publicly available biomedical research
              datasets
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {datasets.map((ds, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl border border-black/5 p-4 flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{ds.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {ds.useCase}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Design principles ── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Design Principles</h2>
            <p className="text-muted-foreground">
              Built with safety, accuracy, and accessibility as first-class
              concerns
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {principles.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl border border-black/5 p-5 flex gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
          <h3 className="font-semibold text-amber-800 mb-2">
            ⚕ Medical Disclaimer
          </h3>
          <p className="text-sm text-amber-700 leading-relaxed">
            This application is designed for{" "}
            <strong>informational and research purposes only</strong>. It does
            not constitute medical advice, diagnosis, or treatment. Results
            should not be used as a substitute for professional medical
            consultation. Always consult a qualified healthcare provider for any
            health concerns or before making any health-related decisions.
          </p>
        </section>
      </div>
    </div>
  );
}
