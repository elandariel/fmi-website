'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Activity, Plus, List, Database, RefreshCw, Archive, 
  ShieldAlert, Check, X, ListTodo, BarChart3, ArrowUpRight, 
  ArrowDownRight, MinusCircle, Calendar, ChevronDown, Search, 
  Download, ChevronRight, Inbox, Moon, Star, Sparkles, CloudMoon
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { id as indonesia } from 'date-fns/locale';
import { Role, PERMISSIONS, hasAccess } from '@/lib/permissions';

import AlertBanner from '@/components/AlertBanner';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEAM_CONFIG = {
  teamA: ['Anan', 'Shidiq'], 
  teamB: ['Ilham', 'Andi'],
  isWeekA_Morning: getISOWeek(new Date()) % 2 !== 0 
};

export default function Dashboard() {
  const isRamadhan = true; // SAKLAR UTAMA TEMA

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  
  const [stats, setStats] = useState({
    totalClient: 0, totalVlanUsed: 0, totalVlanFree: 0,
    growthMonth: 0, logsToday: 0, woPending: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartTab, setChartTab] = useState<'CLIENT' | 'CAPACITY'>('CLIENT');
  const [chartData, setChartData] = useState<any>({ client: [], capacity: [] });
  const [chartSummary, setChartSummary] = useState({ pasang: 0, putus: 0, BerhentiSementara: 0, upgrade: 0, downgrade: 0 });
  const [myInboxTickets, setMyInboxTickets] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false); 
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [searchTicket, setSearchTicket] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const morningSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamA : TEAM_CONFIG.teamB;
  const afternoonSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamB : TEAM_CONFIG.teamA;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (isRamadhan) {
      if (hour >= 3 && hour <= 5) return 'Selamat Sahur';
      if (hour >= 17 && hour <= 19) return 'Selamat Berbuka';
    }
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  useEffect(() => { fetchDashboardData(); }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserName = '';
      let currentUserRole: Role | null = null;

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role as Role);
          setUserFullName(profile.full_name);
          currentUserName = profile.full_name;
          currentUserRole = profile.role as Role;
        }
      }

      // Fetch Stats & Charts
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
        client: [{ name: 'Berlangganan', data: d[0] }, { name: 'Berhenti', data: d[1] }, { name: 'BS', data: d[2] }],
        capacity: [{ name: 'Upgrade', data: d[3] }, { name: 'Downgrade', data: d[4] }]
      });

      setChartSummary({
        pasang: d[0].reduce((a, b) => a + b, 0), putus: d[1].reduce((a, b) => a + b, 0), BerhentiSementara: d[2].reduce((a, b) => a + b, 0),
        upgrade: d[3].reduce((a, b) => a + b, 0), downgrade: d[4].reduce((a, b) => a + b, 0),
      });

      setStats(prev => ({ ...prev, totalClient: clientCount || 0, growthMonth: d[0][new Date().getMonth()], woPending: pendingCount || 0 }));

      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      setRecentLogs(logs || []);

    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={`p-6 min-h-screen relative overflow-hidden transition-all duration-1000 ${isRamadhan ? 'bg-[#062c22] text-emerald-50' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 🌙 ORNAMEN BACKGROUND RAME */}
      {isRamadhan && (
        <>
          {/* Islamic Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/arabesque.png')`, backgroundSize: '400px' }} />
          
          {/* Glowing Orbs */}
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-500/10 blur-[100px] rounded-full" />

          {/* Hanging Lanterns (Fanous) */}
          <div className="absolute top-0 right-20 animate-bounce-slow opacity-80 hidden md:block">
            <div className="w-[2px] h-20 bg-gradient-to-b from-transparent to-amber-400 mx-auto" />
            <div className="w-10 h-14 bg-amber-500 rounded-b-full rounded-t-xl shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center border-2 border-amber-300">
               <Star size={16} className="text-amber-100 fill-amber-100" />
            </div>
          </div>

          <div className="absolute top-0 right-44 animate-bounce-slower opacity-60 hidden md:block">
            <div className="w-[2px] h-32 bg-gradient-to-b from-transparent to-emerald-400 mx-auto" />
            <div className="w-8 h-10 bg-emerald-600 rounded-b-full rounded-t-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center border border-emerald-300">
               <Moon size={12} className="text-emerald-100 fill-emerald-100" />
            </div>
          </div>
        </>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 relative z-10">
        <div className="animate-in slide-in-from-left duration-700">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className={isRamadhan ? 'text-amber-400 animate-pulse' : 'text-blue-500'} />
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isRamadhan ? 'text-emerald-300' : 'text-slate-500'}`}>
              {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: indonesia })}
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase flex items-center gap-4">
            <span className={isRamadhan ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-amber-200 to-emerald-100' : 'text-slate-900'}>
              {getGreeting()}, {userFullName.split(' ')[0]}
            </span>
            {isRamadhan && <CloudMoon className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" size={40} />}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => window.location.reload()} className={`p-3 rounded-2xl border transition-all active:scale-90 ${isRamadhan ? 'bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <Link href="/work-orders/create">
            <button className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-white overflow-hidden relative group ${isRamadhan ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 hover:shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Plus size={20} className="relative z-10" /> 
              <span className="relative z-10 uppercase tracking-wider text-sm">Buat WO Baru</span>
            </button>
          </Link>
        </div>
      </div>

      <AlertBanner />

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        <StatCard title="Total Client" value={stats.totalClient} sub="Aktif di Database" icon={<Users size={24} />} color="emerald" isRamadhan={isRamadhan} />
        <StatCard title="WO Active" value={stats.woPending} sub="Butuh Tindakan" icon={<Activity size={24} />} color="amber" isRamadhan={isRamadhan} />
        <StatCard title="New Clients" value={`+${stats.growthMonth}`} sub="Bulan Februari" icon={<ArrowUpRight size={24} />} color="emerald" isRamadhan={isRamadhan} />
        <StatCard title="Available VLAN" value={480} sub="Ready to Use" icon={<Database size={24} />} color="amber" isRamadhan={isRamadhan} />
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* CHART SECTION */}
        <div className={`lg:col-span-2 rounded-[2.5rem] shadow-2xl border flex flex-col overflow-hidden backdrop-blur-md ${isRamadhan ? 'bg-emerald-900/40 border-emerald-700/50' : 'bg-white border-slate-100'}`}>
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isRamadhan ? 'text-white' : 'text-slate-800'}`}>
                  <BarChart3 className="text-amber-400" /> Statistik Penjualan
                </h3>
                <p className={`text-xs mt-1 font-bold ${isRamadhan ? 'text-emerald-400' : 'text-slate-400'}`}>PERFORMA TAHUN 2026</p>
              </div>
              <div className={`flex p-1.5 rounded-2xl ${isRamadhan ? 'bg-[#041a14]' : 'bg-slate-100'}`}>
                {['CLIENT', 'CAPACITY'].map((t) => (
                  <button key={t} onClick={() => setChartTab(t as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chartTab === t ? (isRamadhan ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:opacity-80'}`}>{t}</button>
                ))}
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ReactApexChart 
                options={{ 
                  chart: { toolbar: { show: false }, background: 'transparent' }, 
                  theme: { mode: isRamadhan ? 'dark' : 'light' },
                  colors: isRamadhan ? ['#10b981', '#f59e0b', '#059669'] : ['#3b82f6', '#ef4444', '#f59e0b'],
                  stroke: { show: true, width: 2, colors: ['transparent'] },
                  grid: { borderColor: isRamadhan ? '#064e3b' : '#f1f5f9' },
                  dataLabels: { enabled: false },
                  xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] }
                }} 
                series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity} 
                type="bar" 
                height="100%" 
              />
            </div>
          </div>

          {/* QUICK SUMMARY FOOTER */}
          <div className={`p-8 border-t grid grid-cols-3 gap-6 ${isRamadhan ? 'bg-emerald-950/50 border-emerald-800' : 'bg-slate-50 border-slate-100'}`}>
             <MiniStat label="Pasang Baru" value={chartSummary.pasang} icon={<ArrowUpRight size={16}/>} color="text-emerald-400" />
             <MiniStat label="Putus" value={chartSummary.putus} icon={<ArrowDownRight size={16}/>} color="text-rose-400" />
             <MiniStat label="B. Sementara" value={chartSummary.BerhentiSementara} icon={<MinusCircle size={16}/>} color="text-amber-400" />
          </div>
        </div>

        {/* SIDEBAR RIGHT */}
        <div className="flex flex-col gap-8">
          {/* TEAM SCHEDULE */}
          <div className={`p-8 rounded-[2.5rem] shadow-xl border backdrop-blur-md ${isRamadhan ? 'bg-emerald-900/40 border-emerald-700/50' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3 ${isRamadhan ? 'text-amber-400' : 'text-slate-800'}`}>
              <Calendar size={18} /> Jadwal NOC
            </h3>
            <div className="space-y-4">
              <ShiftRow label="PAGI" hours="08.00 - 16.00" names={morningSquad} isRamadhan={isRamadhan} />
              <ShiftRow label="SIANG" hours="14.00 - 22.00" names={afternoonSquad} isRamadhan={isRamadhan} />
            </div>
          </div>

          {/* LOGS */}
          <div className={`flex-1 rounded-[2.5rem] shadow-xl border overflow-hidden flex flex-col backdrop-blur-md ${isRamadhan ? 'bg-emerald-900/40 border-emerald-700/50' : 'bg-white border-slate-100'}`}>
            <div className={`px-8 py-6 border-b flex justify-between items-center ${isRamadhan ? 'border-emerald-800' : 'border-slate-50'}`}>
              <h3 className="font-black uppercase text-xs tracking-widest">Aktivitas</h3>
              <Link href="/activity-log" className="p-2 hover:bg-white/10 rounded-lg transition-colors"><List size={16}/></Link>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[300px]">
              {recentLogs.map((log) => (
                <div key={log.id} className={`p-4 rounded-2xl flex gap-4 transition-all hover:translate-x-1 ${isRamadhan ? 'bg-emerald-800/30 hover:bg-emerald-800/50' : 'bg-slate-50'}`}>
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-xs border ${isRamadhan ? 'bg-emerald-700 border-emerald-500 text-emerald-100' : 'bg-white border-slate-200 text-blue-600'}`}>
                    {log.actor?.substring(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${isRamadhan ? 'text-white' : 'text-slate-800'}`}>{log.actor}</p>
                    <p className={`text-[10px] truncate font-medium ${isRamadhan ? 'text-emerald-400' : 'text-slate-500'}`}>{log.SUBJECT}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button onClick={() => setShowInbox(true)} className={`fixed bottom-8 right-8 z-50 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:scale-110 active:scale-90 flex items-center justify-center text-white ${isRamadhan ? 'bg-gradient-to-tr from-amber-500 to-amber-600 shadow-amber-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
        <ListTodo size={32} strokeWidth={2.5} />
        {myInboxTickets.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-full border-4 border-[#062c22] animate-bounce">
            {myInboxTickets.length}
          </span>
        )}
      </button>

      {/* MODAL INBOX (Simplified) */}
      {showInbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#041a14]/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className={`w-full max-w-2xl rounded-[3rem] shadow-2xl border flex flex-col max-h-[80vh] ${isRamadhan ? 'bg-emerald-900 border-emerald-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                 <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                   <Inbox className="text-amber-400" /> Inbox Tugas
                 </h2>
                 <button onClick={() => setShowInbox(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 overflow-y-auto flex items-center justify-center italic text-sm text-emerald-400">
                 Belum ada tiket tugas baru untuk kamu hari ini.
              </div>
           </div>
        </div>
      )}

      {/* STYLES KHUSUS RAMADHAN */}
      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes bounce-slower {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-bounce-slower { animation: bounce-slower 6s ease-in-out infinite; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: ${isRamadhan ? '#065f46' : '#cbd5e1'}; 
          border-radius: 10px; 
        }
      `}</style>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ title, value, sub, icon, color, isRamadhan }: any) {
  return (
    <div className={`p-7 rounded-[2.5rem] border shadow-sm transition-all group relative overflow-hidden backdrop-blur-sm hover:translate-y-[-5px] ${isRamadhan ? 'bg-emerald-900/40 border-emerald-700/50 hover:border-amber-500/50' : 'bg-white border-slate-100'}`}>
      <div className={`p-4 rounded-2xl mb-5 inline-flex transition-transform group-hover:scale-110 shadow-lg ${isRamadhan ? (color === 'emerald' ? 'bg-emerald-600 text-emerald-50 shadow-emerald-900/40' : 'bg-amber-600 text-amber-50 shadow-amber-900/40') : 'bg-blue-50 text-blue-600'}`}>
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className={`text-4xl font-black tracking-tighter mb-1 ${isRamadhan ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
        <p className={`text-xs font-black uppercase tracking-widest ${isRamadhan ? 'text-emerald-400' : 'text-slate-500'}`}>{title}</p>
        <p className={`text-[10px] mt-1 font-bold ${isRamadhan ? 'text-emerald-600' : 'text-slate-400'}`}>{sub}</p>
      </div>
      {isRamadhan && <Star size={60} className="absolute -bottom-4 -right-4 opacity-5 text-amber-400 rotate-12" />}
    </div>
  );
}

function MiniStat({ label, value, icon, color }: any) {
  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>{icon}</div>
        <span className="text-xl font-black text-white">{value}</span>
      </div>
    </div>
  );
}

function ShiftRow({ label, hours, names, isRamadhan }: any) {
  return (
    <div className={`p-4 rounded-2xl border transition-colors ${isRamadhan ? 'bg-emerald-950/40 border-emerald-800 hover:border-emerald-600' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex justify-between items-center mb-3">
        <span className={`text-[10px] font-black px-2 py-1 rounded bg-amber-500 text-amber-950`}>{label}</span>
        <span className="text-[10px] font-bold opacity-60 italic">{hours}</span>
      </div>
      <div className="flex gap-2">
        {names.map((n: string) => (
          <div key={n} className={`flex-1 py-2 rounded-xl text-center text-xs font-black border ${isRamadhan ? 'bg-emerald-800/50 border-emerald-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="p-10 min-h-screen bg-slate-900 animate-pulse flex items-center justify-center text-emerald-500 font-black uppercase tracking-[0.5em]">Loading...</div>;
}