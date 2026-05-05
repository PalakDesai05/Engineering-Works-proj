import { useRef, useState } from 'react';
import { Plus, Trash2, Download, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface LineItem {
  id: number;
  description: string;
  qty: string;
  unit: string;
  rate: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const calcAmount = (qty: string, rate: string) =>
  (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

const formatINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

let nextId = 2;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function BillGenerator() {
  /* ── Bill fields ─────────────────────────────────────────────────────────── */
  const [billNo,         setBillNo]         = useState(`BILL-${new Date().getFullYear().toString().slice(2)}-0001`);
  const [date,           setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [clientName,     setClientName]     = useState('');
  const [clientAddress,  setClientAddress]  = useState('');
  const [clientPhone,    setClientPhone]    = useState('');
  const [clientGst,      setClientGst]      = useState('');
  const [notes,          setNotes]          = useState('');
  const [taxRate,        setTaxRate]        = useState('18');
  const [discount,       setDiscount]       = useState('0');
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: '', qty: '1', unit: 'pcs', rate: '' },
  ]);

  /* ── UI state ────────────────────────────────────────────────────────────── */
  const [saving,      setSaving]      = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  /* ── Calculations ────────────────────────────────────────────────────────── */
  const subtotal     = items.reduce((s, i) => s + calcAmount(i.qty, i.rate), 0);
  const discountAmt  = parseFloat(discount) || 0;
  const afterDisc    = Math.max(0, subtotal - discountAmt);
  const taxAmt       = afterDisc * ((parseFloat(taxRate) || 0) / 100);
  const total        = afterDisc + taxAmt;

  /* ── Item helpers ────────────────────────────────────────────────────────── */
  const addItem = () =>
    setItems(p => [...p, { id: nextId++, description: '', qty: '1', unit: 'pcs', rate: '' }]);

  const removeItem = (id: number) =>
    setItems(p => (p.length > 1 ? p.filter(i => i.id !== id) : p));

  const updateItem = (id: number, field: keyof LineItem, value: string) =>
    setItems(p => p.map(i => (i.id === id ? { ...i, [field]: value } : i)));

  /* ── Payload builder ─────────────────────────────────────────────────────── */
  const buildPayload = () => ({
    bill_number:     billNo,
    client_name:     clientName || 'N/A',
    client_address:  clientAddress,
    client_phone:    clientPhone,
    client_gst:      clientGst,
    date,
    items: items.map(i => ({
      description: i.description || '—',
      quantity:    parseFloat(i.qty)  || 0,
      unit:        i.unit || 'pcs',
      unit_price:  parseFloat(i.rate) || 0,
      total:       calcAmount(i.qty, i.rate),
    })),
    subtotal,
    tax_percent:     parseFloat(taxRate)  || 18,
    tax_amount:      taxAmt,
    discount_amount: discountAmt,
    total_amount:    total,
    notes,
  });

  /* ── Save bill ───────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!clientName.trim()) { toastError('Validation Error', 'Client name is required'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/bill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toastSuccess('Bill Saved', `${json.data?.bill_number || 'Bill'} saved successfully`);
    } catch (e: unknown) {
      toastError('Save Failed', e instanceof Error ? e.message : 'Could not save bill');
    } finally { setSaving(false); }
  };

  /* ── Download PDF ────────────────────────────────────────────────────────── */
  const handleDownload = async () => {
    if (!clientName.trim()) { toastError('Validation Error', 'Client name is required to generate PDF'); return; }
    setDownloading(true);
    try {
      const res = await fetch(`${API}/bill/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${billNo}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toastSuccess('PDF Downloaded', `${billNo}.pdf is ready`);
    } catch (e: unknown) {
      toastError('PDF Failed', e instanceof Error ? e.message : 'PDF generation failed');
    } finally { setDownloading(false); }
  };

  /* ── Inline input style helpers ──────────────────────────────────────────── */
  const inlineInput = (extra = '') =>
    `bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#534AB7] transition-colors ${extra}`;

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Action bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Bill Generator</h2>
          <p className="section-subtitle mt-1">Fill in the fields directly inside the document</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-secondary">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Bill'}
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary">
            <Download size={14} />
            {downloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── A4 Document area ────────────────────────────────────────────────── */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#e8eaf2' }}>
        <div
          className="bg-white shadow-2xl"
          style={{ width: '794px', minHeight: '1123px', fontFamily: "'Arial', sans-serif" }}
        >
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div style={{ backgroundColor: '#26215C', padding: '32px 48px 24px' }}>
            <div className="flex items-start justify-between">
              <div>
                <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '0.5px', margin: 0 }}>
                  SAIRAJ ENGINEERING WORKS
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '6px', lineHeight: 1.7 }}>
                  Industrial Area, Aurangabad, Maharashtra – 431001<br />
                  Phone: +91-XXXXXXXXXX &nbsp;|&nbsp; GST: 27ABCDE1234F1Z5
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-block', padding: '4px 18px', borderRadius: '4px',
                    backgroundColor: '#534AB7', color: '#fff', fontSize: '11px',
                    fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px',
                  }}
                >
                  INVOICE
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.8 }}>
                  <div className="flex items-center justify-end gap-2">
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Bill No:</span>
                    <input
                      value={billNo}
                      onChange={e => setBillNo(e.target.value)}
                      className="bg-transparent outline-none text-right font-bold text-white text-[13px] w-36"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Date:</span>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="bg-transparent outline-none text-right text-white text-[12px]"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ BILL TO / FROM ══════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '24px 48px', borderBottom: '1px solid #e8eaf0' }}>
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
                Bill To
              </p>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Client Name"
                className={inlineInput('text-[15px] font-bold text-gray-900 w-full block')}
                style={{ paddingBottom: '4px' }}
              />
              <textarea
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Client address..."
                rows={2}
                className={inlineInput('text-[12px] text-gray-500 w-full block mt-2 resize-none leading-relaxed')}
              />
              <input
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="Phone number"
                className={inlineInput('text-[12px] text-gray-500 w-full block mt-1')}
              />
              <input
                value={clientGst}
                onChange={e => setClientGst(e.target.value)}
                placeholder="GST Number (optional)"
                className={inlineInput('text-[11px] text-gray-400 w-full block mt-1')}
              />
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid #f0f0f5', paddingLeft: '24px' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
                From
              </p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#26215C' }}>Sairaj Engineering Works</p>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', lineHeight: 1.8 }}>
                GSTIN: 27ABCDE1234F1Z5<br />
                Maharashtra, India<br />
                info@sairajengineering.com
              </p>
            </div>
          </div>

          {/* ══ ITEMS TABLE ═════════════════════════════════════════════════ */}
          <div style={{ padding: '24px 48px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#26215C' }}>
                  {['Sr', 'Description', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '9px 10px', fontSize: '10px', fontWeight: 700,
                        color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px',
                        textAlign: i === 1 ? 'left' : i >= 4 ? 'right' : 'center',
                        width: ['30px', 'auto', '50px', '60px', '90px', '100px'][i],
                      }}
                    >
                      {h}
                    </th>
                  ))}
                  <th style={{ width: '28px', backgroundColor: '#26215C' }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f8ff', borderBottom: '1px solid #eeedf5' }}
                  >
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className={inlineInput('text-[13px] text-gray-800 w-full')}
                      />
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', e.target.value)}
                        type="number" min="0"
                        className={inlineInput('text-[13px] text-gray-800 text-center w-full tabular-nums')}
                      />
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        className={inlineInput('text-[12px] text-gray-500 text-center w-full')}
                      />
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        value={item.rate}
                        onChange={e => updateItem(item.id, 'rate', e.target.value)}
                        type="number" min="0" placeholder="0.00"
                        className={inlineInput('text-[13px] text-gray-800 text-right w-full tabular-nums')}
                      />
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#26215C' }}>
                      {formatINR(calcAmount(item.qty, item.rate))}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                        style={{ opacity: items.length > 1 ? undefined : 0, cursor: items.length > 1 ? 'pointer' : 'default' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add row */}
            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:opacity-80"
              style={{ color: '#534AB7' }}
            >
              <Plus size={13} /> Add Line Item
            </button>

            {/* ── Totals ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <div style={{ width: '280px' }}>
                {/* Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums' }}>{formatINR(subtotal)}</span>
                </div>

                {/* Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>Discount (₹)</span>
                  <input
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    type="number" min="0"
                    className="bg-transparent outline-none text-right font-semibold tabular-nums w-24"
                    style={{ color: '#dc2626', borderBottom: '1px dashed #eee' }}
                  />
                </div>

                {/* Tax */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    GST (
                    <input
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                      className="bg-transparent outline-none text-center tabular-nums"
                      style={{ width: '28px', borderBottom: '1px dashed #ccc', fontSize: '13px' }}
                    />
                    %)
                  </span>
                  <span style={{ fontWeight: 600, color: '#111', fontVariantNumeric: 'tabular-nums' }}>{formatINR(taxAmt)}</span>
                </div>

                {/* Grand Total */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '6px', marginTop: '8px', backgroundColor: '#26215C' }}
                >
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>TOTAL</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>{formatINR(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ NOTES ═══════════════════════════════════════════════════════ */}
          <div style={{ padding: '0 48px 24px', borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '20px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
              Notes / Terms
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, or any additional notes..."
              rows={3}
              className={inlineInput('text-[12px] text-gray-500 w-full resize-none leading-relaxed')}
            />
          </div>

          {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px 48px 32px', backgroundColor: '#f9f8ff', borderTop: '1px solid #eeedf5' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>Thank you for your business!</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#534AB7', marginTop: '2px' }}>Sairaj Engineering Works</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '140px', borderTop: '1.5px solid #26215C', paddingTop: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#26215C' }}>Authorized Signatory</p>
                <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Sairaj Engineering Works</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only style */}
      <style>{`
        @media print {
          .sticky { display: none !important; }
          body { background: white; }
          .shadow-2xl { box-shadow: none !important; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.4; }
      `}</style>
    </div>
  );
}
