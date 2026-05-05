const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const PDF_DIR = path.resolve(process.env.PDF_OUTPUT_DIR || './pdfs');

// ─── Company branding from env ────────────────────────────────────────────────
const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'Sairaj Engineering Works',
  address: process.env.COMPANY_ADDRESS || '123, Industrial Area, Pune, MH - 411001',
  phone:   process.env.COMPANY_PHONE   || '+91 98765 43210',
  email:   process.env.COMPANY_EMAIL   || 'info@sairajengineering.com',
  gst:     process.env.COMPANY_GST     || '27ABCDE1234F1Z5',
};

// ─── Colour palette ───────────────────────────────────────────────────────────
const CLR = {
  primary:   '#1a3c6e',
  accent:    '#f59e0b',
  light:     '#f1f5f9',
  text:      '#1e293b',
  subtext:   '#64748b',
  white:     '#ffffff',
  border:    '#cbd5e1',
};

// ─── Low-level drawing helpers ────────────────────────────────────────────────
function drawRect(doc, x, y, w, h, fill) {
  doc.save().rect(x, y, w, h).fill(fill).restore();
}

function rupees(amount) {
  return `₹ ${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Company header ───────────────────────────────────────────────────────────
function drawHeader(doc, title) {
  // Background bar
  drawRect(doc, 0, 0, doc.page.width, 90, CLR.primary);

  doc.fillColor(CLR.white)
    .font('Helvetica-Bold').fontSize(18)
    .text(COMPANY.name, 40, 20);

  doc.font('Helvetica').fontSize(8).fillColor('#93c5fd')
    .text(COMPANY.address, 40, 44)
    .text(`📞 ${COMPANY.phone}   ✉  ${COMPANY.email}   GST: ${COMPANY.gst}`, 40, 56);

  // Document type badge
  drawRect(doc, doc.page.width - 160, 18, 130, 26, CLR.accent);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(CLR.primary)
    .text(title, doc.page.width - 155, 24, { width: 120, align: 'center' });

  doc.y = 105;
}

// ─── Two-column info block ────────────────────────────────────────────────────
function drawInfoBlock(doc, leftPairs, rightPairs) {
  const startY = doc.y;
  const midX   = doc.page.width / 2;

  drawRect(doc, 30, startY, doc.page.width - 60, 90, CLR.light);

  let ly = startY + 10;
  leftPairs.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.subtext).text(label, 40, ly);
    doc.font('Helvetica').fontSize(9).fillColor(CLR.text).text(value || '—', 40, ly + 10);
    ly += 24;
  });

  let ry = startY + 10;
  rightPairs.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.subtext).text(label, midX, ry);
    doc.font('Helvetica').fontSize(9).fillColor(CLR.text).text(value || '—', midX, ry + 10);
    ry += 24;
  });

  doc.y = startY + 100;
}

// ─── Table ────────────────────────────────────────────────────────────────────
function drawTable(doc, items) {
  const colX    = [30, 280, 340, 390, 450, 510];
  const colW    = [250, 60, 50, 60, 60, 55];
  const headers = ['Description', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)', ''];

  // Header row
  drawRect(doc, 30, doc.y, doc.page.width - 60, 22, CLR.primary);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.white)
      .text(h, colX[i], doc.y + 7, { width: colW[i], align: i > 0 ? 'right' : 'left' });
  });
  doc.y += 22;

  // Rows
  items.forEach((item, idx) => {
    const rowY = doc.y;
    if (idx % 2 === 0) drawRect(doc, 30, rowY, doc.page.width - 60, 20, '#f8fafc');

    doc.font('Helvetica').fontSize(8).fillColor(CLR.text);
    doc.text(item.description,                  colX[0], rowY + 6, { width: colW[0] });
    doc.text(String(item.quantity),             colX[1], rowY + 6, { width: colW[1], align: 'right' });
    doc.text(item.unit || 'nos',                colX[2], rowY + 6, { width: colW[2], align: 'right' });
    doc.text(rupees(item.unit_price),           colX[3], rowY + 6, { width: colW[3], align: 'right' });
    doc.text(rupees(item.amount),               colX[4], rowY + 6, { width: colW[4], align: 'right' });
    doc.y += 20;
  });

  // Bottom border
  doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).strokeColor(CLR.border).stroke();
  doc.y += 8;
}

// ─── Totals block ─────────────────────────────────────────────────────────────
function drawTotals(doc, { subtotal, discount, gst_rate, gst_amount, total, amount_paid }) {
  const x = doc.page.width - 200;
  const lines = [
    ['Subtotal',              rupees(subtotal)],
    [`Discount`,              `- ${rupees(discount || 0)}`],
    [`GST @ ${gst_rate}%`,    rupees(gst_amount)],
  ];
  if (amount_paid !== undefined) {
    lines.push(['Amount Paid', rupees(amount_paid)]);
    lines.push(['Balance Due', rupees(total - amount_paid)]);
  }

  lines.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(9).fillColor(CLR.subtext).text(label, x, doc.y, { width: 100 });
    doc.font('Helvetica').fontSize(9).fillColor(CLR.text).text(value, x + 100, doc.y, { width: 70, align: 'right' });
    doc.y += 16;
  });

  doc.y += 4;
  drawRect(doc, x - 10, doc.y, 185, 28, CLR.primary);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(CLR.white)
    .text('TOTAL', x, doc.y + 8, { width: 100 })
    .text(rupees(total), x + 100, doc.y + 8, { width: 70, align: 'right' });
  doc.y += 40;
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc, terms) {
  const y = doc.page.height - 80;
  doc.moveTo(30, y).lineTo(doc.page.width - 30, y).strokeColor(CLR.border).stroke();

  if (terms) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.subtext).text('Terms & Conditions:', 30, y + 8);
    doc.font('Helvetica').fontSize(7.5).fillColor(CLR.subtext).text(terms, 30, y + 20, { width: 350 });
  }

  doc.font('Helvetica').fontSize(7).fillColor(CLR.subtext)
    .text('Thank you for your business!', 0, y + 55, { align: 'center' });
}

// ─── Public: Generate Bill PDF ────────────────────────────────────────────────
function generateBillPDF(bill) {
  return new Promise((resolve, reject) => {
    try {
      const filename = `bill_${bill.id}_${Date.now()}.pdf`;
      const filePath = path.join(PDF_DIR, filename);
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
      drawHeader(doc, 'TAX INVOICE');

      drawInfoBlock(doc,
        [['Bill To', bill.client_name], ['Address', bill.client_address], ['GST No.', bill.client_gst]],
        [['Bill No.', bill.bill_number], ['Issue Date', bill.issue_date], ['Due Date', bill.due_date || '—'], ['Status', (bill.status || '').toUpperCase()]],
      );

      drawTable(doc, bill.items || []);
      drawTotals(doc, bill);

      if (bill.notes) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.subtext).text('Notes:', 30, doc.y);
        doc.font('Helvetica').fontSize(8).fillColor(CLR.text).text(bill.notes, 30, doc.y + 12, { width: 400 });
      }

      drawFooter(doc, null);
      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Public: Generate Quotation PDF ──────────────────────────────────────────
function generateQuotationPDF(quote) {
  return new Promise((resolve, reject) => {
    try {
      const filename = `quotation_${quote.id}_${Date.now()}.pdf`;
      const filePath = path.join(PDF_DIR, filename);
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
      drawHeader(doc, 'QUOTATION');

      drawInfoBlock(doc,
        [['Quote To', quote.client_name], ['Address', quote.client_address], ['Project', quote.project_title]],
        [['Quote No.', quote.quote_number], ['Issue Date', quote.issue_date], ['Valid Until', quote.valid_until || '—'], ['Status', (quote.status || '').toUpperCase()]],
      );

      if (quote.project_details) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.subtext).text('Project Details:', 40, doc.y);
        doc.font('Helvetica').fontSize(8.5).fillColor(CLR.text).text(quote.project_details, 40, doc.y + 10, { width: 500 });
        doc.y += 18;
      }

      drawTable(doc, quote.items || []);
      drawTotals(doc, quote);
      drawFooter(doc, quote.terms);

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateBillPDF, generateQuotationPDF };
