'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, UserCog, Trash2 } from 'lucide-react';
import { logActivity } from '@/lib/logger';

// --- 1. IMPORT TOAST (SONNER) ---
import { toast } from 'sonner';

function EditClientContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
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
    'STATUS': '',
    'Kapasitas': '',
    'RX ONT/SFP': ''
  });

  // --- 1. AMBIL DATA LAMA ---
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('Data Client Corporate')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // GANTI ALERT JADI TOAST ERROR
        toast.error('Gagal mengambil data: ' + error.message);
        router.push('/clients');
      } else if (data) {
        setFormData(data);
      }
      setLoading(false);
    }
    
    if (id) fetchData();
  }, [id, router]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 2. LOGIC UPDATE (+ KIRIM TELEGRAM) ---
  const handleUpdate = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    // Update Database
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
      // GANTI ALERT JADI TOAST ERROR
      toast.error('Gagal update: ' + error.message);
      setSaving(false);
    } else {
      
      // --- LOGIC TELEGRAM / LOGGER ---
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

      // GANTI ALERT JADI TOAST SUKSES
      toast.success('Data Berhasil Diperbarui!', {
        description: 'Perubahan telah tersimpan di sistem.',
      });

      router.push('/clients'); 
      router.refresh();
    }
  };

  // --- 3. LOGIC HAPUS CLIENT ---
  const handleDelete = async () => {
    // Confirm bawaan browser masih oke untuk tindakan kritis (safety)
    if(!confirm('⚠️ PERINGATAN: Yakin ingin MENGHAPUS client ini secara permanen?')) return;
    
    setSaving(true);
    const { error } = await supabase.from('Data Client Corporate').delete().eq('id', id);
    
    if(error) {
       toast.error("Gagal hapus: " + error.message);
       setSaving(false);
    } else {
       // Log Hapus
       await logActivity({
          activity: 'Delete Client Corp',
          subject: formData['Nama Pelanggan'],
          actor: 'User'
       });

       // TOAST SUKSES HAPUS
       toast.success("Client Berhasil Dihapus", { 
         description: "Data telah dihapus permanen dari database." 
       });

       router.push('/clients');
       router.refresh();
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 border-b pb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <UserCog className="text-amber-500" /> Edit Data Client
              </h1>
              <p className="text-sm text-slate-500">Perbarui informasi pelanggan.</p>
            </div>
        </div>
        
        {/* Tombol Hapus */}
        <button onClick={handleDelete} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition" title="Hapus Client">
            <Trash2 size={20}/>
        </button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* GROUP 1: IDENTITAS */}
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ID Pelanggan</label>
              <input 
                name="ID Pelanggan" 
                value={formData['ID Pelanggan'] || ''} 
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono text-slate-500 bg-slate-200 cursor-not-allowed" 
                readOnly 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pelanggan</label>
              <input 
                name="Nama Pelanggan" 
                value={formData['Nama Pelanggan'] || ''} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" 
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1">Alamat Instalasi</label>
            <textarea 
              name="ALAMAT" 
              rows={2}
              value={formData['ALAMAT'] || ''} 
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
            ></textarea>
          </div>
        </div>

        {/* GROUP 2: TEKNIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">VLAN / VMAN</label>
            <input name="VMAN / VLAN" value={formData['VMAN / VLAN'] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg outline-none font-mono text-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas</label>
            <input name="Kapasitas" value={formData['Kapasitas'] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg outline-none text-slate-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sinyal RX</label>
            <input name="RX ONT/SFP" value={formData['RX ONT/SFP'] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg outline-none font-mono text-slate-700" />
          </div>
        </div>

        {/* GROUP 3: PERANGKAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Near End (POP)</label>
            <input name="Near End" value={formData['Near End'] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg outline-none text-slate-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Far End (CPE)</label>
            <input name="Far End" value={formData['Far End'] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg outline-none text-slate-700" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status Layanan</label>
          <select 
            name="STATUS" 
            value={formData['STATUS'] || ''} 
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-slate-700"
          >
            <option value="Active">Active</option>
            <option value="Deactive">Berhenti Sementara</option>
            <option value="Berhenti Berlangganan">Berhenti Berlangganan</option>
            <option value="Dismantle">Dismantle</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-amber-500 text-white py-3 rounded-lg font-bold hover:bg-amber-600 transition flex justify-center items-center gap-2 shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Menyimpan Perubahan...' : 'Update Data Client'}
          </button>
        </div>

      </form>
    </div>
  );
}

// Export Default dengan Suspense
export default function EditClientPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans">
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
        <EditClientContent />
      </Suspense>
    </div>
  );
}