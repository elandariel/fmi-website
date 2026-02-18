'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight, 
  Users, Signal, Trash2, Edit, MapPin, 
  Moon, Star, Database, LayoutGrid
} from 'lucide-react';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export default function ClientListPage() {
  const isRamadhan = true; // SAKLAR TEMA
  
  // --- STATE ---
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<Role | null>(null);
  
  // State Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const ITEMS_PER_PAGE = 10; 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // --- FETCH DATA ---
  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if(profile) setUserRole(profile.role as Role);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from('Data Client Corporate').select('*', { count: 'exact' }); 

    if (search) {
      query = query.or(`"Nama Pelanggan".ilike.%${search}%,"ID Pelanggan".ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('id', { ascending: false }) 
      .range(from, to);

    if (!error) {
      setClients(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [page, search]); 

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  const canAdd = hasAccess(userRole, PERMISSIONS.CLIENT_ADD);
  const canEditDelete = hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE);

  return (
    <div className={`p-6 min-h-screen font-sans transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-xl ${isRamadhan ? 'bg-emerald-900/50 text-amber-500' : 'bg-blue-100 text-blue-600'}`}>
              <Users size={24} />
            </div>
            <h1 className={`text-3xl font-black tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
              DATA <span className={isRamadhan ? 'text-amber-500' : 'text-blue-600'}>CLIENT</span>
            </h1>
          </div>
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>
            Manajemen Database Pelanggan
          </p>
        </div>
        
        {canAdd && (
          <Link href="/clients/create">
            <button className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isRamadhan ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-900/20' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              <Plus size={18} strokeWidth={3} /> Client Baru
            </button>
          </Link>
        )}

        {/* Dekorasi Background Halus */}
        {isRamadhan && (
          <div className="absolute top-0 right-1/4 opacity-5 pointer-events-none">
            <Moon size={150} className="text-emerald-500" />
          </div>
        )}
      </div>

      {/* FILTER & SEARCH CARD */}
      <div className={`p-5 rounded-2xl border mb-6 flex flex-col md:flex-row justify-between gap-4 transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="relative w-full md:w-96">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`} size={18} />
          <input 
            type="text" 
            placeholder="Cari Nama / ID Pelanggan..." 
            value={search}
            onChange={handleSearch}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all text-sm font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isRamadhan ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
          <Database size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Terdeteksi: <b className={isRamadhan ? 'text-amber-500' : 'text-slate-800'}>{totalRecords}</b> Unit
          </span>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className={`rounded-[2rem] border overflow-hidden transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`uppercase text-[10px] font-black tracking-[0.15em] border-b ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800/50 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              <tr>
                <th className="px-8 py-5 text-center">ID</th>
                <th className="px-6 py-5">Nama Pelanggan / Alamat</th>
                <th className="px-6 py-5">Layanan</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Redaman</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isRamadhan ? 'divide-emerald-900/30' : 'divide-slate-50'}`}>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6">
                      <div className={`h-8 rounded-lg w-full ${isRamadhan ? 'bg-emerald-900/20' : 'bg-slate-100'}`}></div>
                    </td>
                  </tr>
                ))
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id} className={`transition-all group ${isRamadhan ? 'hover:bg-emerald-900/10' : 'hover:bg-blue-50/50'}`}>
                    <td className="px-8 py-6 text-center">
                      <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded-md ${isRamadhan ? 'bg-emerald-950 text-emerald-500 border border-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        #{client['ID Pelanggan']}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`font-black text-sm mb-1 ${isRamadhan ? 'text-emerald-50 group-hover:text-amber-500' : 'text-slate-800'}`}>
                        {client['Nama Pelanggan']}
                      </div>
                      <div className={`text-[10px] flex items-center gap-1.5 font-medium ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>
                        <MapPin size={10} /> {client['ALAMAT'] ? client['ALAMAT'].substring(0, 45) + '...' : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${isRamadhan ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 group-hover:border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        {client['Kapasitas'] || '10 Mbps'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <StatusBadge status={client['STATUS']} isRamadhan={isRamadhan} />
                    </td>
                    <td className="px-6 py-6 text-center">
                       <SignalIndicator value={client['RX ONT/SFP']} isRamadhan={isRamadhan} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center items-center gap-2">
                        <Link href={`/clients/${client.id}`}>
                          <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400 hover:bg-emerald-800 hover:text-white' : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50'}`}>
                            Detail <ChevronRight size={14} />
                          </button>
                        </Link>

                        {canEditDelete && (
                          <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button className={`p-2 rounded-lg transition-colors ${isRamadhan ? 'text-amber-500 hover:bg-amber-500/10' : 'text-amber-500 hover:bg-amber-50'}`}>
                              <Edit size={16} />
                            </button>
                            <button className={`p-2 rounded-lg transition-colors ${isRamadhan ? 'text-rose-500 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={40} className={isRamadhan ? 'text-emerald-900' : 'text-slate-200'} />
                      <p className={`text-xs font-black uppercase tracking-widest ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                        Data Tidak Ditemukan
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className={`p-6 flex items-center justify-between border-t transition-all ${isRamadhan ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-slate-50 border-slate-100'}`}>
          <button 
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 ${isRamadhan ? 'bg-[#020c09] text-emerald-500 border border-emerald-800 hover:border-amber-500' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
            Halaman <span className={isRamadhan ? 'text-amber-500' : 'text-blue-600'}>{page}</span> <span className="mx-2 opacity-30">/</span> {totalPages}
          </div>

          <button 
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 ${isRamadhan ? 'bg-[#020c09] text-emerald-500 border border-emerald-800 hover:border-amber-500' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-8 flex justify-center items-center gap-4">
          <div className={`h-[1px] w-12 ${isRamadhan ? 'bg-emerald-900' : 'bg-slate-200'}`}></div>
          <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isRamadhan ? 'text-emerald-800' : 'text-slate-300'}`}>
            Ramadhan Edition • NOC Commander 2026
          </p>
          <div className={`h-[1px] w-12 ${isRamadhan ? 'bg-emerald-900' : 'bg-slate-200'}`}></div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${isRamadhan ? '#064e3b' : '#cbd5e1'}; 
          border-radius: 10px; 
        }
      `}</style>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatusBadge({ status, isRamadhan }: any) {
  const s = (status || '').toLowerCase();
  let baseClass = "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ";
  
  if (s.includes('active') || s.includes('ok')) {
    return <span className={`${baseClass} ${isRamadhan ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-green-100 text-green-700 border-green-200'}`}>● Active</span>;
  }
  if (s.includes('suspend') || s.includes('isolir')) {
    return <span className={`${baseClass} ${isRamadhan ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-red-100 text-red-700 border-red-200'}`}>⚠ Suspend</span>;
  }
  return <span className={`${baseClass} ${isRamadhan ? 'bg-emerald-900/40 text-emerald-700 border-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{status || 'Offline'}</span>;
}

function SignalIndicator({ value, isRamadhan }: any) {
  const val = parseFloat(value);
  if (!value || isNaN(val)) return <span className="text-slate-500 opacity-30">-</span>;

  let color = isRamadhan ? 'text-emerald-500' : 'text-green-600';
  if (val < -27) color = 'text-red-500 animate-pulse'; 
  else if (val < -24) color = 'text-amber-500';

  return (
    <div className={`flex items-center justify-center gap-1.5 font-mono font-bold text-xs ${color}`}>
      <Signal size={12} strokeWidth={3} />
      {val.toFixed(2)} <span className="text-[8px] opacity-50">dBm</span>
    </div>
  );
}