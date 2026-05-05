const db = require("../config/database");
const { uploadWorkerPhoto, runMiddleware } = require("../middleware/upload");
const { registerFace, deleteFace } = require("../services/faceService");

// ── Helper: map DB row → API response ─────────────────────────────────────────
const fmt = (row) => row ? ({ ...row, _id: String(row.id), id: String(row.id), is_active: !!row.is_active }) : null;

// ── GET /api/workers ──────────────────────────────────────────────────────────
const getWorkers = (req, res, next) => {
  try {
    const { search = "", active, page = 1, limit = 100 } = req.query;
    let query = "SELECT * FROM workers WHERE 1=1";
    const params = [];

    if (active !== undefined) { query += " AND is_active = ?"; params.push(active === "true" ? 1 : 0); }
    if (search) { query += " AND (name LIKE ? OR phone LIKE ? OR address LIKE ?)"; const s = `%${search}%`; params.push(s, s, s); }

    const total = db.prepare(query.replace("SELECT *", "SELECT COUNT(*) AS cnt")).get(...params).cnt;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const rows = db.prepare(query).all(...params).map(fmt);
    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── GET /api/workers/:id ──────────────────────────────────────────────────────
const getWorkerById = (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM workers WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Worker not found" });
    res.json({ success: true, data: fmt(row) });
  } catch (err) { next(err); }
};

// ── POST /api/workers ─────────────────────────────────────────────────────────
const addWorker = async (req, res, next) => {
  try {
    await runMiddleware(req, res, uploadWorkerPhoto);
    if (!req.file) return res.status(400).json({ success: false, message: "Worker photo is required" });

    const { name, phone, address = "" } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    if (!phone) return res.status(400).json({ success: false, message: "phone is required" });

    const photo_url = `/uploads/workers/${req.file.filename}`;
    const result = db.prepare(
      "INSERT INTO workers (name, phone, address, photo_url) VALUES (?, ?, ?, ?)"
    ).run(name.trim(), phone.trim(), address.trim(), photo_url);

    const worker = fmt(db.prepare("SELECT * FROM workers WHERE id = ?").get(result.lastInsertRowid));

    // Register face in background
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    registerFace(String(worker.id), `${baseUrl}${photo_url}`);

    res.status(201).json({ success: true, message: "Worker added successfully", data: worker });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ success: false, message: "Phone number already registered" });
    next(err);
  }
};

// ── PUT /api/workers/:id ──────────────────────────────────────────────────────
const updateWorker = async (req, res, next) => {
  try {
    await runMiddleware(req, res, uploadWorkerPhoto);

    const existing = db.prepare("SELECT * FROM workers WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Worker not found" });

    const { name, phone, address, is_active } = req.body;
    const photo_url = req.file ? `/uploads/workers/${req.file.filename}` : existing.photo_url;

    db.prepare(`
      UPDATE workers SET name=?, phone=?, address=?, photo_url=?, is_active=?, updated_at=datetime('now') WHERE id=?
    `).run(
      name ?? existing.name,
      phone ?? existing.phone,
      address !== undefined ? address : existing.address,
      photo_url,
      is_active !== undefined ? (is_active === "true" || is_active === true ? 1 : 0) : existing.is_active,
      req.params.id
    );

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      registerFace(req.params.id, `${baseUrl}${photo_url}`);
    }

    res.json({ success: true, message: "Worker updated", data: fmt(db.prepare("SELECT * FROM workers WHERE id = ?").get(req.params.id)) });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ success: false, message: "Phone number already in use" });
    next(err);
  }
};

// ── DELETE /api/workers/:id ───────────────────────────────────────────────────
const deleteWorker = (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM workers WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Worker not found" });
    db.prepare("DELETE FROM workers WHERE id = ?").run(req.params.id);
    deleteFace(req.params.id);
    res.json({ success: true, message: "Worker deleted" });
  } catch (err) { next(err); }
};

module.exports = { getWorkers, getWorkerById, addWorker, updateWorker, deleteWorker };
