'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Users, Activity, Plus, List, Database, RefreshCw, Archive,
  ShieldAlert, Check, X, ListTodo, BarChart3, ArrowUpRight,
  ArrowDownRight, MinusCircle, Calendar, ChevronDown, Search,
  Download, ChevronRight, Inbox, Clock, TrendingUp, Wifi, WifiOff,
  Zap, Signal
} from 'lucide-react';
import { format, getISOWeek, formatDistanceToNow } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { Role, PERMISSIONS, hasAccess } from '@/lib/permissions';
import AlertBanner from '@/components/AlertBanner';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { toast } from 'sonner';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEAM_CONFIG = {
  teamA: ['Anan', 'Shidiq'],
  teamB: ['Ilham', 'Andi'],
  isWeekA_Morning: getISOWeek(new Date()) % 2 !== 0
};

// ─── REALTIME STATUS INDICATOR ───────────────────────────────
function LivePill({ connected }: { connected: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-all duration-500 ${
      connected
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-400 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {connected ? 'Live' : 'Connecting'}
    </div>
  );
}

// ─── ANIMATED COUNTER ────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number | string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setDisplay(value);
    }
  }, [value]);

  return <span key={String(value)} style={{ animation: 'countUp 0.4s ease-out' }}>{prefix}{display}{suffix}</span>;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [stats, setStats] = useState({
    totalClient: 0,
    totalVlanUsed: 0,
    totalVlanFree: 0,
    growthMonth: 0,
    logsToday: 0,
    woPending: 0
  });

  const [initialRecentLogs, setInitialRecentLogs] = useState<any[]>([]);
  const [initialClients, setInitialClients] = useState<any[]>([]);
  const [initialWorkOrders, setInitialWorkOrders] = useState<any[]>([]);

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

  // ── REALTIME SUBSCRIPTIONS ─────────────────────────────────
  const realtimeLogs = useRealtimeTable('Log_Aktivitas', initialRecentLogs, ['INSERT']);
  const realtimeClients = useRealtimeTable('Data Client Corporate', initialClients, ['INSERT', 'DELETE']);
  const realtimeWorkOrders = useRealtimeTable('Report Bulanan', initialWorkOrders, ['INSERT', 'UPDATE', 'DELETE']);

  const recentLogs = realtimeLogs.slice(0, 8);

  // ── DERIVED REALTIME STATS ─────────────────────────────────
  const realtimeStats = {
    ...stats,
    totalClient: realtimeClients.length > 0 ? realtimeClients.length : stats.totalClient,
    woPending: realtimeWorkOrders.filter((wo: any) =>
      ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS'].includes(wo.STATUS)
    ).length || stats.woPending,
    logsToday: realtimeLogs.filter((log: any) => {
      const today = new Date().toISOString().split('T')[0];
      return log.created_at?.startsWith(today);
    }).length || stats.logsToday,
  };

  // ── UPDATE TIMESTAMP saat data realtime berubah ────────────
  useEffect(() => {
    setLastUpdated(new Date());
  }, [realtimeLogs.length, realtimeClients.length, realtimeWorkOrders.length]);

  const morningSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamA : TEAM_CONFIG.teamB;
  const afternoonSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamB : TEAM_CONFIG.teamA;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const handleApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) return;
    try {
      if (action === 'APPROVE') {
        await supabase.from('Ignored_Items').update({ STATUS: 'APPROVED' }).eq('id', id);
      } else {
        await supabase.from('Ignored_Items').delete().eq('id', id);
      }
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast.success(action === 'APPROVE' ? 'Request disetujui!' : 'Request ditolak.');
    } catch (err) {
      console.error('Approval Error:', err);
      toast.error('Gagal memproses approval');
    }
  };

  async function handleSyncSheet() {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) {
      toast.error('Izin ditolak', { description: 'Hanya Admin/NOC yang bisa sinkronisasi.' });
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading('Menyinkronkan data ke Google Sheets...');
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_Kamhv6OJiN7bAtzzA2Z-tzkWvekJakQNRsPVGU1Xwmn_jePm2ZyiSf_RdU_5zUpr/exec';
    const syncTargets = [
      { name: 'Report Bulanan', sheetName: '2026', id: '1Yqr6tlJGo2yHE-9FJ_mCMpnehV-0Lpo2oiGUPWqAXOE' },
      { name: 'Berlangganan 2026', sheetName: 'Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Berhenti Berlangganan 2026', sheetName: 'Berhenti Berlangganan 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Berhenti Sementara 2026', sheetName: 'Berhenti Sementara 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Upgrade 2026', sheetName: 'Upgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
      { name: 'Downgrade 2026', sheetName: 'Downgrade 2026', id: '19PWdBv4RQgHqxa2Bf7-OQuOeSdTumLb01bR0fhQhkb0' },
    ];
    try {
      for (const target of syncTargets) {
        await fetch('/api/sync-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableTarget: target.name, sheetName: target.sheetName,
            spreadsheetId: target.id, googleScriptUrl: GOOGLE_SCRIPT_URL
          })
        });
      }
      toast.success('Sync berhasil!', { id: toastId, description: 'Data Supabase berhasil disinkronkan ke Google Sheets.' });
    } catch {
      toast.error('Sinkronisasi gagal', { id: toastId, description: 'Terjadi kesalahan saat menghubungi Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  }

  const fetchDashboardData = useCallback(async () => {
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

      if (hasAccess(currentUserRole, PERMISSIONS.OVERVIEW_ACTION)) {
        const { data: approvals } = await supabase.from('Ignored_Items').select('*').eq('STATUS', 'PENDING').order('created_at', { ascending: false });
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
            const { data: woDetails } = await supabase.from('Report Bulanan').select('id, "SUBJECT WO", STATUS, KETERANGAN').in('id', ticket.wo_ids);
            const allSolved = woDetails?.every(wo => wo.STATUS === 'SOLVED' || wo.STATUS === 'CLOSED');
            if (allSolved && woDetails.length > 0 && ticket.status !== 'SOLVED') {
              await supabase.from('inbox_tugas').update({ status: 'SOLVED' }).eq('id', ticket.id);
            }
            return { ...ticket, details: woDetails || [] };
          }));
          setMyInboxTickets(enrichedTickets);
        }
      }

      const { count: clientCount } = await supabase.from('Data Client Corporate').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('Report Bulanan').select('id', { count: 'exact', head: true }).in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']);

      // ── Fetch semua data client & WO untuk realtime tracking ──
      const { data: allClients } = await supabase.from('Data Client Corporate').select('id, created_at');
      const { data: allWOs } = await supabase.from('Report Bulanan').select('id, STATUS, created_at');
      if (allClients) setInitialClients(allClients);
      if (allWOs) setInitialWorkOrders(allWOs);

      const tables = ['Berlangganan 2026', 'Berhenti Berlangganan 2026', 'Berhenti Sementara 2026', 'Upgrade 2026', 'Downgrade 2026'];
      const responses = await Promise.all(tables.map(t => supabase.from(t).select('TANGGAL')));

      const groupByMonth = (data: any[]) => {
        const months = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) months[new Date(row.TANGGAL).getMonth()]++; });
        return months;
      };
      const d = responses.map(r => groupByMonth(r.data || []));

      setChartData({
        client: [{ name: 'Berlangganan', data: d[0] }, { name: 'Berhenti', data: d[1] }, { name: 'Berhenti Sementara', data: d[2] }],
        capacity: [{ name: 'Upgrade', data: d[3] }, { name: 'Downgrade', data: d[4] }]
      });
      setChartSummary({
        pasang: d[0].reduce((a, b) => a + b, 0), putus: d[1].reduce((a, b) => a + b, 0),
        BerhentiSementara: d[2].reduce((a, b) => a + b, 0),
        upgrade: d[3].reduce((a, b) => a + b, 0), downgrade: d[4].reduce((a, b) => a + b, 0),
      });

      const vlanTables = ['Daftar Vlan 1-1000', 'Daftar Vlan 1000+', 'Daftar Vlan 2000+', 'Daftar Vlan 3000+', 'Daftar Vlan 3500+', 'Daftar Vlan 4003+'];
      let totalUsed = 0, totalAllVlan = 0;
      const vlanResponses = await Promise.all(vlanTables.map(t => supabase.from(t).select('NAME')));
      vlanResponses.forEach(res => {
        if (res.data) {
          totalAllVlan += res.data.length;
          totalUsed += res.data.filter(r => {
            const name = (r.NAME || '').toUpperCase();
            return name && name !== '-' && name !== 'AVAILABLE' && name !== '';
          }).length;
        }
      });

      const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(8);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', todayStart);

      setStats({
        totalClient: clientCount || 0,
        totalVlanUsed: totalUsed,
        totalVlanFree: totalAllVlan - totalUsed,
        growthMonth: d[0][new Date().getMonth()],
        logsToday: countToday || 0,
        woPending: pendingCount || 0
      });
      setInitialRecentLogs(logs || []);
    } catch (err) {
      console.error('Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleDownloadInbox = () => {
    if (myInboxTickets.length === 0) return toast.info('Tidak ada tugas untuk diunduh.');
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

  // VLAN usage percentage
  const vlanUsagePercent = realtimeStats.totalVlanFree + realtimeStats.totalVlanUsed > 0
    ? Math.round((realtimeStats.totalVlanUsed / (realtimeStats.totalVlanFree + realtimeStats.totalVlanUsed)) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: '#f0f2f5', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .new-log-entry { animation: fadeSlideIn 0.35s ease-out; }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      `}</style>

      <div className="p-5 md:p-7 max-w-[1600px] mx-auto">

        {/* ── TOP BAR ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={11} />
                {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: indonesia })}
              </p>
              <LivePill connected={isLive} />
            </div>
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
              {userFullName ? `${getGreeting()}, ${userFullName.split(' ')[0]}` : 'NOC Dashboard'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Signal size={10} />
              Update terakhir: {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: indonesia })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
              <button
                onClick={handleSyncSheet}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-semibold text-xs shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={13} className="animate-spin text-blue-500" /> : <Database size={13} className="text-emerald-500" />}
                {isSyncing ? 'Syncing...' : 'Sync Sheet'}
              </button>
            )}
            {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
              <button disabled className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg font-semibold text-xs opacity-50 cursor-not-allowed">
                <Archive size={13} /> Archive
              </button>
            )}
            {hasAccess(userRole, PERMISSIONS.CLIENT_ADD) && (
              <Link href="/work-orders/create">
                <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors">
                  <Plus size={13} /> Buat WO Baru
                </button>
              </Link>
            )}
            <button onClick={fetchDashboardData} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 shadow-sm transition-colors" title="Refresh data">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── APPROVAL BANNER ────────────────────────────────── */}
        {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && pendingApprovals.length > 0 && (
          <div className="mb-5 bg-white rounded-xl border border-rose-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-rose-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><ShieldAlert size={15} /></div>
                <div>
                  <h3 className="text-sm font-bold text-rose-800">Pending Discard Approvals</h3>
                  <p className="text-[11px] text-rose-500">Verifikasi pengabaian sinkronisasi data</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                {pendingApprovals.length} requests
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{item.REQUESTED_BY || 'NOC'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.created_at ? format(new Date(item.created_at), 'dd/MM HH:mm') : ''}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase leading-tight mb-1 line-clamp-2">{item.SUBJECT_IGNORED}</h4>
                    <p className="text-[11px] text-slate-500 italic">"{item.ALASAN}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button onClick={() => handleApprovalAction(item.id, 'APPROVE')} className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-xs font-bold transition-colors">
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => handleApprovalAction(item.id, 'REJECT')} className="flex items-center justify-center gap-1.5 py-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-md text-xs font-bold transition-colors">
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertBanner />

        {/* ── STAT CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard
            title="Total Client"
            value={<AnimatedNumber value={realtimeStats.totalClient} />}
            sub="Database aktif"
            icon={<Users size={18} />}
            accent="#1a5fad"
            accentBg="#e8f0fb"
            trend={realtimeClients.length > stats.totalClient ? `+${realtimeClients.length - stats.totalClient} baru` : null}
          />
          <StatCard
            title="WO Aktif"
            value={<AnimatedNumber value={realtimeStats.woPending} />}
            sub="Pending & Progress"
            icon={<Activity size={18} />}
            accent="#7c3aed"
            accentBg="#f3f0ff"
            trend={null}
          />
          <StatCard
            title="Bulan Ini"
            value={<AnimatedNumber value={realtimeStats.growthMonth} prefix="+" />}
            sub="Pelanggan baru"
            icon={<TrendingUp size={18} />}
            accent="#059669"
            accentBg="#ecfdf5"
            trend={null}
          />
          <StatCard
            title="VLAN Tersedia"
            value={<AnimatedNumber value={realtimeStats.totalVlanFree} />}
            sub={`${vlanUsagePercent}% slot terpakai`}
            icon={<Database size={18} />}
            accent="#d97706"
            accentBg="#fffbeb"
            trend={null}
            progress={vlanUsagePercent}
          />
        </div>

        {/* ── ROW 2: LOG HARI INI ─────────────────────────────── */}
        <div className="grid grid-cols-3 lg:grid-cols-3 gap-4 mb-5">
          <MiniStatCard
            label="Log Hari Ini"
            value={<AnimatedNumber value={realtimeStats.logsToday} />}
            icon={<Zap size={14} className="text-amber-500" />}
            color="amber"
          />
          <MiniStatCard
            label="Berlangganan 2026"
            value={<AnimatedNumber value={chartSummary.pasang} />}
            icon={<ArrowUpRight size={14} className="text-emerald-500" />}
            color="emerald"
          />
          <MiniStatCard
            label="Putus 2026"
            value={<AnimatedNumber value={chartSummary.putus} />}
            icon={<ArrowDownRight size={14} className="text-rose-500" />}
            color="rose"
          />
        </div>

        {/* ── MAIN GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── CHART ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[14px]">
                    {chartTab === 'CLIENT'
                      ? <><Users size={15} className="text-emerald-600" /> Pertumbuhan Pelanggan</>
                      : <><BarChart3 size={15} className="text-blue-600" /> Pertumbuhan Kapasitas</>
                    }
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Statistik 2026</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    <button onClick={() => setChartTab('CLIENT')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartTab === 'CLIENT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Pelanggan</button>
                    <button onClick={() => setChartTab('CAPACITY')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartTab === 'CAPACITY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Kapasitas</button>
                  </div>
                </div>
              </div>
              <ReactApexChart
                options={{
                  chart: { toolbar: { show: false }, fontFamily: "'IBM Plex Sans', sans-serif", background: 'transparent', animations: { enabled: true, easing: 'easeinout', speed: 600 } },
                  colors: chartTab === 'CLIENT' ? ['#10b981', '#ef4444', '#f59e0b'] : ['#2d7dd2', '#94a3b8'],
                  xaxis: {
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                    labels: { style: { fontSize: '11px', fontWeight: 500, colors: '#94a3b8' } }
                  },
                  yaxis: { labels: { style: { fontSize: '11px', colors: '#94a3b8' } } },
                  grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                  plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
                  legend: { fontSize: '12px', fontWeight: 600, offsetY: 4 },
                  dataLabels: { enabled: false },
                  tooltip: { style: { fontFamily: "'IBM Plex Sans', sans-serif" } },
                  states: { hover: { filter: { type: 'lighten', value: 0.1 } } }
                }}
                series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity}
                type="bar"
                height={240}
              />
            </div>

            {/* Chart Footer Summary */}
            <div className="mt-auto bg-slate-50 border-t border-slate-100 px-5 py-3.5">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Pasang', val: chartSummary.pasang, color: '#10b981' },
                  { label: 'Putus', val: chartSummary.putus, color: '#ef4444' },
                  { label: 'Berhenti Smtr', val: chartSummary.BerhentiSementara, color: '#f59e0b' },
                  { label: 'Upgrade', val: chartSummary.upgrade, color: '#2d7dd2' },
                  { label: 'Downgrade', val: chartSummary.downgrade, color: '#94a3b8' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">{item.label}</p>
                    <p className="text-base font-bold" style={{ color: item.color }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Jadwal Tim */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-[13px]">
                <div className="p-1.5 bg-blue-50 rounded-md text-blue-600"><Calendar size={13} /></div>
                Jadwal Tim
              </h3>
              <div className="space-y-2.5">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pagi · 08.00–16.00</p>
                  <div className="flex gap-2">
                    {morningSquad.map((name, i) => (
                      <span key={i} className="flex-1 text-center text-xs font-semibold py-1.5 bg-white text-slate-700 rounded-md border border-amber-200">{name}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Siang · 14.00–22.00</p>
                  <div className="flex gap-2">
                    {afternoonSquad.map((name, i) => (
                      <span key={i} className="flex-1 text-center text-xs font-semibold py-1.5 bg-white text-slate-700 rounded-md border border-indigo-200">{name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Aktivitas Terkini — Realtime */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-[13px]">Aktivitas Terkini</h3>
                <div className="flex items-center gap-2">
                  <LivePill connected={isLive} />
                  <Link href="/logs" className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-blue-600">
                    <List size={14} />
                  </Link>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: '280px' }}>
                {recentLogs.length === 0 ? (
                  <p className="p-5 text-center text-xs text-slate-400 italic">Belum ada aktivitas</p>
                ) : recentLogs.map((log, idx) => (
                  <div key={log.id} className={`px-4 py-2.5 hover:bg-slate-50 flex gap-3 transition-colors ${idx === 0 ? 'new-log-entry' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0 uppercase mt-0.5">
                      {log.actor?.substring(0, 2) || 'SY'}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-1">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{log.actor}</p>
                        <p className="text-[9px] text-slate-400 shrink-0">{log.created_at ? format(new Date(log.created_at), 'HH:mm') : '-'}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{log.SUBJECT}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── VLAN USAGE BAR ─────────────────────────────────── */}
        <div className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-md text-amber-600"><Database size={13} /></div>
              <div>
                <h3 className="font-bold text-slate-800 text-[13px]">VLAN Usage</h3>
                <p className="text-[10px] text-slate-400">Kapasitas slot jaringan keseluruhan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-800">{vlanUsagePercent}%</p>
              <p className="text-[10px] text-slate-400">{realtimeStats.totalVlanUsed} / {realtimeStats.totalVlanFree + realtimeStats.totalVlanUsed} terpakai</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${vlanUsagePercent}%`,
                background: vlanUsagePercent > 85 ? '#ef4444' : vlanUsagePercent > 60 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-400">0%</span>
            <span className="text-[10px] font-medium" style={{ color: vlanUsagePercent > 85 ? '#ef4444' : vlanUsagePercent > 60 ? '#f59e0b' : '#10b981' }}>
              {vlanUsagePercent > 85 ? 'Kapasitas kritis!' : vlanUsagePercent > 60 ? 'Perlu perhatian' : 'Normal'}
            </span>
            <span className="text-[10px] text-slate-400">100%</span>
          </div>
        </div>

      </div>

      {/* ── FLOATING INBOX BUTTON ──────────────────────────── */}
      <button
        onClick={() => setShowInbox(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <ListTodo size={20} />
        {myInboxTickets.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {myInboxTickets.length}
          </span>
        )}
      </button>

      {/* ── INBOX MODAL ────────────────────────────────────── */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Inbox size={16} className="text-blue-600" /> Inbox Tugas Utama
                  </h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                    {userRole === 'SUPER_DEV' ? 'Monitoring PIC' : 'Daftar Paket Work Order'}
                  </p>
                </div>
                <button onClick={() => setShowInbox(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                  <X size={16} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Cari nomor tiket..."
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {myInboxTickets
                .filter(t => (t.id_tiket_custom || '').toLowerCase().includes(searchTicket.toLowerCase()))
                .map((ticket) => {
                  const isExpanded = expandedTicket === ticket.id;
                  return (
                    <div key={ticket.id} className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-blue-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                      <button onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)} className={`w-full flex items-center justify-between p-3.5 text-left ${isExpanded ? 'bg-blue-50' : 'bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <ListTodo size={14} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">{ticket.id_tiket_custom || 'BATCH'}</h3>
                            <p className="text-[10px] text-slate-500">{ticket.details.length} WOs{userRole === 'SUPER_DEV' ? ` · PIC: ${ticket.assigned_to}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${ticket.status === 'SOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {ticket.status}
                          </span>
                          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-2 bg-white border-t border-blue-100 space-y-2">
                          {ticket.details.map((wo: any) => (
                            <div key={wo.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex-1 pr-3 min-w-0">
                                <h4 className="font-semibold text-xs text-slate-800 truncate">{wo['SUBJECT WO']}</h4>
                                <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{wo.KETERANGAN || '-'}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${wo.STATUS === 'SOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                {wo.STATUS}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs text-slate-400 font-semibold">{myInboxTickets.length} Tiket Aktif</span>
              <button onClick={handleDownloadInbox} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors text-slate-600">
                <Download size={13} /> Download .txt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAT CARD ────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, accent, accentBg, trend, progress }: any) {
  return (
    <div className="stat-card bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: accent, opacity: 0.3 }} />
      <div className="flex justify-between items-start mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentBg, color: accent }}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
            <ArrowUpRight size={10} />{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-slate-600">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: progress > 85 ? '#ef4444' : progress > 60 ? '#f59e0b' : accent }} />
        </div>
      )}
    </div>
  );
}

// ── MINI STAT CARD ───────────────────────────────────────────
function MiniStatCard({ label, value, icon, color }: any) {
  const colorMap: any = {
    amber:   { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    emerald: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
    rose:    { bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
  };
  const c = colorMap[color];
  return (
    <div className="rounded-xl border p-3.5 flex items-center gap-3" style={{ background: c.bg, borderColor: c.border }}>
      <div className="p-2 bg-white rounded-lg border" style={{ borderColor: c.border }}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.text }}>{label}</p>
        <p className="text-xl font-bold" style={{ color: c.text }}>{value}</p>
      </div>
    </div>
  );
}

// ── SKELETON ────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="p-5 md:p-7" style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <div className="h-6 w-40 bg-slate-200 rounded mb-1 animate-pulse" />
      <div className="h-4 w-56 bg-slate-100 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="flex flex-col gap-4">
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}