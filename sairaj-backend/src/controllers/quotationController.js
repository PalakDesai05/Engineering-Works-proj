const db = require("../config/database");
const { generateQuotationPDF } = require("../services/pdfService");
const path = require("path");
const fs = require("fs");

const fmt = (row) => row ? ({ ...row, _id: String(row.id), id: String(row.id), items: JSON.parse(row.items || "[]") }) : null;

const buildQuotationNumber = () => {
  const count = db.prepare("SELECT COUNT(*) AS cnt FROM quotations").get().cnt;
  const yy = new Date().getFullYear().toString().slice(2);
  return `QUOT-${yy}-${String(count + 1).padStart(4, "0")}`;
};

const computeItems = (items) =>
  items.map((i) => ({ ...i, total: parseFloat((parseFloat(i.quantity) * parseFloat(i.unit_price)).toFixed(2)) }));

const computeTotals = (items, taxPercent = 18, discount = 0) => {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const afterDisc = subtotal - parseFloat(discount);
  const tax_amount = parseFloat(((afterDisc * taxPercent) / 100).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), tax_amount, total_amount: parseFloat((afterDisc + tax_amount).toFixed(2)) };
};

// ── POST /api/quotation ───────────────────────────────────────────────────────
const createQuotation = (req, res, next) => {
  try {
    const { client_name, client_address = "", client_phone = "", date, valid_until = "", items, tax_percent = 18, discount_amount = 0, notes = "", status = "draft" } = req.body;
    if (!client_name) return res.status(400).json({ success: false, message: "client_name is required" });
    if (!items?.length) return res.status(400).json({ success: false, message: "At least one item is required" });
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    const lineItems = computeItems(items);
    const { subtotal, tax_amount, total_amount } = computeTotals(lineItems, tax_percent, discount_amount);
    const quotation_number = buildQuotationNumber();

    const result = db.prepare(`
      INSERT INTO quotations (quotation_number, client_name, client_address, client_phone, date, valid_until, items, subtotal, tax_percent, tax_amount, discount_amount, total_amount, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(quotation_number, client_name, client_address, client_phone, date, valid_until, JSON.stringify(lineItems), subtotal, tax_percent, tax_amount, discount_amount, total_amount, notes, status);

    res.status(201).json({ success: true, message: "Quotation created", data: fmt(db.prepare("SELECT * FROM quotations WHERE id = ?").get(result.lastInsertRowid)) });
  } catch (err) { next(err); }
};

// ── GET /api/quotation ────────────────────────────────────────────────────────
const getQuotations = (req, res, next) => {
  try {
    const { search = "", status, page = 1, limit = 20 } = req.query;
    let query = "SELECT * FROM quotations WHERE 1=1";
    const params = [];
    if (status) { query += " AND status = ?"; params.push(status); }
    if (search) { query += " AND (client_name LIKE ? OR quotation_number LIKE ?)"; const s = `%${search}%`; params.push(s, s); }
    const total = db.prepare(query.replace("SELECT *", "SELECT COUNT(*) AS cnt")).get(...params).cnt;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    res.json({ success: true, data: db.prepare(query).all(...params).map(fmt), pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── GET /api/quotation/:id ────────────────────────────────────────────────────
const getQuotationById = (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM quotations WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Quotation not found" });
    res.json({ success: true, data: fmt(row) });
  } catch (err) { next(err); }
};

// ── PUT /api/quotation/:id ────────────────────────────────────────────────────
const updateQuotation = (req, res, next) => {
  try {
    const existing = db.prepare("SELECT * FROM quotations WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Quotation not found" });

    const { client_name, client_address, client_phone, date, valid_until, items, tax_percent, discount_amount, notes, status } = req.body;
    const lineItems = items?.length ? computeItems(items) : JSON.parse(existing.items);
    const tp = tax_percent !== undefined ? tax_percent : existing.tax_percent;
    const da = discount_amount !== undefined ? discount_amount : existing.discount_amount;
    const { subtotal, tax_amount, total_amount } = computeTotals(lineItems, tp, da);

    db.prepare(`
      UPDATE quotations SET client_name=?, client_address=?, client_phone=?, date=?, valid_until=?, items=?, subtotal=?, tax_percent=?, tax_amount=?, discount_amount=?, total_amount=?, notes=?, status=?, pdf_url='', updated_at=datetime('now') WHERE id=?
    `).run(
      client_name ?? existing.client_name, client_address ?? existing.client_address, client_phone ?? existing.client_phone,
      date ?? existing.date, valid_until ?? existing.valid_until, JSON.stringify(lineItems),
      subtotal, tp, tax_amount, da, total_amount,
      notes !== undefined ? notes : existing.notes, status ?? existing.status, req.params.id
    );

    res.json({ success: true, message: "Quotation updated", data: fmt(db.prepare("SELECT * FROM quotations WHERE id = ?").get(req.params.id)) });
  } catch (err) { next(err); }
};

// ── DELETE /api/quotation/:id ─────────────────────────────────────────────────
const deleteQuotation = (req, res, next) => {
  try {
    const row = db.prepare("SELECT id FROM quotations WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Quotation not found" });
    db.prepare("DELETE FROM quotations WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Quotation deleted" });
  } catch (err) { next(err); }
};

// ── GET /api/quotation/:id/pdf ────────────────────────────────────────────────
const downloadQuotationPDF = async (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM quotations WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "Quotation not found" });

    const quotation = fmt(row);
    const pdfBuffer = await generateQuotationPDF(quotation);

    const filename = `${quotation.quotation_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
    const pdfPath = path.resolve(`./pdfs/${filename}`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    db.prepare("UPDATE quotations SET pdf_url = ? WHERE id = ?").run(`/pdfs/${filename}`, req.params.id);

    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// ── POST /api/quotation/generate (instant PDF, no DB save) ───────────────────
const generateQuotationDirect = async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.client_name) return res.status(400).json({ success: false, message: "client_name is required" });
    if (!body.items?.length) return res.status(400).json({ success: false, message: "At least one item is required" });

    const items = (body.items || []).map((i) => ({
      description: i.description || "—",
      quantity:    parseFloat(i.quantity)   || 0,
      unit:        i.unit || "Nos",
      unit_price:  parseFloat(i.unit_price) || 0,
      total:       parseFloat(i.total)      || parseFloat((parseFloat(i.quantity) * parseFloat(i.unit_price)).toFixed(2)),
    }));

    const subtotal    = items.reduce((s, i) => s + i.total, 0);
    const discountAmt = parseFloat(body.discount_amount || 0);
    const taxPercent  = parseFloat(body.tax_percent || 18);
    const afterDisc   = Math.max(0, subtotal - discountAmt);
    const taxAmt      = parseFloat(((afterDisc * taxPercent) / 100).toFixed(2));
    const totalAmount = parseFloat((afterDisc + taxAmt).toFixed(2));

    const quotationData = {
      quotation_number: body.quotation_number || `QUOT-${new Date().getFullYear().toString().slice(2)}-DRAFT`,
      client_name:      body.client_name,
      client_address:   body.client_address || "",
      client_phone:     body.client_phone   || "",
      date:             body.date           || new Date().toISOString().slice(0, 10),
      valid_until:      body.valid_until    || "",
      items,
      subtotal:         parseFloat(subtotal.toFixed(2)),
      tax_percent:      taxPercent,
      tax_amount:       taxAmt,
      discount_amount:  discountAmt,
      total_amount:     parseFloat(body.total_amount || totalAmount),
      notes:            body.notes || "",
      status:           body.status || "draft",
    };

    const pdfBuffer = await generateQuotationPDF(quotationData);
    const filename  = `${quotationData.quotation_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

module.exports = {
  createQuotation, getQuotations, getQuotationById,
  updateQuotation, deleteQuotation, downloadQuotationPDF,
  generateQuotationDirect,
};

