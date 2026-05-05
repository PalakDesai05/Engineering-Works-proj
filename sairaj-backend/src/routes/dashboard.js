const express = require("express");
const router = express.Router();
const {
  getSummary,
  getAttendanceChart,
  getRevenueChart,
  getRecentActivity,
  getTopWorkers,
} = require("../controllers/dashboardController");

// GET /api/dashboard/summary           – KPI cards
router.get("/summary", getSummary);

// GET /api/dashboard/attendance-chart  – last N days attendance (?days=30)
router.get("/attendance-chart", getAttendanceChart);

// GET /api/dashboard/revenue-chart     – last N months revenue (?months=6)
router.get("/revenue-chart", getRevenueChart);

// GET /api/dashboard/recent-activity   – latest bills + quotations
router.get("/recent-activity", getRecentActivity);

// GET /api/dashboard/top-workers       – top 5 workers by monthly attendance
router.get("/top-workers", getTopWorkers);

module.exports = router;
