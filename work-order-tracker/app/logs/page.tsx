'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Search, History, RefreshCcw, User, Clock, Trash2, PlusCircle, Edit, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
// ✅ TAMBAHAN 1: Import hook realtime
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function LogActivityPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // ✅ UBAH: logs sekarang jadi initialLogs (data awal dari fetch)
  const [initialLogs, setInitialLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ TAMBAHAN 2: State untuk status koneksi realtime
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ✅ TAMBAHAN 3: Hook realtime — otomatis update saat ada INSERT baru
  // Hanya berlaku di page 1 tanpa search (agar tidak konflik dengan pagination/filter)
  const realtimeLogs = useRealtimeTable('Log_Aktivitas', initialLogs, ['INSERT']);

  // Gunakan realtimeLogs kalau di page 1 tanpa search, else pakai initialLogs biasa
  const logs = (page === 1 && !search) ? realtimeLogs : initialLogs;

  // Fetch Data — sama persis seperti sebelumnya, tidak ada yang diubah
  async function fetchLogs() {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('Log_Aktivitas')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(`actor.ilike.%${search}%,SUBJECT.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setInitialLogs(data || []); // ✅ UBAH: setLogs → setInitialLogs
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  // ✅ TAMBAHAN 4: Aktifkan indikator "Live" setelah komponen mount
  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Helper Warna Badge — tidak ada perubahan sama sekali
  const getActionStyle = (activity: string) => {
    const act = (activity || '').toUpperCase();
    
    if (act.includes('DELETE') || act.includes('HAPUS')) 
      return { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600', icon: Trash2, label: 'DELETE DATA' };
    
    if (act.includes('INPUT') || act.includes('CREATE') || act.includes('ADD') || act.includes('BARU')) 
      return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600', icon: PlusCircle, label: 'INPUT DATA' };
    
    if (act.includes('UPDATE') || act.includes('EDIT')) 
      return { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-600', icon: Edit, label: 'UPDATE DATA' };
      
    return { bg: 'bg-slate-50 border-slate-100', text: 'text-slate-500', icon: AlertCircle, label: 'SYSTEM LOG' };
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" /> Audit Trail
          </h1>
          <p className="text-sm text-slate-500">Rekaman jejak aktivitas user di sistem NOC</p>
        </div>

        {/* ✅ TAMBAHAN 5: Live badge + tombol refresh */}
        <div className="flex items-center gap-3">
          {/* Indikator Live — hanya muncul di page 1 tanpa search */}
          {page === 1 && !search && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isLive ? 'Live' : 'Connecting...'}
            </span>
          )}
          <button onClick={fetchLogs} className="p-2 bg-white border rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar — tidak ada perubahan */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari Actor / Aktivitas..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
          />
        </div>
      </div>

      {/* Log List (Timeline Style) — tidak ada perubahan sama sekali */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="border-l-2 border-slate-100 ml-3 space-y-8 relative">
          
          {loading ? (
             <div className="pl-8 py-4 text-slate-500 italic">Memuat log aktivitas...</div>
          ) : logs.length > 0 ? (
            logs.map((log) => {
              const style = getActionStyle(log.ACTIVITY);
              const IconComponent = style.icon || AlertCircle;
              
              return (
                <div key={log.id} className="relative pl-8 group hover:bg-slate-50/50 p-2 rounded-lg transition-colors">
                  
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${style.bg.split(' ')[0]}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${style.text.replace('text', 'bg')}`}></div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                            <User size={14} className="text-slate-400"/> 
                            {log.actor || 'System'}
                          </span>
                          
                          {/* Badge Action */}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1 ${style.bg} ${style.text}`}>
                            <IconComponent size={10} />
                            {style.label}
                          </span>
                      </div>
                      <p className="text-slate-800 text-sm leading-relaxed font-medium">
                        {log.SUBJECT}
                      </p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                        <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-800">
                          <Clock size={12} />
                          {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: indonesia }) : '-'}
                        </div>
                        <div className="text-[10px] text-slate-800 mt-0.5 font-medium">
                          {log.created_at ? format(new Date(log.created_at), 'EEEE, dd MMM yyyy HH:mm', { locale: indonesia }) : '-'}
                        </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pl-8 py-10 text-slate-400 italic">Tidak ada aktivitas ditemukan.</div>
          )}

        </div>
        
        {/* Simple Pagination — tidak ada perubahan */}
        <div className="mt-8 flex justify-center gap-2 pt-4 border-t border-slate-50">
           <button 
             disabled={page === 1} 
             onClick={() => setPage(page - 1)}
             className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-medium"
           >
             Previous
           </button>
           <button 
             disabled={logs.length < ITEMS_PER_PAGE}
             onClick={() => setPage(page + 1)}
             className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-medium"
           >
             Next
           </button>
        </div>
      </div>

    </div>
  );
}