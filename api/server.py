"""
Flask API server for AI Silent Disease Predictor.

Wraps the existing Python ML modules (face_analysis, voice_analysis,
prediction_engine) with REST endpoints that the React frontend calls.

Runs on port 5001. The Express dev server proxies /api/* to this.
"""

import sys
import os
import base64
import io
import json

import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add the project root to sys.path so we can import modules
PREDICTOR_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
sys.path.insert(0, PREDICTOR_DIR)

from modules.face_analysis import analyze_face
from modules.voice_analysis import analyze_voice
from modules.prediction_engine import predict_health_risk, warm_up
from config.settings import FEATURE_NAMES, SAMPLE_RATE

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB
CORS(app)


# ── Startup ───────────────────────────────────────────────────────────
_model_ready = False

@app.before_request
def _warm_up_once():
    """Lazy warm-up on first request."""
    global _model_ready
    if not _model_ready:
        warm_up()
        _model_ready = True


# ── Health Check ──────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_dir": PREDICTOR_DIR})


# ── Face Scan ─────────────────────────────────────────────────────────
@app.route("/api/face-scan", methods=["POST"])
def face_scan():
    """Accept a base64-encoded image, return facial biomarkers.

    Request JSON:
        { "image": "<base64 string>" }
    """
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image")

    if not image_b64:
        return jsonify({"error": "No image provided. Please capture or upload a photo.", "error_code": "NO_IMAGE"}), 400

    try:
        # Strip data-URI prefix if present (e.g. "data:image/png;base64,...")
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if image is None:
            return jsonify({"error": "Could not decode image. Please try a different photo.", "error_code": "DECODE_FAILED"}), 400

        result = analyze_face(image=image, deterministic_seed=None)

        # Check if face analysis returned a validation error
        if "error" in result:
            return jsonify(result), 422

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e), "error_code": "SERVER_ERROR"}), 500


# ── Voice Scan ────────────────────────────────────────────────────────
@app.route("/api/voice-scan", methods=["POST"])
def voice_scan():
    """Accept base64-encoded PCM/WAV audio, return vocal biomarkers.

    Request JSON:
        { "audio": "<base64 string>", "sampleRate": 22050 }
    """
    data = request.get_json(silent=True) or {}
    audio_b64 = data.get("audio")
    sample_rate = data.get("sampleRate", SAMPLE_RATE)

    if not audio_b64:
        return jsonify({"error": "No audio provided. Please record or upload audio.", "error_code": "NO_AUDIO"}), 400

    try:
        if "," in audio_b64:
            audio_b64 = audio_b64.split(",", 1)[1]

        audio_bytes = base64.b64decode(audio_b64)

        # Try to decode as WAV first via scipy
        try:
            import scipy.io.wavfile as wav
            sr, audio_np = wav.read(io.BytesIO(audio_bytes))
            audio_np = audio_np.astype(np.float32)
            if audio_np.ndim > 1:
                audio_np = np.mean(audio_np, axis=1)
            # Normalize int16 → float32 [-1, 1]
            if audio_np.max() > 1.0:
                audio_np = audio_np / 32768.0
            sample_rate = sr
        except Exception:
            # Fallback: treat as raw float32 PCM
            audio_np = np.frombuffer(audio_bytes, dtype=np.float32)

        result = analyze_voice(
            audio_data=audio_np,
            sample_rate=int(sample_rate),
        )

        # Check if voice analysis returned a validation error
        if "error" in result:
            return jsonify(result), 422

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e), "error_code": "SERVER_ERROR"}), 500


# ── Predict ───────────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict():
    """Accept fused biomarker features, return ML prediction.

    Request JSON:
        { "features": { "face_fatigue": 42.1, ... } }
    """
    data = request.get_json(silent=True) or {}
    features = data.get("features")

    if not features or not isinstance(features, dict):
        return jsonify({"error": "Missing 'features' dict"}), 400

    # Ensure all feature keys are present
    missing = [k for k in FEATURE_NAMES if k not in features]
    if missing:
        return jsonify({"error": f"Missing features: {missing}"}), 400

    try:
        # Cast values to float
        features = {k: float(v) for k, v in features.items()}
        result = predict_health_risk(features)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Full Scan (convenience: face + voice + predict in one call) ───────
@app.route("/api/full-scan", methods=["POST"])
def full_scan():
    """One-shot endpoint: accepts image + audio, returns full prediction.

    Pipeline stops immediately if face or voice validation fails.
    No simulation / placeholder data is ever generated.

    Request JSON:
        {
            "image": "<base64>",       // required
            "audio": "<base64>",       // required
            "sampleRate": 22050        // optional
        }
    """
    data = request.get_json(silent=True) or {}

    # ── Face analysis ──
    image_b64 = data.get("image")
    if not image_b64:
        return jsonify({
            "error": "No face image provided. Please complete the Face Scan step first.",
            "error_code": "NO_IMAGE",
            "step": "face",
        }), 400

    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "Could not decode face image.", "error_code": "DECODE_FAILED", "step": "face"}), 400
        face_result = analyze_face(image=image, deterministic_seed=None)
    except Exception as e:
        return jsonify({"error": f"Face analysis error: {e}", "error_code": "FACE_ERROR", "step": "face"}), 500

    if "error" in face_result:
        face_result["step"] = "face"
        return jsonify(face_result), 422

    # ── Voice analysis ──
    audio_b64 = data.get("audio")
    sr = data.get("sampleRate", SAMPLE_RATE)
    if not audio_b64:
        return jsonify({
            "error": "No voice audio provided. Please complete the Voice Scan step first.",
            "error_code": "NO_AUDIO",
            "step": "voice",
        }), 400

    try:
        if "," in audio_b64:
            audio_b64 = audio_b64.split(",", 1)[1]
        audio_bytes = base64.b64decode(audio_b64)
        try:
            import scipy.io.wavfile as wav
            sr_read, audio_np = wav.read(io.BytesIO(audio_bytes))
            audio_np = audio_np.astype(np.float32)
            if audio_np.ndim > 1:
                audio_np = np.mean(audio_np, axis=1)
            if audio_np.max() > 1.0:
                audio_np = audio_np / 32768.0
            sr = sr_read
        except Exception:
            audio_np = np.frombuffer(audio_bytes, dtype=np.float32)
        voice_result = analyze_voice(audio_data=audio_np, sample_rate=int(sr))
    except Exception as e:
        return jsonify({"error": f"Voice analysis error: {e}", "error_code": "VOICE_ERROR", "step": "voice"}), 500

    if "error" in voice_result:
        voice_result["step"] = "voice"
        return jsonify(voice_result), 422

    # ── Merge features & Predict ──
    features = {**face_result, **voice_result}
    prediction = predict_health_risk(features)

    if "error" in prediction and prediction.get("overall_risk") is None:
        prediction["step"] = "prediction"
        return jsonify(prediction), 422

    return jsonify({
        "face": face_result,
        "voice": voice_result,
        "prediction": prediction,
    })


# ── Main ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[API] AI Silent Disease Predictor backend")
    print(f"[API] Model directory: {PREDICTOR_DIR}")
    print(f"[API] Features: {FEATURE_NAMES}")
    app.run(host="0.0.0.0", port=5001, debug=False)

