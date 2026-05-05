require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

// ── Ensure directories exist ─────────────────────────────────────────────────
["./uploads/workers", "./uploads/faces", "./pdfs"].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Init SQLite DB ────────────────────────────────────────────────────────────
require("./src/config/database");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Serve uploaded files ──────────────────────────────────────────────────────
app.use("/uploads", express.static(path.resolve("./uploads")));
app.use("/pdfs", express.static(path.resolve("./pdfs")));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later." },
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/workers",    require("./src/routes/workers"));
app.use("/api/attendance", require("./src/routes/attendance"));
app.use("/api/bill",       require("./src/routes/bills"));
app.use("/api/quotation",  require("./src/routes/quotations"));
app.use("/api/dashboard",  require("./src/routes/dashboard"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ success: true, message: "Sairaj API running", timestamp: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Sairaj Engineering Works API`);
  console.log(`   http://localhost:${PORT}  [${process.env.NODE_ENV}]`);
  console.log(`   DB : ${path.resolve(process.env.DB_PATH || "./sairaj.db")}\n`);
});

module.exports = app;
