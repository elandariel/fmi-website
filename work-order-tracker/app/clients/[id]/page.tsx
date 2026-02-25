'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Pencil, Trash2, MapPin, Activity, 
  Server, Router, Loader2, Globe, AlertTriangle, X 
} from 'lucide-react';

// IMPORT TOAST, LOGGER & PERMISSIONS
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';
import { hasAccess, PERMISSIONS } from '@/lib/permissions';

function ClientDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<any>(null);
  
  // STATE UNTUK MODAL KONFIRMASI
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // --- FETCH DATA (CLIENT & ROLE) ---
  useEffect(() => {
    async function fetchData() {
      // 1. Ambil User Role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role);
      }

      // 2. Ambil Data Client
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

  // --- EKSEKUSI DELETE ---
  const executeDelete = async () => {
    // SATPAM FUNGSI
    if (!hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE)) {
      toast.error('Akses Ditolak: Anda tidak memiliki izin menghapus.');
      return;
    }

    setDeleting(true);
    setShowDeleteModal(false); 
    
    const toastId = toast.loading('Menghapus data permanen...');

    const { error } = await supabase
      .from('Data Client Corporate')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Gagal menghapus: ' + error.message, { id: toastId });
      setDeleting(false);
    } else {
      // LOG KE TELEGRAM
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

      toast.success('Client Berhasil Dihapus', {
        id: toastId,
        description: 'Data telah dihapus permanen dari database.'
      });
      
      router.push('/clients');
      router.refresh();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  if (!client) return <div className="p-10 text-center">Data tidak ditemukan.</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      
      {/* --- MODAL KONFIRMASI CUSTOM --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Hapus Client Permanen?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Tindakan ini <span className="text-rose-600 font-bold">TIDAK BISA DIBATALKAN</span>.
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold">
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-xl font-bold">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER HALAMAN --- */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
          <ArrowLeft size={20} /> Kembali
        </button>

        {/* SATPAM TOMBOL EDIT & HAPUS */}
        <div className="flex gap-3">
          {hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE) && (
            <>
              <Link href={`/clients/${id}/edit`}>
                <button className="px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-50 flex items-center gap-2 transition">
                  <Pencil size={16}/> Edit Data
                </button>
              </Link>
              <button 
                onClick={() => setShowDeleteModal(true)} 
                disabled={deleting}
                className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg font-bold text-sm shadow-sm hover:bg-rose-100 flex items-center gap-2 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                {deleting ? 'Memproses...' : 'Hapus Client'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* CARD UTAMA */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-800">{client['Nama Pelanggan']}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  client['STATUS'] === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {client['STATUS']}
                </span>
              </div>
              <p className="text-slate-400 font-mono text-sm"># {client['ID Pelanggan']}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Bandwidth</p>
              <p className="text-2xl font-bold text-blue-600">{client['Kapasitas'] || '-'}</p>
            </div>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-blue-600 uppercase mb-6 flex items-center gap-2">
              <MapPin size={18}/> Informasi Lokasi
            </h3>
            <p className="text-slate-700 font-medium leading-relaxed">{client['ALAMAT'] || '-'}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-emerald-600 uppercase mb-6 flex items-center gap-2">
              <Activity size={18}/> Data Teknis
            </h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">VLAN</label>
                  <p className="text-slate-800 font-mono font-bold text-lg">{client['VMAN / VLAN'] || '-'}</p>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RX (dBm)</label>
                  <p className="text-slate-800 font-mono font-bold text-lg">{client['RX ONT/SFP'] || '-'}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientDetailContent />
    </Suspense>
  );
}