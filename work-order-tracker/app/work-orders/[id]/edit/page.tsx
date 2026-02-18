import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Save, X, Moon, Star, Pencil, LayoutGrid, Activity, Users } from 'lucide-react';

export default async function EditWorkOrder({ params }: { params: Promise<{ id: string }> }) {
  const isRamadhan = true; // SAKLAR TEMA
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: wo } = await supabase.from('Report Bulanan').select('*').eq('id', id).single();
  if (!wo) notFound();

  // Server Action untuk simpan perubahan
  async function updateWO(formData: FormData) {
    'use server';
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    );

    const updatedData = {
      'SUBJECT WO': formData.get('subject'),
      'STATUS': formData.get('status'),
      'NAMA TEAM': formData.get('team'),
      'KETERANGAN': formData.get('detail'),
    };

    const { error } = await supabase.from('Report Bulanan').update(updatedData).eq('id', id);
    if (!error) redirect(`/work-orders/${id}`);
  }

  return (
    <div className={`min-h-screen p-6 md:p-12 font-sans relative overflow-hidden transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* ORNAMEN BACKGROUND */}
      {isRamadhan && (
        <div className="absolute inset-0 pointer-events-none">
          <Moon className="absolute -bottom-20 -left-20 text-emerald-900/10" size={400} />
          <Star className="absolute top-20 right-10 text-amber-500/5 animate-pulse" size={100} />
        </div>
      )}

      <div className="max-w-2xl mx-auto relative z-10">
        {/* HEADER JUDUL */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-4 rounded-3xl ${isRamadhan ? 'bg-emerald-950/50 border border-emerald-800 text-amber-500' : 'bg-white shadow-sm text-blue-600'}`}>
            <Pencil size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={`text-3xl font-black uppercase tracking-tighter ${isRamadhan ? 'text-emerald-50' : 'text-slate-900'}`}>
              Edit <span className={isRamadhan ? 'text-emerald-500' : ''}>WO #{id}</span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
              Modifikasi Data Laporan Teknis
            </p>
          </div>
        </div>
        
        <form action={updateWO} className={`p-8 md:p-10 rounded-[2.5rem] shadow-2xl border space-y-8 transition-all duration-500 ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-black/60' : 'bg-white border-slate-200'}`}>
          
          {/* SUBJECT WO */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>
              <LayoutGrid size={12} /> Subject Work Order
            </label>
            <input 
              name="subject" 
              defaultValue={wo['SUBJECT WO']} 
              className={`w-full p-5 rounded-2xl text-sm font-bold outline-none border transition-all ${
                isRamadhan 
                ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500 shadow-inner' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500'
              }`} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STATUS */}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Activity size={12} /> Update Status
              </label>
              <select 
                name="status" 
                defaultValue={wo.STATUS} 
                className={`w-full p-5 rounded-2xl text-sm font-bold outline-none border appearance-none transition-all cursor-pointer ${
                  isRamadhan 
                  ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="PROGRESS">PROGRESS</option>
                <option value="SOLVED">SOLVED</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCEL">CANCEL</option>
              </select>
            </div>
            
            {/* NAMA TEAM */}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Users size={12} /> Team Lapangan
              </label>
              <input 
                name="team" 
                defaultValue={wo['NAMA TEAM']} 
                className={`w-full p-5 rounded-2xl text-sm font-bold outline-none border transition-all ${
                  isRamadhan 
                  ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900'
                }`} 
              />
            </div>
          </div>

          {/* KETERANGAN */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>
              Keterangan / Detail Pekerjaan
            </label>
            <textarea 
              name="detail" 
              defaultValue={wo['KETERANGAN']} 
              rows={5} 
              className={`w-full p-5 rounded-2xl text-sm font-bold outline-none border transition-all resize-none ${
                isRamadhan 
                ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500 shadow-inner' 
                : 'bg-slate-50 border-slate-200 text-slate-900'
              }`} 
            />
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
              type="submit" 
              className={`flex-1 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 shadow-2xl active:scale-95 ${
                isRamadhan 
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-900/40' 
                : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
            >
              <Save size={18} strokeWidth={3} /> Simpan Perubahan
            </button>
            <Link 
              href={`/work-orders/${id}`} 
              className={`px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex justify-center items-center gap-3 active:scale-95 border ${
                isRamadhan 
                ? 'bg-transparent border-emerald-800 text-emerald-700 hover:text-emerald-500 hover:bg-emerald-950/30' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <X size={18} strokeWidth={3} /> Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}