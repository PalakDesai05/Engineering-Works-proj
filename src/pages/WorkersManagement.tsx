import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Trash2, CreditCard as Edit3, Phone, MapPin, Upload, X, User } from 'lucide-react';
import { supabase, type Worker } from '../lib/supabase';

export default function WorkersManagement() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    setLoading(true);
    const { data } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    setWorkers(data ?? []);
    setLoading(false);
  }

  function openAddForm() {
    setEditWorker(null);
    setForm({ name: '', phone: '', address: '' });
    setPhotoPreview('');
    setPhotoFile(null);
    setShowForm(true);
  }

  function openEditForm(w: Worker) {
    setEditWorker(w);
    setForm({ name: w.name, phone: w.phone, address: w.address });
    setPhotoPreview(w.photo_url);
    setPhotoFile(null);
    setShowForm(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('Name is required'); return; }
    if (!editWorker && !photoFile) { alert('Photo is required for new workers'); return; }
    setSaving(true);

    let photoUrl = editWorker?.photo_url ?? '';
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `workers/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('worker-photos')
        .upload(path, photoFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('worker-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      } else {
        photoUrl = photoPreview;
      }
    }

    if (editWorker) {
      await supabase.from('workers').update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        photo_url: photoUrl,
      }).eq('id', editWorker.id);
    } else {
      await supabase.from('workers').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        photo_url: photoUrl,
      });
    }

    await fetchWorkers();
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this worker? This will also remove their attendance records.')) return;
    setDeleting(id);
    await supabase.from('workers').delete().eq('id', id);
    await fetchWorkers();
    setDeleting(null);
  }

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search) ||
      w.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="section-title">Workers Management</h2>
          <p className="section-subtitle mt-1">{workers.length} registered workers</p>
        </div>
        <button onClick={openAddForm} className="btn-primary">
          <Plus size={15} />
          Add New Worker
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left w-12">Photo</th>
                <th className="text-left">Name</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Address</th>
                <th className="text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="table-row">
                        <div className="h-3.5 bg-gray-50 rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <User size={28} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-[13px] text-gray-400">
                      {search ? 'No workers match your search' : 'No workers added yet'}
                    </p>
                    {!search && (
                      <button
                        onClick={openAddForm}
                        className="mt-3 text-[13px] font-semibold"
                        style={{ color: '#534AB7' }}
                      >
                        Add your first worker
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="table-row">
                    <td>
                      {w.photo_url ? (
                        <img
                          src={w.photo_url}
                          alt={w.name}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                          style={{ backgroundColor: '#534AB7' }}
                        >
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="text-[13px] font-semibold text-gray-800">{w.name}</span>
                    </td>
                    <td>
                      <span className="text-[13px] text-gray-500 flex items-center gap-1.5">
                        {w.phone ? (
                          <>
                            <Phone size={11} className="text-gray-400 flex-shrink-0" />
                            <span>{w.phone}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="text-[13px] text-gray-500 flex items-center gap-1.5 max-w-[220px]">
                        {w.address ? (
                          <>
                            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{w.address}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(w)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={deleting === w.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative ml-auto w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col">
            {/* Form Header */}
            <div
              className="flex items-center justify-between px-6 h-[60px] border-b border-white/10 flex-shrink-0"
              style={{ backgroundColor: '#26215C' }}
            >
              <h3 className="text-[14px] font-semibold text-white">
                {editWorker ? 'Edit Worker' : 'Add New Worker'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Photo Upload */}
              <div>
                <label className="label">
                  Worker Photo <span className="text-red-500">*</span>
                </label>
                <div
                  className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer py-8 transition-colors"
                  style={{ borderColor: '#7F77DD', backgroundColor: '#EEEDFE' }}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
                      />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center shadow ring-2 ring-white"
                        style={{ backgroundColor: '#534AB7' }}
                      >
                        <Upload size={12} className="text-white" />
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: '#534AB7' }}
                      >
                        <Upload size={18} className="text-white" />
                      </div>
                      <p className="text-[13px] font-medium text-gray-600">Click to upload photo</p>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  This photo will be used for face recognition attendance
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Name */}
              <div>
                <label className="label">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter worker's full name"
                  className="input-field"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="input-field"
                />
              </div>

              {/* Address */}
              <div>
                <label className="label">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter home address"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>

            {/* Form Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 justify-center"
              >
                {saving ? 'Saving...' : editWorker ? 'Update Worker' : 'Add Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
