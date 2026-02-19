'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Activity, Plus, List, Database, RefreshCw, 
  BarChart3, ArrowUpRight, Calendar, Moon, Star, 
  Coffee, Sparkles, Lamp, ListTodo
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { id as indonesia } from 'date-fns/locale';
import { Role, PERMISSIONS, hasAccess } from '@/lib/permissions';

// IMPORT COMPONENT
import AlertBanner from '@/components/AlertBanner';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEAM_CONFIG = {
  teamA: ['Anan', 'Shidiq'], 
  teamB: ['Ilham', 'Andi'],
  isWeekA_Morning: getISOWeek(new Date()) % 2 !== 0 
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  
  const [stats, setStats] = useState({
    totalClient: 0,
    totalVlanUsed: 0,
    totalVlanFree: 0,
    growthMonth: 0,
    logsToday: 0,
    woPending: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartTab, setChartTab] = useState<'CLIENT' | 'CAPACITY'>('CLIENT');
  const [chartData, setChartData] = useState<any>({ client: [], capacity: [] });
  const [chartSummary, setChartSummary] = useState({ pasang: 0, putus: 0, BerhentiSementara: 0, upgrade: 0, downgrade: 0 });
  
  const [showInbox, setShowInbox] = useState(false); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const morningSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamA : TEAM_CONFIG.teamB;
  const afternoonSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamB : TEAM_CONFIG.teamA;

  const getRamadhanGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 5) return { msg: 'Selamat Makan Sahur', icon: <Moon className="text-amber-300" />, sub: 'Semoga kuat puasanya hari ini!' };
    if (hour >= 17 && hour < 19) return { msg: 'Selamat Berbuka Puasa', icon: <Coffee className="text-amber-500" />, sub: 'Selamat membatalkan puasa, barakallah.' };
    if (hour >= 19 || hour < 3) return { msg: 'Selamat Istirahat', icon: <Star className="text-emerald-400" />, sub: 'Jangan lupa niat puasa & shalat tarawih.' };
    return { msg: 'Selamat Berpuasa', icon: <Sparkles className="text-emerald-500" />, sub: 'Semangat kerja adalah bagian dari ibadah.' };
  };

  const ramadhan = getRamadhanGreeting();

  async function handleSyncSheet() {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) return alert("Izin ditolak.");
    setIsSyncing(true);
    try {
      const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_Kamhv6OJiN7bAtzzA2Z-tzkWvekJakQNRsPVGU1Xwmn_jePm2ZyiSf_RdU_5zUpr/exec";
      const syncTargets = [
        { name: 'Report Bulanan', sheetName: '2026', id: '1Yqr6tlJGo2yHE-9FJ_mCMpnehV-0Lpo2oiGUPWqAXOE' },
        { name: 'Berlangganan 2026', sheetName: 'Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
        { name: 'Berhenti Berlangganan 2026', sheetName: 'Berhenti Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
        { name: 'Berhenti Sementara 2026', sheetName: 'Berhenti Sementara 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
        { name: 'Upgrade 2026', sheetName: 'Upgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
        { name: 'Downgrade 2026', sheetName: 'Downgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' }
      ];
      for (const target of syncTargets) {
        await fetch('/api/sync-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableTarget: target.name, sheetName: target.sheetName, spreadsheetId: target.id, googleScriptUrl: GOOGLE_SCRIPT_URL })
        });
      }
      alert("✅ Data Berhasil Sinkron!");
    } catch (err) { alert("❌ Gagal sinkronisasi."); } finally { setIsSyncing(false); }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role as Role);
          setUserFullName(profile.full_name);
        }
      }

      const { count: clientCount } = await supabase.from('Data Client Corporate').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('Report Bulanan').select('id', { count: 'exact', head: true }).in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']);
      
      const tables = ['Berlangganan 2026', 'Berhenti Berlangganan 2026', 'Berhenti Sementara 2026', 'Upgrade 2026', 'Downgrade 2026'];
      const responses = await Promise.all(tables.map(t => supabase.from(t).select('TANGGAL')));
      const groupByMonth = (data: any[]) => {
        const months = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) months[new Date(row.TANGGAL).getMonth()]++; });
        return months;
      };
      const d = responses.map(r => groupByMonth(r.data || []));

      setChartData({
        client: [{ name: 'Berlangganan', data: d[0] }, { name: 'Berhenti', data: d[1] }, { name: 'BerhentiSementara', data: d[2] }],
        capacity: [{ name: 'Upgrade', data: d[3] }, { name: 'Downgrade', data: d[4] }]
      });

      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      setRecentLogs(logs || []);
      setStats(prev => ({ ...prev, totalClient: clientCount || 0, woPending: pendingCount || 0, growthMonth: d[0][new Date().getMonth()] }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="p-6 bg-[#051109] min-h-screen font-sans relative text-left text-slate-100 overflow-x-hidden">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute -top-20 -right-20 opacity-10 pointer-events-none rotate-12 z-0">
        <Moon size={400} className="text-emerald-500" />
      </div>

      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-3 bg-emerald-900/30 w-fit px-4 py-1.5 rounded-full border border-emerald-500/20">
            {ramadhan.icon}
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.2em]">
               {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: indonesia })} • 1447 H
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">
            {ramadhan.msg}, <span className="text-amber-400">{userFullName ? userFullName.split(' ')[0] : 'NOC'}</span>
          </h1>
          <p className="text-emerald-500/60 mt-2 font-medium italic">{ramadhan.sub}</p>
        </div>

        <div className="flex items-center gap-4">
          {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
            <button onClick={handleSyncSheet} disabled={isSyncing} className="flex items-center gap-2 px-5 py-3 bg-[#0a1f12] border border-emerald-500/30 text-emerald-400 rounded-2xl font-bold shadow-xl hover:bg-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">
                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                <span className="text-xs uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          )}
          <Link href="/work-orders/create">
            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500 transition-all active:scale-95 border-b-4 border-emerald-800 text-xs tracking-widest">
              <Plus size={20} /> BUAT WO BARU
            </button>
          </Link>
        </div>
      </div>

      {/* 2. ALERT BANNER SECTION (Memberikan space yang jelas) */}
      <div className="relative z-20 mb-10 w-full">
         <AlertBanner />
      </div>

      {/* 3. STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        <StatCard title="Total Client" value={stats.totalClient} icon={<Users size={24} />} color="emerald" />
        <StatCard title="WO Aktif" value={stats.woPending} icon={<Activity size={24} />} color="amber" />
        <StatCard title="Bulan Ini" value={`+${stats.growthMonth}`} icon={<ArrowUpRight size={24} />} color="emerald" />
        <StatCard title="Log Hari Ini" value={stats.logsToday} icon={<List size={24} />} color="amber" />
      </div>

      {/* 4. MAIN CONTENT GRID (Charts & Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* CHART SECTION */}
        <div className="lg:col-span-2 bg-[#0a1f12] rounded-[2.5rem] border border-emerald-500/10 p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                <BarChart3 className="text-emerald-500" /> Statistik Jaringan 2026
              </h3>
            </div>
            <div className="flex bg-[#051109] p-1.5 rounded-2xl border border-emerald-500/20">
              <button onClick={() => setChartTab('CLIENT')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${chartTab === 'CLIENT' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:text-emerald-500'}`}>PELANGGAN</button>
              <button onClick={() => setChartTab('CAPACITY')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${chartTab === 'CAPACITY' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:text-emerald-500'}`}>KAPASITAS</button>
            </div>
          </div>
          <div className="min-h-[300px]">
            <ReactApexChart 
              options={{ 
                chart: { toolbar: { show: false }, background: 'transparent' },
                theme: { mode: 'dark' },
                colors: ['#10b981', '#f43f5e', '#fbbf24'],
                stroke: { curve: 'smooth', width: 3 },
                grid: { borderColor: '#1e3a2a' },
                xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] }
              }} 
              series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity} 
              type="area" height={300} 
            />
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-8">
          <div className="bg-gradient-to-br from-emerald-900/40 to-transparent p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-xl">
            <h3 className="font-black text-white mb-6 flex items-center gap-3 uppercase text-sm tracking-widest"><Calendar size={20} className="text-amber-400"/> Jadwal Team</h3>
            <div className="space-y-4">
              <div className="bg-[#051109] p-4 rounded-3xl border border-emerald-500/10">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-3 flex justify-between"><span>Pagi</span> <Lamp size={12}/></p>
                <div className="flex gap-2">{morningSquad.map((n, i) => <span key={i} className="flex-1 text-center py-2 bg-emerald-900/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/20">{n}</span>)}</div>
              </div>
              <div className="bg-[#051109] p-4 rounded-3xl border border-amber-500/10">
                <p className="text-[10px] font-black text-amber-500 uppercase mb-3 flex justify-between"><span>Malam</span> <Moon size={12}/></p>
                <div className="flex gap-2">{afternoonSquad.map((n, i) => <span key={i} className="flex-1 text-center py-2 bg-amber-900/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/20">{n}</span>)}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#0a1f12] rounded-[2.5rem] border border-emerald-500/10 flex flex-col flex-1 overflow-hidden">
            <div className="p-5 border-b border-emerald-500/10 flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest text-emerald-500">Aktivitas Terbaru</h3>
              <Link href="/activity-log"><List size={18} className="text-emerald-700 hover:text-emerald-400 transition-colors"/></Link>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto max-h-[250px]">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-emerald-900/20 rounded-2xl flex gap-3 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0 border border-emerald-500/20 group-hover:border-emerald-500 transition-all">{log.actor?.substring(0,2)}</div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-white truncate">{log.actor}</p>
                    <p className="text-[10px] text-emerald-500/70 truncate">{log.SUBJECT}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION */}
      <button onClick={() => setShowInbox(true)} className="fixed bottom-10 right-10 z-40 bg-emerald-600 hover:bg-emerald-400 text-white p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all active:scale-90 border-4 border-[#051109]">
        <ListTodo size={32} />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        .apexcharts-tooltip { background: #0a1f12 !important; border: 1px solid #10b981 !important; color: white !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #1e3a2a; border-radius: 10px; }
      `}} />
    </div>
  );
}

// --- SUB COMPONENTS ---

function StatCard({ title, value, icon, color }: any) {
  const c: any = { 
    emerald: 'from-emerald-600/20 to-transparent border-emerald-500/30 text-emerald-400', 
    amber: 'from-amber-600/20 to-transparent border-amber-500/30 text-amber-400' 
  };
  return (
    <div className={`bg-gradient-to-br ${c[color]} border p-8 rounded-[2.5rem] shadow-xl relative group overflow-hidden`}>
      <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <div className="mb-6 p-4 bg-[#051109] rounded-2xl w-fit border border-current shadow-inner group-hover:rotate-12 transition-transform">{icon}</div>
      <h3 className="text-4xl font-black text-white mb-1 tracking-tight">{value}</h3>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{title}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 bg-[#051109] min-h-screen animate-pulse flex flex-col items-center justify-center">
      <Sparkles className="text-emerald-800 animate-bounce mb-4" size={48} />
      <p className="text-emerald-900 font-black tracking-widest uppercase text-xs">Menyiapkan Berkah Ramadhan...</p>
    </div>
  );
}