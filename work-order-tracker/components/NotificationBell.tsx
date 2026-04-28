'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Bell, AlertTriangle, X, RefreshCw,
  Trash2, ShieldQuestion, Send, ExternalLink,
  Calendar, CheckCircle2, Search, Filter, SlidersHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

// ── Theme-aware type config (uses CSS vars) ──────────────────────
const TYPE_CONFIG: Record<string, {
  accent: string; accentBg: string; accentBorder: string; label: string;
}> = {
  blue:    { accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.12)',  accentBorder: 'rgba(59,130,246,0.3)',  label: 'Pelanggan Baru' },
  red:     { accent: '#ef4444', accentBg: 'rgba(239,68,68,0.12)',   accentBorder: 'rgba(239,68,68,0.3)',   label: 'Berhenti' },
  orange:  { accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)',  accentBorder: 'rgba(245,158,11,0.3)',  label: 'Cuti' },
  emerald: { accent: '#10b981', accentBg: 'rgba(16,185,129,0.12)',  accentBorder: 'rgba(16,185,129,0.3)',  label: 'Upgrade' },
  yellow:  { accent: '#eab308', accentBg: 'rgba(234,179,8,0.12)',   accentBorder: 'rgba(234,179,8,0.3)',   label: 'Downgrade' },
};

const ALL_TYPES = ['Semua', 'Pelanggan Baru', 'Berhenti', 'Cuti', 'Upgrade', 'Downgrade'];

