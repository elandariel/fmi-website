'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'; 
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Save, ArrowLeft, Loader2, TrendingUp, 
  CheckCircle, UserPlus, List, Moon, Sparkles, LayoutGrid, Info
} from 'lucide-react';

import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';

const TABLE_OPTIONS = [
  { label: 'Pelanggan Baru (Pasang)', value: 'Berlangganan 2026' },
  { label: 'Berhenti Berlangganan', value: 'Berhenti Berlangganan 2026' },
  { label: 'Cuti / Berhenti Sementara', value: 'Berhenti Sementara 2026' },
  { label: 'Upgrade Layanan', value: 'Upgrade 2026' },
  { label: 'Downgrade Layanan', value: 'Downgrade 2026' },
];

function CreateTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectFromWO = searchParams.get('subject') || '';
  const isRamadhan = true; // SAKLAR TEMA

  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState(TABLE_OPTIONS[0].value);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  
  const [options, setOptions] = useState({
    bts: [],
    isp: [],
    device: [],
    team: []
  });

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
    'SUBJECT BERLANGGANAN': subjectFromWO,
    'PROBLEM': 'Nihil', 
    'TEAM': '',
    'STATUS': 'Done',   
    'BTS': '',
    'DEVICE': '',
    'ISP': '',
    'REASON': ''
  });

  useEffect(() => {
    async function fetchMasterData() {
      const { data, error } = await supabase.from('Index').select('*');
      if (!error && data) {
        const getUnique = (key: string) => [...new Set(data.map((item: any) => item[key]).filter(x => x))];
        setOptions({
          bts: getUnique('BTS') as any,
          isp: getUnique('ISP') as any,
          device: getUnique('DEVICE') as any,
          team: getUnique('TEAM') as any
        });
      }
    }
    fetchMasterData();
  }, []);

  useEffect(() => {
    if(subjectFromWO) setFormData(prev => ({ ...prev, 'SUBJECT BERLANGGANAN': subjectFromWO }));
  }, [subjectFromWO]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!formData['SUBJECT BERLANGGANAN']) {
      toast.error('Nama Subject / Pelanggan wajib diisi!');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Menyimpan Data Tracker...');

    const payload: any = { 
      ...formData,
      'TANGGAL': formatTanggalIndo(formData['TANGGAL']) 
    };

    let targetColumnName = 'SUBJECT BERLANGGANAN'; 
    if (selectedTable === 'Berhenti Sementara 2026') targetColumnName = 'SUBJECT BERHENTI SEMENTARA';
    else if (selectedTable === 'Berhenti Berlangganan 2026') targetColumnName = 'SUBJECT BERHENTI BERLANGGANAN';
    else if (selectedTable === 'Downgrade 2026') targetColumnName = 'SUBJECT DOWNGRADE';
    else if (selectedTable === 'Upgrade 2026') targetColumnName = 'SUBJECT UPGRADE';

    if (targetColumnName !== 'SUBJECT BERLANGGANAN') {
        payload[targetColumnName] = payload['SUBJECT BERLANGGANAN'];
        delete payload['SUBJECT BERLANGGANAN']; 
    }
    if (selectedTable === 'Berlangganan 2026') delete payload['REASON'];

    const { error } = await supabase.from(selectedTable).insert([payload]);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message, { id: toastId });
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let actorName = 'System';
    if(user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actorName = profile?.full_name || 'User';
    }

    await logActivity({
        activity: 'Input Tracker',
        subject: `[${selectedTable}] ${formData['SUBJECT BERLANGGANAN']}`,
        actor: actorName
    });

    if (selectedTable === 'Berlangganan 2026') {
        toast.success('Tracker Tersimpan!', { id: toastId });
        setSaving(false);
        setShowSuccessModal(true); 
    } 
    else if (selectedTable.includes('Berhenti')) {
        const newStatus = selectedTable === 'Berhenti Berlangganan 2026' ? 'Dismantle' : 'Isolir';
        const targetName = formData['SUBJECT BERLANGGANAN'];
        const { error: updateError } = await supabase.from('Data Client Corporate')
          .update({ 'STATUS': newStatus })
          .ilike('Nama Pelanggan', `%${targetName}%`); 

        if(updateError) toast.warning('Tracker tersimpan, tapi gagal update status client otomatis.', { id: toastId });
        else toast.success('Tracker & Status Client Diupdate!', { id: toastId });
        
        setTimeout(() => { router.push('/tracker'); router.refresh(); }, 1500);
    } 
    else {
        toast.success('Data Berhasil Disimpan!', { id: toastId });
        setTimeout(() => { router.push('/tracker'); router.refresh(); }, 1000);
    }
  };

  const goToClientInput = () => {
    const name = encodeURIComponent(formData['SUBJECT BERLANGGANAN']);
    router.push(`/clients/create?name=${name}`);
  };

  return (
    <div className={`min-h-screen w-full flex justify-center items-start p-4 md:p-10 transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* BACKGROUND ELEMENTS */}
      {isRamadhan && (
        <div className="fixed inset-0 pointer-events-none opacity-30">
            <Moon className="absolute top-10 right-10 text-emerald-900" size={200} />
            <Sparkles className="absolute bottom-20 left-20 text-amber-500 animate-pulse" size={40} />
        </div>
      )}

      {/* MODAL SUCCESS (RAMADHAN STYLE) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#041a14] rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-emerald-800">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                <CheckCircle size={40} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black text-emerald-50 uppercase tracking-tighter">Data Tercatat!</h2>
              <p className="text-emerald-700 mt-4 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Tracker berhasil disimpan. Ingin lanjut mendaftarkan data teknis <strong>{formData['SUBJECT BERLANGGANAN']}</strong> ke Database Client?
              </p>
            </div>
            <div className="p-6 bg-emerald-950/20 flex flex-col gap-3">
              <button onClick={goToClientInput} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95">
                <UserPlus size={16} /> Ya, Input Data Client
              </button>
              <button onClick={() => router.push('/tracker')} className="w-full py-4 bg-transparent border border-emerald-800 text-emerald-500 hover:bg-emerald-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                <List size={16} /> Tidak, Kembali ke List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM UTAMA */}
      <div className={`w-full max-w-3xl relative z-10 rounded-[3rem] border shadow-2xl p-8 md:p-12 transition-all duration-500 ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-black' : 'bg-white'}`}>
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12 pb-8 border-b border-emerald-900/30">
          <button 
            onClick={() => router.back()} 
            className={`p-4 rounded-2xl transition-all active:scale-90 ${isRamadhan ? 'bg-emerald-950 text-emerald-500 hover:text-amber-500' : 'bg-slate-100 text-slate-500'}`}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <Sparkles className="text-amber-500" size={14} />
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isRamadhan ? 'text-emerald-500' : 'text-blue-600'}`}>New Entry System</p>
            </div>
            <h1 className={`text-3xl font-black uppercase tracking-tighter ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
              Input <span className={isRamadhan ? 'text-emerald-500' : 'text-slate-400'}>Tracker</span>
            </h1>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* CATEGORY SELECTOR */}
          <div className={`p-6 rounded-[2rem] border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 shadow-inner' : 'bg-blue-50 border-blue-100'}`}>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ${isRamadhan ? 'text-emerald-700' : 'text-blue-800'}`}>Pilih Kategori Transaksi</label>
            <div className="relative">
                <LayoutGrid className="absolute left-4 top-3.5 text-emerald-600" size={18} />
                <select 
                value={selectedTable} 
                onChange={(e) => setSelectedTable(e.target.value)}
                className={`w-full pl-12 pr-6 py-4 rounded-xl border appearance-none outline-none text-xs font-black uppercase tracking-widest transition-all ${
                    isRamadhan ? 'bg-[#041a14] border-emerald-800 text-emerald-400 focus:border-amber-500' : 'bg-white border-blue-300'
                }`}
                >
                {TABLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Tanggal Eksekusi</label>
              <input type="date" name="TANGGAL" value={formData['TANGGAL']} onChange={handleChange}
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-emerald-500' : 'bg-white'}`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Status WO</label>
              <input type="text" name="STATUS" value={formData['STATUS']} onChange={handleChange}
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none transition-all ${isRamadhan ? 'bg-[#020c09]/50 border-emerald-800 text-emerald-600 cursor-not-allowed' : 'bg-slate-50'}`} readOnly />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>
                Subject / Nama Pelanggan <span className="text-amber-500">*</span>
            </label>
            <input type="text" name="SUBJECT BERLANGGANAN" value={formData['SUBJECT BERLANGGANAN']} onChange={handleChange} placeholder="INPUT NAMA PT / CUSTOMER..."
              className={`w-full p-4 rounded-2xl border text-xs font-black uppercase tracking-widest outline-none transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-emerald-500 placeholder:text-emerald-950' : 'bg-white'}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Base Transceiver (BTS)</label>
              <select name="BTS" value={formData['BTS']} onChange={handleChange} 
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none appearance-none ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : 'bg-white'}`}>
                <option value="">- PILIH AREA -</option>
                {options.bts.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Service Provider (ISP)</label>
              <select name="ISP" value={formData['ISP']} onChange={handleChange} 
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none appearance-none ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : 'bg-white'}`}>
                <option value="">- PILIH ISP -</option>
                {options.isp.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Perangkat Utama</label>
              <select name="DEVICE" value={formData['DEVICE']} onChange={handleChange} 
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none appearance-none ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : 'bg-white'}`}>
                <option value="">- PILIH PERANGKAT -</option>
                {options.device.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Team Lapangan</label>
              <select name="TEAM" value={formData['TEAM']} onChange={handleChange} 
                className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none appearance-none ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50' : 'bg-white'}`}>
                <option value="">- PILIH TEAM -</option>
                {options.team.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-700'}`}>Catatan Teknis / Problem</label>
            <textarea name="PROBLEM" rows={3} value={formData['PROBLEM']} onChange={handleChange}
              className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-emerald-500' : 'bg-white'}`}></textarea>
          </div>

          {selectedTable !== 'Berlangganan 2026' && (
              <div className={`p-6 rounded-[2rem] border animate-in slide-in-from-top-4 duration-300 ${isRamadhan ? 'bg-amber-950/10 border-amber-900/50 shadow-lg' : 'bg-red-50 border-red-100'}`}>
                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4 ${isRamadhan ? 'text-amber-500' : 'text-red-700'}`}>
                    <Info size={14} /> Alasan Perubahan (Reason)
                </label>
                <textarea name="REASON" rows={2} value={formData['REASON']} onChange={handleChange} placeholder="JELASKAN ALASAN DISINI..."
                  className={`w-full p-4 rounded-2xl border text-xs font-bold outline-none transition-all ${isRamadhan ? 'bg-[#020c09] border-amber-900 text-amber-50 focus:border-amber-500 placeholder:text-amber-900/30' : 'bg-white border-red-200'}`}></textarea>
              </div>
          )}

          <div className="pt-10 border-t border-emerald-900/30">
            <button type="submit" disabled={saving}
              className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 shadow-2xl active:scale-95 disabled:grayscale disabled:cursor-not-allowed ${
                isRamadhan ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {saving ? 'PROSES SINKRONISASI...' : 'KIRIM DATA TRACKER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateTrackerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020c09]"><Loader2 className="animate-spin text-emerald-500" /></div>}>
      <CreateTrackerContent />
    </Suspense>
  );
}