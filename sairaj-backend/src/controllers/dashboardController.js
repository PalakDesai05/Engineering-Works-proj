const db = require("../config/database");

const getTodayString = () => new Date().toISOString().slice(0, 10);

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
const getSummary = (req, res, next) => {
  try {
    const today = getTodayString();
    const thisMonth = today.slice(0, 7); // YYYY-MM

    const totalWorkers  = db.prepare("SELECT COUNT(*) AS cnt FROM workers").get().cnt;
    const activeWorkers = db.prepare("SELECT COUNT(*) AS cnt FROM workers WHERE is_active = 1").get().cnt;
    const presentToday  = db.prepare("SELECT COUNT(*) AS cnt FROM attendance WHERE date = ?").get(today).cnt;
    const absentToday   = Math.max(0, activeWorkers - presentToday);

    const billingRow    = db.prepare("SELECT COUNT(*) AS total_bills, COALESCE(SUM(total_amount),0) AS total_billed FROM bills").get();
    const monthlyRow    = db.prepare("SELECT COALESCE(SUM(total_amount),0) AS monthly_revenue FROM bills WHERE substr(date,1,7) = ?").get(thisMonth);

    const totalQuotations   = db.prepare("SELECT COUNT(*) AS cnt FROM quotations").get().cnt;
    const pendingQuotations = db.prepare("SELECT COUNT(*) AS cnt FROM quotations WHERE status IN ('draft','sent')").get().cnt;

    res.json({
      success: true,
      data: {
        workers:    { total: totalWorkers, active: activeWorkers },
        attendance: { present_today: presentToday, absent_today: absentToday },
        billing:    { total_bills: billingRow.total_bills, total_billed: billingRow.total_billed, monthly_revenue: monthlyRow.monthly_revenue },
        quotations: { total: totalQuotations, pending: pendingQuotations },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/dashboard/attendance-chart ───────────────────────────────────────
const getAttendanceChart = (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);

    const data = db.prepare(`
      SELECT date, COUNT(*) AS present
      FROM attendance WHERE date >= ?
      GROUP BY date ORDER BY date ASC
    `).all(fromStr);

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── GET /api/dashboard/revenue-chart ─────────────────────────────────────────
const getRevenueChart = (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const from = new Date();
    from.setMonth(from.getMonth() - months + 1);
    from.setDate(1);
    const fromStr = from.toISOString().slice(0, 10);

    const data = db.prepare(`
      SELECT substr(date,1,7) AS month, SUM(total_amount) AS revenue, COUNT(*) AS count
      FROM bills WHERE date >= ?
      GROUP BY month ORDER BY month ASC
    `).all(fromStr);

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── GET /api/dashboard/recent-activity ───────────────────────────────────────
const getRecentActivity = (req, res, next) => {
  try {
    const bills = db.prepare("SELECT id, bill_number, client_name, total_amount, created_at FROM bills ORDER BY created_at DESC LIMIT 5").all();
    const quotes = db.prepare("SELECT id, quotation_number, client_name, total_amount, status, created_at FROM quotations ORDER BY created_at DESC LIMIT 5").all();

    const activity = [
      ...bills.map((b) => ({ type: "bill", ref: b.bill_number, client: b.client_name, amount: b.total_amount, date: b.created_at })),
      ...quotes.map((q) => ({ type: "quotation", ref: q.quotation_number, client: q.client_name, amount: q.total_amount, status: q.status, date: q.created_at })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    res.json({ success: true, data: activity });
  } catch (err) { next(err); }
};

// ── GET /api/dashboard/top-workers ───────────────────────────────────────────
const getTopWorkers = (req, res, next) => {
  try {
    const thisMonth = getTodayString().slice(0, 7);
    const data = db.prepare(`
      SELECT a.worker_id, COUNT(*) AS days_present, w.name, w.photo_url
      FROM attendance a JOIN workers w ON w.id = a.worker_id
      WHERE substr(a.date,1,7) = ?
      GROUP BY a.worker_id ORDER BY days_present DESC LIMIT 5
    `).all(thisMonth).map((r) => ({ ...r, worker_id: String(r.worker_id) }));

    res.json({ success: true, month: thisMonth, data });
  } catch (err) { next(err); }
};

module.exports = { getSummary, getAttendanceChart, getRevenueChart, getRecentActivity, getTopWorkers };
