const express = require("express");
const router = express.Router();
const {
  markAttendance,
  markManual,
  getTodayAttendance,
  getAbsentToday,
  deleteAttendance,
  getAttendanceReport,
} = require("../controllers/attendanceController");

// POST   /api/attendance/mark          – face-recognition attendance
router.post("/mark", markAttendance);

// POST   /api/attendance/mark-manual   – manual attendance by worker_id
router.post("/mark-manual", markManual);

// GET    /api/attendance/today         – all present workers today
router.get("/today", getTodayAttendance);

// GET    /api/attendance/absent        – absent workers today
router.get("/absent", getAbsentToday);

// GET    /api/attendance/report        – date-range / per-worker report
router.get("/report", getAttendanceReport);

// DELETE /api/attendance/:id           – remove an attendance record
router.delete("/:id", deleteAttendance);

module.exports = router;
