'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, UserPlus, FileText, Network } from 'lucide-react';
import { logActivity } from '@/lib/logger';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// FORM CONTENT
// ─────────────────────────────────────────────
function CreateClientContent() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const nameFromTracker = searchParams.get('name') || '';
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // formData includes Data Teknis & Konfigurasi for the TXT download
  // but they are NOT saved to Supabase (no such column in DB)
  const [formData, setFormData] = useState({
    'ID Pelanggan':   '',
    'Nama Pelanggan': '',
    'ALAMAT':         '',
    'VMAN / VLAN':    '',
    'Near End':       '',
    'Far End':        '',
    'STATUS':         'Active',
    'Kapasitas':      '',
    'RX ONT/SFP':     '',
    'SN ONT/SFP':     '',
    // TXT-only fields (not saved to DB)
    'Data Teknis':    '',
    'Konfigurasi':    '',
  });

  useEffect(() => {
    if (nameFromTracker) {
      setFormData(prev => ({ ...prev, 'Nama Pelanggan': nameFromTracker }));
    }
  }, [nameFromTracker]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const downloadTxt = (data: any, officerName: string) => {
    const content = `Dear All,

Telah diregister dan diluruskan client di bawah ini :

ID Pelanggan            : ${data['ID Pelanggan'] || '-'}
Nama Pelanggan          : ${data['Nama Pelanggan'] || '-'}
Alamat                  : ${data['ALAMAT'] || '-'}
VLAN ID                 : ${data['VMAN / VLAN'] || '-'}
Near End                : ${data['Near End'] || '-'}
Far End                 : ${data['Far End'] || '-'}
Kapasitas               : ${data['Kapasitas'] || '-'}
RX ONT                  : ${data['RX ONT/SFP'] || '-'}
SN ONT                  : ${data['SN ONT/SFP'] || '-'}
Data Pelanggan          : Sudah Ditambahkan
Daftar Vlan             : Sudah Ditambahkan
MRTG                    : Sudah Ditambahkan

Data Teknis :
${data['Data Teknis'] || '-'}

Konfigurasi :
${data['Konfigurasi'] || '-'}

Officer                 : ${officerName}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `Register_${data['Nama Pelanggan'] ? data['Nama Pelanggan'].replace(/\s+/g, '_') : 'Client'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    if (!formData['ID Pelanggan'] || !formData['Nama Pelanggan']) {
      toast.error('Wajib isi ID dan Nama Pelanggan!');
      setSaving(false);
      return;
    }

    // Get current user for Officer field
    const { data: { user } } = await supabase.auth.getUser();
    let officerName = 'System';
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      officerName = profile?.full_name || user.email || 'User';
    }

    // All DB fields including Data Teknis & Konfigurasi
    const dbPayload = {
      'Officer':          officerName,
      'ID Pelanggan':     formData['ID Pelanggan'],
      'Nama Pelanggan':   formData['Nama Pelanggan'],
      'ALAMAT':           formData['ALAMAT'],
      'VMAN / VLAN':      formData['VMAN / VLAN'],
      'Near End':         formData['Near End'],
      'Far End':          formData['Far End'],
      'STATUS':           formData['STATUS'],
      'Kapasitas':        formData['Kapasitas'],
      'RX ONT/SFP':       formData['RX ONT/SFP'],
      'SN ONT/SFP':       formData['SN ONT/SFP'],
      'Data Pelanggan':   'Sudah Ditambahkan',
      'Daftar Vlan':      'Sudah Ditambahkan',
      'MRTG':             'Sudah Ditambahkan',
      'Data Teknis':      formData['Data Teknis'],
      'Konfigurasi':      formData['Konfigurasi'],
    };

    const { error } = await supabase.from('Data Client Corporate').insert([dbPayload]);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
      setSaving(false);
    } else {
      await logActivity({ activity: 'CLIENT_CREATE', subject: formData['Nama Pelanggan'], actor: officerName });
      downloadTxt(formData, officerName);
      toast.success('Client Berhasil Disimpan!', {
        description: 'Laporan TXT sedang diunduh.',
        duration: 4000,
      });
      router.push('/clients');
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-3xl">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
              <UserPlus size={17} />
            </div>
            Input Client Baru
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Pastikan ID Pelanggan unik dan belum terdaftar.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">

        {/* ── GROUP 1: IDENTITAS ── */}
        <FormSection title="Identitas Pelanggan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ID Pelanggan *">
              <input
                name="ID Pelanggan"
                value={formData['ID Pelanggan']}
                onChange={handleChange}
                placeholder="Contoh: 10024"
                required
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="Nama Pelanggan *">
              <input
                name="Nama Pelanggan"
                value={formData['Nama Pelanggan']}
                onChange={handleChange}
                placeholder="Nama PT / Perusahaan"
                required
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <FormField label="Alamat Instalasi">
            <textarea
              name="ALAMAT"
              rows={2}
              value={formData['ALAMAT']}
              onChange={handleChange}
              placeholder="Alamat lengkap lokasi instalasi..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
        </FormSection>

        {/* ── GROUP 2: JARINGAN ── */}
        <FormSection title="Spesifikasi Jaringan">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="VLAN / VMAN">
              <input
                name="VMAN / VLAN"
                value={formData['VMAN / VLAN']}
                onChange={handleChange}
                placeholder="ex: 100"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: '#3b82f6' }}
              />
            </FormField>
            <FormField label="Kapasitas">
              <input
                name="Kapasitas"
                value={formData['Kapasitas']}
                onChange={handleChange}
                placeholder="100 Mbps"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="Sinyal RX (dBm)">
              <input
                name="RX ONT/SFP"
                value={formData['RX ONT/SFP']}
                onChange={handleChange}
                placeholder="-20.5"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="SN ONT/SFP">
              <input
                name="SN ONT/SFP"
                value={formData['SN ONT/SFP']}
                onChange={handleChange}
                placeholder="ZTEGC8..."
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Near End (POP)">
              <input
                name="Near End"
                value={formData['Near End']}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
            <FormField label="Far End (CPE)">
              <input
                name="Far End"
                value={formData['Far End']}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
              />
            </FormField>
          </div>
          <FormField label="Status Awal">
            <select
              name="STATUS"
              value={formData['STATUS']}
              onChange={handleChange}
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

        {/* ── GROUP 3: INFO TAMBAHAN (TXT only) ── */}
        <FormSection title="📄 Informasi Tambahan (untuk Report TXT)">
          <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-muted)', border: '1px solid rgba(59,130,246,0.2)' }}>
            Field ini disimpan ke database dan akan tampil di tombol <strong>Data Teknis</strong> pada halaman detail client.
          </p>
          <FormField label="Data Teknis (Detail)">
            <textarea
              name="Data Teknis"
              rows={5}
              placeholder="Isi detail teknis lainnya di sini..."
              value={formData['Data Teknis']}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-y"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
          <FormField label="Konfigurasi">
            <textarea
              name="Konfigurasi"
              rows={6}
              placeholder="Paste konfigurasi router/switch di sini..."
              value={formData['Konfigurasi']}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-y"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            />
          </FormField>
        </FormSection>

        {/* ── SUBMIT ── */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2"
          style={{ background: saving ? 'var(--bg-elevated)' : '#3b82f6', color: saving ? 'var(--text-muted)' : '#fff' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan Data...' : 'Simpan & Download Report'}
        </button>

      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// PAGE EXPORT
// ─────────────────────────────────────────────
export default function CreateClientPage() {
  return (
    <div className="min-h-screen p-6 md:p-8 flex justify-center items-start" style={{ background: 'var(--bg-base)' }}>
      <Suspense fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-blue)' }} />
        </div>
      }>
        <CreateClientContent />
      </Suspense>
    </div>
  );
}
