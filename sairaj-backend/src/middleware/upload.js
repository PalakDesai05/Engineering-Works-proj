const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// ── Disk storage for worker photos ────────────────────────────────────────────
const workerPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve("./uploads/workers")),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});

// ── Memory storage for face images (sent to Python) ───────────────────────────
const memoryStorage = multer.memoryStorage();

// ── File filter ───────────────────────────────────────────────────────────────
const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

// ── Multer instances ──────────────────────────────────────────────────────────
const uploadWorkerPhoto = multer({
  storage: workerPhotoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("photo");

const uploadFaceImage = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, (err) => { if (err) reject(err); else resolve(); });
  });

module.exports = { uploadWorkerPhoto, uploadFaceImage, runMiddleware };
