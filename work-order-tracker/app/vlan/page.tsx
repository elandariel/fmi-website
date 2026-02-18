'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Search, RefreshCcw, Server, Database, Filter, 
  Edit, Save, Trash2, X, AlertCircle, CheckCircle, Router, ShieldCheck, AlertTriangle, 
  ChevronLeft, ChevronRight, Share2, Moon, Sparkles, Layers, Info
} from 'lucide-react';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner';

const VLAN_TABLES = [
  { name: 'VLAN 1-1000', table: 'Daftar Vlan 1-1000' },
  { name: 'VLAN 1000+', table: 'Daftar Vlan 1000+' },
  { name: 'VLAN 2000+', table: 'Daftar Vlan 2000+' },
  { name: 'VLAN 3000+', table: 'Daftar Vlan 3000+' },
  { name: 'VLAN 3500+', table: 'Daftar Vlan 3500+' },
];

export default function VlanPage() {
  const [selectedTable, setSelectedTable] = useState(VLAN_TABLES[0]);
  const [vlanList, setVlanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVlan, setEditingVlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [stats, setStats] = useState({ total: 0, used: 0, free: 0 });

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    const syncToast = toast.loading("Menyelaraskan data ke Spreadsheet...");
    try {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfOmI847h1PFaaO6FBJ52SLCORyOmIalhkVxcb_W0jYI9J31-jAY03CoQzcZ0DZxDP/exec";
      const payload = {
        spreadsheetId: "1kojKLgb04yCirdTfRcb3C_1xqkKs8N68bmzuz0-4-N4",
        sheetName: selectedTable.table, 
        rows: vlanList
      };
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      toast.success("Sync Terkirim! Cek Spreadsheet segera.", { id: syncToast });
    } catch (error) {
      toast.error("Gagal mengirim data ke Sheets.", { id: syncToast });
    } finally {
      setIsSyncing(false);
    }
  };

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if(profile) setUserRole(profile.role as Role);
    }
    const { data, error } = await supabase.from(selectedTable.table).select('*').order('VLAN', { ascending: true });
    if (!error) {
      setVlanList(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  }

  const calculateStats = (data: any[]) => {
    const total = data.length;
    const used = data.filter(r => {
      const name = (r.NAME || '').toUpperCase();
      return name && name !== '-' && name !== 'AVAILABLE' && name !== '';
    }).length;
    setStats({ total, used, free: total - used });
  };

  useEffect(() => { fetchData(); setCurrentPage(1); }, [selectedTable]);

  const filteredVlan = vlanList.filter(item => {
    const s = search.toLowerCase();
    return (item.VLAN?.toString() || '').includes(s) || 
           (item.NAME?.toLowerCase() || '').includes(s) || 
           (item['SERVICE ID']?.toLowerCase() || '').includes(s);
  });

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(filteredVlan.length / itemsPerPage);
  const paginatedData = filteredVlan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditClick = (vlanItem: any) => {
    setEditingVlan({ ...vlanItem }); 
    setIsModalOpen(true);
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingVlan({ ...editingVlan, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const matchQuery = editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN };
    const { error } = await supabase.from(selectedTable.table).update({
        'NAME': editingVlan.NAME,
        'SERVICE ID': editingVlan['SERVICE ID'],
        'NE_SWITCH POP': editingVlan['NE_SWITCH POP'],
        'NE_PORT': editingVlan['NE_PORT'],
        'NE_MODE': editingVlan['NE_MODE'],
        'FE_SWITCH POP': editingVlan['FE_SWITCH POP'],
        'FE_PORT': editingVlan['FE_PORT'],
        'FE_MODE': editingVlan['FE_MODE']
      }).match(matchQuery); 

    if (error) toast.error('Gagal update: ' + error.message);
    else {
      toast.success('Data VLAN Berhasil Diupdate!');
      setIsModalOpen(false);
      fetchData(); 
    }
    setIsSaving(false);
  };

  const executeResetVlan = async () => {
    setIsSaving(true);
    setShowResetConfirm(false);
    const matchQuery = editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN };
    const { error } = await supabase.from(selectedTable.table).update({
        'NAME': 'AVAILABLE',
        'SERVICE ID': '-',
        'NE_SWITCH POP': '-', 'NE_PORT': '-', 'NE_MODE': '-',
        'FE_SWITCH POP': '-', 'FE_PORT': '-', 'FE_MODE': '-'
      }).match(matchQuery);

    if (error) toast.error('Gagal reset: ' + error.message);
    else {
      toast.success(`VLAN ${editingVlan.VLAN} Berhasil Dikosongkan!`);
      setIsModalOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const canEditDelete = hasAccess(userRole, PERMISSIONS.VLAN_EDIT_DELETE);

  return (
    <div className="p-4 md:p-8 bg-[#020c09] min-h-screen font-sans relative overflow-hidden">
      
      {/* BACKGROUND ORNAMENT */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <Moon className="absolute top-10 right-10 text-emerald-900" size={300} />
        <Sparkles className="absolute bottom-20 left-10 text-amber-500 animate-pulse" size={40} />
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6 mb-10">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
            <Layers className="text-emerald-500" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Infrastructure</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-emerald-50 tracking-tighter uppercase flex items-center gap-3">
            DATABASE <span className="text-emerald-500">VLAN</span>
          </h1>
          <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mt-1">Management Alokasi & IP Network</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
           <button 
            onClick={handleSyncToSheets} 
            disabled={isSyncing}
            className="flex items-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
           >
            <Share2 size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'SINKRONISASI...' : 'SYNC SHEETS'}
           </button>

           <div className="relative group">
             <Filter className="absolute left-4 top-3.5 text-emerald-500" size={16} />
             <select 
              className="appearance-none bg-[#041a14] border border-emerald-900/50 text-emerald-100 py-3 pl-12 pr-10 rounded-2xl focus:outline-none focus:border-emerald-500 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-xl"
              value={selectedTable.name}
              onChange={(e) => setSelectedTable(VLAN_TABLES.find(t => t.name === e.target.value) || VLAN_TABLES[0])}
             >
               {VLAN_TABLES.map((t, idx) => (
                 <option key={idx} value={t.name} className="bg-[#041a14]">{t.name}</option>
               ))}
             </select>
           </div>
           
           <button onClick={fetchData} className="p-3 bg-[#041a14] border border-emerald-900/50 rounded-2xl hover:bg-emerald-950 text-emerald-500 shadow-xl transition-all active:rotate-180">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATISTIK CARDS */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
            { label: 'Total VLAN', val: stats.total, icon: Database, color: 'emerald', border: 'border-emerald-500' },
            { label: 'Terpakai (Used)', val: stats.used, icon: AlertCircle, color: 'rose', border: 'border-rose-500' },
            { label: 'Tersedia (Free)', val: stats.free, icon: CheckCircle, color: 'amber', border: 'border-amber-500' }
        ].map((s, i) => (
            <div key={i} className={`bg-[#041a14] p-6 rounded-[2rem] border-b-4 ${s.border} shadow-2xl flex justify-between items-center group hover:translate-y-[-4px] transition-all`}>
                <div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                    <h3 className={`text-3xl font-black text-${s.color}-500 tracking-tighter`}>{s.val}</h3>
                </div>
                <s.icon className={`text-emerald-950 group-hover:text-${s.color}-900/30 transition-colors`} size={48} />
            </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="relative z-10 bg-[#041a14] rounded-[2.5rem] shadow-2xl border border-emerald-900/30 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-emerald-900/30 flex flex-col md:flex-row items-center justify-between bg-emerald-950/10 gap-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-3.5 text-emerald-800 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="CARI VLAN / CUSTOMER / SERVICE ID..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-[#020c09] border border-emerald-900/50 rounded-2xl w-full text-[10px] font-bold text-emerald-100 placeholder-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase tracking-widest transition-all"
            />
          </div>
          
          <div className="text-[10px] text-emerald-700 font-black uppercase tracking-[0.2em] flex items-center gap-4">
              <span>Halaman {currentPage} Dari {totalPages || 1}</span>
              <div className="flex gap-2">
                 <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-3 bg-[#020c09] hover:bg-emerald-900 rounded-xl disabled:opacity-20 text-emerald-500 transition-all"
                 >
                  <ChevronLeft size={18}/>
                 </button>
                 <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-3 bg-[#020c09] hover:bg-emerald-900 rounded-xl disabled:opacity-20 text-emerald-500 transition-all"
                 >
                  <ChevronRight size={18}/>
                 </button>
              </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#020c09] text-emerald-700 font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-5 border-b border-emerald-900/30 text-center sticky left-0 bg-[#020c09] z-10">Status</th>
                <th className="px-6 py-5 border-b border-emerald-900/30">VLAN ID</th>
                <th className="px-6 py-5 border-b border-emerald-900/30 min-w-[250px]">Customer Name</th>
                <th className="px-6 py-5 border-b border-emerald-900/30">Service ID</th>
                <th className="px-6 py-5 border-b border-emerald-900/30 bg-emerald-950/20 text-emerald-400">NE Switch (POP)</th>
                <th className="px-6 py-5 border-b border-emerald-900/30 bg-emerald-950/20 text-emerald-400 text-center sticky right-0 z-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center text-emerald-800 font-black animate-pulse uppercase tracking-[0.5em]">Mengunduh Data...</td></tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((v, index) => {
                  const name = (v.NAME || '').toUpperCase();
                  const isUsed = name && name !== '-' && name !== 'AVAILABLE' && name !== '';
                  
                  return (
                    <tr key={v.VLAN || index} className={`hover:bg-emerald-950/20 transition-colors group ${!isUsed ? 'bg-emerald-500/[0.02]' : ''}`}>
                      <td className="px-6 py-4 text-center sticky left-0 bg-[#041a14] z-10 group-hover:bg-[#06241c] transition-colors shadow-2xl">
                        {isUsed ? 
                          <span className="px-3 py-1.5 rounded-lg text-[9px] font-black bg-rose-950/30 text-rose-500 border border-rose-900/50 uppercase tracking-tighter italic">USED</span> : 
                          <span className="px-3 py-1.5 rounded-lg text-[9px] font-black bg-emerald-950/30 text-emerald-500 border border-emerald-900/50 uppercase tracking-tighter">FREE</span>
                        }
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-amber-500 text-sm italic">{v.VLAN}</td>
                      <td className="px-6 py-4 font-bold text-emerald-50 uppercase tracking-wide">
                        {v.NAME === 'AVAILABLE' ? <span className="text-emerald-900/40 italic font-medium">AVAILABLE SLOT</span> : v.NAME}
                      </td>
                      <td className="px-6 py-4 text-emerald-700 font-mono text-[10px]">{v['SERVICE ID'] || '-'}</td>
                      <td className="px-6 py-4 text-emerald-400/70 text-[10px] font-mono bg-emerald-950/10">{v['NE_SWITCH POP']}</td>
                      <td className="px-6 py-4 text-center sticky right-0 bg-[#041a14] z-10 group-hover:bg-[#06241c] transition-colors shadow-2xl">
                        {canEditDelete ? (
                          <button onClick={() => handleEditClick(v)} className="p-2 text-emerald-800 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all" title="Edit Detail">
                            <Edit size={16} />
                          </button>
                        ) : (
                          <ShieldCheck size={16} className="text-emerald-900 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-20 text-center text-emerald-900 font-bold uppercase">Data Tidak Ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL EDIT (Z-Index 50) --- */}
      {isModalOpen && editingVlan && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#041a14] rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-emerald-800/50 flex flex-col max-h-[90vh]">
            
            <div className="bg-emerald-950/50 p-6 flex justify-between items-center border-b border-emerald-800/30">
              <div>
                <h2 className="text-xl font-black text-emerald-50 flex items-center gap-3 uppercase tracking-tighter">
                  <Edit size={20} className="text-amber-500" /> EDIT VLAN <span className="text-amber-500">{editingVlan.VLAN}</span>
                </h2>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mt-1">Konfigurasi Alokasi Jaringan</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-emerald-900 p-3 rounded-2xl text-emerald-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="bg-[#020c09] p-6 rounded-[2rem] border border-emerald-900/50">
                <h3 className="text-[10px] font-black text-emerald-700 uppercase mb-4 tracking-[0.3em] flex items-center gap-2">
                    <Info size={14}/> Identitas Layanan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-widest ml-1">Customer Name</label>
                    <input type="text" name="NAME" value={editingVlan.NAME || ''} onChange={handleModalChange}
                      className="w-full p-4 bg-[#041a14] border border-emerald-800/50 rounded-2xl text-emerald-50 font-bold text-xs uppercase focus:border-amber-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-widest ml-1">Service ID</label>
                    <input type="text" name="SERVICE ID" value={editingVlan['SERVICE ID'] || ''} onChange={handleModalChange}
                      className="w-full p-4 bg-[#041a14] border border-emerald-800/50 rounded-2xl text-emerald-50 font-bold text-xs focus:border-amber-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="bg-[#020c09] p-6 rounded-[2rem] border border-emerald-900/50">
                <h3 className="text-[10px] font-black text-emerald-700 uppercase mb-4 tracking-[0.3em] flex items-center gap-2">
                    <Server size={14}/> Near End (POP Side)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="SWITCH" name="NE_SWITCH POP" value={editingVlan['NE_SWITCH POP'] || ''} onChange={handleModalChange}
                    className="w-full p-4 bg-[#041a14] border border-emerald-800/50 rounded-2xl text-emerald-50 font-bold text-[10px] uppercase outline-none focus:border-emerald-500" />
                  <input type="text" placeholder="PORT" name="NE_PORT" value={editingVlan['NE_PORT'] || ''} onChange={handleModalChange}
                    className="w-full p-4 bg-[#041a14] border border-emerald-800/50 rounded-2xl text-emerald-50 font-bold text-[10px] uppercase outline-none focus:border-emerald-500" />
                  <input type="text" placeholder="MODE" name="NE_MODE" value={editingVlan['NE_MODE'] || ''} onChange={handleModalChange}
                    className="w-full p-4 bg-[#041a14] border border-emerald-800/50 rounded-2xl text-emerald-50 font-bold text-[10px] uppercase outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-emerald-800/30 bg-emerald-950/20 flex justify-between items-center gap-4">
              <button onClick={() => setShowResetConfirm(true)} disabled={isSaving}
                className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 px-6 py-4 rounded-2xl transition-all flex items-center gap-2">
                <Trash2 size={16} /> RESET VLAN
              </button>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-4 text-emerald-700 hover:text-emerald-500 font-black text-[10px] uppercase tracking-widest">BATAL</button>
                <button onClick={handleSaveChanges} disabled={isSaving}
                  className="px-8 py-4 bg-emerald-500 text-black rounded-2xl hover:bg-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95">
                  {isSaving ? 'MEMPROSES...' : <><Save size={18} /> SIMPAN PERUBAHAN</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RESET CONFIRM (Z-Index 100) --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-300">
          <div className="bg-[#041a14] rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden border border-rose-900/50 scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-rose-500 text-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/30">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black text-rose-50 uppercase tracking-tighter">LEPAS VLAN {editingVlan?.VLAN}?</h2>
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-[0.2em] mt-4 leading-relaxed">
                Data customer akan dihapus permanen dan status kembali menjadi <strong className="text-emerald-500 underline">AVAILABLE</strong>.
              </p>
            </div>
            <div className="p-6 bg-rose-950/10 flex flex-col gap-3">
              <button onClick={executeResetVlan} className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95">
                YA, KOSONGKAN SEKARANG
              </button>
              <button onClick={() => setShowResetConfirm(false)} className="w-full py-5 bg-transparent border border-emerald-900 text-emerald-700 hover:text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>

    </div>
  );
}