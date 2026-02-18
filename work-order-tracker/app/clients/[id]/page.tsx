'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Pencil, Trash2, MapPin, Activity, 
  Server, Router, Loader2, Globe, AlertTriangle, X,
  Moon, Star, Zap, Database, ShieldAlert
} from 'lucide-react';

// IMPORT TOAST, LOGGER & PERMISSIONS
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';
import { hasAccess, PERMISSIONS } from '@/lib/permissions';

function ClientDetailContent() {
  const isRamadhan = true; // SAKLAR TEMA
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<any>(null);
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

      const { data, error } = await supabase
        .from('Data Client Corporate')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error('Gagal mengambil data: ' + error.message);
        router.push('/clients');
      } else {
        setClient(data);
      }
      setLoading(false);
    }
    if (id) fetchData();
  }, [id, router, supabase]);

  const executeDelete = async () => {
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE)) {
      toast.error('Akses Ditolak!');
      return;
    }

    setDeleting(true);
    setShowDeleteModal(false); 
    const toastId = toast.loading('Menghapus data dari semesta...');

    const { error } = await supabase.from('Data Client Corporate').delete().eq('id', id);

    if (error) {
      toast.error('Gagal menghapus: ' + error.message, { id: toastId });
      setDeleting(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      let actorName = 'System';
      if(user) {
         const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
         actorName = profile?.full_name || 'User';
      }

      await logActivity({
          activity: 'Delete Client Corp',
          subject: client?.['Nama Pelanggan'] || 'Unknown',
          actor: actorName
      });

      toast.success('Data Terhapus Selamanya', { id: toastId });
      router.push('/clients');
      router.refresh();
    }
  };

  if (loading) return (
    <div className={`h-screen flex items-center justify-center ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      <Loader2 className={`animate-spin ${isRamadhan ? 'text-amber-500' : 'text-blue-600'}`} size={40}/>
    </div>
  );

  if (!client) return <div className="p-10 text-center text-emerald-500">Data tidak ditemukan.</div>;

  return (
    <div className={`p-6 min-h-screen font-sans relative transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* MODAL KONFIRMASI RAMADHAN STYLE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800' : 'bg-white border-slate-200'}`}>
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isRamadhan ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-rose-100 text-rose-500'}`}>
                <ShieldAlert size={40} />
              </div>
              <h2 className={`text-xl font-black uppercase tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>Hapus Permanen?</h2>
              <p className={`text-xs font-bold uppercase tracking-widest mt-3 opacity-60 ${isRamadhan ? 'text-emerald-500' : 'text-slate-500'}`}>
                Data akan hilang dari database <br/> <span className="text-rose-500">NOC COMMANDER</span>.
              </p>
            </div>
            <div className={`p-6 flex gap-3 ${isRamadhan ? 'bg-emerald-950/30' : 'bg-slate-50'}`}>
              <button onClick={() => setShowDeleteModal(false)} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-500 hover:border-emerald-600' : 'bg-white text-slate-700'}`}>
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-rose-900/20">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER NAVIGATION */}
      <div className="max-w-5xl mx-auto mb-10 flex items-center justify-between relative z-10">
        <button onClick={() => router.back()} className={`flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] transition-all ${isRamadhan ? 'text-emerald-600 hover:text-amber-500' : 'text-slate-500 hover:text-blue-600'}`}>
          <ArrowLeft size={18} strokeWidth={3} /> Kembali ke List
        </button>

        <div className="flex gap-3">
          {hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE) && (
            <>
              <Link href={`/clients/${id}/edit`}>
                <button className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border transition-all flex items-center gap-2 ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800 text-amber-500 hover:bg-emerald-800' : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50'}`}>
                  <Pencil size={14} strokeWidth={3}/> Edit
                </button>
              </Link>
              <button 
                onClick={() => setShowDeleteModal(true)} 
                disabled={deleting}
                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border transition-all flex items-center gap-2 ${isRamadhan ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'}`}
              >
                {deleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} strokeWidth={3}/>}
                Hapus
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative">
        
        {/* CARD UTAMA: IDENTITAS */}
        <div className={`p-10 rounded-[3rem] border relative overflow-hidden transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-2xl shadow-emerald-950/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          {/* Aksen Ramadhan */}
          {isRamadhan && (
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none rotate-12">
              <Moon size={200} className="text-amber-500" />
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                  {client['Nama Pelanggan']}
                </h1>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                  client['STATUS'] === 'Active' 
                    ? (isRamadhan ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') 
                    : (isRamadhan ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-100 text-slate-500')
                }`}>
                  {client['STATUS']}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Database size={14} /> ID: {client['ID Pelanggan']}
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${isRamadhan ? 'bg-[#020c09] border-emerald-800 text-amber-500' : 'bg-blue-50 text-blue-400'}`}>
                  <Zap size={14} /> {client['Kapasitas'] || 'Default BW'}
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border text-center min-w-[160px] ${isRamadhan ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>Redaman Aktivasi</p>
              <p className={`text-4xl font-black tracking-tighter ${isRamadhan ? 'text-amber-500' : 'text-blue-600'}`}>
                {client['RX ONT/SFP'] || '0.00'}
              </p>
              <p className={`text-[10px] font-bold mt-1 ${isRamadhan ? 'text-emerald-800' : 'text-slate-300'}`}>dBm (ONT RX)</p>
            </div>
          </div>
        </div>

        {/* INFO GRID: LOKASI & TEKNIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* KARTU LOKASI */}
          <div className={`p-8 rounded-[2.5rem] border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3 ${isRamadhan ? 'text-emerald-500' : 'text-blue-600'}`}>
              <div className={`p-2 rounded-lg ${isRamadhan ? 'bg-emerald-900/30' : 'bg-blue-50'}`}><MapPin size={16}/></div>
              Informasi Instalasi
            </h3>
            <div className={`p-6 rounded-2xl border min-h-[100px] flex items-center italic ${isRamadhan ? 'bg-[#020c09] border-emerald-900 text-emerald-100/80 font-medium' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
              {client['ALAMAT'] || 'Alamat tidak terdefinisi dalam database.'}
            </div>
          </div>

          {/* KARTU DATA TEKNIS */}
          <div className={`p-8 rounded-[2.5rem] border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3 ${isRamadhan ? 'text-amber-500' : 'text-emerald-600'}`}>
              <div className={`p-2 rounded-lg ${isRamadhan ? 'bg-amber-500/10' : 'bg-emerald-50'}`}><Activity size={16}/></div>
              Parameter Jaringan
            </h3>
            <div className="grid grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-900 hover:border-emerald-700' : 'bg-slate-50 border-slate-100'}`}>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>VMAN / VLAN ID</label>
                  <p className={`font-mono font-black text-xl ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>{client['VMAN / VLAN'] || '-'}</p>
                </div>
                <div className={`p-5 rounded-2xl border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-900 hover:border-emerald-700' : 'bg-slate-50 border-slate-100'}`}>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>Node Near-End</label>
                  <p className={`font-black text-xs uppercase ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>{client['Near End'] || '-'}</p>
                </div>
                <div className={`p-5 rounded-2xl border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-900 hover:border-emerald-700' : 'bg-slate-50 border-slate-100'}`}>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>CPE Far-End</label>
                  <p className={`font-black text-xs uppercase ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>{client['Far End'] || '-'}</p>
                </div>
                <div className={`p-5 rounded-2xl border transition-all ${isRamadhan ? 'bg-[#020c09] border-emerald-900 hover:border-emerald-700' : 'bg-slate-50 border-slate-100'}`}>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>Identity Check</label>
                  <div className={`h-2 w-10 rounded-full ${isRamadhan ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-600'}`}></div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-12 text-center">
          <p className={`text-[9px] font-black uppercase tracking-[0.5em] transition-all ${isRamadhan ? 'text-emerald-900' : 'text-slate-300'}`}>
            Authenticated View • Ramadhan 2026
          </p>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const isRamadhan = true;
  return (
    <Suspense fallback={
      <div className={`h-screen flex items-center justify-center ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
        <Loader2 className={`animate-spin ${isRamadhan ? 'text-amber-500' : 'text-blue-600'}`} size={40}/>
      </div>
    }>
      <ClientDetailContent />
    </Suspense>
  );
}