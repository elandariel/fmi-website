'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle, ChevronLeft, ChevronRight, 
  CheckCircle, X, XCircle, Loader2, Star, Moon
} from 'lucide-react';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Record<number, string>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role as Role);
      }
      const { data: woData } = await supabase.from('Report Bulanan').select('*')
        .in('STATUS', ['PENDING', 'PROGRESS', 'ON PROGRESS', 'OPEN']).order('id', { ascending: false });
      if (woData) setAlerts(woData);
      const { data: teamData } = await supabase.from('Index').select('TEAM').not('TEAM', 'is', null);
      if (teamData) setTeamList(Array.from(new Set(teamData.map((t: any) => t.TEAM))) as string[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const handleUpdateStatus = async (id: number, actionType: string) => {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) return alert("Izin ditolak.");
    const teamName = selectedTeams[id];
    if (actionType === 'SOLVED' && !teamName) return alert('Pilih Team Eksekutor dulu!');
    setProcessingId(id);
    const { error } = await supabase.from('Report Bulanan').update({
      'STATUS': actionType,
      'KETERANGAN': actionType === 'SOLVED' ? 'DONE' : 'CANCELLED',
      'SELESAI ACTION': new Date().toISOString().split('T')[0],
      'NAMA TEAM': teamName || 'System'
    }).eq('id', id);
    if (!error) {
      setAlerts(prev => prev.filter(item => item.id !== id));
      if (alerts.length <= 1) setIsModalOpen(false);
    }
    setProcessingId(null);
  };

  if (loading || alerts.length === 0) return null;
  const item = alerts[currentIndex];
  
  return (
    <div className="w-full block"> 
      {/* BOX UTAMA */}
      <div className="bg-[#0a1f12] rounded-[2.5rem] border border-emerald-500/20 overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        {/* Indikator Samping */}
        <div className="w-full md:w-3 bg-gradient-to-b from-amber-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.3)]"></div>
        
        <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20 text-amber-500 shadow-inner">
              <AlertTriangle size={28} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">Urgent WO</span>
                <span className="text-[10px] font-bold text-emerald-500/40 uppercase">{currentIndex + 1} / {alerts.length}</span>
              </div>
              <h3 className="text-white font-black text-xl md:text-2xl leading-tight uppercase tracking-tight line-clamp-1">{item['SUBJECT WO']}</h3>
              <p className="text-emerald-500/50 text-xs italic mt-2 border-l-2 border-emerald-500/20 pl-3">"{item['KETERANGAN'] || 'No additional info'}"</p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
            <div className="flex bg-black/40 rounded-2xl p-1 border border-emerald-500/10 flex-1 md:flex-none justify-center">
              <button onClick={() => setCurrentIndex(p => (p - 1 + alerts.length) % alerts.length)} className="p-3 hover:text-white text-emerald-600 transition-colors"><ChevronLeft size={24}/></button>
              <button onClick={() => setCurrentIndex(p => (p + 1) % alerts.length)} className="p-3 hover:text-white text-emerald-600 transition-colors"><ChevronRight size={24}/></button>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-b-4 border-emerald-800 transition-all active:scale-95 shadow-xl">
              Cek Semua ({alerts.length})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL (Fixed, Outside Flow) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#051109]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a1f12] border border-emerald-500/20 w-full max-w-5xl max-h-[85vh] rounded-[3rem] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-emerald-500/10 flex justify-between items-center bg-emerald-950/20">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-2xl shadow-lg"><Star className="text-[#0a1f12]" fill="currentColor" size={24} /></div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Antrean Pekerjaan</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-emerald-500 hover:text-white p-2 transition-colors"><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-[#051109] border border-emerald-500/10 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-emerald-500/30 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg">#{alert.id}</span>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">{alert.STATUS}</span>
                    </div>
                    <h4 className="text-white font-black text-lg uppercase tracking-tight">{alert['SUBJECT WO']}</h4>
                    {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase">Team:</span>
                        <select 
                          className="bg-[#0a1f12] border border-emerald-500/20 text-emerald-400 text-xs rounded-xl px-4 py-2 outline-none focus:border-amber-500 transition-all"
                          value={selectedTeams[alert.id] || alert['NAMA TEAM'] || ''}
                          onChange={(e) => setSelectedTeams({...selectedTeams, [alert.id]: e.target.value})}
                        >
                          <option value="">Pilih Team Eksekutor</option>
                          {teamList.map((t, i) => <option key={i} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 w-full md:w-auto shrink-0">
                    <button onClick={() => handleUpdateStatus(alert.id, 'SOLVED')} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-500 transition-all">Solved</button>
                    <button onClick={() => handleUpdateStatus(alert.id, 'CANCEL')} className="flex-1 md:flex-none bg-rose-500/10 text-rose-500 border border-rose-500/20 px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all">Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}