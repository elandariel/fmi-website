'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Bell, AlertTriangle, X, RefreshCw, 
  Trash2, ShieldQuestion, User, Send, ExternalLink, Calendar, CheckCircle,
  Moon, Star, Database
} from 'lucide-react'; // Saya pastikan hanya pakai icon yang sudah ada
import { useRouter } from 'next/navigation';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export function NotificationBell() {
  const isRamadhan = true; 
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [currentUser, setCurrentUser] = useState<string>('USER');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'USER';
      setCurrentUser(name.toUpperCase());
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role as Role);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUserData();
    checkMissingData();
    const interval = setInterval(checkMissingData, 300000);
    return () => clearInterval(interval);
  }, []);

  const checkMissingData = async () => {
    setLoading(true);
    const missing: any[] = [];
    try {
      const { data: ignoredData } = await supabase.from('Ignored_Items').select('SUBJECT_IGNORED');
      const ignoredSet = new Set(ignoredData?.map(i => i.SUBJECT_IGNORED?.toLowerCase().trim()) || []);
      const { data: solvedWO } = await supabase.from('Report Bulanan').select('*').eq('STATUS', 'SOLVED');

      if (!solvedWO || solvedWO.length === 0) {
        setMissingItems([]);
        setLoading(false);
        return;
      }

      const rules = [
        { keyword: 'Pelurusan VLAN', targetTable: 'Berlangganan 2026', targetCol: 'SUBJECT BERLANGGANAN', label: 'Pelanggan Baru', color: 'blue' },
        { keyword: 'Berhenti Berlangganan', targetTable: 'Berhenti Berlangganan 2026', targetCol: 'SUBJECT BERHENTI BERLANGGANAN', label: 'Berhenti', color: 'red' },
        { keyword: 'Berhenti Sementara', targetTable: 'Berhenti Sementara 2026', targetCol: 'SUBJECT BERHENTI SEMENTARA', label: 'Cuti', color: 'orange' },
        { keyword: ['Upgrade Bandwith', 'Upgrade Kapasitas'], targetTable: 'Upgrade 2026', targetCol: 'SUBJECT UPGRADE', label: 'Upgrade', color: 'emerald' },
        { keyword: ['Downgrade Bandwith', 'Downgrade Kapasitas'], targetTable: 'Downgrade 2026', targetCol: 'SUBJECT DOWNGRADE', label: 'Downgrade', color: 'yellow' }
      ];

      for (const rule of rules) {
        const candidates = solvedWO.filter((wo) => {
          const subject = (wo['SUBJECT WO'] || '').toLowerCase();
          return Array.isArray(rule.keyword) ? rule.keyword.some(k => subject.includes(k.toLowerCase())) : subject.includes(rule.keyword.toLowerCase());
        });

        if (candidates.length > 0) {
          const { data: existingData } = await supabase.from(rule.targetTable).select('*');
          const existingSubjects = new Set(existingData?.map((item) => (item[rule.targetCol] || '').toLowerCase().trim()) || []);

          candidates.forEach((wo) => {
            const woSubjectClean = (wo['SUBJECT WO'] || '').toLowerCase().trim();
            if (!existingSubjects.has(woSubjectClean) && !ignoredSet.has(woSubjectClean)) {
              missing.push({
                id: wo.id,
                date: wo['TANGGAL'],
                subject: wo['SUBJECT WO'],
                type: rule.label,
                targetTable: rule.targetTable,
                themeColor: rule.color
              });
            }
          });
        }
      }
      setMissingItems(missing);
    } catch (err) { console.error("Notification Error:", err); } finally { setLoading(false); }
  };

  const handleFixData = (subject: string) => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_ADD)) return;
    const encodedSubject = encodeURIComponent(subject);
    router.push(`/tracker/create?subject=${encodedSubject}`);
    setIsOpen(false);
  };

  const submitDiscard = async () => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_ADD)) return;
    if (!reason.trim()) return;
    try {
      const { error } = await supabase.from('Ignored_Items').insert({
        SUBJECT_IGNORED: selectedItem.subject,
        ALASAN: reason,
        STATUS: 'PENDING',
        REQUESTED_BY: currentUser
      });
      if (error) throw error;
      setShowReasonModal(false);
      setReason('');
      checkMissingData();
    } catch (err: any) { alert("Gagal discard: " + err.message); }
  };

  const getStatusColor = (color: string) => {
    const colors: any = { 
      blue: 'border-blue-500 text-blue-400 bg-blue-500/10', 
      red: 'border-red-500 text-red-400 bg-red-500/10', 
      orange: 'border-orange-500 text-orange-400 bg-orange-500/10', 
      emerald: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', 
      yellow: 'border-amber-500 text-amber-400 bg-amber-500/10' 
    };
    return colors[color] || 'border-emerald-800 text-emerald-400';
  };

  if (!mounted) return null;

  return (
    <>
      {/* BELL TRIGGER - TAMPILAN HEADER */}
      <button onClick={() => setIsOpen(true)} className={`relative p-2.5 rounded-xl transition-all active:scale-95 duration-200 mr-2 group border ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400 hover:bg-emerald-800 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
        <Bell size={20} className={missingItems.length > 0 ? 'animate-bounce' : ''} />
        {!loading && missingItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500 text-[10px] font-black text-black shadow-lg">
            {missingItems.length}
          </span>
        )}
      </button>

      {/* MAIN NOTIFICATION MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#020c09]/90 backdrop-blur-md">
          <div className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border ${isRamadhan ? 'bg-[#041a14] border-emerald-800' : 'bg-white border-slate-200'}`}>
            
            {/* HEADER MODAL */}
            <div className={`px-6 py-5 flex items-center justify-between shrink-0 border-b ${isRamadhan ? 'bg-emerald-900/30 border-emerald-800' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <Moon size={20} className="text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h2 className={`text-lg font-black uppercase tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-white'}`}>
                    Missing Data Sinkronisasi
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Pengecekan Rutin Database NOC</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => checkMissingData()} className="p-2.5 rounded-xl bg-emerald-800/50 text-emerald-400 hover:text-white border border-emerald-700">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${isRamadhan ? 'bg-[#031510]' : 'bg-slate-50'}`}>
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="text-amber-500 animate-spin" size={40} />
                  <p className="text-emerald-700 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Memindai Database...</p>
                </div>
              ) : missingItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
                  <CheckCircle size={48} className="text-emerald-400" />
                  <h3 className="text-emerald-50 font-black uppercase text-sm">Semua Data Terintegrasi!</h3>
                </div>
              ) : (
                missingItems.map((item, idx) => (
                  <div key={idx} className={`rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all ${isRamadhan ? 'bg-[#05231b] border-emerald-800/50 hover:border-amber-500/50' : 'bg-white border-slate-200'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                          <Calendar size={12} /> {item.date}
                        </span>
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${getStatusColor(item.themeColor)}`}>
                          {item.type}
                        </span>
                      </div>
                      <h3 className={`text-sm md:text-base font-bold leading-relaxed mb-3 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                        {item.subject}
                      </h3>
                      <p className="text-[10px] font-bold text-emerald-700 italic">
                        Missing di: <span className="text-amber-500 uppercase ml-1">{item.targetTable}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {hasAccess(userRole, PERMISSIONS.CLIENT_ADD) ? (
                        <>
                          <button onClick={() => handleFixData(item.subject)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg">
                            <ExternalLink size={14} /> Input
                          </button>
                          <button onClick={() => { setSelectedItem(item); setReason(''); setShowReasonModal(true); }} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20">
                            <Trash2 size={18} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full md:w-32 py-3 bg-emerald-950/50 rounded-xl border border-dashed border-emerald-800 text-center text-[9px] font-black text-emerald-800 uppercase italic">
                          View Only
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALASAN */}
      {showReasonModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#020c09]/95 backdrop-blur-xl">
          <div className="w-full max-w-lg bg-[#041a14] rounded-[2.5rem] p-10 text-center border border-emerald-800">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
              <ShieldQuestion size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase mb-2 text-emerald-50">Konfirmasi Abaikan</h3>
            <div className="rounded-[2rem] p-6 border-2 mb-8 bg-emerald-950/50 border-emerald-800">
              <textarea 
                placeholder="Kenapa WO ini diabaikan?..."
                className="w-full h-32 bg-transparent rounded-2xl p-2 text-sm font-bold outline-none text-emerald-50"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowReasonModal(false)} className="py-4 rounded-2xl bg-emerald-900/50 text-emerald-500 font-black text-xs uppercase">Batal</button>
              <button onClick={submitDiscard} disabled={!reason.trim()} className="py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2">
                <Send size={16} /> Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}