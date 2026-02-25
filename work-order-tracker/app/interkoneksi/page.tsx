'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Plus, Search, Layers, X, Trash2, 
  FileSpreadsheet, Loader2, MapPin, ChevronRight, 
  HardDrive, Edit3, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function InterkoneksiPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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

  const [formData, setFormData] = useState({
    ID_Pelanggan: '', Tenant_ISP: '', Site_Tujuan: '', Location: '',
    Device: '', SN_Perangkat: '', Rack: '', OTB: '', Type: '', 
    Port: '', No_Reff: '', Label: '', Kapasitas: '', Limitasi: '',
    Status: 'Active' // Tambahan field Status
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
      setIsModalOpen(false);
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
      ID_Pelanggan: item?.ID_Pelanggan || '', Tenant_ISP: item?.Tenant_ISP || '',
      Site_Tujuan: item?.Site_Tujuan || '', Location: item?.Location || '',
      Device: item?.Device || '', SN_Perangkat: item?.SN_Perangkat || '',
      Rack: item?.Rack || '', OTB: item?.OTB || '', Type: item?.Type || '',
      Port: item?.Port || '', No_Reff: item?.No_Reff || '', Label: item?.Label || '',
      Kapasitas: item?.Kapasitas || '', Limitasi: item?.Limitasi || '',
      Status: item?.Status || 'Active' // Load status dari DB atau default Active
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
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Interkoneksi</h1>
            </div>
            <p className="text-sm text-slate-400">Database Interkoneksi / Cross Connect Client FMI</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleSyncSheet} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm">
              {syncing ? <Loader2 className="animate-spin" size={14}/> : <FileSpreadsheet size={14} />}
              SYNC SHEET
            </button>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
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
              className="w-full bg-transparent py-3 pl-12 pr-4 text-sm outline-none placeholder:text-slate-300 font-medium"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="px-6 border-l border-slate-100 text-[11px] font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            Total: <span className="text-blue-600 text-sm font-black">{filteredData.length}</span> Pelanggan
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                <th className="px-8 py-5">ID & Status</th>
                <th className="px-6 py-5">Nama Pelanggan / ISP</th>
                <th className="px-6 py-5">Site Tujuan</th>
                <th className="px-6 py-5">Hardware & Port</th>
                <th className="px-6 py-5 text-center">Kapasitas</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-400 font-mono italic">#{item.id || '---'}</span>
                    <div className="text-[13px] font-black text-slate-700 mt-1 mb-1">{item.ID_Pelanggan}</div>
                    {/* Status Badge di Tabel */}
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      item.Status === 'Dismantle' 
                      ? 'bg-rose-50 text-rose-600 border-rose-100' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {item.Status === 'Dismantle' ? <AlertCircle size={10}/> : <CheckCircle2 size={10}/>}
                      {item.Status || 'Active'}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm font-bold text-blue-600 uppercase mb-0.5">{item.Tenant_ISP}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium italic">
                      {item.No_Reff || '# -'}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-blue-400" />
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 uppercase leading-none mb-1">{item.Site_Tujuan}</div>
                        <div className="text-[10px] text-slate-400 font-medium leading-none">{item.Location || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black border border-blue-100 uppercase tracking-tighter">Rack: {item.Rack || '-'}</span>
                      <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[9px] font-black border border-amber-100 uppercase tracking-tighter">Port: {item.Port || '-'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase italic tracking-tight">{item.Device || '-'}</div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="bg-slate-800 text-white inline-block px-3 py-1 rounded text-[10px] font-black mb-1 leading-none uppercase tracking-tighter shadow-sm">
                      {item.Kapasitas || '-'}
                    </div>
                    <div className="text-[10px] text-rose-500 font-bold block leading-none">
                      {item.Limitasi ? `Lmt: ${item.Limitasi}` : ''}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openModal(item)} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 transition-all">
                        Detail <ChevronRight size={12} />
                      </button>
                      <button onClick={() => openModal(item)} className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-all">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all">
                        <Trash2 size={14} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Interkoneksi' : 'Tambah Interkoneksi Baru'}</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Technical Interface Configuration</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* STATUS DROPDOWN SELECTION */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Status Link</label>
                  <select 
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm font-bold outline-none transition-all ${
                      formData.Status === 'Dismantle' 
                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}
                    value={formData.Status}
                    onChange={(e) => setFormData({...formData, Status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Dismantle">Dismantle</option>
                  </select>
                </div>

                {/* FIELDS LAINNYA */}
                {Object.keys(formData).filter(k => k !== 'Status').map((key) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.replace('_', ' ')}</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500/50 focus:bg-white transition-all"
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({...formData, [key]: e.target.value})}
                      placeholder="---"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors">Batal</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-10 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 leading-none">
                {loading ? <Loader2 className="animate-spin" size={14} /> : editingItem ? 'Simpan Perubahan' : 'BUAT INTERKONEKSI'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}