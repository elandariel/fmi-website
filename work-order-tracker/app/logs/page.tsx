'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Search, History, RefreshCcw, User, Clock, Trash2, PlusCircle, Edit, AlertCircle, 
  Moon, Sparkles, Fingerprint, CalendarDays
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

export default function LogActivityPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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
    if (!error) setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const getActionStyle = (activity: string) => {
    const act = (activity || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('HAPUS')) 
      return { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.3)]', icon: Trash2, label: 'ERASE' };
    if (act.includes('INPUT') || act.includes('CREATE') || act.includes('ADD') || act.includes('BARU')) 
      return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]', icon: PlusCircle, label: 'CREATE' };
    if (act.includes('UPDATE') || act.includes('EDIT')) 
      return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]', icon: Edit, label: 'UPDATE' };
    return { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', glow: '', icon: AlertCircle, label: 'SYSTEM' };
  };

  return (
    <div className="p-4 md:p-8 bg-[#020c09] min-h-screen font-sans relative overflow-hidden text-emerald-50">
      
      {/* DECORATIVE BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-900/5 rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <Fingerprint className="text-emerald-500" size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Identity Guard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">
            AUDIT <span className="text-emerald-500">TRAIL</span>
          </h1>
          <p className="text-emerald-900 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 italic">
            "Setiap ketukan tombol terekam dalam keabadian sistem"
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 text-emerald-800 group-focus-within:text-emerald-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="CARI AKTOR / AKTIVITAS..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-12 pr-6 py-3.5 bg-[#041a14] border border-emerald-900/50 rounded-2xl w-full md:w-80 text-[10px] font-black text-emerald-100 placeholder-emerald-900 focus:ring-2 focus:ring-emerald-500/50 outline-none uppercase tracking-widest transition-all shadow-2xl"
            />
          </div>
          <button onClick={fetchLogs} className="p-3.5 bg-emerald-500 text-[#020c09] rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-90">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TIMELINE CONTAINER */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Central Line */}
        <div className="absolute left-4 md:left-1/2 md:-ml-[1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/50 via-emerald-900/20 to-transparent" />

        <div className="space-y-12 relative">
          {loading ? (
            <div className="text-center py-20">
               <div className="inline-block animate-bounce mb-4"><Moon className="text-emerald-500" size={40}/></div>
               <p className="text-emerald-800 font-black uppercase tracking-[0.5em] text-xs">Membaca Jejak Digital...</p>
            </div>
          ) : logs.length > 0 ? (
            logs.map((log, index) => {
              const style = getActionStyle(log.ACTIVITY);
              const IconComponent = style.icon;
              const isEven = index % 2 === 0;

              return (
                <div key={log.id} className={`relative flex flex-col md:flex-row items-center group`}>
                  
                  {/* Timeline Point */}
                  <div className={`absolute left-4 md:left-1/2 md:-ml-3 top-0 w-6 h-6 rounded-full bg-[#020c09] border-2 border-emerald-500 z-20 flex items-center justify-center transition-all group-hover:scale-125 ${style.glow}`}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Content Card */}
                  <div className={`w-full md:w-[45%] ml-12 md:ml-0 ${isEven ? 'md:mr-auto md:text-right' : 'md:ml-auto md:text-left'}`}>
                    <div className={`p-6 bg-[#041a14]/60 backdrop-blur-xl border border-emerald-900/30 rounded-[2rem] transition-all hover:border-emerald-500/40 group-hover:translate-y-[-5px] shadow-2xl`}>
                      
                      <div className={`flex items-center gap-3 mb-4 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border uppercase ${style.bg} ${style.text}`}>
                          {style.label}
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                           <User size={12}/> {log.actor || 'System'}
                        </div>
                      </div>

                      <h3 className="text-sm md:text-base font-bold text-emerald-50 leading-relaxed mb-4">
                        {log.SUBJECT}
                      </h3>

                      <div className={`flex flex-col gap-1 border-t border-emerald-900/30 pt-4 ${isEven ? 'md:items-end' : 'md:items-start'}`}>
                        <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-tighter">
                          <Clock size={12} />
                          {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: indonesia }) : '-'}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-[9px] uppercase tracking-[0.1em]">
                          <CalendarDays size={10} />
                          {log.created_at ? format(new Date(log.created_at), 'EEEE, dd MMM yyyy • HH:mm', { locale: indonesia }) : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-[#041a14] rounded-[3rem] border border-dashed border-emerald-900/50">
               <History size={48} className="mx-auto text-emerald-900 mb-4 opacity-20" />
               <p className="text-emerald-800 font-bold uppercase tracking-widest text-xs">Belum ada rekaman aktivitas hari ini</p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="mt-16 flex justify-center gap-4">
          <button 
            disabled={page === 1} 
            onClick={() => { setPage(page - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
            className="px-8 py-4 bg-[#041a14] border border-emerald-900/50 text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-20 shadow-xl"
          >
            SEBELUMNYA
          </button>
          <button 
            disabled={logs.length < ITEMS_PER_PAGE}
            onClick={() => { setPage(page + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
            className="px-8 py-4 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all disabled:opacity-20 shadow-xl"
          >
            SELANJUTNYA
          </button>
        </div>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #020c09; }
        ::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>

    </div>
  );
}