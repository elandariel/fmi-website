'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  Search, RefreshCcw, Download, ChevronDown, X, 
  TrendingUp, UserPlus, Server, Globe, Plus, Calendar, Moon, Star, Filter, LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner'; 
import MonthlySummary from '@/components/MonthlySummary';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TABLE_MAP = {
  'Berlangganan': 'Berlangganan 2026',
  'Berhenti Berlangganan': 'Berhenti Berlangganan 2026',
  'Berhenti Sementara': 'Berhenti Sementara 2026',
  'Upgrade': 'Upgrade 2026',
  'Downgrade': 'Downgrade 2026'
};

export default function TrackerPage() {
  const isRamadhan = true; // SAKLAR TEMA
  const [selectedCategory, setSelectedCategory] = useState('Berlangganan');
  const [dataList, setDataList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const summaryRef = useRef<any>(null);
  const [targetMonth, setTargetMonth] = useState('2026-01');
  const [showModal, setShowModal] = useState(false);
  const [modalChartMode, setModalChartMode] = useState('ISP');
  const [globalStats, setGlobalStats] = useState<any>({ 
    pasang: 0, putus: 0, cuti: 0, netGrowth: 0,
    byIsp: [], byBts: []
  });

  const [chartTrend, setChartTrend] = useState<any>({ series: [], options: {} });
  const [chartTeam, setChartTeam] = useState<any>({ series: [], options: {} });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if(profile) setUserRole(profile.role as Role);
    }

    const tableName = TABLE_MAP[selectedCategory as keyof typeof TABLE_MAP];
    if (!tableName) {
        setLoading(false);
        return;
    }

    const { data, error } = await supabase.from(tableName).select('*').order('TANGGAL', { ascending: false });
    if (!error) {
      setDataList(data || []);
      processMainCharts(data || [], selectedCategory);
    }
    setLoading(false);
  }

  async function fetchGlobalStats() {
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
    } catch (err) { console.error(err); }
  }

  useEffect(() => { fetchData(); }, [selectedCategory]);
  useEffect(() => { fetchGlobalStats(); }, []);

  const processMainCharts = (data: any[], category: string) => {
    const dateMap: any = {};
    data.forEach(row => {
      if(row.TANGGAL) {
        const d = row.TANGGAL.substring(0, 7); 
        dateMap[d] = (dateMap[d] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateMap).sort();
    
    let color = isRamadhan ? '#10b981' : '#3b82f6'; 
    if(category.includes('Berhenti')) color = '#f43f5e'; 
    if(category.includes('Upgrade')) color = '#f59e0b'; 

    setChartTrend({
      series: [{ name: 'Total', data: sortedDates.map(d => dateMap[d]) }],
      options: {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: { 
            categories: sortedDates,
            labels: { style: { colors: isRamadhan ? '#334155' : '#64748b' } } 
        },
        yaxis: { labels: { style: { colors: isRamadhan ? '#334155' : '#64748b' } } },
        colors: [color],
        grid: { borderColor: isRamadhan ? '#06281e' : '#f1f5f9' },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 } },
        title: { text: `TREN DATA ${category.toUpperCase()}`, style: { color: isRamadhan ? '#ecfdf5' : '#1e293b', fontWeight: 900 } },
        tooltip: { theme: 'dark' }
      }
    });

    const teamMap: any = {};
    data.forEach(row => {
      const t = row.TEAM || 'Unknown';
      teamMap[t] = (teamMap[t] || 0) + 1;
    });
    const sortedTeams = Object.keys(teamMap).sort((a,b) => teamMap[b] - teamMap[a]).slice(0, 5);

    setChartTeam({
      series: [{ name: 'Eksekusi', data: sortedTeams.map(t => teamMap[t]) }],
      options: {
        chart: { type: 'bar', toolbar: { show: false } },
        xaxis: { categories: sortedTeams, labels: { style: { colors: isRamadhan ? '#334155' : '#64748b' } } },
        colors: [isRamadhan ? '#f59e0b' : '#3b82f6'],
        plotOptions: { bar: { borderRadius: 8, columnWidth: '40%' } },
        title: { text: 'TOP TEAM PERFORMANCE', style: { color: isRamadhan ? '#ecfdf5' : '#1e293b', fontWeight: 900 } },
        tooltip: { theme: 'dark' },
        dataLabels: { enabled: false }
      }
    });
  };

  const getSubject = (row: any) => {
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

  const canInput = hasAccess(userRole, PERMISSIONS.TRACKER_INPUT);

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans transition-colors duration-500 ${isRamadhan ? 'bg-[#020c09]' : 'bg-slate-50'}`}>
      
      {/* BACKGROUND DECOR */}
      {isRamadhan && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Moon className="absolute top-10 right-20 text-emerald-900/10" size={300} />
          <Star className="absolute top-40 left-20 text-amber-500/5 animate-pulse" size={50} />
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LayoutDashboard className={isRamadhan ? 'text-amber-500' : 'text-blue-600'} size={18} />
              <p className={`font-black text-[10px] uppercase tracking-[0.3em] ${isRamadhan ? 'text-emerald-500' : 'text-blue-600'}`}>
                Operational Tracker
              </p>
            </div>
            <h1 className={`text-4xl font-black tracking-tighter uppercase ${isRamadhan ? 'text-emerald-50' : 'text-slate-900'}`}>
              Weekly <span className={isRamadhan ? 'text-emerald-500' : 'text-slate-400'}>Report</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowModal(true)} 
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${
                isRamadhan ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400 hover:border-amber-500' : 'bg-white text-slate-700'
              }`}
            >
              <TrendingUp size={16} className="text-amber-500" /> Global Stats
            </button>
            
            {canInput && (
              <Link href="/tracker/create">
                <button className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                  isRamadhan ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-blue-600 text-white'
                }`}>
                  <Plus size={18} strokeWidth={3} /> Input Baru
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* TAB NAV */}
        <div className={`inline-flex p-1.5 rounded-2xl border mb-10 overflow-x-auto max-w-full ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-slate-200/50 border-slate-200'}`}>
          {Object.keys(TABLE_MAP).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? (isRamadhan ? 'bg-emerald-500 text-black shadow-lg' : 'bg-white text-blue-600 shadow-sm')
                  : (isRamadhan ? 'text-emerald-700 hover:text-emerald-400' : 'text-slate-500')
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className={`p-6 rounded-[2.5rem] border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50' : 'bg-white border-slate-200'}`}>
            <div className="h-72">
              {chartTrend.series.length > 0 && <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height="100%" />}
            </div>
          </div>
          <div className={`p-6 rounded-[2.5rem] border transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50' : 'bg-white border-slate-200'}`}>
            <div className="h-72">
              {chartTeam.series.length > 0 && <ReactApexChart options={chartTeam.options} series={chartTeam.series} type="bar" height="100%" />}
            </div>
          </div>
        </div>

        {/* SUMMARY SECTION */}
        <div className={`mb-12 p-8 rounded-[3rem] border ${isRamadhan ? 'bg-emerald-950/10 border-emerald-800/30' : 'bg-white'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${isRamadhan ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>Monthly Summary</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isRamadhan ? 'text-emerald-700' : 'text-slate-500'}`}>Rekap Performa Bulanan</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className={`flex items-center gap-2 p-1 rounded-xl border ${isRamadhan ? 'bg-[#020c09] border-emerald-800' : 'bg-white border-slate-200'}`}>
                        <button onClick={() => summaryRef.current?.handleExport()} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 rounded-lg">Excel</button>
                        <button onClick={() => window.print()} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-lg">PDF</button>
                    </div>
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isRamadhan ? 'bg-[#020c09] border-emerald-800' : 'bg-white border-slate-200'}`}>
                        <Filter size={14} className="text-emerald-700" />
                        <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${isRamadhan ? 'text-emerald-400' : 'text-blue-600'}`} />
                    </div>
                </div>
            </div>
            <MonthlySummary ref={summaryRef} selectedMonth={targetMonth} />
        </div>

        {/* DATA TABLE */}
        <div className={`rounded-[2.5rem] border overflow-hidden transition-all ${isRamadhan ? 'bg-[#041a14] border-emerald-800/50 shadow-2xl shadow-black/60' : 'bg-white border-slate-200'}`}>
          <div className={`p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6 ${isRamadhan ? 'border-emerald-800/50' : 'border-slate-100'}`}>
            <div className="flex items-center gap-4">
                <h3 className={`font-black uppercase tracking-widest text-xs ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>Data {selectedCategory}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${isRamadhan ? 'bg-emerald-500 text-black' : 'bg-blue-600 text-white'}`}>
                    {filteredData.length}
                </span>
            </div>
            <div className="relative w-full md:w-96 group">
              <Search className={`absolute left-4 top-3 transition-colors ${isRamadhan ? 'text-emerald-800 group-focus-within:text-amber-500' : 'text-slate-400'}`} size={18} />
              <input 
                type="text" 
                placeholder="Cari Pelanggan / BTS / Team..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className={`w-full pl-12 pr-6 py-3 rounded-2xl text-xs font-bold outline-none border transition-all ${
                    isRamadhan 
                    ? 'bg-[#020c09] border-emerald-800 text-emerald-50 focus:border-amber-500 placeholder:text-emerald-950' 
                    : 'bg-slate-50 border-slate-200'
                }`} 
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`text-[9px] font-black uppercase tracking-[0.2em] border-b ${isRamadhan ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                <tr>
                  <th className="px-8 py-5">Tanggal</th>
                  <th className="px-8 py-5">Subject Pelanggan</th>
                  <th className="px-8 py-5">Provider</th> 
                  <th className="px-8 py-5">Team</th>
                  <th className="px-8 py-5">BTS</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isRamadhan ? 'divide-emerald-900/30' : 'divide-slate-100'}`}>
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-emerald-900 animate-pulse">SINKRONISASI DATA...</td></tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className={`transition-colors group ${isRamadhan ? 'hover:bg-emerald-500/5' : 'hover:bg-slate-50'}`}>
                      <td className={`px-8 py-5 text-[11px] font-bold ${isRamadhan ? 'text-emerald-500' : 'text-slate-600'}`}>
                        {row.TANGGAL ? format(new Date(row.TANGGAL), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-8 py-5">
                        <div className={`font-black text-xs uppercase tracking-tight ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>{getSubject(row)}</div>
                        <div className={`text-[10px] font-medium italic mt-1 truncate max-w-xs ${isRamadhan ? 'text-emerald-800' : 'text-slate-400'}`}>
                          {row['PROBLEM'] || row['REASON'] || row['KETERANGAN'] || ''}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            isRamadhan ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {row.ISP || 'INTERNAL'}
                        </span>
                      </td>
                      <td className={`px-8 py-5 text-[10px] font-black uppercase ${isRamadhan ? 'text-emerald-600' : 'text-slate-700'}`}>
                         {row.TEAM || '-'}
                      </td>
                      <td className="px-8 py-5">
                          <div className={`flex items-center gap-2 text-[10px] font-bold ${isRamadhan ? 'text-emerald-700' : 'text-slate-600'}`}>
                              <Server size={12} />
                              <span className="font-mono">{row.BTS || '-'}</span>
                          </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-emerald-900">DATA TIDAK DITEMUKAN</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL GLOBAL STATS */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020c09]/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#041a14] rounded-[3rem] border border-emerald-800 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(16,185,129,0.1)]">
            <div className="p-8 border-b border-emerald-800/50 flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-emerald-50 uppercase tracking-tighter flex items-center gap-3">
                    <TrendingUp className="text-amber-500" /> Summary Growth 2026
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">Akumulasi Seluruh Data Berlangganan</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-emerald-950/50 text-emerald-500 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 overflow-y-auto flex-1 space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-emerald-500 p-6 rounded-3xl shadow-xl shadow-emerald-900/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Net Growth</p>
                  <h3 className="text-4xl font-black text-black mt-2">{globalStats.netGrowth}</h3>
                </div>
                <div className="bg-[#020c09] border border-emerald-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Pasang</p>
                  <h3 className="text-4xl font-black text-emerald-500 mt-2">{globalStats.pasang}</h3>
                </div>
                <div className="bg-[#020c09] border border-emerald-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Putus</p>
                  <h3 className="text-4xl font-black text-rose-500 mt-2">{globalStats.putus}</h3>
                </div>
                <div className="bg-[#020c09] border border-emerald-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Cuti</p>
                  <h3 className="text-4xl font-black text-amber-500 mt-2">{globalStats.cuti}</h3>
                </div>
              </div>

              <div className="bg-[#020c09] p-8 rounded-[2.5rem] border border-emerald-800/50">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <h4 className="font-black text-emerald-50 uppercase tracking-widest text-xs">Distribusi Pasang Baru</h4>
                    <div className="flex bg-emerald-950/30 p-1.5 rounded-2xl border border-emerald-800/50">
                        <button onClick={() => setModalChartMode('ISP')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalChartMode === 'ISP' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-700'}`}>PER ISP</button>
                        <button onClick={() => setModalChartMode('BTS')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalChartMode === 'BTS' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-700'}`}>PER BTS</button>
                    </div>
                 </div>
                 <div className="h-[450px]">
                    <ReactApexChart 
                      type="bar" 
                      height="100%"
                      series={[{ name: 'Total', data: modalChartMode === 'ISP' ? globalStats.byIsp.map((i:any) => i.data) : globalStats.byBts.map((i:any) => i.data) }]}
                      options={{
                        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                        plotOptions: { bar: { horizontal: true, borderRadius: 10, barHeight: '60%' } },
                        colors: [modalChartMode === 'ISP' ? '#10b981' : '#f59e0b'],
                        xaxis: { 
                            categories: modalChartMode === 'ISP' ? globalStats.byIsp.map((i:any) => i.name) : globalStats.byBts.map((i:any) => i.name),
                            labels: { style: { colors: '#064e3b', fontWeight: 'bold' } }
                        },
                        yaxis: { labels: { style: { colors: '#ecfdf5', fontWeight: 'bold' } } },
                        grid: { borderColor: '#06281e' },
                        tooltip: { theme: 'dark' },
                        dataLabels: { enabled: true, style: { colors: ['#000'], fontWeight: '900' } }
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