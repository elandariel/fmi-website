'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle, ChevronLeft, ChevronRight, 
  Calendar, CheckCircle2, X, XCircle, CheckCircle, Loader2, ShieldAlert,
  Plus, ExternalLink 
} from 'lucide-react';
// FIX: Tambahkan import Link di bawah ini
import Link from 'next/link'; 
import { format, differenceInDays } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export default function AlertBanner() {
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

      // Ambil WO Pending & Progress dari Report Bulanan (Tabel 1)
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

  // Fungsi Solved Langsung dari Banner
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

  if (loading) return <div className="h-28 bg-white rounded-xl shadow-sm animate-pulse mb-8"></div>;

  if (alerts.length === 0) return null;

  const item = alerts[currentIndex];
  const targetDate = extractDateFromText(item['KETERANGAN'], item['TANGGAL']);
  const diffDays = today ? differenceInDays(today, targetDate) : 0; 
  
  return (
    <>
      {/* BANNER UTAMA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-rose-600"></div>
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
               <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border border-rose-200">
                  <AlertTriangle size={12} /> URGENT WO
               </span>
               <span className="text-[10px] font-mono text-slate-400">{currentIndex + 1} / {alerts.length}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 truncate">{item['SUBJECT WO']}</h3>
            <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">"{item['KETERANGAN'] || '-'}"</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <button 
                    onClick={() => setCurrentIndex(p => (p - 1 + alerts.length) % alerts.length)} 
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-900 transition-colors"
                  >
                    <ChevronLeft size={16}/>
                  </button>

                  <button 
                    onClick={() => setCurrentIndex(p => (p + 1) % alerts.length)} 
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-900 transition-colors"
                  >
                    <ChevronRight size={16}/>
                  </button>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs shadow-md">Lihat Semua ({alerts.length})</button>
          </div>
        </div>
      </div>

      {/* MODAL LIHAT SEMUA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={24} /> Antrean WO Pending & Progress
                </h2>
                <p className="text-sm text-slate-500 mt-1">Total {alerts.length} item membutuhkan tindakan segera.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100/50 flex-1 space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-amber-50 text-amber-700 border-amber-200">{alert['STATUS']}</span>
                      <span className="text-xs text-slate-400 font-mono">#{alert.id}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">{alert['SUBJECT WO']}</h3>
                    <p className="text-xs text-slate-500 mt-1 italic">"{alert['KETERANGAN'] || '-'}"</p>
                    
                    {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                      <div className="mt-3 flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-500">Pilih Team:</span>
                         <select className="text-xs border rounded px-2 py-1 bg-slate-50 text-slate-700 outline-none"
                           value={selectedTeams[alert.id] || alert['NAMA TEAM'] || ''}
                           onChange={(e) => setSelectedTeams({...selectedTeams, [alert.id]: e.target.value})}
                         >
                           <option value="">- Pilih Eksekutor -</option>
                           {teamList.map((t, i) => <option key={i} value={t}>{t}</option>)}
                         </select>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex gap-2">
                      {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                        <>
                          <button onClick={() => handleUpdateStatus(alert.id, 'CANCEL')} disabled={processingId === alert.id} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded border border-rose-200 flex items-center gap-1">
                            {processingId === alert.id ? <Loader2 size={12} className="animate-spin"/> : <XCircle size={12} />} Cancel
                          </button>
                          <button onClick={() => handleUpdateStatus(alert.id, 'SOLVED')} disabled={processingId === alert.id} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-200 flex items-center gap-1">
                            {processingId === alert.id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12} />} Solved
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t flex justify-between items-center">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}