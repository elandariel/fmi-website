'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Plus, Search, Layers, X, Trash2,
  FileSpreadsheet, Loader2, MapPin,
  Edit3, CheckCircle2, AlertCircle, Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';

export default function InterkoneksiPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SS_CONFIG = {
    url: 'https://script.google.com/macros/s/AKfycbx7aZ3bzoAXXaewspBpas0MalHe0694WXfyJzHeMSb85YE9kZh49R_5xhcRoZzaTL8p/exec',
    id: '1BHALs4UFTj_1c7UR7Uf4U1Vq2L3fdsGQ9epN6aEBkSM',
    name: 'Data Interkoneksi'
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const emptyForm = {
    ID_Pelanggan: '', Nama_ISP: '', Location: '', Lantai: '',
    Device: '', SN_Perangkat: '', Rack: '', OTB: '', Type: '',
    Port: '', No_Reff: '', Label: '', Kapasitas: '', Limitasi: '',
    Status: 'Active'
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    const { data: inter, error } = await supabase
      .from('Data Interkoneksi')
      .select('*')
      .order('id', { ascending: false });
    if (!error) setData(inter || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) return;
        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const validColumns = Object.keys(emptyForm);
        const importedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          rawHeaders.forEach((header, index) => {
            if (validColumns.includes(header) && header.toLowerCase() !== 'id') {
              row[header] = values[index] || null;
            }
          });
          return row;
        }).filter(row => Object.keys(row).length > 0);

        if (confirm(`Upsert ${importedData.length} data ke database?`)) {
          setLoading(true);
          const { error } = await supabase.from('Data Interkoneksi').upsert(importedData);
          if (error) throw error;
          toast.success('Import Berhasil!');
          fetchData();
        }
      } catch (err: any) {
        toast.error('Gagal: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (data.length === 0) return toast.error('Data kosong');
    const headers = Object.keys(emptyForm);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Interkoneksi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredData = useMemo(() => {
    return data.filter(item =>
      Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await supabase.from('Data Interkoneksi').update(formData).eq('id', editingItem.id);
        toast.success('Data berhasil diupdate!');
      } else {
        await supabase.from('Data Interkoneksi').insert([formData]);
        toast.success('Data berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    setLoading(true);
    try {
      await supabase.from('Data Interkoneksi').delete().eq('id', id);
      toast.success('Data dihapus');
      fetchData();
    } finally { setLoading(false); }
  };

  const handleSyncSheet = async () => {
    if (data.length === 0) return;
    setSyncing(true);
    try {
      const payload = { spreadsheetId: SS_CONFIG.id, sheetName: SS_CONFIG.name, rows: data };
      await fetch(SS_CONFIG.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      toast.success('Sync Berhasil!');
    } finally { setSyncing(false); }
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    setFormData({
      ID_Pelanggan: item?.ID_Pelanggan || '', Nama_ISP: item?.Nama_ISP || '',
      Location: item?.Location || '', Lantai: item?.Lantai || '',
      Device: item?.Device || '', SN_Perangkat: item?.SN_Perangkat || '',
      Rack: item?.Rack || '', OTB: item?.OTB || '', Type: item?.Type || '',
      Port: item?.Port || '', No_Reff: item?.No_Reff || '', Label: item?.Label || '',
      Kapasitas: item?.Kapasitas || '', Limitasi: item?.Limitasi || '',
      Status: item?.Status || 'Active'
    });
    setIsModalOpen(true);
  };

  // Form fields config (excluding Status)
  const formFields = [
    { key: 'ID_Pelanggan', label: 'ID Pelanggan', mono: true },
    { key: 'Nama_ISP', label: 'Nama ISP' },
    { key: 'Location', label: 'Location' },
    { key: 'Lantai', label: 'Lantai' },
    { key: 'Device', label: 'Device', mono: true },
    { key: 'SN_Perangkat', label: 'SN Perangkat', mono: true },
    { key: 'Rack', label: 'Rack' },
    { key: 'OTB', label: 'OTB' },
    { key: 'Type', label: 'Type' },
    { key: 'Port', label: 'Port', mono: true },
    { key: 'No_Reff', label: 'No. Referensi' },
    { key: 'Label', label: 'Label' },
    { key: 'Kapasitas', label: 'Kapasitas' },
    { key: 'Limitasi', label: 'Limitasi' },
  ];

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ background: '#f4f6f9', fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <div className="max-w-[1600px] mx-auto">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                <Layers size={17} />
              </div>
              Data Interkoneksi
            </h1>
            <p className="text-xs text-slate-400 mt-1 ml-0.5">Database Interkoneksi / Cross Connect Client FMI</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Upload size={13} className="text-blue-500" /> Import
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={13} className="text-amber-500" /> Export
            </button>
            <button
              onClick={handleSyncSheet}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
            >
              {syncing ? <Loader2 className="animate-spin" size={13} /> : <FileSpreadsheet size={13} />}
              Sync Sheet
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus size={15} /> Interkoneksi Baru
            </button>
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-5 flex items-center overflow-hidden">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari ID, ISP, lokasi, device, atau port..."
              className="w-full py-3 pl-11 pr-4 text-sm outline-none text-slate-700 placeholder:text-slate-400"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="px-5 border-l border-slate-100 text-xs font-semibold text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            Total: <span className="text-blue-600 font-bold text-sm">{filteredData.length}</span>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100" style={{ background: '#f8fafc' }}>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID & Status</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ISP / Pelanggan</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Site & Lokasi</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Hardware & Port</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Kapasitas</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-3.5 bg-slate-100 rounded animate-pulse w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Layers size={28} className="opacity-20" />
                        <p className="text-sm font-medium">Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">

                      {/* ID & Status */}
                      <td className="px-5 py-4">
                        <p className="font-mono text-[10px] text-slate-400 mb-0.5">#{item.id}</p>
                        <p className="text-[13px] font-bold text-slate-800 mb-1.5">{item.ID_Pelanggan || '—'}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.Status === 'Dismantle'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {item.Status === 'Dismantle'
                            ? <AlertCircle size={9} />
                            : <CheckCircle2 size={9} />
                          }
                          {item.Status || 'Active'}
                        </span>
                      </td>

                      {/* ISP */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">{item.Nama_ISP || '—'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.No_Reff || '—'}</p>
                      </td>

                      {/* Site */}
                      <td className="px-5 py-4 text-center">
                        <p className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1">
                          <MapPin size={11} className="text-blue-500 shrink-0" />
                          {item.Location || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Lantai {item.Lantai || '—'}</p>
                      </td>

                      {/* Hardware */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                            Rack {item.Rack || '—'}
                          </span>
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                            Port {item.Port || '—'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{item.Device || '—'}</p>
                      </td>

                      {/* Kapasitas */}
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                          {item.Kapasitas || '—'}
                        </span>
                        {item.Limitasi && (
                          <p className="text-[10px] text-rose-500 font-semibold mt-1">Lmt: {item.Limitasi}</p>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openModal(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
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
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  {editingItem ? 'Update' : 'Tambah'} <span className="text-blue-600">Interkoneksi</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Technical data base on E-Mail</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Status first */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Status</label>
                  <select
                    value={formData.Status}
                    onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                    className={`input font-semibold ${
                      formData.Status === 'Dismantle'
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Dismantle">Dismantle</option>
                  </select>
                </div>

                {formFields.map(({ key, label, mono }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                    <input
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder="—"
                      className={`input ${mono ? 'font-mono text-blue-700' : ''}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold text-xs shadow-sm transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : null}
                {editingItem ? 'Update Data' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}