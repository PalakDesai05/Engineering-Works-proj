const db = require("../config/database");
const { recognizeFace } = require("../services/faceService");
const { uploadFaceImage, runMiddleware } = require("../middleware/upload");

const getTodayString = () => new Date().toISOString().slice(0, 10);
const isSunday = (d) => new Date(d).getDay() === 0;
const getTimeString = () => new Date().toTimeString().slice(0, 8);

const fmtWorker = (row) => row ? ({ ...row, _id: String(row.id), id: String(row.id), is_active: !!row.is_active }) : null;
const fmtAtt = (row) => {
  if (!row) return null;
  const r = { ...row, _id: String(row.id), id: String(row.id) };
  if (r.worker) r.worker_id = fmtWorker(r.worker);
  return r;
};

// ── POST /api/attendance/mark (face recognition) ──────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    await runMiddleware(req, res, uploadFaceImage);
    if (!req.file) return res.status(400).json({ success: false, message: "Face image is required" });

    const today = getTodayString();
    if (isSunday(today)) return res.status(400).json({ success: false, message: "Attendance cannot be marked on Sundays" });

    let recognitionResult;
    try {
      recognitionResult = await recognizeFace(req.file.buffer, req.file.originalname);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    const { worker_id, confidence } = recognitionResult;
    const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(worker_id);
    if (!worker) return res.status(404).json({ success: false, message: "Matched worker not found" });
    if (!worker.is_active) return res.status(403).json({ success: false, message: "Worker is inactive" });

    const existing = db.prepare("SELECT * FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, today);
    if (existing) {
      return res.status(409).json({ success: false, message: `Attendance already marked for ${worker.name} today at ${existing.time}` });
    }

    const result = db.prepare(
      "INSERT INTO attendance (worker_id, date, time, status, marked_by) VALUES (?, ?, ?, 'present', 'face_recognition')"
    ).run(worker_id, today, getTimeString());

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${worker.name}`,
      data: {
        worker: fmtWorker(worker),
        attendance: { id: String(result.lastInsertRowid), worker_id, date: today, time: getTimeString(), status: "present", marked_by: "face_recognition" },
        confidence,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/attendance/mark-manual ─────────────────────────────────────────
const markManual = (req, res, next) => {
  try {
    const { worker_id, date } = req.body;
    if (!worker_id) return res.status(400).json({ success: false, message: "worker_id is required" });

    const targetDate = date || getTodayString();
    if (isSunday(targetDate)) return res.status(400).json({ success: false, message: "Attendance cannot be marked on Sundays" });

    const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(worker_id);
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found" });

    const existing = db.prepare("SELECT id FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, targetDate);
    if (existing) return res.status(409).json({ success: false, message: `Attendance already marked for ${worker.name} on ${targetDate}` });

    const result = db.prepare(
      "INSERT INTO attendance (worker_id, date, time, status, marked_by) VALUES (?, ?, ?, 'present', 'manual')"
    ).run(worker_id, targetDate, getTimeString());

    res.status(201).json({ success: true, message: `Manual attendance marked for ${worker.name}`, data: { id: String(result.lastInsertRowid), worker_id, date: targetDate, status: "present", marked_by: "manual" } });
  } catch (err) { next(err); }
};

// ── GET /api/attendance/today ─────────────────────────────────────────────────
const getTodayAttendance = (req, res, next) => {
  try {
    const today = getTodayString();
    const rows = db.prepare(`
      SELECT a.*, w.name AS w_name, w.phone AS w_phone, w.photo_url AS w_photo_url
      FROM attendance a JOIN workers w ON w.id = a.worker_id
      WHERE a.date = ? ORDER BY a.time ASC
    `).all(today);

    const data = rows.map((r) => ({
      _id: String(r.id), id: String(r.id),
      worker_id: { _id: String(r.worker_id), id: String(r.worker_id), name: r.w_name, phone: r.w_phone, photo_url: r.w_photo_url },
      date: r.date, time: r.time, status: r.status, marked_by: r.marked_by, created_at: r.created_at,
    }));

    res.json({ success: true, date: today, total_present: data.length, data });
  } catch (err) { next(err); }
};

// ── GET /api/attendance/absent ────────────────────────────────────────────────
const getAbsentToday = (req, res, next) => {
  try {
    const today = getTodayString();
    if (isSunday(today)) return res.json({ success: true, date: today, message: "Today is Sunday", data: [] });

    const absentWorkers = db.prepare(`
      SELECT * FROM workers WHERE is_active = 1 AND id NOT IN (
        SELECT worker_id FROM attendance WHERE date = ?
      )
    `).all(today).map((w) => ({ ...w, _id: String(w.id), id: String(w.id), is_active: !!w.is_active }));

    res.json({ success: true, date: today, total_absent: absentWorkers.length, data: absentWorkers });
  } catch (err) { next(err); }
};

// ── GET /api/attendance/report ────────────────────────────────────────────────
const getAttendanceReport = (req, res, next) => {
  try {
    const { start_date, end_date, worker_id } = req.query;
    let query = `
      SELECT a.*, w.name AS w_name, w.phone AS w_phone, w.photo_url AS w_photo_url
      FROM attendance a JOIN workers w ON w.id = a.worker_id WHERE 1=1
    `;
    const params = [];
    if (worker_id) { query += " AND a.worker_id = ?"; params.push(worker_id); }
    if (start_date) { query += " AND a.date >= ?"; params.push(start_date); }
    if (end_date) { query += " AND a.date <= ?"; params.push(end_date); }
    query += " ORDER BY a.date DESC, a.time ASC";

    const data = db.prepare(query).all(...params).map((r) => ({
      _id: String(r.id), id: String(r.id),
      worker_id: { _id: String(r.worker_id), id: String(r.worker_id), name: r.w_name, phone: r.w_phone, photo_url: r.w_photo_url },
      date: r.date, time: r.time, status: r.status, marked_by: r.marked_by,
    }));

    res.json({ success: true, total: data.length, data });
  } catch (err) { next(err); }
};

// ── DELETE /api/attendance/:id ────────────────────────────────────────────────
const deleteAttendance = (req, res, next) => {
  try {
    const row = db.prepare("SELECT id FROM attendance WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Record not found" });
    db.prepare("DELETE FROM attendance WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Attendance record deleted" });
  } catch (err) { next(err); }
};

module.exports = { markAttendance, markManual, getTodayAttendance, getAbsentToday, getAttendanceReport, deleteAttendance };
