const puppeteer = require("puppeteer");
const path = require("path");

const CO = {
  name:    process.env.COMPANY_NAME    || "Sairaj Engineering Works",
  address: process.env.COMPANY_ADDRESS || "Industrial Area, Aurangabad, Maharashtra – 431001",
  phone:   process.env.COMPANY_PHONE   || "+91-XXXXXXXXXX",
  email:   process.env.COMPANY_EMAIL   || "info@sairajengineering.com",
  gst:     process.env.COMPANY_GST     || "27ABCDE1234F1Z5",
};


const inr = (n) =>
  "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const itemRows = (items) =>
  items
    .map(
      (item, i) => `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td class="center gray">${i + 1}</td>
        <td class="desc">${item.description || "—"}</td>
        <td class="center">${item.quantity || 0}</td>
        <td class="center">${item.unit || "pcs"}</td>
        <td class="right">${inr(item.unit_price)}</td>
        <td class="right bold">${inr(item.total)}</td>
      </tr>`
    )
    .join("");

const buildHTML = (data, type = "bill") => {
  const isQuotation = type === "quotation";
  const accent      = isQuotation ? "#b71c1c" : "#534AB7";
  const title       = isQuotation ? "QUOTATION" : "INVOICE";
  const refLabel    = isQuotation ? "Quot. No:" : "Bill No:";
  const refNumber   = data.quotation_number || data.bill_number || "—";

  const subtotal      = parseFloat(data.subtotal || 0);
  const discountAmt   = parseFloat(data.discount_amount || 0);
  const taxPct        = parseFloat(data.tax_percent || 18);
  const taxAmt        = parseFloat(data.tax_amount || 0);
  const totalAmt      = parseFloat(data.total_amount || 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    position: relative;
  }

  /* ── Header ── */
  .header {
    background: #26215C;
    padding: 30px 44px 26px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .co-name {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .co-details {
    font-size: 10.5px;
    color: rgba(255,255,255,0.5);
    margin-top: 6px;
    line-height: 1.8;
  }
  .doc-badge {
    display: inline-block;
    background: ${accent};
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 16px;
    border-radius: 3px;
    margin-bottom: 10px;
  }
  .doc-meta {
    text-align: right;
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    line-height: 1.9;
  }
  .doc-meta span { color: rgba(255,255,255,0.35); font-size: 9px; }

  /* ── Parties ── */
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border-bottom: 1px solid #eeedf5;
  }
  .party {
    padding: 22px 44px;
  }
  .party + .party {
    border-left: 1px solid #eeedf5;
    text-align: right;
  }
  .party-label {
    font-size: 8.5px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }
  .party-name { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 5px; }
  .party-detail { font-size: 11px; color: #6b7280; line-height: 1.8; }

  /* ── Table ── */
  .table-wrap { padding: 20px 44px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #26215C; }
  thead th {
    padding: 9px 10px;
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tbody tr.even { background: #fff; }
  tbody tr.odd  { background: #f9f8ff; }
  tbody td { padding: 10px; border-bottom: 1px solid #eeedf5; font-size: 12px; vertical-align: top; }
  .center { text-align: center; }
  .right  { text-align: right; font-variant-numeric: tabular-nums; }
  .bold   { font-weight: 600; }
  .gray   { color: #9ca3af; }
  .desc   { width: 38%; }

  /* ── Totals ── */
  .totals-wrap { display: flex; justify-content: flex-end; padding: 0 44px 24px; }
  .totals { width: 270px; }
  .t-row {
    display: flex; justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid #eeedf5;
    font-size: 12px;
  }
  .t-row .label { color: #6b7280; }
  .t-row .val   { font-weight: 600; color: #111; font-variant-numeric: tabular-nums; }
  .t-row .val.disc { color: #dc2626; }
  .t-grand {
    display: flex; justify-content: space-between;
    padding: 12px 16px;
    background: #26215C;
    border-radius: 5px;
    margin-top: 8px;
  }
  .t-grand .label { font-size: 13px; font-weight: 700; color: #fff; }
  .t-grand .val   { font-size: 16px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }

  /* ── Notes ── */
  .notes-section {
    margin: 0 44px;
    padding: 16px 18px;
    border: 1px solid #eeedf5;
    border-radius: 4px;
    background: #fffde7;
    border-left: 4px solid #fbc02d;
  }
  .notes-label { font-size: 8.5px; font-weight: 700; color: #f57f17; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .notes-text  { font-size: 11.5px; color: #555; line-height: 1.7; white-space: pre-wrap; }

  /* ── Footer ── */
  .bill-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 22px 44px 30px;
    margin-top: 28px;
    background: #f9f8ff;
    border-top: 1px solid #eeedf5;
  }
  .footer-note { font-size: 11px; color: #9ca3af; }
  .footer-brand { font-size: 11px; font-weight: 600; color: ${accent}; margin-top: 3px; }
  .sign-box {
    text-align: center;
    border-top: 1.5px solid #26215C;
    padding-top: 8px;
    width: 150px;
  }
  .sign-label { font-size: 11px; font-weight: 600; color: #26215C; }
  .sign-sub   { font-size: 10px; color: #9ca3af; margin-top: 2px; }

  ${isQuotation ? `
  .validity-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #fff3e0; color: #e65100; border: 1px solid #ffb74d;
    border-radius: 4px; padding: 5px 14px; font-size: 11px; font-weight: 600;
    margin: 12px 44px;
  }
  ` : ""}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="co-name">${CO.name}</div>
      <div class="co-details">
        ${CO.address}<br>
        📞 ${CO.phone} &nbsp;|&nbsp; ✉ ${CO.email}<br>
        GST: ${CO.gst}
      </div>
    </div>
    <div>
      <div class="doc-badge">${title}</div>
      <div class="doc-meta">
        <div><span>${refLabel}</span> &nbsp;<strong>${refNumber}</strong></div>
        <div><span>Date:</span> &nbsp;${data.date || "—"}</div>
        ${isQuotation && data.valid_until ? `<div><span>Valid Until:</span> &nbsp;${data.valid_until}</div>` : ""}
      </div>
    </div>
  </div>

  ${isQuotation && data.valid_until ? `<div class="validity-badge">⚠ Valid until ${data.valid_until}</div>` : ""}

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">${isQuotation ? "Quoted To" : "Bill To"}</div>
      <div class="party-name">${data.client_name || "—"}</div>
      <div class="party-detail">
        ${data.client_address ? data.client_address + "<br>" : ""}
        ${data.client_phone ? "📞 " + data.client_phone + "<br>" : ""}
        ${data.client_gst ? "GST: " + data.client_gst : ""}
      </div>
    </div>
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">${CO.name}</div>
      <div class="party-detail">
        GSTIN: ${CO.gst}<br>
        Maharashtra, India<br>
        ${CO.email}
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:30px;text-align:center">#</th>
          <th style="text-align:left">Description</th>
          <th style="width:50px;text-align:center">Qty</th>
          <th style="width:55px;text-align:center">Unit</th>
          <th style="width:95px;text-align:right">Rate</th>
          <th style="width:105px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows(data.items || [])}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="t-row"><span class="label">Subtotal</span><span class="val">${inr(subtotal)}</span></div>
      ${discountAmt > 0 ? `<div class="t-row"><span class="label">Discount</span><span class="val disc">-${inr(discountAmt)}</span></div>` : ""}
      <div class="t-row"><span class="label">GST (${taxPct}%)</span><span class="val">${inr(taxAmt)}</span></div>
      <div class="t-grand"><span class="label">TOTAL</span><span class="val">${inr(totalAmt)}</span></div>
    </div>
  </div>

  <!-- Notes -->
  ${data.notes ? `
  <div class="notes-section">
    <div class="notes-label">Notes / Terms</div>
    <div class="notes-text">${data.notes}</div>
  </div>` : ""}

  <!-- Footer -->
  <div class="bill-footer">
    <div>
      <div class="footer-note">Thank you for your business!</div>
      <div class="footer-brand">${CO.name}</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Authorized Signatory</div>
      <div class="sign-sub">${CO.name}</div>
    </div>
  </div>

</div>
</body>
</html>`;
};

/* ── Puppeteer runner ──────────────────────────────────────────────────────── */
const generatePDF = async (html) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
    ],
  });
  try {
    const page = await browser.newPage();
    // domcontentloaded — does NOT wait for external resources (fonts/images)
    // This prevents hanging when there is no internet or CDN resources
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });
    // Small delay to let CSS render before capture
    await new Promise((r) => setTimeout(r, 300));
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
};

const generateBillPDF      = (data) => generatePDF(buildHTML(data, "bill"));
const generateQuotationPDF = (data) => generatePDF(buildHTML(data, "quotation"));

module.exports = { generateBillPDF, generateQuotationPDF };
