'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Trash2, MapPin,
  Loader2, AlertTriangle, Signal, Cpu, Wifi, FileText, X,
  CheckCircle2, User2
} from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';
import { hasAccess, PERMISSIONS } from '@/lib/permissions';

function ClientDetailContent() {
  const params  = useParams();
  const id      = params.id as string;
  const router  = useRouter();

  const [client, setClient]                   = useState<any>(null);
  const [loading, setLoading]                 = useState(true);
  const [deleting, setDeleting]               = useState(false);
  const [userRole, setUserRole]               = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDataTeknis, setShowDataTeknis]   = useState(false);

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
    if (s === 'active')
      return { dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.3)' };
    if (s === 'deactive' || s.includes('berhenti') || s === 'dismantle')
      return { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
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

  // Build formatted text for "Data Teknis" modal
  const dataTeknisTxt = `Dear All,

Telah diregister dan diluruskan client di bawah ini :

ID Pelanggan            : ${client['ID Pelanggan'] || '-'}
Nama Pelanggan          : ${client['Nama Pelanggan'] || '-'}
Alamat                  : ${client['ALAMAT'] || '-'}
VLAN ID                 : ${client['VMAN / VLAN'] || '-'}
Near End                : ${client['Near End'] || '-'}
Far End                 : ${client['Far End'] || '-'}
Kapasitas               : ${client['Kapasitas'] || '-'}
RX ONT                  : ${client['RX ONT/SFP'] || '-'}
SN ONT                  : ${client['SN ONT/SFP'] || '-'}
Data Pelanggan          : ${client['Data Pelanggan'] || 'Sudah Ditambahkan'}
Daftar Vlan             : ${client['Daftar Vlan'] || 'Sudah Ditambahkan'}
MRTG                    : ${client['MRTG'] || 'Sudah Ditambahkan'}`;

  const handleDownloadTxt = () => {
    const blob = new Blob([dataTeknisTxt], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `Register_${(client['Nama Pelanggan'] || 'Client').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {/* ── DATA TEKNIS MODAL ── */}
      {showDataTeknis && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDataTeknis(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
            {/* Header strip */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)' }} />

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <FileText size={16} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Data Teknis Client</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{client['Nama Pelanggan']}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDataTeknis(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Data rows */}
            <div className="px-5 py-4 space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <DataRow label="ID Pelanggan"  value={client['ID Pelanggan']} mono />
              <DataRow label="Nama Pelanggan" value={client['Nama Pelanggan']} />
              <DataRow label="Alamat"         value={client['ALAMAT']} />
              <DataRow label="VLAN ID"        value={client['VMAN / VLAN']} mono />
              <DataRow label="Near End"       value={client['Near End']} mono />
              <DataRow label="Far End"        value={client['Far End']} mono />
              <DataRow label="Kapasitas"      value={client['Kapasitas']} />
              <DataRow label="RX ONT/SFP"     value={client['RX ONT/SFP']} mono />
              <DataRow label="SN ONT/SFP"     value={client['SN ONT/SFP']} mono />
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                <DataRow label="Data Pelanggan" value={client['Data Pelanggan'] || 'Sudah Ditambahkan'} badge="#10b981" />
                <DataRow label="Daftar Vlan"    value={client['Daftar Vlan']    || 'Sudah Ditambahkan'} badge="#10b981" />
                <DataRow label="MRTG"           value={client['MRTG']           || 'Sudah Ditambahkan'} badge="#10b981" />
              </div>
              {client['Officer'] && (
                <div className="pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <DataRow label="Officer" value={client['Officer']} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)' }}>
              <button
                onClick={() => setShowDataTeknis(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
              >
                Tutup
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                style={{ background: '#3b82f6', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <FileText size={12} /> Download TXT
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

          <div className="flex gap-2">
            {/* Data Teknis Button — always visible */}
            <button
              onClick={() => setShowDataTeknis(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
            >
              <FileText size={13} /> Data Teknis
            </button>

            {hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE) && (
              <>
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
              </>
            )}
          </div>
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
              {client['Officer'] && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <User2 size={11} /> Officer: {client['Officer']}
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
              <InfoRow label="VLAN / VMAN"  value={client['VMAN / VLAN']} mono />
              <InfoRow label="Near End"     value={client['Near End']} />
              <InfoRow label="Far End"      value={client['Far End']} />
              <InfoRow label="SN ONT/SFP"   value={client['SN ONT/SFP']} mono />
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
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Near End (POP)</p>
                <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{client['Near End'] || '—'}</p>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Far End (CPE)</p>
                <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{client['Far End'] || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STATUS LAYANAN ── */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <CheckCircle2 size={13} /> Status Layanan
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Data Pelanggan', value: client['Data Pelanggan'] },
              { label: 'Daftar Vlan',   value: client['Daftar Vlan']   },
              { label: 'MRTG',          value: client['MRTG']          },
              { label: 'Status',        value: client['STATUS']        },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-xs font-semibold" style={{ color: value ? '#10b981' : 'var(--text-muted)' }}>{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── HELPERS ──
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

function DataRow({ label, value, mono, badge }: { label: string; value?: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
      {badge ? (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${badge}18`, color: badge, border: `1px solid ${badge}33` }}>
          {value || '—'}
        </span>
      ) : (
        <span className={`text-xs font-semibold text-right ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>
          {value || '—'}
        </span>
      )}
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
