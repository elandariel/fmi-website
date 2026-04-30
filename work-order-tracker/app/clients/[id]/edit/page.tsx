'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, UserCog, Trash2, AlertTriangle } from 'lucide-react';
import { logActivity } from '@/lib/logger';
import { toast } from 'sonner';

function EditClientContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [formData, setFormData] = useState({
    'ID Pelanggan':   '',
    'Nama Pelanggan': '',
    'ALAMAT':         '',
    'VMAN / VLAN':    '',
    'Near End':       '',
    'Far End':        '',
    'STATUS':         '',
    'Kapasitas':      '',
    'RX ONT/SFP':     '',
    'SN ONT':         '',
    'Data Teknis':    '',
    'Konfigurasi':    '',
  });

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('Data Client Corporate')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error('Gagal mengambil data: ' + error.message);
        router.push('/clients');
      } else if (data) {
        setFormData(prev => ({ ...prev, ...data }));
      }
      setLoading(false);
    }
    if (id) fetchData();
  }, [id]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('Data Client Corporate')
      .update({
        'Nama Pelanggan': formData['Nama Pelanggan'],
        'ALAMAT':         formData['ALAMAT'],
        'VMAN / VLAN':    formData['VMAN / VLAN'],
        'Near End':       formData['Near End'],
        'Far End':        formData['Far End'],
        'STATUS':         formData['STATUS'],
        'Kapasitas':      formData['Kapasitas'],
        'RX ONT/SFP':     formData['RX ONT/SFP'],
        'SN ONT':         formData['SN ONT'],
        'Data Teknis':    formData['Data Teknis'],
        'Konfigurasi':    formData['Konfigurasi'],
      })
      .eq('id', id);

    if (error) {
      toast.error('Gagal update: ' + error.message);
      setSaving(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actorName = profile?.full_name || 'User';
      }
      await logActivity({ activity: 'CLIENT_EDIT', subject: formData['Nama Pelanggan'], actor: actorName });
      toast.success('Data Berhasil Diperbarui!');
      router.push(`/clients/${id}`);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setShowDeleteModal(false);
    const { error } = await supabase.from('Data Client Corporate').delete().eq('id', id);
    if (error) {
      toast.error('Gagal hapus: ' + error.message);
      setSaving(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actor = 'System';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actor = profile?.full_name || 'User';
      }
      await logActivity({ activity: 'CLIENT_DELETE', subject: formData['Nama Pelanggan'], actor });
      toast.success('Client Berhasil Dihapus');
      router.push('/clients');
      router.refresh();
    }
  };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
    </div>
  );

  return (
    <div className="w-full max-w-3xl">

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
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                Batal
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg font-semibold text-sm" style={{ background: '#ef4444', color: '#fff' }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <UserCog size={17} />
              </div>
              Edit Data Client
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Perbarui informasi pelanggan.</p>
          </div>
        </div>
        <button onClick={() => setShowDeleteModal(true)} disabled={saving}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
        >
          <Trash2 size={13} /> Hapus
        </button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">

        {/* ── IDENTITAS ── */}
        <FormSection title="Identitas Pelanggan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ID Pelanggan">
              <input name="ID Pelanggan" value={formData['ID Pelanggan'] || ''} readOnly
                className="w-full px-3 py-2 rounded-lg text-sm font-mono cursor-not-allowed"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}
              />
            </FormField>
            <FormField label="Nama Pelanggan *">
              <input name="Nama Pelanggan" value={formData['Nama Pelanggan'] || ''} onChange={handleChange} required
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <FormField label="Alamat Instalasi">
            <textarea name="ALAMAT" rows={2} value={formData['ALAMAT'] || ''} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
        </FormSection>

        {/* ── SPESIFIKASI ── */}
        <FormSection title="Spesifikasi Jaringan">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="VLAN / VMAN">
              <input name="VMAN / VLAN" value={formData['VMAN / VLAN'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: '#3b82f6' }}
              />
            </FormField>
            <FormField label="Kapasitas">
              <input name="Kapasitas" value={formData['Kapasitas'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="Sinyal RX (dBm)">
              <input name="RX ONT/SFP" value={formData['RX ONT/SFP'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="SN ONT">
              <input name="SN ONT" value={formData['SN ONT'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Near End (POP)">
              <input name="Near End" value={formData['Near End'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="Far End (CPE)">
              <input name="Far End" value={formData['Far End'] || ''} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <FormField label="Status Layanan">
            <select name="STATUS" value={formData['STATUS'] || ''} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            >
              <option value="Active">Active</option>
              <option value="Deactive">Berhenti Sementara</option>
              <option value="Berhenti Berlangganan">Berhenti Berlangganan</option>
              <option value="Dismantle">Dismantle</option>
            </select>
          </FormField>
        </FormSection>

        {/* ── INFORMASI TAMBAHAN ── */}
        <FormSection title="📄 Informasi Tambahan">
          <FormField label="Data Teknis (Detail)">
            <textarea name="Data Teknis" rows={5} value={formData['Data Teknis'] || ''} onChange={handleChange}
              placeholder="Isi detail teknis lainnya di sini..."
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-y"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
          <FormField label="Konfigurasi">
            <textarea name="Konfigurasi" rows={6} value={formData['Konfigurasi'] || ''} onChange={handleChange}
              placeholder="Paste konfigurasi router/switch di sini..."
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-y"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
        </FormSection>

        {/* ── SUBMIT ── */}
        <button type="submit" disabled={saving}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2"
          style={{ background: saving ? 'var(--bg-elevated)' : '#f59e0b', color: saving ? 'var(--text-muted)' : '#fff' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan Perubahan...' : 'Update Data Client'}
        </button>

      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
      <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

export default function EditClientPage() {
  return (
    <div className="min-h-screen p-6 md:p-8 flex justify-center items-start" style={{ background: 'var(--bg-base)' }}>
      <Suspense fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
        </div>
      }>
        <EditClientContent />
      </Suspense>
    </div>
  );
}