export function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted]               = useState(false);
  const [isOpen, setIsOpen]                 = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedItem, setSelectedItem]     = useState<any>(null);
  const [reason, setReason]                 = useState('');
  const [currentUser, setCurrentUser]       = useState('USER');
  const [userRole, setUserRole]             = useState<Role | null>(null);
  const [loading, setLoading]               = useState(true);
  const [missingItems, setMissingItems]     = useState<any[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeFilter, setActiveFilter]     = useState('Semua');

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
      if (!solvedWO || solvedWO.length === 0) { setMissingItems([]); setLoading(false); return; }

      const rules = [
        { keyword: 'Pelurusan VLAN',                                     targetTable: 'Berlangganan 2026',         targetCol: 'SUBJECT BERLANGGANAN',         label: 'Pelanggan Baru', color: 'blue' },
        { keyword: 'Berhenti Berlangganan',                              targetTable: 'Berhenti Berlangganan 2026', targetCol: 'SUBJECT BERHENTI BERLANGGANAN', label: 'Berhenti',       color: 'red' },
        { keyword: 'Berhenti Sementara',                                 targetTable: 'Berhenti Sementara 2026',   targetCol: 'SUBJECT BERHENTI SEMENTARA',   label: 'Cuti',           color: 'orange' },
        { keyword: ['Upgrade Bandwith', 'Upgrade Kapasitas'],            targetTable: 'Upgrade 2026',              targetCol: 'SUBJECT UPGRADE',              label: 'Upgrade',        color: 'emerald' },
        { keyword: ['Downgrade Bandwith', 'Downgrade Kapasitas'],        targetTable: 'Downgrade 2026',            targetCol: 'SUBJECT DOWNGRADE',            label: 'Downgrade',      color: 'yellow' },
      ];

      for (const rule of rules) {
        const candidates = solvedWO.filter((wo) => {
          const subject = (wo['SUBJECT WO'] || '').toLowerCase();
          return Array.isArray(rule.keyword)
            ? rule.keyword.some(k => subject.includes(k.toLowerCase()))
            : subject.includes(rule.keyword.toLowerCase());
        });
        if (candidates.length > 0) {
          const { data: existingData } = await supabase.from(rule.targetTable).select('*');
          const existingSubjects = new Set(existingData?.map(item => (item[rule.targetCol] || '').toLowerCase().trim()) || []);
          candidates.forEach((wo) => {
            const clean = (wo['SUBJECT WO'] || '').toLowerCase().trim();
            if (!existingSubjects.has(clean) && !ignoredSet.has(clean)) {
              missing.push({ id: wo.id, date: wo['TANGGAL'], subject: wo['SUBJECT WO'], type: rule.label, targetTable: rule.targetTable, themeColor: rule.color });
            }
          });
        }
      }
      setMissingItems(missing);
    } catch (err) {
      console.error('Notification Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Filter + Search ───────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return missingItems.filter(item => {
      const matchType   = activeFilter === 'Semua' || item.type === activeFilter;
      const matchSearch = !q || item.subject.toLowerCase().includes(q) || item.targetTable.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [missingItems, searchQuery, activeFilter]);

  // Count per type untuk badge
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Semua': missingItems.length };
    missingItems.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return counts;
  }, [missingItems]);

  const handleFixData = (subject: string) => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_ADD)) return;
    router.push(`/tracker/create?subject=${encodeURIComponent(subject)}`);
    setIsOpen(false);
  };

  const submitDiscard = async () => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_ADD) || !reason.trim()) return;
    try {
      const { error } = await supabase.from('Ignored_Items').insert({
        SUBJECT_IGNORED: selectedItem.subject,
        ALASAN: reason,
        STATUS: 'PENDING',
        REQUESTED_BY: currentUser,
      });
      if (error) throw error;
      setShowReasonModal(false);
      setReason('');
      checkMissingData();
    } catch (err: any) {
      alert('Gagal discard: ' + err.message);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery('');
    setActiveFilter('Semua');
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── BELL BUTTON ── */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl transition-all"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-mid)', background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
        title="Notifikasi Sinkronisasi"
      >
        <Bell size={14} />
        {!loading && missingItems.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm">
            {missingItems.length > 9 ? '9+' : missingItems.length}
          </span>
        )}
      </button>

      {/* ── NOTIFICATION PANEL ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div
            className="w-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              maxWidth: 720, maxHeight: '88vh',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
              fontFamily: 'var(--font-sans)',
              animation: 'popup-in 0.18s ease-out',
            }}
          >
            {/* ── HEADER ── */}
            <div
              className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <h2 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    Missing Data Sinkronisasi
                  </h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {loading ? 'Memeriksa data...' : missingItems.length > 0
                      ? `${missingItems.length} item perlu ditindaklanjuti · ${filteredItems.length} ditampilkan`
                      : 'Semua data terintegrasi'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={checkMissingData}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── SEARCH + FILTER BAR ── */}
            {missingItems.length > 0 && (
              <div
                className="px-4 py-3 space-y-2.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-elevated)' }}
              >
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Cari subject WO atau tabel tujuan..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-xl text-xs outline-none transition-all"
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-mid)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <SlidersHorizontal size={11} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                  {ALL_TYPES.map(type => {
                    const count = typeCounts[type] ?? 0;
                    if (type !== 'Semua' && count === 0) return null;
                    const isActive = activeFilter === type;
                    // Find color for this type
                    const colorKey = Object.entries(TYPE_CONFIG).find(([, c]) => c.label === type)?.[0];
                    const conf = colorKey ? TYPE_CONFIG[colorKey] : null;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                        style={isActive
                          ? {
                              background: conf ? conf.accentBg : 'var(--accent-bg)',
                              color: conf ? conf.accent : 'var(--accent)',
                              border: `1px solid ${conf ? conf.accentBorder : 'var(--accent-border)'}`,
                            }
                          : {
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-mid)',
                            }
                        }
                      >
                        {type}
                        {count > 0 && (
                          <span className="ml-1 opacity-70">({count})</span>
                        )}
                      </button>
                    );
                  })}
                  {(searchQuery || activeFilter !== 'Semua') && (
                    <button
                      onClick={() => { setSearchQuery(''); setActiveFilter('Semua'); }}
                      className="ml-auto text-[10px] font-semibold transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── LIST ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" style={{ background: 'var(--bg-base)' }}>
              {loading ? (
                <div className="flex flex-col gap-2 pt-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  {missingItems.length === 0 ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <CheckCircle2 size={26} style={{ color: '#10b981' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Database Terintegrasi</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Semua WO sudah tersinkronisasi dengan baik</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)' }}>
                        <Search size={22} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Tidak ada hasil</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {searchQuery ? `Tidak ada yang cocok dengan "${searchQuery}"` : `Tidak ada item tipe "${activeFilter}"`}
                        </p>
                      </div>
                      <button onClick={() => { setSearchQuery(''); setActiveFilter('Semua'); }} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        Reset filter
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const conf = TYPE_CONFIG[item.themeColor] || TYPE_CONFIG.blue;
                  // Highlight search match
                  const highlightSubject = searchQuery
                    ? item.subject.replace(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '|||$1|||')
                    : item.subject;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl p-4 flex items-center justify-between gap-4 transition-all"
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid var(--border-light)`,
                        borderLeft: `3px solid ${conf.accent}`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = conf.accentBorder; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.borderLeftColor = conf.accent; }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-mid)' }}>
                            <Calendar size={9} /> {item.date}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: conf.accentBg, color: conf.accent, border: `1px solid ${conf.accentBorder}` }}>
                            {item.type}
                          </span>
                        </div>
                        <p className="font-semibold text-sm truncate mb-1" style={{ color: 'var(--text-primary)' }}>
                          {searchQuery
                            ? highlightSubject.split('|||').map((part, i) =>
                                part.toLowerCase() === searchQuery.toLowerCase()
                                  ? <mark key={i} style={{ background: `${conf.accentBg}`, color: conf.accent, borderRadius: 3, padding: '0 2px' }}>{part}</mark>
                                  : part
                              )
                            : item.subject
                          }
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Missing di:{' '}
                          <span className="font-bold" style={{ color: conf.accent }}>{item.targetTable}</span>
                        </p>
                      </div>

                      {hasAccess(userRole, PERMISSIONS.CLIENT_ADD) ? (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleFixData(item.subject)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all"
                            style={{ background: conf.accent, color: '#fff' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                          >
                            <ExternalLink size={11} /> Input
                          </button>
                          <button
                            onClick={() => { setSelectedItem(item); setReason(''); setShowReasonModal(true); }}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-mid)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                          >
                            <Trash2 size={11} /> Abaikan
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] italic shrink-0" style={{ color: 'var(--text-muted)' }}>View Only</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── FOOTER ── */}
            {filteredItems.length > 0 && (
              <div
                className="px-5 py-3 flex items-center justify-between shrink-0 text-[11px]"
                style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                <span>Menampilkan <b style={{ color: 'var(--text-primary)' }}>{filteredItems.length}</b> dari <b style={{ color: 'var(--text-primary)' }}>{missingItems.length}</b> item</span>
                <span>Update otomatis setiap 5 menit</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REASON MODAL ── */}
      {showReasonModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowReasonModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', fontFamily: 'var(--font-sans)', animation: 'popup-in 0.18s ease-out' }}
          >
            <div className="px-6 pt-6 pb-4 text-center" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <ShieldQuestion size={22} style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Konfirmasi Abaikan</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Berikan alasan mengapa WO ini diabaikan dari sinkronisasi</p>
            </div>

            <div className="p-5 space-y-4">
              {selectedItem && (
                <div className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)' }}>
                  <p className="text-[10px] font-black uppercase mb-0.5" style={{ color: 'var(--text-muted)' }}>Subject</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedItem.subject}</p>
                </div>
              )}
              <textarea
                placeholder="Kenapa WO ini diabaikan?..."
                className="w-full h-28 rounded-xl p-3 text-xs outline-none resize-none transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-mid)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
                value={reason}
                onChange={e => setReason(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-mid)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                >
                  Batal
                </button>
                <button
                  onClick={submitDiscard}
                  disabled={!reason.trim()}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { if (reason.trim()) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Send size={14} /> Kirim Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
