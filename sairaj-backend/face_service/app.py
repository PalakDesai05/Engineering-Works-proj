"""
Sairaj Engineering Works – Face Recognition Microservice
=========================================================
PORT : 8000  (set FACE_SERVICE_PORT env var to override)

Endpoints
---------
GET  /health                  – liveness check
POST /register                – register a worker face via Cloudinary URL or uploaded file
POST /recognize               – identify a worker from an uploaded image buffer
GET  /workers                 – list registered worker IDs
DELETE /workers/<worker_id>   – remove a worker embedding
"""

import os, io, json, logging, urllib.request
from pathlib import Path

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

try:
    import face_recognition
    FACE_LIB = "face_recognition"
except ImportError:
    face_recognition = None
    FACE_LIB = "placeholder"

# ── Config ────────────────────────────────────────────────────────────────────
PORT            = int(os.getenv("FACE_SERVICE_PORT", 8000))
EMBEDDINGS_PATH = Path(os.getenv("EMBEDDINGS_PATH", "./embeddings.json"))
THRESHOLD       = float(os.getenv("FACE_THRESHOLD", 0.55))

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Embedding store ───────────────────────────────────────────────────────────
_store: dict = {}

def _load():
    return json.loads(EMBEDDINGS_PATH.read_text()) if EMBEDDINGS_PATH.exists() else {}

def _save():
    EMBEDDINGS_PATH.write_text(json.dumps(_store))

_store = _load()
log.info(f"Loaded {len(_store)} embedding(s) | face lib: {FACE_LIB}")

# ── Helpers ───────────────────────────────────────────────────────────────────
def _to_rgb(source) -> np.ndarray:
    """Accept file-storage bytes or a URL string → RGB numpy array."""
    if isinstance(source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(source)).convert("RGB")
    else:
        with urllib.request.urlopen(source, timeout=15) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGB")
    return np.array(img)

def _embed(img: np.ndarray):
    if face_recognition is None:
        log.warning("face_recognition not installed – using random placeholder")
        return list(np.random.rand(128).astype(float))
    encs = face_recognition.face_encodings(img)
    return encs[0].tolist() if encs else None

def _cosine(a, b) -> float:
    va, vb = np.array(a), np.array(b)
    d = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / d) if d else 0.0

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return jsonify({"status": "ok", "face_lib": FACE_LIB, "registered": len(_store)})


@app.post("/register")
def register():
    """
    Accepts either:
      - multipart/form-data: worker_id + face (file)
      - application/json:    worker_id + image_url
    """
    worker_id = None
    source = None

    if request.content_type and "multipart" in request.content_type:
        worker_id = request.form.get("worker_id")
        f = request.files.get("face")
        if f:
            source = f.read()
    else:
        data = request.get_json(silent=True) or {}
        worker_id = data.get("worker_id")
        source = data.get("image_url")

    if not worker_id:
        return jsonify({"error": "worker_id is required"}), 400
    if not source:
        return jsonify({"error": "face file or image_url is required"}), 400

    try:
        img = _to_rgb(source)
    except Exception as e:
        return jsonify({"error": f"Could not load image: {e}"}), 422

    emb = _embed(img)
    if emb is None:
        return jsonify({"error": "No face detected in the image"}), 422

    _store[worker_id] = emb
    _save()
    log.info(f"Registered face for worker_id={worker_id}")
    return jsonify({"message": f"Face registered for worker {worker_id}", "worker_id": worker_id}), 201


@app.post("/recognize")
def recognize():
    """
    multipart/form-data: image (file)
    Returns: { worker_id, confidence } or { worker_id: null }
    """
    f = request.files.get("image")
    if not f:
        return jsonify({"error": "image file is required"}), 400

    if not _store:
        return jsonify({"error": "No faces registered yet"}), 404

    try:
        img = _to_rgb(f.read())
    except Exception as e:
        return jsonify({"error": f"Could not load image: {e}"}), 422

    emb = _embed(img)
    if emb is None:
        return jsonify({"worker_id": None, "confidence": 0.0, "detail": "No face detected"}), 422

    best_id, best_score = None, -1.0
    for wid, stored in _store.items():
        score = _cosine(emb, stored)
        if score > best_score:
            best_score, best_id = score, wid

    min_score = 1 - THRESHOLD
    if best_score < min_score:
        log.info(f"No match. Best={best_score:.3f} threshold={min_score:.3f}")
        return jsonify({"worker_id": None, "confidence": round(best_score, 4)})

    log.info(f"Matched worker_id={best_id} confidence={best_score:.3f}")
    return jsonify({"worker_id": best_id, "confidence": round(best_score, 4)})


@app.get("/workers")
def list_workers():
    return jsonify({"registered": list(_store.keys()), "count": len(_store)})


@app.delete("/workers/<worker_id>")
def remove_worker(worker_id):
    if worker_id not in _store:
        return jsonify({"error": "Worker not found"}), 404
    del _store[worker_id]
    _save()
    log.info(f"Removed embedding for worker_id={worker_id}")
    return jsonify({"message": f"Embedding removed for {worker_id}"})


if __name__ == "__main__":
    log.info(f"Starting face service on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
