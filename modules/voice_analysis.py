"""
voice_analysis.py — Vocal biomarker extraction with strict input validation.

Validation pipeline (runs BEFORE any AI analysis):
    Step 1 — Audio data exists, is a valid numpy array
    Step 2 — Minimum duration check (≥ 3 seconds)
    Step 3 — Signal-to-noise ratio check (reject near-silence)
    Step 4 — Voice Activity Detection (reject pure music / noise)
    Step 5 — Sufficient voiced frames (human speech must dominate)

Only after ALL checks pass does the module extract biomarkers.
If ANY check fails an error dict is returned — NO prediction runs.

Architecture rules
------------------
- Does NOT import Streamlit.
- Does NOT import other modules (face_analysis, prediction_engine).
- Communicates only via dict return values.
- NEVER returns simulated or placeholder data.
"""

from __future__ import annotations

from typing import Dict, Optional, Union

import librosa
import numpy as np

from config.settings import SAMPLE_RATE, VOICE_WEIGHTS
from utils.feature_utils import weighted_composite
from utils.logger import get_logger
from utils.preprocessing import clip_score, normalize_to_range

logger = get_logger(__name__)

# ── Validation thresholds ─────────────────────────────────────────────
# Minimum audio duration in seconds — shorter recordings are unreliable
_MIN_DURATION_SEC = 3.0
# Minimum number of audio samples (at any sample rate)
_MIN_SAMPLES = 1024
# RMS energy floor — below this the signal is effectively silence
_SILENCE_RMS_THRESHOLD = 0.005
# Minimum fraction of frames that must be voiced (speech, not music/noise)
_MIN_VOICED_FRACTION = 0.10   # at least 10 % of frames must be voiced speech
# Minimum SNR in dB — reject very noisy recordings
_MIN_SNR_DB = 3.0
# Minimum number of voiced onsets (speech segments detected by pYIN)
_MIN_VOICED_ONSETS = 2


# ==============================================================================
# PUBLIC API
# ==============================================================================

