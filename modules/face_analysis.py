"""
face_analysis.py — Facial biomarker extraction with strict input validation.

Validation pipeline (runs BEFORE any AI analysis):
    Step 1 — Image exists and is a valid colour frame
    Step 2 — Brightness check (reject too dark / overexposed)
    Step 3 — Blur detection via Laplacian variance
    Step 4 — Face detection via OpenCV Haar Cascade
    Step 5 — Face quality: size check + centering check

Only after ALL checks pass does the module extract biomarkers.
If ANY check fails an error dict is returned — NO prediction runs.

Architecture rules
------------------
- Does NOT import Streamlit.
- Does NOT import other modules (voice_analysis, prediction_engine).
- Communicates only via dict return values.
- NEVER returns simulated or placeholder data.
"""

from __future__ import annotations

from typing import Dict, Optional, Union

import cv2
import numpy as np

from config.settings import (
    FACE_WEIGHTS,
    LEFT_EYE_LANDMARKS,
    MIDLINE_LANDMARKS,
    RIGHT_EYE_LANDMARKS,
    SYMMETRIC_PAIRS,
)
from utils.feature_utils import (
    compute_brightness_variance,
    compute_ear,
    compute_symmetry_index,
    weighted_composite,
)
from utils.logger import get_logger
from utils.preprocessing import clip_score, normalize_to_range

logger = get_logger(__name__)

# Healthy EAR reference (open eye)
_HEALTHY_EAR = 0.27

# ── Validation thresholds ─────────────────────────────────────────────
# Brightness: mean pixel intensity of grayscale image (0–255)
_MIN_BRIGHTNESS = 40       # reject very dark frames
_MAX_BRIGHTNESS = 240      # reject washed-out / white frames
# Blur: Laplacian variance — lower value = blurrier image
_MIN_SHARPNESS = 30.0      # reject blurry / out-of-focus images
# Face: minimum face area as fraction of total frame area
_MIN_FACE_FRACTION = 0.03  # face must cover ≥3 % of the frame
# Face centering: face center may deviate at most this fraction of half-frame
_MAX_CENTER_OFFSET = 0.35  # 35 %


# ==============================================================================
# PUBLIC API
# ==============================================================================

