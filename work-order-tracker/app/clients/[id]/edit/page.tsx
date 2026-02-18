'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, UserCog, Trash2, Database, Zap, Moon, Star } from 'lucide-react';
import { logActivity } from '@/lib/logger';

// --- IMPORT TOAST (SONNER) ---
import { toast } from 'sonner';

function EditClientContent() {
  const isRamadhan = true; // SAKLAR TEMA
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
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
    'STATUS': '',
    'Kapasitas': '',
    'RX ONT/SFP': ''
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
        setFormData(data);
      }
      setLoading(false);
    }
    
    if (id) fetchData();
  }, [id, router, supabase]);

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
        'ALAMAT': formData['ALAMAT'],
        'VMAN / VLAN': formData['VMAN / VLAN'],
        'Near End': formData['Near End'],
        'Far End': formData['Far End'],
        'STATUS': formData['STATUS'],
        'Kapasitas': formData['Kapasitas'],
        'RX ONT/SFP': formData['RX ONT/SFP']
      })
      .eq('id', id);

    if (error) {
      toast.error('Gagal update: ' + error.message);
      setSaving(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if(user) {
         const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
         actorName = profile?.full_name || 'User';
      }

      await logActivity({
        activity: 'Edit Client Corp', 
        subject: formData['Nama Pelanggan'],
        actor: actorName
      });

      toast.success('Mubarak! Perubahan Disimpan', {
        description: 'Data pelanggan telah diperbarui di pusat data.',
      });

      router.push(`/clients/${id}`); 
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if(!confirm('⚠️ PERINGATAN KRITIS: Hapus data client ini secara permanen?')) return;
    
    setSaving(true);
    const { error } = await supabase.from('Data Client Corporate').delete().eq('id', id);
    
    if(error) {
       toast.error("Gagal hapus: " + error.message);
       setSaving(false);
    } else {
       await logActivity({
          activity: 'Delete Client Corp',
          subject: formData['Nama Pelanggan'],
          actor: 'User'
       });

       toast.success("Data Dihapus Selamanya");
       router.push('/clients');
       router.refresh();
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#020c09]">
      <Loader2 className="animate-spin text-amber-500" size={40} />
    </div>
  );

  return (
    <div className={`w-full max-w-4xl rounded-[2.5rem] shadow-2xl border transition-all duration-500 overflow-hidden ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-emerald-950/50' : 'bg-white border-slate-200'}`}>
      
      {/* DECORATIVE HEADER */}
      <div className={`p-8 relative overflow-hidden border-b ${isRamadhan ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-slate-50 border-slate-100'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Moon size={120} className="text-amber-500 -rotate-12" />
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className={`p-3 rounded-2xl transition-all ${isRamadhan ? 'bg-[#020c09] text-emerald-500 hover:text-amber-500 border border-emerald-800' : 'hover:bg-slate-100 text-slate-500'}`}>
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <div>
              <h1 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                <UserCog className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} /> Edit <span className={isRamadhan ? 'text-amber-500' : ''}>Konfigurasi</span>
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
                ID Pelanggan: {formData['ID Pelanggan']}
              </p>
            </div>
          </div>
          
          <button onClick={handleDelete} className={`group p-3 rounded-2xl transition-all border ${isRamadhan ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' : 'text-rose-500 hover:bg-rose-50'}`}>
            <Trash2 size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="p-8 space-y-8">
        
        {/* IDENTITAS SECTION */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
             <div className={`w-8 h-1 rounded-full ${isRamadhan ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
             <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>Identitas Pelanggan</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 opacity-60">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>ID (Locked)</label>
              <div className={`w-full p-4 rounded-2xl border font-mono text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-900 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {formData['ID Pelanggan']}
              </div>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>Nama Pelanggan</label>
              <input 
                name="Nama Pelanggan" 
                value={formData['Nama Pelanggan'] || ''} 
                onChange={handleChange}
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'border-slate-200'}`} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>Alamat Instalasi</label>
            <textarea 
              name="ALAMAT" 
              rows={2}
              value={formData['ALAMAT'] || ''} 
              onChange={handleChange}
              className={`w-full p-4 rounded-2xl border outline-none transition-all text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20' : 'border-slate-200'}`} 
            ></textarea>
          </div>
        </div>

        {/* TEKNIS SECTION */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
             <div className={`w-8 h-1 rounded-full ${isRamadhan ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
             <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>Spesifikasi & Node</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>VLAN ID</label>
              <input name="VMAN / VLAN" value={formData['VMAN / VLAN'] || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none font-mono text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-amber-500' : 'text-blue-600'}`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Kapasitas</label>
              <input name="Kapasitas" value={formData['Kapasitas'] || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none text-sm font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : ''}`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>RX Level (dBm)</label>
              <input name="RX ONT/SFP" value={formData['RX ONT/SFP'] || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none font-mono text-sm ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : ''}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Near End (POP)</label>
              <input name="Near End" value={formData['Near End'] || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none text-sm font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : ''}`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Far End (CPE)</label>
              <input name="Far End" value={formData['Far End'] || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border outline-none text-sm font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : ''}`} />
            </div>
          </div>
        </div>

        {/* STATUS SECTION */}
        <div className={`p-6 rounded-[2rem] border ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-slate-50 border-slate-100'}`}>
          <label className={`block text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-center ${isRamadhan ? 'text-amber-500' : 'text-slate-500'}`}>Status Layanan</label>
          <select 
            name="STATUS" 
            value={formData['STATUS'] || ''} 
            onChange={handleChange}
            className={`w-full p-4 rounded-2xl border outline-none text-sm font-black text-center appearance-none cursor-pointer transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 hover:border-amber-500/50' : 'bg-white'}`}
          >
            <option value="Active">🟢 ACTIVE</option>
            <option value="Deactive">🟡 BERHENTI SEMENTARA</option>
            <option value="Berhenti Berlangganan">🔴 BERHENTI BERLANGGANAN</option>
            <option value="Dismantle">⚫ DISMANTLE</option>
          </select>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4">
          <button 
            type="submit" 
            disabled={saving}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isRamadhan ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-900/20' : 'bg-blue-600 text-white shadow-blue-500/30'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />}
            {saving ? 'Sinkronisasi Data...' : 'Update & Simpan Konfigurasi'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function EditClientPage() {
  const isRamadhan = true;
  return (
    <div className={`min-h-screen p-6 flex justify-center items-start font-sans transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>}>
        <EditClientContent />
      </Suspense>
    </div>
  );
}