'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle, ChevronLeft, ChevronRight, 
  Calendar, X, XCircle, CheckCircle, RefreshCw, 
  Moon, Star, Users, ExternalLink, Database, Send
} from 'lucide-react';
import Link from 'next/link'; 
import { format, differenceInDays } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export default function AlertBanner() {
  const isRamadhan = true; // SAKLAR TEMA
  const [alerts, setAlerts] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [today, setToday] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Record<number, string>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Helper Ekstrak Tanggal
  const extractDateFromText = (text: string, defaultDate: string) => {
    if (!text) return new Date(defaultDate);
    const regex = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s+(\d{4})/i;
    const match = text.match(regex);
    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const monthMap: Record<string, number> = {
        januari: 0, jan: 0, februari: 1, feb: 1, maret: 2, mar: 2,
        april: 3, apr: 3, mei: 4, juni: 5, jun: 5, juli: 6, jul: 6,
        agustus: 7, agu: 7, september: 8, sep: 8, oktober: 9, okt: 9,
        november: 10, nov: 10, desember: 11, des: 11
      };
      if (monthMap.hasOwnProperty(monthStr)) return new Date(year, monthMap[monthStr], day);
    }
    return new Date(defaultDate);
  };

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role as Role);
      }

      const { data: woData } = await supabase
        .from('Report Bulanan')
        .select('*')
        .in('STATUS', ['PENDING', 'PROGRESS', 'ON PROGRESS', 'OPEN'])
        .order('id', { ascending: false });

      if (woData) setAlerts(woData);

      const { data: teamData } = await supabase.from('Index').select('TEAM').not('TEAM', 'is', null);
      if (teamData) {
        const unique = Array.from(new Set(teamData.map((t: any) => t.TEAM)));
        setTeamList(unique as string[]);
      }
    } catch (err) {
      console.error("Error AlertBanner:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setToday(new Date());
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: number, actionType: string) => {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) {
      alert("Izin ditolak.");
      return;
    }

    const teamName = selectedTeams[id];
    if (actionType === 'SOLVED' && !teamName) {
      alert('Pilih Team Eksekutor dulu!');
      return;
    }

    setProcessingId(id);
    const todayDate = new Date().toISOString().split('T')[0];
    
    const payload = {
      'STATUS': actionType,
      'KETERANGAN': actionType === 'SOLVED' ? 'DONE' : 'CANCELLED',
      'SELESAI ACTION': todayDate,
      'NAMA TEAM': teamName || 'System'
    };

    const { error } = await supabase.from('Report Bulanan').update(payload).eq('id', id);

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setAlerts(prev => prev.filter(item => item.id !== id));
      if (alerts.length <= 1) setIsModalOpen(false);
    }
    setProcessingId(null);
  };

  if (loading) return (
    <div className={`h-28 rounded-2xl animate-pulse mb-8 mt-8 border ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-white border-slate-200'}`}></div>
  );

  if (alerts.length === 0) return null;

  const item = alerts[currentIndex];
  const targetDate = extractDateFromText(item['KETERANGAN'], item['TANGGAL']);
  const diffDays = today ? differenceInDays(today, targetDate) : 0; 
  
  return (
    <>
      {/* BANNER UTAMA - Ditambahkan mt-8 agar tidak mepet header */}
      <div className={`rounded-2xl shadow-xl mb-8 mt-8 relative overflow-hidden border-2 transition-all duration-500 ${isRamadhan ? 'bg-[#041a14] border-emerald-800 shadow-emerald-900/20' : 'bg-white border-slate-200'}`}>
        
        {/* Dekorasi Bulan Sabit Transparan */}
        <div className="absolute -top-4 -right-4 opacity-10 pointer-events-none">
          <Moon size={120} className="text-amber-500 fill-amber-500 rotate-12" />
        </div>
        
        {/* Aksen List Warna di Kiri */}
        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isRamadhan ? 'bg-amber-500' : 'bg-rose-600'}`}></div>
        
        {/* Konten Banner */}
        <div className="p-7 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
               <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border transition-all ${isRamadhan ? 'bg-emerald-950 text-amber-500 border-emerald-700 animate-pulse' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                  <AlertTriangle size={12} /> {isRamadhan ? 'Task Pending' : 'URGENT WO'}
               </span>
               <span className={`text-[10px] font-black uppercase tracking-widest ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>
                 Item {currentIndex + 1} dari {alerts.length}
               </span>
            </div>
            <h3 className={`text-xl font-black truncate tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
              {item['SUBJECT WO']}
            </h3>
            <p className={`text-xs italic mt-1 line-clamp-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
              "{item['KETERANGAN'] || '-'}"
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Navigasi Panah */}
            <div className="flex bg-black/20 p-1.5 rounded-xl border border-emerald-800/50">
              <button 
                onClick={() => setCurrentIndex(p => (p - 1 + alerts.length) % alerts.length)} 
                className={`p-2 rounded-lg transition-all ${isRamadhan ? 'hover:bg-emerald-800 text-emerald-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <ChevronLeft size={20}/>
              </button>
              <button 
                onClick={() => setCurrentIndex(p => (p + 1) % alerts.length)} 
                className={`p-2 rounded-lg transition-all ${isRamadhan ? 'hover:bg-emerald-800 text-emerald-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <ChevronRight size={20}/>
              </button>
            </div>
            
            {/* Tombol Lihat Semua */}
            <button 
              onClick={() => setIsModalOpen(true)} 
              className={`px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isRamadhan ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
            >
              Cek Semua ({alerts.length})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL FULL SCREEN - RAMADHAN STYLE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#020c09]/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-md">
          <div className={`w-full max-w-5xl max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border animate-in zoom-in-95 duration-300 ${isRamadhan ? 'bg-[#041a14] border-emerald-800' : 'bg-white border-slate-200'}`}>
            
            {/* Header Modal */}
            <div className={`p-8 border-b flex justify-between items-center ${isRamadhan ? 'bg-emerald-900/30 border-emerald-800' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
                  <Star className="text-amber-500 fill-amber-500" size={28} />
                </div>
                <div>
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                    Monitoring Antrean <span className="text-amber-500 ml-1">✦</span>
                  </h2>
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
                    Tersisa {alerts.length} Work Order yang harus diselesaikan
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-red-500/10 rounded-2xl text-red-400 transition-colors">
                <X size={28} />
              </button>
            </div>

            {/* List Content */}
            <div className={`p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar ${isRamadhan ? 'bg-[#031510]' : 'bg-slate-100/50'}`}>
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col lg:flex-row gap-5 items-start lg:items-center ${isRamadhan ? 'bg-[#05231b] border-emerald-800/50 hover:border-amber-500/50 shadow-sm' : 'bg-white border-slate-200'}`}>
                  <div className="flex-1 w-full min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${isRamadhan ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {alert['STATUS']}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${isRamadhan ? 'text-emerald-800' : 'text-slate-300'}`}>#{alert.id}</span>
                    </div>
                    <h3 className={`font-black text-base tracking-tight mb-2 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                      {alert['SUBJECT WO']}
                    </h3>
                    <p className={`text-xs italic line-clamp-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
                      "{alert['KETERANGAN'] || '-'}"
                    </p>
                    
                    {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                      <div className="mt-4 flex items-center gap-3">
                          <Users size={14} className="text-emerald-600" />
                          <select 
                            className={`text-[11px] font-black border rounded-xl px-4 py-2 bg-transparent outline-none transition-all uppercase tracking-widest ${isRamadhan ? 'border-emerald-800 text-emerald-400 focus:border-amber-500' : 'border-slate-200 text-slate-700'}`}
                            value={selectedTeams[alert.id] || alert['NAMA TEAM'] || ''}
                            onChange={(e) => setSelectedTeams({...selectedTeams, [alert.id]: e.target.value})}
                          >
                            <option value="" className="bg-[#05231b]">- Pilih Team -</option>
                            {teamList.map((t, i) => <option key={i} value={t} className="bg-[#05231b]">{t}</option>)}
                          </select>
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col items-center gap-2 w-full lg:w-auto shrink-0">
                    {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(alert.id, 'SOLVED')} 
                          disabled={processingId === alert.id} 
                          className={`flex-1 lg:w-32 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${isRamadhan ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}
                        >
                          {processingId === alert.id ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14} />} Solved
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(alert.id, 'CANCEL')} 
                          disabled={processingId === alert.id} 
                          className={`flex-1 lg:w-32 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isRamadhan ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                        >
                          {processingId === alert.id ? <RefreshCw size={14} className="animate-spin"/> : <XCircle size={14} />} Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className={`p-5 border-t flex justify-center items-center ${isRamadhan ? 'bg-emerald-950 border-emerald-900' : 'bg-white'}`}>
              <p className="text-[9px] font-black text-emerald-800 uppercase tracking-[0.4em]">NOC Commander Sync • 2026</p>
            </div>
          </div>
        </div>
      )}

      {/* Style Internal untuk Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #065f46; 
          border-radius: 10px; 
        }
      `}</style>
    </>
  );
}