def analyze_face(
    image: Optional[np.ndarray] = None,
    deterministic_seed: Optional[int] = None,
) -> Dict[str, Union[float, str, bool]]:
    """Extract facial biomarkers from a BGR image with full validation.

    Validation pipeline
    -------------------
    1. Image exists and is a valid 3-channel colour frame
    2. Brightness is within acceptable range
    3. Image is not too blurry (Laplacian variance)
    4. A human face is detected (Haar cascade)
    5. Detected face is large enough and reasonably centered

    Returns
    -------
    dict
        On success — biomarker keys plus ``"validated": True``.
        On failure — ``{"error": "...", "error_code": "..."}``.
    """

    # ── Step 1: Image exists and is valid ─────────────────────────
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        logger.warning("Validation FAIL — no image provided.")
        return {
            "error": "No image provided. Please capture or upload a photo.",
            "error_code": "NO_IMAGE",
        }

    if image.ndim != 3 or image.shape[2] != 3:
        return {
            "error": "Invalid image format. Please provide a colour photo.",
            "error_code": "INVALID_FORMAT",
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # ── Step 2: Brightness check ──────────────────────────────────
    mean_brightness = float(np.mean(gray))
    if mean_brightness < _MIN_BRIGHTNESS:
        logger.warning("Validation FAIL — too dark (brightness=%.1f)", mean_brightness)
        return {
            "error": "Lighting too low. Please improve lighting and try again.",
            "error_code": "LOW_BRIGHTNESS",
        }
    if mean_brightness > _MAX_BRIGHTNESS:
        logger.warning("Validation FAIL — overexposed (brightness=%.1f)", mean_brightness)
        return {
            "error": "Image is overexposed. Please reduce lighting or glare.",
            "error_code": "HIGH_BRIGHTNESS",
        }

    # ── Step 3: Blur detection ────────────────────────────────────
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < _MIN_SHARPNESS:
        logger.warning("Validation FAIL — blurry (sharpness=%.1f)", laplacian_var)
        return {
            "error": "Image is too blurry. Please hold the camera steady and ensure focus.",
            "error_code": "BLURRY_IMAGE",
        }

    # ── Step 4: Face detection (Haar cascade — works on all Pythons) ──
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"  # type: ignore[attr-defined]
    )
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60),
    )

    if len(faces) == 0:
        logger.warning("Validation FAIL — no face detected.")
        return {
            "error": "No face detected. Please position your face clearly in front of the camera.",
            "error_code": "NO_FACE",
        }

    # Pick the largest detected face
    face_areas = [w * h for (_, _, w, h) in faces]
    best_idx = int(np.argmax(face_areas))
    fx, fy, fw, fh = faces[best_idx]

    # ── Step 5: Face quality — size and centering ─────────────────
    frame_h, frame_w = gray.shape[:2]
    face_fraction = (fw * fh) / (frame_w * frame_h)

    if face_fraction < _MIN_FACE_FRACTION:
        logger.warning("Validation FAIL — face too small (%.1f%%)", face_fraction * 100)
        return {
            "error": "Face is too far away. Please move closer to the camera.",
            "error_code": "FACE_TOO_SMALL",
        }

    face_cx = fx + fw / 2
    face_cy = fy + fh / 2
    offset_x = abs(face_cx - frame_w / 2) / (frame_w / 2)
    offset_y = abs(face_cy - frame_h / 2) / (frame_h / 2)

    if offset_x > _MAX_CENTER_OFFSET or offset_y > _MAX_CENTER_OFFSET:
        logger.warning("Validation FAIL — face off-center (dx=%.2f, dy=%.2f)", offset_x, offset_y)
        return {
            "error": "Face is not centered. Please position your face in the middle of the frame.",
            "error_code": "FACE_OFF_CENTER",
        }

    # ── All validation passed → extract biomarkers ────────────────
    logger.info(
        "Face validation PASSED (brightness=%.0f, sharpness=%.0f, face=%.1f%%)",
        mean_brightness, laplacian_var, face_fraction * 100,
    )

    try:
        return _extract_face_features(image, gray, (fx, fy, fw, fh))
    except Exception:
        logger.exception("Feature extraction failed after validation.")
        return {
            "error": "Face analysis failed unexpectedly. Please retake the photo.",
            "error_code": "EXTRACTION_FAILED",
        }


# ==============================================================================
# INTERNAL — Feature extraction
# ==============================================================================

def _extract_face_features(
    image: np.ndarray,
    gray: np.ndarray,
    face_rect: tuple,
) -> Dict[str, Union[float, bool]]:
    """Extract biomarkers using MediaPipe (preferred) or OpenCV fallback."""
    mp_result = _try_mediapipe(image)
    if mp_result is not None:
        return mp_result
    return _extract_opencv_features(image, gray, face_rect)


