'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Server, ArrowUpRight, Clock, Activity, Plus, List,
  Sun, Moon, CalendarDays, Inbox, CheckCircle2, ArrowRight,
  Download, X, ListTodo, BarChart3, TrendingUp, ArrowDownRight, MinusCircle, 
  AlertTriangle, Calendar, ChevronLeft, ChevronRight, ExternalLink,
  ChevronDown, Search, Database, RefreshCw, Archive, ShieldAlert, Check
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { id as indonesia } from 'date-fns/locale';
import { Role } from '@/lib/permissions';

// Komponen AlertBanner yang menangani WO Pending/Progress dan aksi Solved
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
  const [chartSummary, setChartSummary] = useState({ pasang: 0, putus: 0, cuti: 0, upgrade: 0, downgrade: 0 });
  
  // --- STATE UNTUK SISTEM INBOX & APPROVAL ---
  const [myInboxTickets, setMyInboxTickets] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]); // State untuk Discard Approval
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
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // --- FUNGSI APPROVAL DISCARD ---
  const handleApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      if (action === 'APPROVE') {
        await supabase.from('Ignored_Items').update({ STATUS: 'APPROVED' }).eq('id', id);
      } else {
        await supabase.from('Ignored_Items').delete().eq('id', id);
      }
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      alert(`Berhasil di-${action === 'APPROVE' ? 'setujui' : 'tolak'}`);
    } catch (err) {
      console.error("Approval Error:", err);
    }
  };

  // --- FUNGSI SYNC SPREADSHEET ---
  async function handleSyncSheet() {
    setIsSyncing(true);
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_Kamhv6OJiN7bAtzzA2Z-tzkWvekJakQNRsPVGU1Xwmn_jePm2ZyiSf_RdU_5zUpr/exec";
    const syncTargets = [
      { name: 'Report Bulanan', sheetName: '2026', id: '1Yqr6tlJGo2yHE-9FJ_mCMpnehV-0Lpo2oiGUPWqAXOE' },
      { name: 'Berlangganan 2026', sheetName: 'Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Berhenti Berlangganan 2026', sheetName: 'Berhenti Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Berhenti Sementara 2026', sheetName: 'Berhenti Sementara 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Upgrade 2026', sheetName: 'Upgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Downgrade 2026', sheetName: 'Downgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' }
    ];

    try {
      for (const target of syncTargets) {
        await fetch('/api/sync-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tableTarget: target.name,
            sheetName: target.sheetName,
            spreadsheetId: target.id,
            googleScriptUrl: GOOGLE_SCRIPT_URL
          })
        });
      }
      alert("✅ Data Supabase berhasil di-sync ke Google Sheets!");
    } catch (err) {
      alert("❌ Terjadi kesalahan sinkronisasi.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserName = '';
      let currentUserRole = '';

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role as Role);
          setUserFullName(profile.full_name);
          currentUserName = profile.full_name;
          currentUserRole = profile.role;
        }
      }

      // --- FETCH PENDING APPROVALS (HANYA ADMIN/SUPER_DEV) ---
      if (currentUserRole === 'SUPER_DEV' || currentUserRole === 'ADMIN') {
        const { data: approvals } = await supabase
          .from('Ignored_Items')
          .select('*')
          .eq('STATUS', 'PENDING')
          .order('created_at', { ascending: false });
        if (approvals) setPendingApprovals(approvals);
      }

      if (currentUserName) {
        let query = supabase.from('inbox_tugas').select('*');
        if (currentUserRole !== 'SUPER_DEV') {
          query = query.eq('assigned_to', currentUserName).eq('status', 'OPEN');
        }
        const { data: inboxData } = await query.order('created_at', { ascending: false });

        if (inboxData) {
          const enrichedTickets = await Promise.all(inboxData.map(async (ticket) => {
            const { data: woDetails } = await supabase
              .from('Report Bulanan')
              .select('id, "SUBJECT WO", STATUS, KETERANGAN')
              .in('id', ticket.wo_ids);

            const allSolved = woDetails?.every(wo => wo.STATUS === 'SOLVED' || wo.STATUS === 'CLOSED');
            if (allSolved && woDetails.length > 0 && ticket.status !== 'SOLVED') {
              await supabase.from('inbox_tugas').update({ status: 'SOLVED' }).eq('id', ticket.id);
            }
            return { ...ticket, details: woDetails || [] };
          }));
          setMyInboxTickets(enrichedTickets);
        }
      }

      // STATS & CHARTS...
      const { count: clientCount } = await supabase.from('Data Client Corporate').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('Report Bulanan').select('id', { count: 'exact', head: true }).in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']);
      const tables = ['Berlangganan 2026', 'Berhenti Berlangganan 2026', 'Berhenti Sementara 2026', 'Upgrade 2026', 'Downgrade 2026'];
      const responses = await Promise.all(tables.map(t => supabase.from(t).select('*')));
      
      const groupByMonth = (data: any[]) => {
        const months = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) months[new Date(row.TANGGAL).getMonth()]++; });
        return months;
      };
      const d = responses.map(r => groupByMonth(r.data || []));

      setChartData({
        client: [{ name: 'Pasang Baru', data: d[0] }, { name: 'Berhenti', data: d[1] }, { name: 'Cuti', data: d[2] }],
        capacity: [{ name: 'Upgrade', data: d[3] }, { name: 'Downgrade', data: d[4] }]
      });

      setChartSummary({
        pasang: d[0].reduce((a, b) => a + b, 0), putus: d[1].reduce((a, b) => a + b, 0), cuti: d[2].reduce((a, b) => a + b, 0),
        upgrade: d[3].reduce((a, b) => a + b, 0), downgrade: d[4].reduce((a, b) => a + b, 0),
      });

      const todayStart = new Date().toISOString().split('T')[0] + "T00:00:00Z";
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', todayStart);

      setStats({
        totalClient: clientCount || 0,
        totalVlanUsed: 0, totalVlanFree: 0,
        growthMonth: d[0][new Date().getMonth()],
        logsToday: countToday || 0,
        woPending: pendingCount || 0
      });
      setRecentLogs(logs || []);

    } catch (err) { console.error("Dashboard Error:", err); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, []);

  const handleDownloadInbox = () => {
    if (myInboxTickets.length === 0) return alert("Tidak ada tugas.");
    let content = `TO DO LIST GRUP - ${userFullName}\nGenerated: ${format(new Date(), 'dd MMM yyyy HH:mm')}\n==========================\n\n`;
    myInboxTickets.forEach((ticket) => {
      content += `${ticket.id_tiket_custom || 'BATCH'} (PIC: ${ticket.assigned_to})\n`;
      ticket.details.forEach((wo: any) => { content += `- [${wo.STATUS}] ${wo['SUBJECT WO']}\n`; });
      content += `\n--------------------------\n`;
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `Monitoring_Inbox_${userFullName}.txt`;
    link.click();
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative text-left text-slate-800">
      
      {/* HEADER UTAMA */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-slate-500 text-sm font-bold mb-1">
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: indonesia })}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">
            {userFullName ? `${getGreeting()}, ${userFullName.split(' ')[0]}` : 'NOC Dashboard'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSyncSheet} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50">
            {isSyncing ? <RefreshCw size={18} className="animate-spin text-blue-500" /> : <Database size={18} className="text-emerald-500" />}
            <span className="text-xs uppercase tracking-wider">{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <div className="relative group cursor-not-allowed"> 
            <button disabled className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl font-bold shadow-sm opacity-60 grayscale">
              <Archive size={18} />
              <span className="text-xs uppercase tracking-wider">Archive</span>
              <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center font-bold">
              Fitur Arsip belum tersedia (Coming Soon)
            </div>
          </div>

          <Link href="/work-orders/create">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95">
              <Plus size={18} /> Buat WO Baru
            </button>
          </Link>
        </div>
      </div>

      {/* APPROVAL SECTION - KHUSUS ADMIN / SUPER_DEV */}
      {(userRole === 'SUPER_DEV' || userRole === 'ADMIN') && pendingApprovals.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl border-2 border-rose-100 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-rose-500 p-2 rounded-lg text-white shadow-md shadow-rose-200"><ShieldAlert size={20} /></div>
              <div>
                <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest">Pending Discard Approvals</h3>
                <p className="text-[10px] text-rose-500 font-bold uppercase italic">Verifikasi pengabaian sinkronisasi data</p>
              </div>
            </div>
            <span className="bg-rose-200 text-rose-700 text-[10px] font-black px-3 py-1 rounded-full border border-rose-300">
              {pendingApprovals.length} REQUESTS
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/20">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">{item.REQUESTED_BY || 'NOC'}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{item.created_at ? format(new Date(item.created_at), 'dd/MM HH:mm') : ''}</span>
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight mb-2 line-clamp-2">{item.SUBJECT_IGNORED}</h4>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-4">
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">"{item.ALASAN}"</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleApprovalAction(item.id, 'APPROVE')} className="flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase transition-all active:scale-95"><Check size={14} /> Approve</button>
                  <button onClick={() => handleApprovalAction(item.id, 'REJECT')} className="flex items-center justify-center gap-2 py-2 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95"><X size={14} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertBanner />

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
        <StatCard title="Total Client" value={stats.totalClient} sub="Database Client" icon={<Users size={24} />} color="blue" />
        <StatCard title="WO Active" value={stats.woPending} sub="Pending & Progress" icon={<Activity size={24} />} color="purple" />
        <StatCard title="New This Month" value={`+${stats.growthMonth}`} sub="Pelanggan Baru" icon={<ArrowUpRight size={24} />} color="emerald" />
        <StatCard title="Logs Today" value={stats.logsToday} sub="Aktivitas Hari Ini" icon={<Clock size={24} />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      {chartTab === 'CLIENT' ? <Users size={20} className="text-emerald-600"/> : <BarChart3 size={20} className="text-blue-600"/>}
                      {chartTab === 'CLIENT' ? 'Pertumbuhan Pelanggan' : 'Pertumbuhan Kapasitas'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-tighter">Data statistik tahun 2026</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setChartTab('CLIENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CLIENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pelanggan</button>
                    <button onClick={() => setChartTab('CAPACITY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CAPACITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kapasitas</button>
                </div>
            </div>
            <div className="flex-1 min-h-[280px]">
                <ReactApexChart options={{ chart: { toolbar: { show: false }, fontFamily: 'inherit' }, colors: chartTab === 'CLIENT' ? ['#10b981', '#ef4444', '#f59e0b'] : ['#3b82f6', '#64748b'], xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] } }} series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity} type="bar" height={280} />
            </div>
          </div>
          <div className="mt-auto bg-slate-50 border-t border-slate-100 p-6">
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Berlangganan</p><div className="flex items-center gap-2"><span className="p-1 bg-emerald-100 text-emerald-600 rounded"><ArrowUpRight size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.pasang}</span></div></div>
                <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Berhenti Berlangganan</p><div className="flex items-center gap-2"><span className="p-1 bg-rose-100 text-rose-600 rounded"><ArrowDownRight size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.putus}</span></div></div>
                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Berhenti Sementara</p><div className="flex items-center gap-2"><span className="p-1 bg-amber-100 text-amber-600 rounded"><MinusCircle size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.cuti}</span></div></div>
             </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-600"/> Jadwal Team</h3>
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Pagi (08.00 - 16.00)</p>
                <div className="flex gap-2">{morningSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-amber-200 flex-1 text-center">{name}</span>)}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Siang (14.00 - 22.00)</p>
                <div className="flex gap-2">{afternoonSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-indigo-200 flex-1 text-center">{name}</span>)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-slate-800">
              <h3 className="font-bold text-sm">Aktivitas Terkini</h3>
              <Link href="/activity-log"><List size={16} className="text-slate-400 hover:text-blue-600 cursor-pointer"/></Link>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-50">
              {recentLogs.length === 0 ? <p className="p-4 text-center text-xs text-slate-400 italic">Belum ada aktivitas hari ini</p> : 
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0 border border-blue-100 uppercase">{log.actor?.substring(0,2) || 'SY'}</div>
                    <div className="overflow-hidden text-left">
                      <p className="text-xs font-bold text-slate-700 truncate">{log.actor}</p>
                      <p className="text-[10px] text-slate-500 truncate">{log.SUBJECT}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{log.created_at ? format(new Date(log.created_at), 'HH:mm') : '-'}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING INBOX BUTTON */}
      <button onClick={() => setShowInbox(true)} className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-transform active:scale-90 flex items-center justify-center">
        <ListTodo size={28} />
        {myInboxTickets.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-50 animate-bounce">
            {myInboxTickets.length}
          </span>
        )}
      </button>

      {/* MODAL INBOX GRUP */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b flex flex-col gap-4 bg-slate-50/50">
              <div className="flex justify-between items-center text-slate-800 text-left">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Inbox className="text-blue-600" /> Inbox Tugas Utama</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{userRole === 'SUPER_DEV' ? 'Mode Monitoring PIC' : 'Daftar Paket Work Order'}</p>
                </div>
                <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Cari nomor tiket..." value={searchTicket} onChange={(e) => setSearchTicket(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {myInboxTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <CheckCircle2 size={64} className="mb-4 text-emerald-100" />
                  <p className="font-bold">Inbox kosong.</p>
                </div>
              ) : (
                myInboxTickets.filter(t => (t.id_tiket_custom || '').toLowerCase().includes(searchTicket.toLowerCase())).map((ticket) => {
                  const isExpanded = expandedTicket === ticket.id;
                  return (
                    <div key={ticket.id} className={`border-2 rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-blue-400 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}>
                      <button onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)} className={`w-full flex items-center justify-between p-4 text-left ${isExpanded ? 'bg-blue-50/50' : 'bg-white'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><ListTodo size={20} /></div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">{ticket.id_tiket_custom || 'BATCH'}</h3>
                            <p className="text-[10px] text-slate-500 font-bold">{ticket.details.length} Work Orders {userRole === 'SUPER_DEV' && `| PIC: ${ticket.assigned_to}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase border ${ticket.status === 'SOLVED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{ticket.status}</span>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-blue-100">
                          <div className="space-y-2">
                            {ticket.details.map((wo: any) => (
                              <div key={wo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex-1 pr-3 text-left">
                                  <h4 className="font-bold text-xs uppercase">{wo['SUBJECT WO']}</h4>
                                  <p className="text-[9px] text-slate-500 italic">{wo.KETERANGAN || '-'}</p>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${wo.STATUS === 'SOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{wo.STATUS}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between items-center bg-slate-50 shrink-0">
              <span className="text-xs text-slate-400 font-bold uppercase">{myInboxTickets.length} Tiket Aktif</span>
              {myInboxTickets.length > 0 && (
                <button onClick={handleDownloadInbox} className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition-all text-slate-800">
                  <Download size={16} /> Download .txt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `.apexcharts-tooltip-text { color: #0f172a !important; font-weight: 700 !important; }`}} />
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group text-left">
      <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform w-fit mb-4 ${colors[color]}`}>{icon}</div>
      <h3 className="text-3xl font-black text-slate-900 mb-1">{value}</h3>
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-pulse text-left">
      <div className="h-12 w-full bg-slate-200 rounded-xl mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div><div className="h-96 bg-slate-200 rounded-2xl"></div></div>
    </div>
  );
}