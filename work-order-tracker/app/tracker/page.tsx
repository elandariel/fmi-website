'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  Search, RefreshCcw, Download, ChevronDown, X, 
  TrendingUp, UserPlus, Server, Globe, Plus 
} from 'lucide-react';
import { format } from 'date-fns';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner'; 

// Setup ApexCharts (No SSR)
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// --- FIX 1: UPDATE KEY MAPPING AGAR SESUAI DEFAULT STATE ---
const TABLE_MAP = {
  'Berlangganan': 'Berlangganan 2026',
  'Berhenti Berlangganan': 'Berhenti Berlangganan 2026',
  'Berhenti Sementara': 'Berhenti Sementara 2026',
  'Upgrade': 'Upgrade 2026',
  'Downgrade': 'Downgrade 2026'
};

export default function TrackerPage() {
  // State default adalah 'Berlangganan', jadi TABLE_MAP harus punya key 'Berlangganan'
  const [selectedCategory, setSelectedCategory] = useState('Berlangganan');
  const [dataList, setDataList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<Role | null>(null);
   
  // State Modal Global Stats
  const [showModal, setShowModal] = useState(false);
  const [modalChartMode, setModalChartMode] = useState('ISP');
  const [globalStats, setGlobalStats] = useState<any>({ 
    pasang: 0, putus: 0, cuti: 0, netGrowth: 0,
    byIsp: [], byBts: []
  });

  // State Chart Halaman Utama
  const [chartTrend, setChartTrend] = useState<any>({ series: [], options: {} });
  const [chartTeam, setChartTeam] = useState<any>({ series: [], options: {} });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // --- 1. FETCH DATA UTAMA & ROLE ---
  async function fetchData() {
    setLoading(true);
    
    // A. Ambil Role User
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if(profile) setUserRole(profile.role as Role);
    }

    // B. Ambil Data Table
    const tableName = TABLE_MAP[selectedCategory as keyof typeof TABLE_MAP];
    
    // --- FIX 2: SAFETY CHECK (Anti Crash) ---
    // Jika nama tabel tidak ketemu, hentikan proses jangan sampai Supabase error
    if (!tableName) {
        console.error("Mapping tabel tidak ditemukan untuk kategori:", selectedCategory);
        toast.error(`Kategori '${selectedCategory}' belum di-mapping ke database.`);
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('TANGGAL', { ascending: false });

    if (error) {
      console.error('Error fetching:', error);
      toast.error("Gagal memuat data: " + error.message);
    } else {
      setDataList(data || []);
      processMainCharts(data || [], selectedCategory);
    }
    setLoading(false);
  }

  // --- 2. FETCH GLOBAL STATS ---
  async function fetchGlobalStats() {
    // Kita bungkus try-catch biar aman
    try {
        const [resPasang, resPutus, resCuti] = await Promise.all([
          supabase.from('Berlangganan 2026').select('id, ISP, BTS'),
          supabase.from('Berhenti Berlangganan 2026').select('id'),
          supabase.from('Berhenti Sementara 2026').select('id')
        ]);
    
        const pasang = resPasang.data?.length || 0;
        const putus = resPutus.data?.length || 0;
        const cuti = resCuti.data?.length || 0;
        
        const ispMap: any = {};
        const btsMap: any = {};
    
        resPasang.data?.forEach(row => {
          const isp = row.ISP || 'Unknown';
          ispMap[isp] = (ispMap[isp] || 0) + 1;
          const bts = row.BTS || 'Unknown';
          btsMap[bts] = (btsMap[bts] || 0) + 1;
        });
    
        setGlobalStats({
          pasang, putus, cuti,
          netGrowth: pasang - putus,
          byIsp: Object.keys(ispMap).map(k => ({ name: k, data: ispMap[k] })).sort((a,b) => b.data - a.data).slice(0, 15),
          byBts: Object.keys(btsMap).map(k => ({ name: k, data: btsMap[k] })).sort((a,b) => b.data - a.data).slice(0, 15)
        });
    } catch (err) {
        console.error("Gagal load global stats", err);
    }
  }

  useEffect(() => { fetchData(); }, [selectedCategory]);
  useEffect(() => { fetchGlobalStats(); }, []);

  // --- 3. PROSES CHART ---
  const processMainCharts = (data: any[], category: string) => {
    const dateMap: any = {};
    data.forEach(row => {
      if(row.TANGGAL) {
        const d = row.TANGGAL.substring(0, 7); 
        dateMap[d] = (dateMap[d] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateMap).sort();
    
    let color = '#10b981'; 
    if(category.includes('Berhenti') || category.includes('Cuti')) color = '#ef4444'; 
    if(category.includes('Upgrade') || category.includes('Downgrade')) color = '#3b82f6'; 

    setChartTrend({
      series: [{ name: 'Jumlah', data: sortedDates.map(d => dateMap[d]) }],
      options: {
        chart: { type: 'area', toolbar: { show: false } },
        xaxis: { categories: sortedDates },
        colors: [color],
        stroke: { curve: 'smooth' },
        title: { text: `Tren ${category}`, style: { color: '#64748b' } }
      }
    });

    const teamMap: any = {};
    data.forEach(row => {
      const t = row.TEAM || 'Unknown';
      teamMap[t] = (teamMap[t] || 0) + 1;
    });
    const sortedTeams = Object.keys(teamMap).sort((a,b) => teamMap[b] - teamMap[a]).slice(0, 5);

    setChartTeam({
      series: [{ name: 'Total', data: sortedTeams.map(t => teamMap[t]) }],
      options: {
        chart: { type: 'bar', toolbar: { show: false } },
        xaxis: { categories: sortedTeams },
        colors: [color],
        title: { text: 'Top Performance Team', style: { color: '#64748b' } }
      }
    });
  };

  const getSubject = (row: any) => {
    // Helper subject yang lebih aman
    return row['SUBJECT BERLANGGANAN'] || row['SUBJECT BERHENTI BERLANGGANAN'] || 
           row['SUBJECT BERHENTI SEMENTARA'] || row['SUBJECT UPGRADE'] || 
           row['SUBJECT DOWNGRADE'] || row['SUBJECT'] || 
           row['NAMA PELANGGAN'] || '-'; 
  };

  const filteredData = dataList.filter(item => {
    const s = search.toLowerCase();
    const subject = getSubject(item).toLowerCase();
    const bts = (item.BTS || '').toLowerCase();
    const team = (item.TEAM || '').toLowerCase();
    return subject.includes(s) || bts.includes(s) || team.includes(s);
  });

  // LOGIKA RBAC: Cek izin input
  const canInput = hasAccess(userRole, PERMISSIONS.TRACKER_INPUT);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER UTAMA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
                <UserPlus className="text-emerald-600" size={24} />
            </div>
            Weekly Report
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitoring status perubahan Client</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-bold shadow-sm transition-all">
            <TrendingUp size={18} className="text-indigo-600" /> Global Stats
          </button>
          
          {/* TOMBOL INPUT BARU (Hanya untuk SUPER_DEV & AKTIVATOR) */}
          {canInput && (
            <Link href="/tracker/create">
              <button className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                <Plus size={20} /> Input Baru
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* NAVIGASI TAB KATEGORI */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-xl w-fit border border-slate-200">
        {Object.keys(TABLE_MAP).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="h-72">
            {chartTrend.series.length > 0 && <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height="100%" />}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="h-72">
            {chartTeam.series.length > 0 && <ReactApexChart options={chartTeam.options} series={chartTeam.series} type="bar" height="100%" />}
          </div>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800">List {selectedCategory}</h3>
            <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-100">
                {filteredData.length}
            </span>
          </div>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari Subject / BTS / Team..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none w-full transition-all" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Subject Pelanggan</th>
                  <th className="px-6 py-4 text-emerald-600">Provider (ISP)</th> 
                  <th className="px-6 py-4">Team Eksekusi</th>
                  <th className="px-6 py-4">BTS Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400">Memuat data...</td></tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {row.TANGGAL ? format(new Date(row.TANGGAL), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{getSubject(row)}</div>
                        <div className="text-[10px] text-slate-400 italic truncate max-w-[200px]">
                          {row['PROBLEM'] || row['REASON'] || row['KETERANGAN'] || ''}
                        </div>
                      </td>
                      
                      {/* UPDATE ISI KOLOM ISP DI SINI */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-black border border-emerald-100 uppercase">
                          {row.ISP || 'INTERNAL'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase">
                              {row.TEAM || '-'}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                              <Server size={14} className="text-slate-400" />
                              <span className="font-mono text-xs">{row.BTS || '-'}</span>
                          </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL GLOBAL STATS --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" /> Summary Growth 2026
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <p className="text-[10px] font-bold uppercase opacity-80">Net Growth</p>
                  <h3 className="text-3xl font-black mt-1">{globalStats.netGrowth}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Berlangganan</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-1">{globalStats.pasang}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Berhenti Berlangganan</p>
                  <h3 className="text-3xl font-black text-red-600 mt-1">{globalStats.putus}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Berhenti Sementara</p>
                  <h3 className="text-3xl font-black text-amber-500 mt-1">{globalStats.cuti}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-700">Distribusi Pelanggan Pasang</h4>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setModalChartMode('ISP')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${modalChartMode === 'ISP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>PER ISP</button>
                        <button onClick={() => setModalChartMode('BTS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${modalChartMode === 'BTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>PER BTS</button>
                    </div>
                 </div>
                 <div className="h-[400px]">
                    <ReactApexChart 
                      type="bar" 
                      height="100%"
                      series={[{ name: 'Total', data: modalChartMode === 'ISP' ? globalStats.byIsp.map((i:any) => i.data) : globalStats.byBts.map((i:any) => i.data) }]}
                      options={{
                        chart: { toolbar: { show: false } },
                        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '70%' } },
                        colors: [modalChartMode === 'ISP' ? '#3b82f6' : '#8b5cf6'],
                        xaxis: { categories: modalChartMode === 'ISP' ? globalStats.byIsp.map((i:any) => i.name) : globalStats.byBts.map((i:any) => i.name) },
                        grid: { borderColor: '#f1f5f9' }
                      }}
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}