const db = require("../config/database");
const { generateBillPDF } = require("../services/pdfService");
const path = require("path");
const fs = require("fs");

const fmt = (row) => {
  if (!row) return null;
  return { ...row, _id: String(row.id), id: String(row.id), items: JSON.parse(row.items || "[]") };
};

const buildBillNumber = () => {
  const count = db.prepare("SELECT COUNT(*) AS cnt FROM bills").get().cnt;
  const yy = new Date().getFullYear().toString().slice(2);
  return `BILL-${yy}-${String(count + 1).padStart(4, "0")}`;
};

const computeItems = (items) =>
  items.map((i) => ({ ...i, total: parseFloat((parseFloat(i.quantity) * parseFloat(i.unit_price)).toFixed(2)) }));

const computeTotals = (items, taxPercent = 18, discount = 0) => {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const afterDisc = subtotal - parseFloat(discount);
  const tax_amount = parseFloat(((afterDisc * taxPercent) / 100).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), tax_amount, total_amount: parseFloat((afterDisc + tax_amount).toFixed(2)) };
};

// ── POST /api/bill ────────────────────────────────────────────────────────────
const createBill = (req, res, next) => {
  try {
    const { client_name, client_address = "", client_phone = "", client_gst = "", date, items, tax_percent = 18, discount_amount = 0, notes = "" } = req.body;
    if (!client_name) return res.status(400).json({ success: false, message: "client_name is required" });
    if (!items?.length) return res.status(400).json({ success: false, message: "At least one item is required" });
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    const lineItems = computeItems(items);
    const { subtotal, tax_amount, total_amount } = computeTotals(lineItems, tax_percent, discount_amount);
    const bill_number = buildBillNumber();

    const result = db.prepare(`
      INSERT INTO bills (bill_number, client_name, client_address, client_phone, client_gst, date, items, subtotal, tax_percent, tax_amount, discount_amount, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bill_number, client_name, client_address, client_phone, client_gst, date, JSON.stringify(lineItems), subtotal, tax_percent, tax_amount, discount_amount, total_amount, notes);

    res.status(201).json({ success: true, message: "Bill created", data: fmt(db.prepare("SELECT * FROM bills WHERE id = ?").get(result.lastInsertRowid)) });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ success: false, message: "Bill number already exists" });
    next(err);
  }
};

// ── GET /api/bill ─────────────────────────────────────────────────────────────
const getBills = (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    let query = "SELECT * FROM bills WHERE 1=1";
    const params = [];
    if (search) { query += " AND (client_name LIKE ? OR bill_number LIKE ?)"; const s = `%${search}%`; params.push(s, s); }
    const total = db.prepare(query.replace("SELECT *", "SELECT COUNT(*) AS cnt")).get(...params).cnt;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    res.json({ success: true, data: db.prepare(query).all(...params).map(fmt), pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── GET /api/bill/:id ─────────────────────────────────────────────────────────
const getBillById = (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Bill not found" });
    res.json({ success: true, data: fmt(row) });
  } catch (err) { next(err); }
};

// ── PUT /api/bill/:id ─────────────────────────────────────────────────────────
const updateBill = (req, res, next) => {
  try {
    const existing = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Bill not found" });

    const { client_name, client_address, client_phone, client_gst, date, items, tax_percent, discount_amount, notes } = req.body;
    const lineItems = items?.length ? computeItems(items) : JSON.parse(existing.items);
    const tp = tax_percent !== undefined ? tax_percent : existing.tax_percent;
    const da = discount_amount !== undefined ? discount_amount : existing.discount_amount;
    const { subtotal, tax_amount, total_amount } = computeTotals(lineItems, tp, da);

    db.prepare(`
      UPDATE bills SET client_name=?, client_address=?, client_phone=?, client_gst=?, date=?, items=?, subtotal=?, tax_percent=?, tax_amount=?, discount_amount=?, total_amount=?, notes=?, pdf_url='', updated_at=datetime('now') WHERE id=?
    `).run(
      client_name ?? existing.client_name, client_address ?? existing.client_address, client_phone ?? existing.client_phone, client_gst ?? existing.client_gst,
      date ?? existing.date, JSON.stringify(lineItems), subtotal, tp, tax_amount, da, total_amount, notes !== undefined ? notes : existing.notes, req.params.id
    );

    res.json({ success: true, message: "Bill updated", data: fmt(db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id)) });
  } catch (err) { next(err); }
};

// ── DELETE /api/bill/:id ──────────────────────────────────────────────────────
const deleteBill = (req, res, next) => {
  try {
    const row = db.prepare("SELECT id FROM bills WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Bill not found" });
    db.prepare("DELETE FROM bills WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Bill deleted" });
  } catch (err) { next(err); }
};

// ── GET /api/bill/:id/pdf ─────────────────────────────────────────────────────
const downloadBillPDF = async (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Bill not found" });

    const bill = fmt(row);
    const pdfBuffer = await generateBillPDF(bill);

    const filename = `${bill.bill_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
    const pdfPath = path.resolve(`./pdfs/${filename}`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    db.prepare("UPDATE bills SET pdf_url = ? WHERE id = ?").run(`/pdfs/${filename}`, req.params.id);

    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// ── POST /api/bill/generate (instant PDF, no DB save) ────────────────────────
const generateBillDirect = async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.client_name) return res.status(400).json({ success: false, message: "client_name is required" });
    if (!body.items?.length) return res.status(400).json({ success: false, message: "At least one item is required" });

    // Ensure items have all fields pdfService expects
    const items = (body.items || []).map((i) => ({
      description: i.description || "—",
      quantity:    parseFloat(i.quantity)   || 0,
      unit:        i.unit || "pcs",
      unit_price:  parseFloat(i.unit_price) || 0,
      total:       parseFloat(i.total)      || parseFloat((parseFloat(i.quantity) * parseFloat(i.unit_price)).toFixed(2)),
    }));

    const subtotal      = items.reduce((s, i) => s + i.total, 0);
    const discountAmt   = parseFloat(body.discount_amount || 0);
    const taxPercent    = parseFloat(body.tax_percent || 18);
    const afterDisc     = Math.max(0, subtotal - discountAmt);
    const taxAmt        = parseFloat(((afterDisc * taxPercent) / 100).toFixed(2));
    const totalAmount   = parseFloat((afterDisc + taxAmt).toFixed(2));

    const billData = {
      bill_number:     body.bill_number || `BILL-${new Date().getFullYear().toString().slice(2)}-DRAFT`,
      client_name:     body.client_name,
      client_address:  body.client_address  || "",
      client_phone:    body.client_phone    || "",
      client_gst:      body.client_gst      || "",
      date:            body.date            || new Date().toISOString().slice(0, 10),
      items,
      subtotal:        parseFloat(subtotal.toFixed(2)),
      tax_percent:     taxPercent,
      tax_amount:      taxAmt,
      discount_amount: discountAmt,
      total_amount:    parseFloat(body.total_amount || totalAmount),
      notes:           body.notes || "",
    };

    const pdfBuffer = await generateBillPDF(billData);
    const filename  = `${billData.bill_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

module.exports = { createBill, getBills, getBillById, updateBill, deleteBill, downloadBillPDF, generateBillDirect };