def analyze_voice(
    audio_data: Optional[np.ndarray] = None,
    sample_rate: int = SAMPLE_RATE,
    deterministic_seed: Optional[int] = None,
) -> Dict[str, Union[float, str, bool]]:
    """Extract vocal biomarkers from raw audio with full validation.

    Validation pipeline
    -------------------
    1. Audio data exists and has enough samples
    2. Duration ≥ 3 seconds
    3. Not silence (RMS energy above threshold)
    4. Acceptable signal-to-noise ratio
    5. Human voice detected via pYIN pitch tracking (Voice Activity Detection)
    6. Sufficient voiced speech frames present

    Returns
    -------
    dict
        On success — biomarker keys plus ``"validated": True``.
        On failure — ``{"error": "...", "error_code": "..."}``.
    """

    # ── Step 1: Audio exists and is valid ─────────────────────────
    if audio_data is None:
        logger.warning("Validation FAIL — no audio provided.")
        return {
            "error": "No audio provided. Please record or upload audio.",
            "error_code": "NO_AUDIO",
        }

    if not isinstance(audio_data, np.ndarray) or audio_data.size < _MIN_SAMPLES:
        logger.warning("Validation FAIL — audio too short (%d samples).",
                        audio_data.size if isinstance(audio_data, np.ndarray) else 0)
        return {
            "error": "Audio recording is too short. Please record at least 3 seconds.",
            "error_code": "AUDIO_TOO_SHORT",
        }

    # Ensure 1-D float32
    if audio_data.ndim > 1:
        audio_data = np.mean(audio_data, axis=1)
    audio_data = audio_data.astype(np.float32)

    # ── Step 2: Duration check ────────────────────────────────────
    duration_sec = len(audio_data) / max(sample_rate, 1)
    if duration_sec < _MIN_DURATION_SEC:
        logger.warning("Validation FAIL — duration %.1fs < %.1fs minimum.",
                        duration_sec, _MIN_DURATION_SEC)
        return {
            "error": f"Audio is only {duration_sec:.1f}s. Please record at least {_MIN_DURATION_SEC:.0f} seconds of speech.",
            "error_code": "DURATION_TOO_SHORT",
        }

    # ── Step 3: Silence / near-silence detection ──────────────────
    rms_all = float(np.sqrt(np.mean(audio_data ** 2)))
    if rms_all < _SILENCE_RMS_THRESHOLD:
        logger.warning("Validation FAIL — audio is silence (RMS=%.5f).", rms_all)
        return {
            "error": "No sound detected. Please speak clearly into the microphone.",
            "error_code": "SILENCE",
        }

    # ── Step 4: Signal-to-noise ratio ─────────────────────────────
    # Estimate noise floor from the quietest 10 % of frames
    frame_length = int(0.025 * sample_rate)  # 25 ms frames
    hop = frame_length // 2
    rms_frames = librosa.feature.rms(y=audio_data, frame_length=frame_length, hop_length=hop)[0]
    sorted_rms = np.sort(rms_frames)
    noise_floor = float(np.mean(sorted_rms[:max(1, len(sorted_rms) // 10)])) + 1e-10
    signal_peak = float(np.mean(sorted_rms[-max(1, len(sorted_rms) // 10):]))
    snr_db = 20.0 * np.log10(signal_peak / noise_floor)

    if snr_db < _MIN_SNR_DB:
        logger.warning("Validation FAIL — SNR too low (%.1f dB).", snr_db)
        return {
            "error": "Audio quality too poor — too much background noise. Please record in a quiet environment.",
            "error_code": "LOW_SNR",
        }

    # ── Step 5: Voice Activity Detection via pYIN pitch tracking ──
    # pYIN returns NaN for unvoiced frames; voiced frames have a valid f0
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y=audio_data,
        fmin=float(librosa.note_to_hz("C2")),
        fmax=float(librosa.note_to_hz("C7")),
        sr=sample_rate,
    )
    f0_voiced = f0[~np.isnan(f0)] if f0 is not None else np.array([])
    total_frames = len(f0) if f0 is not None else 0
    voiced_count = len(f0_voiced)
    voiced_fraction = voiced_count / max(total_frames, 1)

    # Count voiced-segment onsets (transitions from unvoiced → voiced)
    if voiced_flag is not None and len(voiced_flag) > 1:
        transitions = np.diff(voiced_flag.astype(int))
        onset_count = int(np.sum(transitions == 1))
    else:
        onset_count = 0

    if voiced_fraction < _MIN_VOICED_FRACTION or onset_count < _MIN_VOICED_ONSETS:
        logger.warning(
            "Validation FAIL — insufficient speech (voiced=%.1f%%, onsets=%d).",
            voiced_fraction * 100, onset_count,
        )
        return {
            "error": "No human voice detected. Please speak clearly — music or noise is not accepted.",
            "error_code": "NO_VOICE",
        }

    # ── All validation passed → extract biomarkers ────────────────
    logger.info(
        "Voice validation PASSED (dur=%.1fs, RMS=%.4f, SNR=%.1fdB, voiced=%.0f%%, onsets=%d)",
        duration_sec, rms_all, snr_db, voiced_fraction * 100, onset_count,
    )

    try:
        return _extract_voice_features(audio_data, sample_rate, f0, f0_voiced,
                                       voiced_flag, rms_frames)
    except Exception:
        logger.exception("Voice feature extraction failed after validation.")
        return {
            "error": "Voice analysis failed unexpectedly. Please try again.",
            "error_code": "EXTRACTION_FAILED",
        }


# ==============================================================================
# INTERNAL — Feature extraction (reuses VAD results to avoid double work)
# ==============================================================================

def _extract_voice_features(
    audio: np.ndarray,
    sr: int,
    f0: np.ndarray,
    f0_voiced: np.ndarray,
    voiced_flag: np.ndarray,
    rms_frames: np.ndarray,
) -> Dict[str, Union[float, bool]]:
    """Run Librosa feature extraction on already-validated audio."""

    # ── MFCCs ─────────────────────────────────────────────────────
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    mfcc_var = np.var(mfccs, axis=1)
    mfcc_instability = float(np.mean(mfcc_var))

    # ── Pitch statistics (from pre-computed f0) ───────────────────
    if len(f0_voiced) > 1:
        pitch_mean = float(np.mean(f0_voiced))
        pitch_std = float(np.std(f0_voiced))
        pitch_cv = pitch_std / pitch_mean if pitch_mean > 1e-6 else 0.0
    else:
        pitch_mean, pitch_std, pitch_cv = 150.0, 20.0, 0.13

    # ── RMS statistics (from pre-computed frames) ─────────────────
    rms_mean = float(np.mean(rms_frames))
    rms_var = float(np.var(rms_frames))

    # ── Speech rate (voiced-onset count / duration) ───────────────
    if voiced_flag is not None and len(voiced_flag) > 1:
        transitions = np.diff(voiced_flag.astype(int))
        onset_count = int(np.sum(transitions == 1))
        duration_sec = len(audio) / sr
        speech_rate = onset_count / max(duration_sec, 0.1)
    else:
        speech_rate = 2.0

    # ── Derived biomarkers ────────────────────────────────────────
    mfcc_stress = normalize_to_range(mfcc_instability, 0.0, 50.0)
    pitch_stress = normalize_to_range(pitch_cv, 0.0, 0.5)
    voice_stress = float(np.clip(0.5 * mfcc_stress + 0.5 * pitch_stress, 0.0, 1.0))

    low_energy = normalize_to_range(rms_mean, 0.0, 0.1, target_min=1.0, target_max=0.0)
    energy_irregularity = normalize_to_range(rms_var, 0.0, 0.01)
    breathing_score = float(np.clip(0.6 * low_energy + 0.4 * energy_irregularity, 0.0, 1.0))

    pitch_instability = normalize_to_range(pitch_cv, 0.0, 0.5)

    # ── Composite voice risk score ────────────────────────────────
    composite = {
        "stress": voice_stress,
        "breathing": breathing_score,
        "pitch": pitch_instability,
    }
    voice_risk_score = clip_score(
        weighted_composite(composite, VOICE_WEIGHTS) * 100, 0.0, 100.0,
    )

    result: Dict[str, Union[float, bool]] = {
        "voice_stress": round(voice_stress, 4),
        "breathing_score": round(breathing_score, 4),
        "pitch_instability": round(pitch_instability, 4),
        "voice_risk_score": round(voice_risk_score, 2),
        "validated": True,
    }
    logger.info("Voice analysis complete: %s", result)
    return result
