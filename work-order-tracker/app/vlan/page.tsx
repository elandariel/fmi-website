'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Search, RefreshCcw, Server, Database, Filter, 
  Edit, Save, Trash2, X, AlertCircle, CheckCircle, Router, ShieldCheck, AlertTriangle, 
  ChevronLeft, ChevronRight, Share2, Activity, Zap, Layers
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
  // --- STATE & LOGIC (Tetap sesuai fitur asli) ---
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

  // --- FUNCTIONS (Fixing defined errors) ---
  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    const syncToast = toast.loading("Menyelaraskan data...");
    try {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfOmI847h1PFaaO6FBJ52SLCORyOmIalhkVxcb_W0jYI9J31-jAY03CoQzcZ0DZxDP/exec";
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          spreadsheetId: "1kojKLgb04yCirdTfRcb3C_1xqkKs8N68bmzuz0-4-N4",
          sheetName: selectedTable.table, 
          rows: vlanList
        }),
      });
      toast.success("Sync Terhasil!", { id: syncToast });
    } catch (error) {
      toast.error("Sync Gagal", { id: syncToast });
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
      const total = data.length;
      const used = data.filter(r => {
        const name = (r.NAME || '').toUpperCase();
        return name && name !== '-' && name !== 'AVAILABLE' && name !== '';
      }).length;
      setStats({ total, used, free: total - used });
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); setCurrentPage(1); }, [selectedTable]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredVlan = vlanList.filter(item => {
    const s = search.toLowerCase();
    return (item.VLAN?.toString() || '').includes(s) || (item.NAME?.toLowerCase() || '').includes(s);
  });

  const totalPages = Math.ceil(filteredVlan.length / itemsPerPage);
  const paginatedData = filteredVlan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditClick = (vlanItem: any) => {
    setEditingVlan({ ...vlanItem }); 
    setIsModalOpen(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const { error } = await supabase.from(selectedTable.table).update({
      'NAME': editingVlan.NAME, 'SERVICE ID': editingVlan['SERVICE ID'],
      'NE_SWITCH POP': editingVlan['NE_SWITCH POP'], 'NE_PORT': editingVlan['NE_PORT'], 'NE_MODE': editingVlan['NE_MODE'],
      'FE_SWITCH POP': editingVlan['FE_SWITCH POP'], 'FE_PORT': editingVlan['FE_PORT'], 'FE_MODE': editingVlan['FE_MODE']
    }).match(editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN }); 

    if (!error) { toast.success('Berhasil!'); setIsModalOpen(false); fetchData(); }
    setIsSaving(false);
  };

  const executeResetVlan = async () => {
    setIsSaving(true);
    const { error } = await supabase.from(selectedTable.table).update({
      'NAME': 'AVAILABLE', 'SERVICE ID': '-',
      'NE_SWITCH POP': '-', 'NE_PORT': '-', 'NE_MODE': '-',
      'FE_SWITCH POP': '-', 'FE_PORT': '-', 'FE_MODE': '-'
    }).match(editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN });
    if (!error) { toast.success('VLAN Dikosongkan!'); setIsModalOpen(false); setShowResetConfirm(false); fetchData(); }
    setIsSaving(false);
  };

  const canEditDelete = hasAccess(userRole, PERMISSIONS.VLAN_EDIT_DELETE);

  return (
    <div className="p-6 bg-[#0a0f18] min-h-screen text-slate-200">
      
      {/* HEADER SECTION - Theme Match Emerald */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Layers className="text-emerald-500" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Network VLAN <span className="text-emerald-500">Manager</span></h1>
          </div>
          <p className="text-slate-500 text-sm">Database alokasi segmen network NOC FMI</p>
        </div>

        <div className="flex gap-3">
          <select 
            className="bg-[#161f2c] border border-slate-800 text-slate-300 py-2 px-4 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            value={selectedTable.name}
            onChange={(e) => setSelectedTable(VLAN_TABLES.find(t => t.name === e.target.value) || VLAN_TABLES[0])}
          >
            {VLAN_TABLES.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
          </select>

          <button onClick={handleSyncToSheets} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
            <Share2 size={16} className={isSyncing ? 'animate-pulse' : ''} /> Sync
          </button>
          
          <button onClick={fetchData} className="p-2 bg-[#161f2c] border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 transition-all">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Segment', val: stats.total, color: 'emerald', icon: Database },
          { label: 'Occupied', val: stats.used, color: 'rose', icon: Activity },
          { label: 'Available', val: stats.free, color: 'sky', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="bg-[#111827] p-5 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-emerald-500/30 transition-all">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <h3 className={`text-3xl font-bold text-${s.color}-500`}>{s.val}</h3>
            </div>
            <s.icon className={`text-slate-800 group-hover:text-${s.color}-500/20 transition-colors`} size={48} />
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#161f2c]/50 border-b border-slate-800 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" placeholder="Search VLAN or Customer..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0a0f18] border border-slate-800 rounded-xl text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>PAGE {currentPage} / {totalPages || 1}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-slate-800 rounded disabled:opacity-20"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:bg-slate-800 rounded disabled:opacity-20"><ChevronRight size={18}/></button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#161f2c] text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">VLAN</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Service ID</th>
                <th className="px-6 py-4 bg-emerald-500/5 text-emerald-500">NE (POP)</th>
                <th className="px-6 py-4 bg-emerald-500/5 text-emerald-500">Port</th>
                <th className="px-6 py-4 bg-emerald-500/5 text-emerald-500">Mode</th>
                <th className="px-6 py-4 bg-blue-500/5 text-blue-400">FE (CPE)</th>
                <th className="px-6 py-4 bg-blue-500/5 text-blue-400">Port</th>
                <th className="px-6 py-4 bg-blue-500/5 text-blue-400">Mode</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={11} className="p-10 text-center text-slate-500 animate-pulse">Loading core database...</td></tr>
              ) : paginatedData.map((v, i) => {
                const isUsed = v.NAME && v.NAME !== 'AVAILABLE' && v.NAME !== '-';
                return (
                  <tr key={v.VLAN || i} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter ${isUsed ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {isUsed ? 'USED' : 'FREE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-500">{v.VLAN}</td>
                    <td className={`px-6 py-4 font-medium ${isUsed ? 'text-slate-200' : 'text-slate-600 italic'}`}>{v.NAME || 'Available'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{v['SERVICE ID'] || '-'}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-emerald-400/70 bg-emerald-500/5">{v['NE_SWITCH POP']}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-emerald-400/70 bg-emerald-500/5">{v['NE_PORT']}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-emerald-400/70 bg-emerald-500/5">{v['NE_MODE']}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-blue-400/70 bg-blue-500/5">{v['FE_SWITCH POP']}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-blue-400/70 bg-blue-500/5">{v['FE_PORT']}</td>
                    <td className="px-6 py-4 text-[11px] font-mono text-blue-400/70 bg-blue-500/5">{v['FE_MODE']}</td>
                    <td className="px-6 py-4 text-center">
                      {canEditDelete ? (
                        <button onClick={() => handleEditClick(v)} className="p-2 text-slate-500 hover:text-emerald-500 transition-colors">
                          <Edit size={16} />
                        </button>
                      ) : <ShieldCheck size={16} className="text-slate-800 mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT - Fix Reference Error */}
      {isModalOpen && editingVlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-3xl w-full max-w-2xl border border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#161f2c]">
              <h2 className="text-xl font-bold flex items-center gap-2"><Edit size={20} className="text-emerald-500"/> Edit VLAN {editingVlan.VLAN}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Field Groups */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer Name</label>
                    <input type="text" value={editingVlan.NAME} onChange={(e)=>setEditingVlan({...editingVlan, NAME: e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2.5 rounded-xl text-slate-200 outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service ID</label>
                    <input type="text" value={editingVlan['SERVICE ID']} onChange={(e)=>setEditingVlan({...editingVlan, 'SERVICE ID': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2.5 rounded-xl text-slate-200 outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Near End */}
              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 space-y-4">
                <p className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">Near End (POP)</p>
                <input type="text" placeholder="NE Switch" value={editingVlan['NE_SWITCH POP']} onChange={(e)=>setEditingVlan({...editingVlan, 'NE_SWITCH POP': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
                <input type="text" placeholder="NE Port" value={editingVlan['NE_PORT']} onChange={(e)=>setEditingVlan({...editingVlan, 'NE_PORT': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
                <input type="text" placeholder="NE Mode" value={editingVlan['NE_MODE']} onChange={(e)=>setEditingVlan({...editingVlan, 'NE_MODE': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
              </div>

              {/* Far End */}
              <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 space-y-4">
                <p className="text-[10px] font-black text-blue-400 tracking-widest uppercase">Far End (CPE)</p>
                <input type="text" placeholder="FE Switch" value={editingVlan['FE_SWITCH POP']} onChange={(e)=>setEditingVlan({...editingVlan, 'FE_SWITCH POP': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
                <input type="text" placeholder="FE Port" value={editingVlan['FE_PORT']} onChange={(e)=>setEditingVlan({...editingVlan, 'FE_PORT': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
                <input type="text" placeholder="FE Mode" value={editingVlan['FE_MODE']} onChange={(e)=>setEditingVlan({...editingVlan, 'FE_MODE': e.target.value})} className="w-full bg-[#0a0f18] border border-slate-800 p-2 rounded-lg text-xs" />
              </div>
            </div>

            <div className="p-4 bg-[#161f2c] border-t border-slate-800 flex justify-between">
              <button onClick={handleResetClick} className="text-rose-500 text-xs font-bold px-4 py-2 hover:bg-rose-500/10 rounded-xl transition-all">RELEASE VLAN</button>
              <div className="flex gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-400 font-bold text-sm">Cancel</button>
                <button onClick={handleSaveChanges} disabled={isSaving} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-900/40">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111827] border border-rose-500/30 p-8 rounded-[40px] max-w-sm text-center shadow-2xl shadow-rose-900/20">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32}/></div>
            <h2 className="text-xl font-bold text-white mb-2">Release VLAN?</h2>
            <p className="text-sm text-slate-500 mb-8">Seluruh data customer akan dihapus dan VLAN akan kembali tersedia.</p>
            <div className="flex flex-col gap-2">
              <button onClick={executeResetVlan} className="w-full py-3 bg-rose-600 text-white rounded-2xl font-black">YA, LEPAS</button>
              <button onClick={() => setShowResetConfirm(false)} className="w-full py-3 text-slate-500 font-bold">BATAL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}