import { useRef, useState } from 'react';
import { Download, Printer, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  id: number;
  description: string;
  qty: string;
  unit: string;
  rate: string;
}

function calcAmount(qty: string, rate: string): number {
  return (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
}

function formatINR(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuotationGenerator() {
  const printRef = useRef<HTMLDivElement>(null);
  const [quoteNo, setQuoteNo] = useState(`QT-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [subject, setSubject] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: '', qty: '1', unit: 'Nos', rate: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('18');

  const subtotal = items.reduce((s, it) => s + calcAmount(it.qty, it.rate), 0);
  const taxAmt = subtotal * (parseFloat(taxRate) / 100 || 0);
  const total = subtotal + taxAmt;

  function addItem() {
    setItems((p) => [...p, { id: Date.now(), description: '', qty: '1', unit: 'Nos', rate: '' }]);
  }

  function removeItem(id: number) {
    if (items.length === 1) return;
    setItems((p) => p.filter((it) => it.id !== id));
  }

  function updateItem(id: number, field: keyof LineItem, value: string) {
    setItems((p) => p.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10 no-print">
        <div>
          <h2 className="section-title">Quotation Generator</h2>
          <p className="section-subtitle mt-1">Create and download professional quotations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="btn-secondary"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            onClick={() => window.print()}
            className="btn-primary"
          >
            <Download size={15} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          ref={printRef}
          className="quotation-document bg-white w-full max-w-[800px] rounded-xl overflow-hidden"
          style={{ boxShadow: '0 4px 24px rgba(38,33,92,0.10)' }}
        >
          {/* Header */}
          <div className="px-12 py-8" style={{ backgroundColor: '#26215C' }}>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                  Sairaj Engineering Works
                </h1>
                <p className="text-white/50 text-[12px] mt-1.5 tracking-wide">Engineering & Fabrication Services</p>
              </div>
              <div className="text-right">
                <div
                  className="inline-block px-3.5 py-1 rounded-md text-[10px] font-bold tracking-[0.1em] uppercase mb-3"
                  style={{ backgroundColor: '#7F77DD', color: '#FFFFFF' }}
                >
                  Quotation
                </div>
                <div className="text-white/70 text-[13px] space-y-1">
                  <p className="flex items-center justify-end gap-2">
                    <span className="text-white/35 text-[11px]">Quote No:</span>
                    <input
                      className="bg-transparent text-white font-semibold outline-none w-28 text-right text-[13px]"
                      value={quoteNo}
                      onChange={(e) => setQuoteNo(e.target.value)}
                    />
                  </p>
                  <p className="flex items-center justify-end gap-2">
                    <span className="text-white/35 text-[11px]">Date:</span>
                    <input
                      type="date"
                      className="bg-transparent text-white font-semibold outline-none text-[13px]"
                      style={{ colorScheme: 'dark' }}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </p>
                  <p className="flex items-center justify-end gap-2">
                    <span className="text-white/35 text-[11px]">Valid Until:</span>
                    <input
                      type="date"
                      className="bg-transparent text-white font-semibold outline-none text-[13px]"
                      style={{ colorScheme: 'dark' }}
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="px-12 py-7 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-3">Quote To</p>
                <input
                  className="text-[15px] font-semibold text-gray-900 outline-none border-b border-dashed border-gray-200 w-full pb-1 focus:border-gray-400 transition-colors"
                  placeholder="Client / Company Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <textarea
                  className="text-[12px] text-gray-500 outline-none w-full resize-none mt-2 leading-relaxed"
                  placeholder="Client address / contact details"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-3">From</p>
                <p className="text-[13px] font-semibold text-gray-800">Sairaj Engineering Works</p>
                <p className="text-[12px] text-gray-400 mt-1">GSTIN: 27XXXXX0000X1ZX</p>
                <p className="text-[12px] text-gray-400">Maharashtra, India</p>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="px-12 pt-6 pb-2">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Subject</span>
              <div className="flex-1 border-b border-dashed border-gray-200">
                <input
                  className="w-full text-[13px] font-medium text-gray-800 outline-none pb-1 focus:border-gray-400 transition-colors"
                  placeholder="Brief description of work / project"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-12 py-6">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left rounded-l-lg w-10">#</th>
                  <th className="text-left">Description</th>
                  <th className="text-center w-16">Qty</th>
                  <th className="text-center w-20">Unit</th>
                  <th className="text-right w-28">Rate</th>
                  <th className="text-right rounded-r-lg w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-50 group">
                    <td className="table-row text-[12px] text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="table-row">
                      <input
                        className="w-full text-[13px] text-gray-800 outline-none"
                        placeholder="Work / material description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="table-row">
                      <input
                        className="w-full text-[13px] text-gray-800 text-center outline-none tabular-nums"
                        type="number"
                        min="0"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="table-row">
                      <input
                        className="w-full text-[12px] text-gray-500 text-center outline-none"
                        placeholder="Nos"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      />
                    </td>
                    <td className="table-row">
                      <input
                        className="w-full text-[13px] text-gray-800 text-right outline-none tabular-nums"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="table-row text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[13px] font-medium text-gray-800 tabular-nums">
                          {formatINR(calcAmount(item.qty, item.rate))}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all no-print"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={addItem}
              className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold no-print transition-colors"
              style={{ color: '#534AB7' }}
            >
              <Plus size={13} /> Add Line Item
            </button>

            {/* Totals */}
            <div className="mt-8 ml-auto w-72">
              <div className="flex justify-between py-2.5 border-b border-gray-100">
                <span className="text-[13px] text-gray-500">Subtotal</span>
                <span className="text-[13px] font-medium text-gray-800 tabular-nums">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                <span className="text-[13px] text-gray-500 flex items-center gap-1">
                  GST (
                  <input
                    className="w-10 text-center outline-none border-b border-dashed text-[13px] tabular-nums"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                  %)
                </span>
                <span className="text-[13px] font-medium text-gray-800 tabular-nums">{formatINR(taxAmt)}</span>
              </div>
              <div
                className="flex justify-between py-3.5 px-5 rounded-lg mt-3"
                style={{ backgroundColor: '#26215C' }}
              >
                <span className="text-[13px] font-bold text-white">Total</span>
                <span className="text-[14px] font-bold text-white tabular-nums">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="px-12 py-6 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2">Terms & Conditions</p>
            <textarea
              className="w-full text-[12px] text-gray-500 outline-none resize-none leading-relaxed"
              placeholder="e.g. 50% advance required. Balance on delivery. Prices valid for 30 days. GST extra as applicable."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Signature area */}
          <div className="px-12 py-8 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-16">
              <div>
                <p className="text-[11px] text-gray-400 mb-16">Customer Signature</p>
                <div className="border-t border-dashed border-gray-300 pt-2">
                  <p className="text-[10px] text-gray-400">Authorized by</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 mb-16">For Sairaj Engineering Works</p>
                <div className="border-t border-dashed border-gray-300 pt-2">
                  <p className="text-[10px] text-gray-400">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-12 py-4 flex items-center justify-between"
            style={{ backgroundColor: '#EEEDFE' }}
          >
            <p className="text-[11px] text-gray-400">This is a computer-generated quotation.</p>
            <p className="text-[11px] font-semibold" style={{ color: '#534AB7' }}>
              Sairaj Engineering Works
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .quotation-document { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
