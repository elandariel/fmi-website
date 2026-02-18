'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'; 
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Save, ArrowLeft, Loader2, UserPlus, FileText, 
  Moon, Star, Info, Database, Zap 
} from 'lucide-react';

// Import Logger Helper
import { logActivity } from '@/lib/logger';

// --- IMPORT TOAST (SONNER) ---
import { toast } from 'sonner';

function CreateClientContent() {
  const isRamadhan = true; // SAKLAR TEMA
  const router = useRouter();
  const searchParams = useSearchParams(); 
  
  const nameFromTracker = searchParams.get('name') || '';
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

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
    'SN ONT': '', 
    'Data Teknis': '',
    'Konfigurasi': '' 
  });

  useEffect(() => {
    if (nameFromTracker) {
      setFormData(prev => ({ ...prev, 'Nama Pelanggan': nameFromTracker }));
    }
  }, [nameFromTracker]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const downloadTxt = (data: any) => {
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

Data Teknis : 
${data['Data Teknis'] || '-'}

Konfigurasi : 
${data['Konfigurasi'] || '-'}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `Register_${data['Nama Pelanggan'] ? data['Nama Pelanggan'].replace(/\s+/g, '_') : 'Client'}.txt`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    if (!formData['ID Pelanggan'] || !formData['Nama Pelanggan']) {
      toast.error('Wajib isi ID dan Nama Pelanggan!', { position: 'top-center' });
      setSaving(false);
      return;
    }

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

    const { error } = await supabase.from('Data Client Corporate').insert([dbPayload]); 

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
      setSaving(false);
    } else {
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

      downloadTxt(formData); 
      toast.success('Mubarak! Client Berhasil Disimpan', {
        description: 'Laporan TXT diunduh & Log terkirim.',
        duration: 4000,
      });

      router.push('/clients'); 
      router.refresh();
    }
  };

  return (
    <div className={`w-full max-w-4xl rounded-[2.5rem] shadow-2xl border transition-all duration-500 overflow-hidden ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-emerald-900/20' : 'bg-white border-slate-200'}`}>
      
      {/* DECORATIVE HEADER */}
      <div className={`p-8 relative overflow-hidden border-b ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-slate-50 border-slate-100'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Moon size={100} className="text-amber-500 rotate-12" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className={`p-3 rounded-2xl transition-all ${isRamadhan ? 'bg-[#020c09] text-emerald-500 hover:text-amber-500 border border-emerald-800' : 'hover:bg-slate-200 text-slate-500'}`}>
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <div>
              <h1 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                <UserPlus className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} /> Registrasi <span className={isRamadhan ? 'text-amber-500' : ''}>Client</span>
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
                Tambahkan Data Pelanggan Baru ke Database
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${isRamadhan ? 'bg-[#020c09]/50 border-emerald-800 text-amber-500' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
             <Star size={16} className="fill-current" />
             <span className="text-[10px] font-black uppercase tracking-widest">Ramadhan Edition</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-8 space-y-8">
        
        {/* SECTION 1: IDENTITAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
             <div className={`w-8 h-1 rounded-full ${isRamadhan ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
             <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>Identitas Utama</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>ID Pelanggan *</label>
              <input 
                name="ID Pelanggan" 
                value={formData['ID Pelanggan']} 
                onChange={handleChange}
                placeholder="Ex: 10024"
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`} 
              />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>Nama Pelanggan *</label>
              <input 
                name="Nama Pelanggan" 
                value={formData['Nama Pelanggan']} 
                onChange={handleChange}
                placeholder="Nama PT / Perusahaan"
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>Alamat Instalasi</label>
            <textarea 
              name="ALAMAT" 
              rows={2}
              value={formData['ALAMAT']} 
              onChange={handleChange}
              placeholder="Jl. Raya Detail Alamat..."
              className={`w-full p-4 rounded-2xl border outline-none transition-all text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`} 
            ></textarea>
          </div>
        </div>

        {/* SECTION 2: TEKNIS */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
             <div className={`w-8 h-1 rounded-full ${isRamadhan ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
             <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>Spesifikasi Jaringan</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'VLAN / VMAN', name: 'VMAN / VLAN', placeholder: '100', mono: true },
              { label: 'Kapasitas', name: 'Kapasitas', placeholder: '100 Mbps', mono: false },
              { label: 'Sinyal RX (dBm)', name: 'RX ONT/SFP', placeholder: '-20.5', mono: true },
              { label: 'SN ONT', name: 'SN ONT', placeholder: 'ZTEGC...', mono: true }
            ].map((field) => (
              <div key={field.name} className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>{field.label}</label>
                <input 
                  name={field.name}
                  value={(formData as any)[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={`w-full p-3 rounded-xl border outline-none transition-all text-xs ${field.mono ? 'font-mono' : 'font-bold'} ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-50 focus:border-amber-500/30' : 'border-slate-200'}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Near End (POP)</label>
                <input name="Near End" value={formData['Near End']} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-50' : ''}`} />
             </div>
             <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Far End (CPE)</label>
                <input name="Far End" value={formData['Far End']} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-50' : ''}`} />
             </div>
             <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Status</label>
                <select 
                  name="STATUS" 
                  value={formData['STATUS']} 
                  onChange={handleChange}
                  className={`w-full p-3 rounded-xl border outline-none text-xs font-bold appearance-none cursor-pointer ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-50' : ''}`}
                >
                  <option value="Active">Active</option>
                  <option value="Suspend">Suspend</option>
                  <option value="Isolir">Isolir</option>
                  <option value="Dismantle">Dismantle</option>
                </select>
             </div>
          </div>
        </div>

        {/* SECTION 3: REPORT TXT */}
        <div className={`p-6 rounded-[2rem] border transition-all ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-blue-50 border-blue-100'}`}>
          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 ${isRamadhan ? 'text-amber-500' : 'text-blue-800'}`}>
             <FileText size={16}/> Report Generator Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-600'}`}>Data Teknis</label>
              <textarea 
                name="Data Teknis" 
                rows={4}
                value={formData['Data Teknis']} 
                onChange={handleChange}
                placeholder="Detail ODP, Port, dsb..."
                className={`w-full p-4 rounded-2xl border outline-none transition-all text-[11px] font-mono ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-100 focus:border-amber-500/30' : 'border-blue-100'}`} 
              ></textarea>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-600'}`}>Konfigurasi</label>
              <textarea 
                name="Konfigurasi" 
                rows={4}
                value={formData['Konfigurasi']} 
                onChange={handleChange}
                placeholder="Paste command CLI di sini..."
                className={`w-full p-4 rounded-2xl border outline-none transition-all text-[11px] font-mono ${isRamadhan ? 'bg-[#020c09] border-emerald-800/50 text-emerald-100 focus:border-amber-500/30' : 'border-blue-100'}`} 
              ></textarea>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4">
          <button 
            type="submit" 
            disabled={saving}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isRamadhan ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-900/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-current" />}
            {saving ? 'Proses Sinkronisasi...' : 'Simpan & Unduh Report'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function CreateClientPage() {
  const isRamadhan = true; 
  return (
    <div className={`min-h-screen p-6 flex justify-center items-start font-sans transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className={`animate-spin ${isRamadhan ? 'text-amber-500' : 'text-blue-600'}`} /></div>}>
        <CreateClientContent />
      </Suspense>
    </div>
  );
}