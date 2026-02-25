'use client';

// Tetap pertahankan ini biar aman
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'; 
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, UserPlus, FileText } from 'lucide-react';

// Import Logger Helper
import { logActivity } from '@/lib/logger';

// --- 1. IMPORT TOAST (SONNER) ---
import { toast } from 'sonner';

// --- BAGIAN 1: LOGIKA FORM DIPISAH KE SINI ---
function CreateClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  
  // Ambil nama dari URL (jika ada kiriman dari Tracker)
  const nameFromTracker = searchParams.get('name') || '';

  const [saving, setSaving] = useState(false);

  // Setup Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // State Form
  const [formData, setFormData] = useState({
    'ID Pelanggan': '',
    'Nama Pelanggan': '',
    'ALAMAT': '',
    'VMAN / VLAN': '',
    'Near End': '',
    'Far End': '',
    'STATUS': 'Active', 
    'Kapasitas': '',
    'RX ONT/SFP': '',
    'SN ONT': '',       // Input Tambahan (TXT Only)
    'Data Teknis': '',  // Input Tambahan (TXT Only)
    'Konfigurasi': ''   // Input Tambahan (TXT Only)
  });

  // Effect: Isi nama otomatis jika ada data dari Tracker
  useEffect(() => {
    if (nameFromTracker) {
      setFormData(prev => ({ ...prev, 'Nama Pelanggan': nameFromTracker }));
    }
  }, [nameFromTracker]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- FUNGSI GENERATE & DOWNLOAD TXT ---
  const downloadTxt = (data: any) => {
    // Format Template
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
SN ONT                  : ${data['SN ONT'] || '-'}
Data Pelanggan          : Sudah Ditambahkan
Daftar Vlan             : Sudah Ditambahkan
MRTG                    : Sudah Ditambahkan

Data Teknis : 
${data['Data Teknis'] || '-'}

Konfigurasi : 
${data['Konfigurasi'] || '-'}
`;

    // Proses Download File
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Nama file: Register_NamaPT.txt (Spasi diganti underscore)
    const fileName = `Register_${data['Nama Pelanggan'] ? data['Nama Pelanggan'].replace(/\s+/g, '_') : 'Client'}.txt`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    // Validasi Sederhana (GANTI ALERT JADI TOAST ERROR)
    if (!formData['ID Pelanggan'] || !formData['Nama Pelanggan']) {
      toast.error('Wajib isi ID dan Nama Pelanggan!', {
        position: 'top-center'
      });
      setSaving(false);
      return;
    }

    // Persiapan Data untuk Database
    const dbPayload = {
        'ID Pelanggan': formData['ID Pelanggan'],
        'Nama Pelanggan': formData['Nama Pelanggan'],
        'ALAMAT': formData['ALAMAT'],
        'VMAN / VLAN': formData['VMAN / VLAN'],
        'Near End': formData['Near End'],
        'Far End': formData['Far End'],
        'STATUS': formData['STATUS'],
        'Kapasitas': formData['Kapasitas'],
        'RX ONT/SFP': formData['RX ONT/SFP'],
    };

    // Eksekusi Simpan ke Supabase
    const { error } = await supabase
      .from('Data Client Corporate')
      .insert([dbPayload]); 

    if (error) {
      // GANTI ALERT JADI TOAST ERROR
      toast.error('Gagal menyimpan: ' + error.message);
      setSaving(false);
    } else {
      
      // --- INTEGRASI LOGGER (DB + TELEGRAM) ---
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if(user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actorName = profile?.full_name || user.email || 'User';
      }

      await logActivity({
        activity: 'Input Client Corp', 
        subject: formData['Nama Pelanggan'],
        actor: actorName
      });

      // --- DOWNLOAD TXT & REDIRECT ---
      downloadTxt(formData); 

      // GANTI ALERT JADI TOAST SUKSES
      toast.success('Client Berhasil Disimpan!', {
        description: 'Laporan TXT sedang diunduh & Notifikasi terkirim.',
        duration: 4000, // Muncul selama 4 detik
      });

      router.push('/clients'); 
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8 border-b pb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="text-blue-600" /> Input Client Baru
          </h1>
          <p className="text-sm text-slate-500">Pastikan ID Pelanggan unik dan belum terdaftar.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* GROUP 1: IDENTITAS UTAMA */}
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Identitas Pelanggan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ID Pelanggan <span className="text-red-500">*</span></label>
              <input 
                name="ID Pelanggan" 
                value={formData['ID Pelanggan']} 
                onChange={handleChange}
                placeholder="Contoh: 10024"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pelanggan <span className="text-red-500">*</span></label>
              <input 
                name="Nama Pelanggan" 
                value={formData['Nama Pelanggan']} 
                onChange={handleChange}
                placeholder="Nama PT / Perusahaan"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" 
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1">Alamat Instalasi</label>
            <textarea 
              name="ALAMAT" 
              rows={2}
              value={formData['ALAMAT']} 
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
            ></textarea>
          </div>
        </div>

        {/* GROUP 2: SPESIFIKASI JARINGAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">VLAN / VMAN</label>
            <input 
              name="VMAN / VLAN" 
              value={formData['VMAN / VLAN']} 
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-600" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas</label>
            <input 
              name="Kapasitas" 
              value={formData['Kapasitas']} 
              onChange={handleChange}
              placeholder="ex: 100 Mbps"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sinyal RX (dBm)</label>
            <input 
              name="RX ONT/SFP" 
              value={formData['RX ONT/SFP']} 
              onChange={handleChange}
              placeholder="-20.5"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">SN ONT</label>
            <input 
              name="SN ONT" 
              value={formData['SN ONT']} 
              onChange={handleChange}
              placeholder="ZTEGC8..."
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700" 
            />
          </div>
        </div>

        {/* GROUP 3: PERANGKAT & STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perangkat Near End (POP)</label>
            <input 
              name="Near End" 
              value={formData['Near End']} 
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perangkat Far End (CPE)</label>
            <input 
              name="Far End" 
              value={formData['Far End']} 
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status Awal</label>
          <select 
            name="STATUS" 
            value={formData['STATUS']} 
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
          >
            <option value="Active">Active</option>
            <option value="Suspend">Suspend</option>
            <option value="Isolir">Isolir</option>
            <option value="Dismantle">Dismantle</option>
          </select>
        </div>

        {/* GROUP 4: INFORMASI TAMBAHAN (UNTUK TXT) */}
        <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 uppercase mb-4 tracking-wider flex items-center gap-2">
             <FileText size={16}/> Informasi Tambahan (Report TXT)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Data Teknis (Detail)</label>
              <textarea 
                name="Data Teknis" 
                rows={3}
                placeholder="Isi detail teknis lainnya di sini..."
                value={formData['Data Teknis']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm font-mono" 
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Konfigurasi</label>
              <textarea 
                name="Konfigurasi" 
                rows={3}
                placeholder="Paste konfigurasi router/switch di sini..."
                value={formData['Konfigurasi']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm font-mono" 
              ></textarea>
            </div>
          </div>
        </div>

        {/* TOMBOL SAVE */}
        <div className="pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg hover:shadow-blue-500/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Menyimpan Data...' : 'Simpan & Download Report'}
          </button>
        </div>

      </form>
    </div>
  );
}

// --- BAGIAN 2: EXPORT DEFAULT (PEMBUNGKUS) ---
export default function CreateClientPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans">
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
        <CreateClientContent />
      </Suspense>
    </div>
  );
}