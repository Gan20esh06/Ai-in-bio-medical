import { createContext, useContext, useState, type ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────────

/** Health form data collected on the Predict page. */
export interface PredictFormData {
  age: number;
  gender: "male" | "female";
  bloodPressure: number;
  cholesterol: number;
  glucose: number;
  bmi: number;
  smoking: boolean;
  exercise: 0 | 1 | 2 | 3;
  // Self-reported biomarker sliders (0-10)
  fatigue: number;
  breathing: number;
  eyeInstability: number;
  voiceInstability: number;
  symmetry: number;
  skinQuality: number;
}

export interface FaceResult {
  face_fatigue: number;
  symmetry_score: number;
  blink_instability: number;
  brightness_variance: number;
  face_risk_score: number;
}

export interface VoiceResult {
  voice_stress: number;
  breathing_score: number;
  pitch_instability: number;
  voice_risk_score: number;
}

export interface PredictionResult {
  overall_risk: number;
  risk_level: string;
  confidence_score: number;
  feature_contribution: Record<string, number>;
  model_version: string;
  drift_warning: boolean;
}

export interface ScanResults {
  face: FaceResult;
  voice: VoiceResult;
  prediction: PredictionResult;
  timestamp: string;
}

// Intermediate scan data passed between pages
export interface FaceScanData {
  image: string;
  result: FaceResult;
  biomarkers: {
    eye: number;
    symmetry: number;
    fatigue: number;
    brightness: number;
  };
}

export interface VoiceScanData {
  audio: string | null;
  sampleRate: number;
}

// ── Context ──────────────────────────────────────────────────────────
interface ScanContextType {
  results: ScanResults | null;
  setResults: (r: ScanResults) => void;
  clearResults: () => void;
  predictData: PredictFormData | null;
  setPredictData: (d: PredictFormData) => void;
  faceData: FaceScanData | null;
  setFaceData: (d: FaceScanData) => void;
  voiceData: VoiceScanData | null;
  setVoiceData: (d: VoiceScanData) => void;
}

const ScanContext = createContext<ScanContextType>({
  results: null,
  setResults: () => {},
  clearResults: () => {},
  predictData: null,
  setPredictData: () => {},
  faceData: null,
  setFaceData: () => {},
  voiceData: null,
  setVoiceData: () => {},
});

export function ScanProvider({ children }: { children: ReactNode }) {
  const [results, setResultsState] = useState<ScanResults | null>(null);
  const [predictData, setPredictDataState] = useState<PredictFormData | null>(
    null,
  );
  const [faceData, setFaceDataState] = useState<FaceScanData | null>(null);
  const [voiceData, setVoiceDataState] = useState<VoiceScanData | null>(null);

  const setResults = (r: ScanResults) => setResultsState(r);
  const clearResults = () => {
    setResultsState(null);
    setPredictDataState(null);
    setFaceDataState(null);
    setVoiceDataState(null);
  };
  const setPredictData = (d: PredictFormData) => setPredictDataState(d);
  const setFaceData = (d: FaceScanData) => setFaceDataState(d);
  const setVoiceData = (d: VoiceScanData) => setVoiceDataState(d);

  return (
    <ScanContext.Provider
      value={{
        results,
        setResults,
        clearResults,
        predictData,
        setPredictData,
        faceData,
        setFaceData,
        voiceData,
        setVoiceData,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanResults() {
  return useContext(ScanContext);
}
