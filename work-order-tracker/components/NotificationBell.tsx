'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Bell, AlertTriangle, X, RefreshCw, 
  Trash2, ShieldQuestion, User, Send, ExternalLink, Calendar, CheckCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions'; // Import satpam

export function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [currentUser, setCurrentUser] = useState<string>('USER');
  const [userRole, setUserRole] = useState<Role | null>(null); // State untuk Role
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

      // AMBIL ROLE DARI PROFILES
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
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

      const { data: solvedWO } = await supabase
        .from('Report Bulanan')
        .select('*')
        .eq('STATUS', 'SOLVED');

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
    } catch (err) {
      console.error("Notification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixData = (subject: string) => {
    // PROTEKSI FUNGSI
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_ADD)) return;

    const encodedSubject = encodeURIComponent(subject);
    router.push(`/tracker/create?subject=${encodedSubject}`);
    setIsOpen(false);
  };

  const submitDiscard = async () => {
    // PROTEKSI FUNGSI
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
    } catch (err: any) {
      alert("Gagal discard: " + err.message);
    }
  };

  const getBorderColor = (color: string) => {
    const colors: any = { 
      blue: 'border-blue-500', red: 'border-red-500', orange: 'border-orange-500', 
      emerald: 'border-emerald-500', yellow: 'border-yellow-500' 
    };
    return colors[color] || 'border-slate-300';
  };

  if (!mounted) return null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="relative p-2.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 active:scale-95 duration-200 mr-4 group">
        <Bell size={24} />
        {!loading && missingItems.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-pulse">
            {missingItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
            
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500" />
                <h2 className="text-lg font-bold text-white uppercase">Missing Data Sinkronisasi</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => checkMissingData()} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 font-bold italic">Memindai Database...</div>
              ) : missingItems.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <CheckCircle size={40} className="text-emerald-500" />
                  <p className="font-bold uppercase tracking-widest text-[10px]">Database Terintegrasi!</p>
                </div>
              ) : (
                missingItems.map((item, idx) => (
                  <div key={idx} className={`bg-white rounded-xl border-l-4 ${getBorderColor(item.themeColor)} border-t border-r border-b border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          <Calendar size={12} /> {item.date}
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-600 uppercase">
                          {item.type}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 leading-tight mb-2">{item.subject}</h3>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 italic">Missing di tabel:</span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{item.targetTable}</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS DENGAN SATPAM */}
                    <div className="flex flex-col gap-2 shrink-0 min-w-[100px]">
                      {hasAccess(userRole, PERMISSIONS.CLIENT_ADD) ? (
                        <>
                          <button 
                            onClick={() => handleFixData(item.subject)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] shadow-md transition-all uppercase tracking-wide"
                          >
                            <ExternalLink size={12} /> Input
                          </button>
                          <button 
                            onClick={() => { setSelectedItem(item); setReason(''); setShowReasonModal(true); }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg font-black text-[10px] transition-all uppercase border border-slate-100"
                          >
                            <Trash2 size={16} /> Abaikan
                          </button>
                        </>
                      ) : (
                        <div className="text-center px-2 py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          <p className="text-[9px] font-black text-slate-400 uppercase italic">View Only</p>
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

      {/* MODAL ALASAN (CS TIDAK AKAN BISA LIHAT INI JUGA) */}
      {showReasonModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ShieldQuestion size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase mb-2">Konfirmasi Alasan</h3>
            <div className="bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-100 mb-8 text-left">
              <textarea 
                placeholder="Kenapa WO ini diabaikan?..."
                className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowReasonModal(false)} className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase">Batal</button>
              <button onClick={submitDiscard} disabled={!reason.trim()} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2">
                <Send size={16} /> Kirim Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}