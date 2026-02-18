import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag, User, Calendar, Info, Pencil, Star, Moon, ShieldCheck, Zap } from 'lucide-react';

export default async function DetailWorkOrder({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const isRamadhan = true; // SAKLAR TEMA
  const { id } = await params;
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: wo, error } = await supabase
    .from('Report Bulanan')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !wo) {
    notFound();
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans transition-colors duration-500 relative overflow-hidden ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* BACKGROUND ORNAMENT */}
      {isRamadhan && (
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <Moon className="absolute -top-20 -right-20 text-emerald-500" size={400} />
          <Star className="absolute top-40 left-10 text-amber-500 animate-pulse" size={40} />
          <Star className="absolute bottom-40 right-20 text-emerald-500 animate-pulse" size={30} />
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Tombol Kembali */}
        <Link 
          href="/work-orders" 
          className={`inline-flex items-center gap-2 transition-all mb-8 group ${isRamadhan ? 'text-emerald-700 hover:text-amber-500' : 'text-slate-500 hover:text-blue-600'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${isRamadhan ? 'bg-emerald-950/30 group-hover:bg-amber-500/10' : 'bg-white shadow-sm'}`}>
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Kembali ke List</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} size={16} />
              <p className={`font-black text-[10px] uppercase tracking-[0.3em] ${isRamadhan ? 'text-emerald-500' : 'text-blue-600'}`}>
                Arsip Digital NOC
              </p>
            </div>
            <h1 className={`text-4xl font-black tracking-tighter uppercase leading-none ${isRamadhan ? 'text-emerald-50' : 'text-slate-900'}`}>
              WO <span className={isRamadhan ? 'text-amber-500' : 'text-slate-400'}>#{wo.id}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href={`/work-orders/${id}/edit`}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 border ${
                isRamadhan 
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 hover:border-amber-500 hover:text-amber-500 shadow-xl shadow-black/40' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
              }`}
            >
              <Pencil size={14} strokeWidth={3} /> Edit WO
            </Link>

            <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border ${
              wo.STATUS === 'SOLVED' 
              ? (isRamadhan ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-emerald-500 text-white')
              : (isRamadhan ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-amber-500 text-white')
            }`}>
              {wo.STATUS}
            </div>
          </div>
        </div>
        
        {/* Main Content Card */}
        <div className={`rounded-[3rem] shadow-2xl overflow-hidden border transition-all duration-500 ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-black/60' : 'bg-white border-slate-200'}`}>
          <div className="p-10">
            <div className="grid grid-cols-1 gap-12">
              
              {/* Subject Section */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                  <Tag size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Subject Perihal</span>
                </div>
                <p className={`text-2xl md:text-3xl font-black tracking-tight leading-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-900'}`}>
                  {wo['SUBJECT WO'] || 'N/A'}
                </p>
                <div className={`h-1 w-20 rounded-full ${isRamadhan ? 'bg-amber-500/50' : 'bg-blue-600'}`}></div>
              </div>

              {/* Info Grid */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 p-8 rounded-[2rem] border transition-colors ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/30' : 'bg-slate-50 border-slate-100'}`}>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <User size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Team Exec</span>
                  </div>
                  <p className={`font-bold text-sm uppercase ${isRamadhan ? 'text-emerald-400' : 'text-slate-800'}`}>{wo['NAMA TEAM'] || '-'}</p>
                </div>
                
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <Calendar size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Entry Date</span>
                  </div>
                  <p className={`font-bold text-sm ${isRamadhan ? 'text-emerald-400' : 'text-slate-800'}`}>{wo.TANGGAL || '-'}</p>
                </div>

                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <Zap size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Work Type</span>
                  </div>
                  <p className={`font-bold text-sm uppercase ${isRamadhan ? 'text-emerald-400' : 'text-slate-800'}`}>{wo['JENIS WO'] || '-'}</p>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-4">
                <div className={`flex items-center gap-2 ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                  <Info size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dokumentasi Pekerjaan</span>
                </div>
                <div className={`p-8 rounded-[2rem] border-l-8 transition-all ${
                  isRamadhan 
                  ? 'bg-[#020c09] border-emerald-500 text-emerald-100 shadow-inner' 
                  : 'bg-slate-50 border-blue-600 text-slate-700 shadow-sm'
                }`}>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                    {wo['KETERANGAN'] || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
          
          {/* Footer Card */}
          <div className={`px-10 py-6 flex justify-between items-center ${isRamadhan ? 'bg-emerald-950/40' : 'bg-slate-900'}`}>
             <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full animate-pulse ${isRamadhan ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
               <span className={`text-[9px] font-black tracking-[0.3em] uppercase ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>System Secured</span>
             </div>
             <span className={`text-[9px] font-black uppercase tracking-widest ${isRamadhan ? 'text-emerald-900' : 'text-slate-500'}`}>
               © {new Date().getFullYear()} NOC RAMADHAN CORE
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}