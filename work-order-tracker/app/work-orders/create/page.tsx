'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// PERBAIKAN: Memasukkan semua ikon yang digunakan agar tidak Error
import { 
  Save, ArrowLeft, Loader2, ClipboardList, 
  CheckCircle, TrendingUp, List, Star, Moon, Calendar, Zap, AlertCircle, Users, Activity
} from 'lucide-react';

import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';

export default function CreateWOPage() {
  const isRamadhan = true; // SAKLAR TEMA
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teamList, setTeamList] = useState<any[]>([]); 
  const [showSolvedModal, setShowSolvedModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const formatTanggalIndo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const [formData, setFormData] = useState({
    'TANGGAL': new Date().toISOString().split('T')[0], 
    'SUBJECT WO': '',
    'STATUS': 'PROGRESS', 
    'JENIS WO': 'PERMANEN', 
    'KETERANGAN': '',
    'SELESAI ACTION': '', 
    'NAMA TEAM': ''
  });

  useEffect(() => {
    async function fetchTeams() {
      const { data, error } = await supabase
        .from('Index')
        .select('TEAM')
        .not('TEAM', 'is', null);

      if (!error && data) {
        const uniqueTeams = [...new Set(data.map(item => item.TEAM))];
        setTeamList(uniqueTeams);
        if (uniqueTeams.length > 0) {
          setFormData(prev => ({ ...prev, 'NAMA TEAM': uniqueTeams[0] }));
        }
      }
    }
    fetchTeams();
  }, [supabase]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!formData['SUBJECT WO']) {
      toast.error('Subject WO wajib diisi!');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Memproses penyimpanan data...');

    const payload = {
      ...formData,
      'TANGGAL': formatTanggalIndo(formData['TANGGAL']), 
      'SELESAI ACTION': formData['SELESAI ACTION'] ? formatTanggalIndo(formData['SELESAI ACTION']) : '' 
    };

    const { error } = await supabase
      .from('Report Bulanan')
      .insert([payload]);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message, { id: toastId });
      setSaving(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if(user) {
         const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
         actorName = profile?.full_name || 'User';
      }

      await logActivity({
          activity: 'Input Work Order',
          subject: `${formData['JENIS WO']} - ${formData['SUBJECT WO']}`,
          actor: actorName
      });

      toast.dismiss(toastId);

      if (formData['STATUS'] === 'SOLVED') {
        setSaving(false);
        setShowSolvedModal(true); 
      } else {
        toast.success('Work Order Berhasil Disimpan!');
        router.push('/work-orders');
        router.refresh();
      }
    }
  };

  const handleGoToTracker = () => {
    const subject = encodeURIComponent(formData['SUBJECT WO']);
    router.push(`/tracker/create?subject=${subject}`);
  };

  const handleBackToList = () => {
    router.push('/work-orders');
    router.refresh();
  };

  return (
    <div className={`min-h-screen p-6 flex justify-center items-start font-sans relative transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* ORNAMEN BACKGROUND */}
      {isRamadhan && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Moon className="absolute top-10 right-10 text-emerald-900/10" size={300} />
          <Star className="absolute bottom-20 left-10 text-amber-500/5 animate-pulse" size={150} />
        </div>
      )}

      {/* MODAL SOLVED - TETAP ADA */}
      {showSolvedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#020c09]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#041a14] rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.1)] w-full max-w-md overflow-hidden border border-emerald-800 scale-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-emerald-50 tracking-tighter uppercase mb-2">Work Order Solved!</h2>
              <p className="text-emerald-700 font-medium text-sm leading-relaxed px-4">
                Data berhasil diamankan. Apakah Anda ingin lanjut menginput data ini ke <span className="text-amber-500">Tracker Pelanggan</span>?
              </p>
            </div>
            
            <div className="p-6 bg-emerald-950/20 border-t border-emerald-800/50 flex flex-col gap-3">
              <button onClick={handleGoToTracker} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-2 active:scale-95">
                <TrendingUp size={18} /> Ya, Input ke Tracker
              </button>
              <button onClick={handleBackToList} className="w-full py-4 bg-transparent border border-emerald-800 text-emerald-500 hover:bg-emerald-900/30 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-2 active:scale-95">
                <List size={18} /> Tidak, Kembali ke List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER FORM UTAMA */}
      <div className={`w-full max-w-3xl rounded-[2.5rem] shadow-2xl border transition-all duration-500 z-10 ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-black/40' : 'bg-white border-slate-200'}`}>
        
        <div className={`p-8 border-b flex items-center gap-6 ${isRamadhan ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-slate-100'}`}>
          <button onClick={() => router.back()} className={`p-3 rounded-2xl transition-all ${isRamadhan ? 'bg-[#020c09] text-emerald-500 border border-emerald-800 hover:border-amber-500' : 'hover:bg-slate-100 text-slate-500'}`}>
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-tighter flex items-center gap-3 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
              <Zap className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} size={24} /> Create <span className={isRamadhan ? 'text-emerald-500' : ''}>Work Order</span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Sistem Manajemen Laporan NOC</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Calendar size={12}/> Tanggal
              </label>
              <input type="date" name="TANGGAL" value={formData['TANGGAL']} onChange={handleChange} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' : 'border-slate-300 text-slate-700'}`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Activity size={12}/> Status
              </label>
              <select name="STATUS" value={formData['STATUS']} onChange={handleChange} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' : 'border-slate-300 bg-white'}`}>
                <option value="PROGRESS">PROGRESS</option>
                <option value="PENDING">PENDING</option>
                <option value="SOLVED">SOLVED</option>
                <option value="CANCEL">CANCEL</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
              Subject WO <AlertCircle size={12} className="text-amber-500" />
            </label>
            <input type="text" name="SUBJECT WO" value={formData['SUBJECT WO']} onChange={handleChange} placeholder="Judul Pekerjaan..." className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 placeholder:text-emerald-950 focus:border-amber-500' : 'border-slate-300'}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>Jenis WO</label>
              <select name="JENIS WO" value={formData['JENIS WO']} onChange={handleChange} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' : 'border-slate-300 bg-white'}`}>
                <option value="PERMANEN">PERMANEN</option>
                <option value="SEMENTARA">SEMENTARA</option>
                <option value="BOD">BOD</option>
              </select>
            </div>
             <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Users size={12}/> Team Pelaksana
              </label>
              <select name="NAMA TEAM" value={formData['NAMA TEAM']} onChange={handleChange} className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' : 'border-slate-300 bg-white'}`}>
                {teamList.map((team, index) => (
                  <option key={index} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>Keterangan</label>
            <textarea name="KETERANGAN" rows={4} value={formData['KETERANGAN']} onChange={handleChange} placeholder="Deskripsi detail..." className={`w-full p-4 rounded-2xl text-sm font-bold outline-none border transition-all resize-none ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 placeholder:text-emerald-950 focus:border-amber-500' : 'border-slate-300'}`} />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={saving} className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50 ${isRamadhan ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-900/40' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} strokeWidth={3} />}
              {saving ? 'Menyimpan...' : 'Simpan Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}