'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Trash2, MapPin,
  Loader2, AlertTriangle, Signal, Cpu, Wifi, FileText, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';
import { hasAccess, PERMISSIONS } from '@/lib/permissions';

function ClientDetailContent() {
  const params  = useParams();
  const id      = params.id as string;
  const router  = useRouter();

  const [client, setClient]             = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [deleting, setDeleting]         = useState(false);
  const [userRole, setUserRole]         = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role);
      }
      const { data, error } = await supabase.from('Data Client Corporate').select('*').eq('id', id).single();
      if (error) {
        toast.error('Gagal mengambil data: ' + error.message);
        router.push('/clients');
      } else {
        setClient(data);
      }
      setLoading(false);
    }
    if (id) fetchData();
  }, [id]);

  const executeDelete = async () => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE)) {
      toast.error('Akses Ditolak: Anda tidak memiliki izin menghapus.');
      return;
    }
    setDeleting(true);
    setShowDeleteModal(false);
    const toastId = toast.loading('Menghapus data permanen...');
    const { error } = await supabase.from('Data Client Corporate').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus: ' + error.message, { id: toastId });
      setDeleting(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actorName = profile?.full_name || 'User';
      }
      await logActivity({ activity: 'CLIENT_DELETE', subject: client?.['Nama Pelanggan'] || 'Unknown', actor: actorName });
      toast.success('Client Berhasil Dihapus', { id: toastId });
      router.push('/clients');
      router.refresh();
    }
  };

  const getSignalInfo = (value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return { color: '#64748b', label: '—', bar: 0 };
    if (val > -15)   return { color: '#f59e0b', label: 'High Power',  bar: 95 };
    if (val < -24.5) return { color: '#ef4444', label: 'Low Power',   bar: 20 };
    return                  { color: '#10b981', label: 'Aman SOP',    bar: 70 };
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active')                          return { dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.3)' };
    if (s.includes('suspend') || s.includes('isolir')) return { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
    return { dot: '#94a3b8', bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' };
  };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
    </div>
  );
  if (!client) return (
    <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Data tidak ditemukan.</div>
  );

  const sig    = getSignalInfo(client['RX ONT/SFP']);
  const status = getStatusStyle(client['STATUS']);

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={26} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Hapus Client Permanen?</h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Tindakan ini <span style={{ color: '#ef4444', fontWeight: 600 }}>tidak bisa dibatalkan</span>.<br />
                Data akan hilang selamanya.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors" style={{ background: '#ef4444', color: '#fff' }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── TOP NAV ── */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={16} /> Kembali
          </button>

          {hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE) && (
            <div className="flex gap-2">
              <Link href={`/clients/${id}/edit`}>
                <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = '#3b82f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Pencil size={13} /> Edit Data
                </button>
              </Link>
              <button onClick={() => setShowDeleteModal(true)} disabled={deleting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Memproses...' : 'Hapus'}
              </button>
            </div>
          )}
        </div>

        {/* ── HERO CARD ── */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />
          <div className="p-6 flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{client['Nama Pelanggan']}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                  {client['STATUS'] || 'Unknown'}
                </span>
              </div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID #{client['ID Pelanggan']}</p>
              {client['ALAMAT'] && (
                <p className="text-sm mt-3 flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                  {client['ALAMAT']}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right rounded-xl px-5 py-3" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#3b82f6' }}>Bandwidth</p>
              <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{client['Kapasitas'] || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── INFO GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Network Info */}
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Wifi size={13} /> Informasi Jaringan
            </h3>
            <div className="space-y-3">
              <InfoRow label="VLAN / VMAN"   value={client['VMAN / VLAN']} mono />
              <InfoRow label="Interkoneksi"  value={client['Near End']} />
              <InfoRow label="Last PoP"      value={client['Far End']} />
              <InfoRow label="SN ONT"        value={client['SN ONT']} mono />
            </div>
          </div>

          {/* Signal */}
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Signal size={13} /> Kualitas Redaman
            </h3>
            <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: `${sig.color}12`, border: `1px solid ${sig.color}30` }}>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <Signal size={24} style={{ color: sig.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono" style={{ color: sig.color }}>
                  {client['RX ONT/SFP'] || '—'} <span className="text-sm font-semibold">dBm</span>
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: sig.color }}>Kualitas: {sig.label}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
              <div className="rounded-lg py-1.5" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>Baik<br /><span className="font-mono">&gt; -15 ~ -22</span></div>
              <div className="rounded-lg py-1.5" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Sedang<br /><span className="font-mono">-23 ~ -24</span></div>
              <div className="rounded-lg py-1.5" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Lemah<br /><span className="font-mono">&lt; -25</span></div>
            </div>
          </div>
        </div>

        {/* ── DEVICE INFO ── */}
        {(client['Near End'] || client['Far End']) && (
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Cpu size={13} /> Perangkat
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Interkoneksi</p>
                <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{client['Near End'] || '—'}</p>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Last PoP</p>
                <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{client['Far End'] || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── DATA TEKNIS ── */}
        {client['Data Teknis'] && (
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <FileText size={13} /> Data Teknis
            </h3>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg p-4 font-mono"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
              {client['Data Teknis']}
            </pre>
          </div>
        )}

        {/* ── KONFIGURASI ── */}
        {client['Konfigurasi'] && (
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Settings2 size={13} /> Konfigurasi
            </h3>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg p-4 font-mono"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
              {client['Konfigurasi']}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

// ── HELPER ──
function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`text-xs font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
      </div>
    }>
      <ClientDetailContent />
    </Suspense>
  );
}
