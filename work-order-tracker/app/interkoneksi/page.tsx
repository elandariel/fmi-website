'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Plus, Search, Layers, X, Trash2, 
  FileSpreadsheet, Loader2, MapPin, ChevronRight, 
  Edit3, CheckCircle2, AlertCircle, Download, Upload
} from 'lucide-react';

export default function InterkoneksiPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CONFIGURATION ---
  const SS_CONFIG = {
    url: 'https://script.google.com/macros/s/AKfycbx7aZ3bzoAXXaewspBpas0MalHe0694WXfyJzHeMSb85YE9kZh49R_5xhcRoZzaTL8p/exec',
    id: '1BHALs4UFTj_1c7UR7Uf4U1Vq2L3fdsGQ9epN6aEBkSM',
    name: 'Data Interkoneksi' 
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Sesuaikan header dengan database Supabase lo
  const [formData, setFormData] = useState({
    ID_Pelanggan: '', Nama_ISP: '', Location: '', Lantai: '',
    Device: '', SN_Perangkat: '', Rack: '', OTB: '', Type: '', 
    Port: '', No_Reff: '', Label: '', Kapasitas: '', Limitasi: '',
    Status: 'Active'
  });

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

  // --- LOGIKA IMPORT CSV (UPSERT) ---
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
        const validColumns = Object.keys(formData);

        const importedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          rawHeaders.forEach((header, index) => {
            // Mapping & hapus ID agar auto-increment DB jalan
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
          alert('Import Berhasil!');
          fetchData();
        }
      } catch (err: any) {
        alert('Gagal: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- LOGIKA EXPORT CSV ---
  const handleExportCSV = () => {
    if (data.length === 0) return alert('Data kosong');
    const headers = Object.keys(formData);
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
      } else {
        await supabase.from('Data Interkoneksi').insert([formData]);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    setLoading(true);
    try {
      await supabase.from('Data Interkoneksi').delete().eq('id', id);
      fetchData();
    } finally { setLoading(false); }
  };

  const handleSyncSheet = async () => {
    if (data.length === 0) return;
    setSyncing(true);
    try {
      const payload = { spreadsheetId: SS_CONFIG.id, sheetName: SS_CONFIG.name, rows: data };
      await fetch(SS_CONFIG.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      alert('Sync Berhasil!');
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

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans text-slate-600">
      <div className="max-w-[1600px] mx-auto p-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Layers className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">DATA <span className="text-blue-600">INTERKONEKSI</span></h1>
            </div>
            <p className="text-sm text-slate-400 font-medium">Database Interkoneksi / Cross Connect Client FMI</p>
          </div>
          
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm uppercase">
              <Upload size={14} className="text-blue-500" /> Import
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm uppercase">
              <Download size={14} className="text-amber-500" /> Export
            </button>
            <button onClick={handleSyncSheet} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm uppercase">
              {syncing ? <Loader2 className="animate-spin" size={14}/> : <FileSpreadsheet size={14} />} SYNC SHEET
            </button>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 uppercase">
              <Plus size={16} /> Interkoneksi Baru
            </button>
          </div>
        </div>

        {/* SEARCH & TOTAL */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 mb-6 flex items-center shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Cari ID, Tenant, Site, atau Port..."
              className="w-full bg-transparent py-3 pl-12 pr-4 text-sm outline-none placeholder: font-medium"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="px-6 border-l border-slate-100 text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
            Total Record: <span className="text-blue-600 text-sm font-black">{filteredData.length}</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-900 uppercase">
                <th className="px-8 py-5">ID & Status</th>
                <th className="px-6 py-5">Nama Pelanggan / ISP</th>
                <th className="px-6 py-5 text-center">Site & Lokasi</th>
                <th className="px-6 py-4 text-center">Hardware & Port</th>
                <th className="px-6 py-5 text-center">Kapasitas</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">#{item.id}</span>
                    <div className="text-[13px] font-black text-slate-700 mt-1 mb-1 tracking-tight">{item.ID_Pelanggan}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      item.Status === 'Dismantle' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {item.Status === 'Dismantle' ? <AlertCircle size={10}/> : <CheckCircle2 size={10}/>}
                      {item.Status || 'Active'}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm font-black text-slate-700 uppercase tracking-tighter">{item.Nama_ISP}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{item.No_Reff || '# -'}</div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-[11px] font-black text-slate-700 uppercase tracking-tighter">
                        <MapPin size={12} className="text-blue-500"/> {item.Location || '-'}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lantai: {item.Lantai || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex gap-1">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Rack: {item.Rack || '-'}</span>
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">Port: {item.Port || '-'}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-none">{item.Device || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="bg-slate-100 text-slate-700 border border-slate-200 inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter">
                      {item.Kapasitas || '-'}
                    </div>
                    <div className="text-[9px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">
                      {item.Limitasi ? `Lmt: ${item.Limitasi}` : ''}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(item)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                  {editingItem ? 'Update' : 'Create'} <span className="text-blue-600">Interkoneksi</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">Technical data base on E-Mail</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 max-h-[65vh] overflow-y-auto grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Current Status</label>
                  <select 
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm font-black outline-none transition-all ${
                      formData.Status === 'Dismantle' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}
                    value={formData.Status}
                    onChange={(e) => setFormData({...formData, Status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Dismantle">Dismantle</option>
                  </select>
                </div>

                {Object.keys(formData).filter(k => k !== 'Status').map((key) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.replace('_', ' ')}</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all"
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({...formData, [key]: e.target.value})}
                      placeholder="..."
                    />
                  </div>
                ))}
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all uppercase">Cancel</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-10 py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={14} /> : 'Input'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}