def _try_mediapipe(image: np.ndarray) -> Optional[Dict[str, Union[float, bool]]]:
    """Attempt MediaPipe FaceMesh extraction. Returns None if unavailable."""
    try:
        import mediapipe as mp
        if not hasattr(mp, "solutions") or not hasattr(mp.solutions, "face_mesh"):
            return None

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        with mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        ) as face_mesh:
            results = face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0].landmark
        h, w, _ = image.shape
        coords = np.array(
            [(lm.x * w, lm.y * h, lm.z * w) for lm in landmarks],
            dtype=np.float64,
        )

        # EAR
        right_eye_pts = [coords[i] for i in RIGHT_EYE_LANDMARKS]
        left_eye_pts = [coords[i] for i in LEFT_EYE_LANDMARKS]
        avg_ear = (compute_ear(right_eye_pts) + compute_ear(left_eye_pts)) / 2.0
        face_fatigue = normalize_to_range(max(0.0, _HEALTHY_EAR - avg_ear) / _HEALTHY_EAR, 0.0, 1.0)
        blink_instability = normalize_to_range(abs(compute_ear(right_eye_pts) - compute_ear(left_eye_pts)), 0.0, 0.15)

        # Symmetry
        left_sym = np.array([coords[lp] for lp, _ in SYMMETRIC_PAIRS])
        right_sym = np.array([coords[rp] for _, rp in SYMMETRIC_PAIRS])
        midline = np.array([coords[i] for i in MIDLINE_LANDMARKS])
        symmetry_score = compute_symmetry_index(left_sym, right_sym, midline)

        # Brightness variance in face ROI
        gry = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        xs, ys = coords[:, 0], coords[:, 1]
        roi = gry[int(max(ys.min(), 0)):int(min(ys.max(), h)),
                   int(max(xs.min(), 0)):int(min(xs.max(), w))]
        brightness_variance = compute_brightness_variance(roi)

        composite = {
            "fatigue": face_fatigue,
            "asymmetry": 1.0 - symmetry_score,
            "blink": blink_instability,
            "brightness": brightness_variance,
        }
        face_risk_score = clip_score(
            weighted_composite(composite, FACE_WEIGHTS) * 100, 0.0, 100.0,
        )

        result: Dict[str, Union[float, bool]] = {
            "face_fatigue": round(face_fatigue, 4),
            "symmetry_score": round(symmetry_score, 4),
            "blink_instability": round(blink_instability, 4),
            "brightness_variance": round(brightness_variance, 4),
            "face_risk_score": round(face_risk_score, 2),
            "validated": True,
        }
        logger.info("Face analysis complete (MediaPipe): %s", result)
        return result

    except Exception as exc:
        logger.debug("MediaPipe not usable, falling back to OpenCV: %s", exc)
        return None


def _extract_opencv_features(
    image: np.ndarray,
    gray: np.ndarray,
    face_rect: tuple,
) -> Dict[str, Union[float, bool]]:
    """Compute approximate biomarkers from the Haar-detected face ROI."""
    fx, fy, fw, fh = face_rect
    face_roi = gray[fy:fy + fh, fx:fx + fw]
    mid = fw // 2

    # ── Symmetry: compare left / flipped-right halves ─────────────
    left_half = face_roi[:, :mid]
    right_half = cv2.flip(face_roi[:, mid:], 1)
    target = (min(left_half.shape[1], right_half.shape[1]),
              min(left_half.shape[0], right_half.shape[0]))
    if target[0] > 0 and target[1] > 0:
        diff = np.abs(cv2.resize(left_half, target).astype(float)
                      - cv2.resize(right_half, target).astype(float))
        symmetry_score = float(np.clip(1.0 - np.mean(diff) / 255.0, 0.0, 1.0))
    else:
        symmetry_score = 0.5

    # ── Eye-region metrics ────────────────────────────────────────
    eye_region = face_roi[:int(fh * 0.4), :]
    eye_mean = float(np.mean(eye_region)) / 255.0
    face_fatigue = float(np.clip((1.0 - eye_mean) * 0.8, 0.0, 1.0))

    eye_left = eye_region[:, :mid]
    eye_right = eye_region[:, mid:]
    blink_instability = float(np.clip(
        abs(float(np.mean(eye_left)) - float(np.mean(eye_right))) / 255.0 * 5.0,
        0.0, 1.0,
    ))

    # ── Brightness variance (skin patch) ──────────────────────────
    mx, my = int(fw * 0.2), int(fh * 0.3)
    skin = face_roi[my:fh - my, mx:fw - mx]
    brightness_variance = float(np.clip(np.std(skin) / 128.0, 0.0, 1.0)) if skin.size > 0 else 0.3

    # ── Composite risk score ──────────────────────────────────────
    composite = {
        "fatigue": face_fatigue,
        "asymmetry": 1.0 - symmetry_score,
        "blink": blink_instability,
        "brightness": brightness_variance,
    }
    face_risk_score = clip_score(
        weighted_composite(composite, FACE_WEIGHTS) * 100, 0.0, 100.0,
    )

    result: Dict[str, Union[float, bool]] = {
        "face_fatigue": round(face_fatigue, 4),
        "symmetry_score": round(symmetry_score, 4),
        "blink_instability": round(blink_instability, 4),
        "brightness_variance": round(brightness_variance, 4),
        "face_risk_score": round(face_risk_score, 2),
        "validated": True,
    }
    logger.info("Face analysis complete (OpenCV fallback): %s", result)
    return result
