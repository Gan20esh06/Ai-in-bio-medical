/**
 * api.ts — Centralized API service layer.
 * All calls to the Flask backend (port 5001, proxied via /api) live here.
 * No health data is ever cached or stored in localStorage.
 */

// ── Types ─────────────────────────────────────────────────────────────────
export interface HealthFormData {
  // Self-reported biomarker-level inputs (0–10 scale)
  fatigue: number;
  breathing: number;
  eyeInstability: number;
  voiceInstability: number;
  symmetry: number;
  skinQuality: number;

  // Clinical inputs
  age: number;
  gender: "male" | "female";
  bloodPressure: number;
  cholesterol: number;
  glucose: number;
  bmi: number;
  smoking: boolean;
  exercise: 0 | 1 | 2 | 3; // 0=none, 1=light, 2=moderate, 3=active
}

export interface PredictionResponse {
  overall_risk: number; // 0–100
  risk_level: string; // "low" | "moderate" | "high"
  confidence_score: number; // 0–1
  feature_contribution: Record<string, number>;
  model_version: string;
  drift_warning: boolean;
  recommendation?: string;
}

export interface FullScanResponse {
  face: {
    face_fatigue: number;
    symmetry_score: number;
    blink_instability: number;
    brightness_variance: number;
    face_risk_score: number;
  };
  voice: {
    voice_stress: number;
    breathing_score: number;
    pitch_instability: number;
    voice_risk_score: number;
  };
  prediction: PredictionResponse;
  timestamp: string;
}

// ── Feature computation ────────────────────────────────────────────────────
/**
 * Maps user-friendly form inputs to the ML feature dict that /api/predict expects.
 * All 31 features (9 base + 4 interaction + 7 advanced + 3 cross + 8 raw) are computed.
 */
function computeFeatures(form: HealthFormData): Record<string, number> {
  // Normalize 0–10 sliders to 0–1
  const fatigue = form.fatigue / 10;
  const breathing = form.breathing / 10;
  const blinkInst = form.eyeInstability / 10;
  const pitchInst = form.voiceInstability / 10;
  const symmetry = form.symmetry / 10;
  const brightness = form.skinQuality / 10;
  const stress = fatigue * 0.7 + blinkInst * 0.3; // derived

  // Base 9 biomarker features
  const face_fatigue = Math.min(fatigue * 0.9, 1);
  const symmetry_score = Math.min(symmetry, 1);
  const blink_instability = Math.min(blinkInst * 0.4, 1);
  const brightness_variance = Math.min(brightness * 0.6, 1);
  const voice_stress = Math.min(stress, 1);
  const breathing_score = Math.min(1 - breathing * 0.8, 1); // inverted: lower breathing = higher score issue
  const pitch_instability = Math.min(pitchInst * 0.5, 1);
  const face_risk_score = Math.min(
    ((face_fatigue +
      (1 - symmetry_score) +
      blink_instability +
      brightness_variance) /
      4) *
      100,
    100,
  );
  const voice_risk_score = Math.min(
    ((voice_stress + breathing_score + pitch_instability) / 3) * 100,
    100,
  );

  // Interaction features
  const cardio_stress = face_fatigue * breathing_score;
  const metabolic_score = brightness_variance * voice_stress;
  const fatigue_stress = face_fatigue * voice_stress;
  const respiratory_variation = breathing_score * pitch_instability;

  // Advanced interaction features
  const stress_fatigue = voice_stress * face_fatigue;
  const respiratory_load = breathing_score * pitch_instability;
  const eye_fatigue_index = blink_instability * face_fatigue;
  const symmetry_fatigue_gap = Math.abs(symmetry_score - face_fatigue);
  const combined_risk = (face_fatigue + voice_stress + blink_instability) / 3;
  const fatigue_pitch_interaction = face_fatigue * pitch_instability;
  const breathing_stress_ratio = breathing_score / (voice_stress + 0.001);

  // Raw clinical features (normalized)
  const raw_age = form.age / 100;
  const raw_sex = form.gender === "male" ? 1 : 0;
  const raw_bp = form.bloodPressure / 200;
  const raw_cholesterol = form.cholesterol / 300;
  const raw_glucose = form.glucose / 200;
  const raw_bmi = form.bmi / 50;
  const raw_smoking = form.smoking ? 1 : 0;
  const raw_exercise = form.exercise / 3;

  // Clinical cross-interaction features
  const bp_chol_risk = raw_bp * raw_cholesterol;
  const age_metabolic = raw_age * raw_glucose;
  const clinical_cardio = raw_bp * face_fatigue;

  return {
    face_fatigue,
    symmetry_score,
    blink_instability,
    brightness_variance,
    voice_stress,
    breathing_score,
    pitch_instability,
    face_risk_score,
    voice_risk_score,
    cardio_stress,
    metabolic_score,
    fatigue_stress,
    respiratory_variation,
    stress_fatigue,
    respiratory_load,
    eye_fatigue_index,
    symmetry_fatigue_gap,
    combined_risk,
    fatigue_pitch_interaction,
    breathing_stress_ratio,
    bp_chol_risk,
    age_metabolic,
    clinical_cardio,
    raw_age,
    raw_sex,
    raw_bp,
    raw_cholesterol,
    raw_glucose,
    raw_bmi,
    raw_smoking,
    raw_exercise,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────

/** POST /api/predict — runs ML prediction from form inputs */
export async function predictFromForm(
  form: HealthFormData,
): Promise<PredictionResponse> {
  const features = computeFeatures(form);

  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  return res.json();
}

/** GET /api/health — check if the backend is available */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
