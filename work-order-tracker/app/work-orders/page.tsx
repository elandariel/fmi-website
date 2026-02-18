'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ClipboardList, Plus, Search, Eye, Moon, Star, Calendar, Users, Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

// 1. IMPORT TOAST (SONNER)
import { toast } from 'sonner';

export default function WorkOrderPage() {
  const isRamadhan = true; // SAKLAR TEMA
  const [wos, setWos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [search, setSearch] = useState('');

  // Setup Supabase Client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    async function init() {
      try {
        // 1. Ambil Role User
        const { data: { user } } = await supabase.auth.getUser();
        if(user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          setUserRole(profile?.role as Role);
        }
        
        // 2. Ambil Data WO
        const { data, error } = await supabase.from('Report Bulanan').select('*').order('id', { ascending: false });
        
        if (error) {
          toast.error('Gagal memuat data Work Order', {
            description: error.message
          });
        } else if (data) {
          setWos(data);
        }
      } catch (err: any) {
        toast.error('Terjadi kesalahan sistem');
      } finally {
        setLoading(false);
      }
    }
    init();
    // Dependency array dikosongkan untuk menghindari error "size changed between renders"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Logika Proteksi
  const canCreate = hasAccess(userRole, PERMISSIONS.WO_CREATE);
  
  // Filter Search
  const filteredWos = wos.filter(wo => 
    (wo['SUBJECT WO'] || '').toLowerCase().includes(search.toLowerCase()) ||
    (wo['NAMA TEAM'] || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`p-6 min-h-screen font-sans transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 relative">
        {isRamadhan && (
          <div className="absolute -top-4 -left-4 opacity-10 animate-pulse">
            <Star className="text-amber-500" size={40} />
          </div>
        )}

        <div>
           <h1 className={`text-3xl font-black uppercase tracking-tighter flex items-center gap-3 ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
             <ClipboardList className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} size={32} /> 
             Work <span className={isRamadhan ? 'text-emerald-500' : ''}>Orders</span>
           </h1>
           <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mt-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>
             Pusat Kendali Laporan Bulanan & Aktivasi
           </p>
        </div>

        {canCreate && (
          <Link href="/work-orders/create">
            <button className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl active:scale-95 ${
              isRamadhan 
              ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-900/20' 
              : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}>
              <Plus size={18} strokeWidth={3} /> Input WO Baru
            </button>
          </Link>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className={`rounded-[2.5rem] shadow-2xl overflow-hidden border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-black/40' : 'bg-white border-slate-200 shadow-sm'}`}>
         
         {/* Search Bar - Cyber Style */}
         <div className={`p-6 border-b ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
            <div className="relative max-w-md group">
               <Search className={`absolute left-4 top-3 transition-colors ${isRamadhan ? 'text-emerald-800 group-focus-within:text-amber-500' : 'text-slate-400'}`} size={20}/>
               <input 
                 type="text" 
                 placeholder="Cari Berdasarkan Perihal / Team..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className={`w-full pl-12 pr-6 py-3 rounded-2xl text-sm font-bold outline-none transition-all border ${
                   isRamadhan 
                   ? 'bg-[#020c09] border-emerald-800 text-emerald-50 placeholder:text-emerald-900 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/10' 
                   : 'bg-white border-slate-200 text-black focus:ring-2 focus:ring-blue-500'
                 }`} 
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className={`font-black uppercase text-[10px] tracking-[0.2em] border-b ${isRamadhan ? 'bg-emerald-900/10 border-emerald-800/50 text-emerald-600' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                  <tr>
                      <th className="px-8 py-5 flex items-center gap-2"><Calendar size={14}/> Tanggal</th>
                      <th className="px-8 py-5">Subject Laporan</th>
                      <th className="px-8 py-5 text-center">Status Operasional</th>
                      <th className="px-8 py-5 text-center"><Users size={14} className="inline mr-1"/> Team Pelaksana</th>
                      <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
               </thead>
               <tbody className={`divide-y ${isRamadhan ? 'divide-emerald-900/30' : 'divide-slate-100'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <Loader2 className={`animate-spin mx-auto ${isRamadhan ? 'text-amber-500' : 'text-blue-600'}`} size={40} />
                        <p className={`mt-4 font-bold tracking-widest uppercase text-[10px] ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>Mendownload Data dari Pusat...</p>
                      </td>
                    </tr>
                  ) : filteredWos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`p-20 text-center font-bold italic ${isRamadhan ? 'text-emerald-900' : 'text-slate-400'}`}>
                        -- Belum ada rekaman pekerjaan di database --
                      </td>
                    </tr>
                  ) : (
                    filteredWos.map(wo => (
                        <tr key={wo.id} className={`transition-all ${isRamadhan ? 'hover:bg-emerald-500/5' : 'hover:bg-slate-50'}`}>
                           <td className="px-8 py-6">
                              <span className={`font-mono text-xs font-black tracking-tighter ${isRamadhan ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {wo.TANGGAL}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className={`font-bold text-sm tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                                {wo['SUBJECT WO']}
                              </div>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                (wo.STATUS || '').includes('SOLVED') 
                                  ? (isRamadhan ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200') : 
                                (wo.STATUS || '').includes('PENDING') 
                                  ? (isRamadhan ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200') :
                                  (isRamadhan ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100')
                              }`}>
                                {wo.STATUS}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-center">
                             {wo['NAMA TEAM'] ? (
                               <span className={`px-3 py-1.5 rounded-lg border font-black text-[10px] tracking-wider ${isRamadhan ? 'bg-[#020c09] border-emerald-900 text-emerald-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                 {wo['NAMA TEAM']}
                               </span>
                             ) : <span className="opacity-20">—</span>}
                           </td>
                           <td className="px-8 py-6 text-center">
                              <Link 
                                href={`/work-orders/${wo.id}`} 
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                                  isRamadhan 
                                  ? 'bg-emerald-900/20 border-emerald-800 text-amber-500 hover:bg-amber-500 hover:text-black' 
                                  : 'text-blue-600 hover:bg-blue-50 border-blue-100'
                                }`}
                              >
                                <Eye size={14} strokeWidth={3} /> Detail
                              </Link>
                           </td>
                        </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-3xl border text-center ${isRamadhan ? 'bg-emerald-950/20 border-emerald-900 shadow-lg shadow-black/20' : 'bg-white'}`}>
             <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isRamadhan ? 'text-emerald-700' : 'text-slate-400'}`}>Total Laporan</p>
             <p className={`text-xl font-black ${isRamadhan ? 'text-emerald-100' : 'text-slate-800'}`}>{filteredWos.length}</p>
          </div>
          {isRamadhan && (
            <div className="col-span-2 md:col-span-3 flex items-center justify-end px-6 italic text-[10px] text-emerald-900 font-bold tracking-widest">
               NOC WORK-ORDER MANAGEMENT SYSTEM • VERSION 2026.4
            </div>
          )}
      </div>
    </div>
  );
}