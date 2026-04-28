'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  ClipboardList, Plus, Search, Eye, Filter,
  CheckCircle, XCircle, Clock, AlertCircle,
  RefreshCw, Pencil, ShieldAlert, Check, X,
  Download, History, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ArrowUpDown, BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { logActivity } from '@/lib/logger';
import * as XLSX from 'xlsx';

// ── Status config (WO-BUG-01: ON PROGRESS dinormalisasi → PROGRESS) ─
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  SOLVED:   { label: 'Solved',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={10} /> },
  CLOSED:   { label: 'Closed',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={10} /> },
  PENDING:  { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  icon: <Clock size={10} /> },
  PROGRESS: { label: 'Progress',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   icon: <RefreshCw size={10} /> },
  OPEN:     { label: 'Open',      bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', icon: <AlertCircle size={10} /> },
  CANCEL:   { label: 'Cancel',    bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-200',  icon: <XCircle size={10} /> },
};

// WO-BUG-01: Normalisasi "ON PROGRESS" → "PROGRESS"
const normalizeStatus = (s: string) => {
  const u = (s || '').toUpperCase();
  return u === 'ON PROGRESS' ? 'PROGRESS' : u;
};

function StatusBadge({ status }: { status: string }) {
  const norm = normalizeStatus(status);
  const cfg  = STATUS_CONFIG[norm] || STATUS_CONFIG['OPEN'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// WO-BUG-04: Parse "DD-MM-YYYY" → Date object (untuk perbandingan & display)
function parseTanggalWO(val: string): Date | null {
  if (!val) return null;
  const m = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatTanggalWO(val: string): string {
  const d = parseTanggalWO(val);
  return d ? format(d, 'd MMMM yyyy', { locale: indonesia }) : (val || '—');
}

const APPROVER_ROLES = ['ADMIN', 'SUPER_DEV', 'NOC'];
const PAGE_SIZE = 20;

export default function WorkOrderPage() {
  const [wos,          setWos]          = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [userRole,     setUserRole]     = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);

  // WO-FITUR-01: Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // WO-FITUR-02: Sorting
  const [sortField, setSortField] = useState<string>('TANGGAL');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');

  // WO-UX-03: Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // WO-UX-05: History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRequests,  setHistoryRequests]  = useState<any[]>([]);

  // WO-BUG-02: supabase singleton — tidak dibuat ulang setiap render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  const isApprover = APPROVER_ROLES.includes(userRole || '');
  const canCreate  = hasAccess(userRole, PERMISSIONS.WO_CREATE);

  // WO-BUG-03: tambah limit 1000 agar tidak memuat seluruh tabel tanpa batas
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role, full_name').eq('id', user.id).single();
      setUserRole(profile?.role as Role);
      setUserFullName(profile?.full_name || '');
    }
    const { data, error } = await supabase
      .from('Report Bulanan')
      .select('*')
      .order('id', { ascending: false })
      .limit(1000);              // WO-BUG-03 fix
    if (error) toast.error('Gagal memuat data', { description: error.message });
    else setWos(data || []);
    setLoading(false);
  }, [supabase]);

  const fetchEditRequests = useCallback(async () => {
    const { data } = await supabase
      .from('WO_Edit_Requests')
      .select('*')
      .eq('request_type', 'WO')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    setEditRequests(data || []);
  }, [supabase]);

  // WO-UX-05: Ambil history request (APPROVED + REJECTED)
  const fetchHistoryRequests = useCallback(async () => {
    const { data } = await supabase
      .from('WO_Edit_Requests')
      .select('*')
      .eq('request_type', 'WO')
      .in('status', ['APPROVED', 'REJECTED'])
      .order('reviewed_at', { ascending: false })
      .limit(50);
    setHistoryRequests(data || []);
  }, [supabase]);

  useEffect(() => { fetchData(); fetchEditRequests(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('wo-edit-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'WO_Edit_Requests' },
        () => fetchEditRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (req: any) => {
    const toastId = toast.loading('Memproses approval...');
    try {
      const { error } = await supabase
        .from('Report Bulanan').update(req.proposed_changes).eq('id', req.target_id);
      if (error) throw error;
      await supabase.from('WO_Edit_Requests').update({
        status: 'APPROVED', reviewed_by: userFullName,
        reviewed_at: new Date().toISOString()
      }).eq('id', req.id);
      toast.success('Edit disetujui & diterapkan!', { id: toastId });
      fetchData(); fetchEditRequests();
      await logActivity({ activity: 'WO_EDIT_APPROVED', subject: req.target_subject,
        actor: userFullName, detail: `Disetujui dari request oleh ${req.requested_by}` });
    } catch (err: any) {
      toast.error('Gagal approve: ' + err.message, { id: toastId });
    }
  };

  const handleReject = async (req: any) => {
    const toastId = toast.loading('Menolak request...');
    await supabase.from('WO_Edit_Requests').update({
      status: 'REJECTED', reviewed_by: userFullName,
      reviewed_at: new Date().toISOString()
    }).eq('id', req.id);
    toast.success('Request ditolak.', { id: toastId });
    fetchEditRequests();
    await logActivity({ activity: 'WO_EDIT_REJECTED', subject: req.target_subject,
      actor: userFullName, detail: `Request dari ${req.requested_by} ditolak` });
  };

  // WO-UX-01 + WO-FITUR-01 + WO-FITUR-02: filter + sort terpadu
  const filteredWos = useMemo(() => {
    const s = search.toLowerCase().trim();
    let result = wos.filter(wo => {
      // WO-UX-01: search meliputi Subject, Team, Jenis, Keterangan, Status
      const matchSearch = !s ||
        (wo['SUBJECT WO']  || '').toLowerCase().includes(s) ||
        (wo['NAMA TEAM']   || '').toLowerCase().includes(s) ||
        (wo['JENIS WO']    || '').toLowerCase().includes(s) ||
        (wo['KETERANGAN']  || '').toLowerCase().includes(s) ||
        normalizeStatus(wo.STATUS).toLowerCase().includes(s);

      // Status filter (WO-BUG-01: normalisasi ON PROGRESS)
      const matchStatus = statusFilter === 'ALL' || normalizeStatus(wo.STATUS) === statusFilter;

      // WO-FITUR-01: date range
      let matchDateFrom = true;
      let matchDateTo   = true;
      if (dateFrom || dateTo) {
        const rowDate = parseTanggalWO(wo.TANGGAL || '');
        if (rowDate) {
          if (dateFrom) matchDateFrom = rowDate >= new Date(dateFrom);
          if (dateTo)   matchDateTo   = rowDate <= new Date(dateTo + 'T23:59:59');
        }
      }

      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });

    // WO-FITUR-02: sorting
    result = [...result].sort((a, b) => {
      let va: any = a[sortField] ?? '';
      let vb: any = b[sortField] ?? '';
      // Sort tanggal secara kronologis
      if (sortField === 'TANGGAL') {
        va = parseTanggalWO(String(va))?.getTime() ?? 0;
        vb = parseTanggalWO(String(vb))?.getTime() ?? 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), 'id', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [wos, search, statusFilter, dateFrom, dateTo, sortField, sortDir]);

  // WO-UX-03: Pagination
  const totalPages    = Math.max(1, Math.ceil(filteredWos.length / PAGE_SIZE));
  const paginatedWos  = filteredWos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage     = () => setCurrentPage(1);

  // WO-FITUR-02: Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    resetPage();
  };

  // ── Stat counts ─────────────────────────────────────────────
  const statusCounts = useMemo(() => wos.reduce((acc, wo) => {
    const s = normalizeStatus(wo.STATUS);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [wos]);

  const activeCount  = (statusCounts['PROGRESS'] || 0) + (statusCounts['OPEN'] || 0);
  const pendingCount = statusCounts['PENDING'] || 0;
  const solvedCount  = (statusCounts['SOLVED']  || 0) + (statusCounts['CLOSED'] || 0);

  // WO-FITUR-04: Breakdown per JENIS WO
  const jenisBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    wos.forEach(wo => { const j = wo['JENIS WO'] || 'Lainnya'; map[j] = (map[j] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [wos]);

  // WO-FITUR-03: Export Excel
  const exportToExcel = () => {
    const rows = [
      ['Tanggal', 'Subject WO', 'Status', 'Jenis WO', 'Team', 'Keterangan'],
      ...filteredWos.map(wo => [
        formatTanggalWO(wo.TANGGAL || ''),
        wo['SUBJECT WO'] || '',
        normalizeStatus(wo.STATUS),
        wo['JENIS WO'] || '',
        wo['NAMA TEAM'] || '',
        wo['KETERANGAN'] || '',
      ]),
    ];
    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Work Orders');
    XLSX.writeFile(wb, `Work_Orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // WO-UX-04: Export PDF summary
  const exportToPdf = () => {
    const total   = wos.length;
    const today   = format(new Date(), 'd MMMM yyyy', { locale: indonesia });
    const statusRows = (Object.entries(statusCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => `<tr><td>${s}</td><td style="text-align:center;font-weight:700;">${c}</td><td style="text-align:center;">${Math.round(c/total*100)}%</td></tr>`)
      .join('');
    const jenisRows = (jenisBreakdown as [string, number][])
      .map(([j, c]) => `<tr><td>${j}</td><td style="text-align:center;font-weight:700;">${c}</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Summary Work Order — ${today}</title>
      <style>
        body{font-family:sans-serif;padding:28px;color:#1e293b;font-size:13px}
        h1{font-size:18px;font-weight:bold;margin-bottom:4px}
        .sub{color:#64748b;font-size:12px;margin-bottom:20px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
        .card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center}
        .card .lbl{font-size:10px;text-transform:uppercase;font-weight:700;color:#64748b;margin-bottom:4px}
        .card .val{font-size:26px;font-weight:800}
        h2{font-size:14px;font-weight:700;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px}
        th{background:#f8fafc;border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b}
        td{border:1px solid #e2e8f0;padding:7px 10px}
        @media print{body{padding:14px}}
      </style>
    </head><body>
      <h1>Summary Work Order</h1>
      <p class="sub">Tanggal Cetak: ${today} &nbsp;|&nbsp; Total WO: ${total} &nbsp;|&nbsp; Ditampilkan: ${filteredWos.length}</p>
      <div class="grid">
        <div class="card"><div class="lbl">Total WO</div><div class="val" style="color:#1e293b">${total}</div></div>
        <div class="card"><div class="lbl">Aktif</div><div class="val" style="color:#2563eb">${activeCount}</div></div>
        <div class="card"><div class="lbl">Pending</div><div class="val" style="color:#d97706">${pendingCount}</div></div>
        <div class="card"><div class="lbl">Solved</div><div class="val" style="color:#059669">${solvedCount}</div></div>
      </div>
      <h2>Breakdown per Status</h2>
      <table>
        <thead><tr><th>Status</th><th style="text-align:center">Jumlah</th><th style="text-align:center">%</th></tr></thead>
        <tbody>${statusRows}</tbody>
      </table>
      <h2>Breakdown per Jenis WO</h2>
      <table>
        <thead><tr><th>Jenis WO</th><th style="text-align:center">Jumlah</th></tr></thead>
        <tbody>${jenisRows}</tbody>
      </table>
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Popup diblokir. Izinkan popup untuk melanjutkan.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><ClipboardList size={17} /></div>
            Monthly Report
          </h1>
          <p className="text-xs text-slate-400 mt-1">Daftar & monitoring Work Order teknis lapangan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isApprover && editRequests.length > 0 && (
            <button onClick={() => setShowApprovalPanel(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors">
              <ShieldAlert size={13} /> {editRequests.length} Request Edit
            </button>
          )}
          {/* WO-UX-05: Tombol history */}
          <button onClick={() => { fetchHistoryRequests(); setShowHistoryModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm transition-colors">
            <History size={13} /> Riwayat
          </button>
          {/* WO-UX-04 + WO-FITUR-03: Export buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <button onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors border-r border-slate-100">
              <Download size={12} /> Excel
            </button>
            <button onClick={exportToPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
              <Download size={12} /> PDF
            </button>
          </div>
          <button onClick={fetchData}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 shadow-sm transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {canCreate && (
            <Link href="/work-orders/create">
              <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                <Plus size={13} /> Input WO
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── STAT STRIP — WO-UX-02: tambah Pending ──── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total WO',  value: wos.length,    color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' },
          { label: 'Aktif',     value: activeCount,   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Pending',   value: pendingCount,  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Solved',    value: solvedCount,   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-3.5 shadow-sm"
            style={{ background: s.bg, borderColor: s.border }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color + 'aa' }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* WO-FITUR-04: Breakdown per JENIS WO */}
      {jenisBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <BarChart2 size={11} /> Jenis WO:
          </span>
          {jenisBreakdown.map(([jenis, count]) => (
            <button key={jenis}
              onClick={() => { setStatusFilter('ALL'); setSearch(jenis); resetPage(); }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer">
              <span className="text-slate-800">{jenis}</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-blue-600">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── FILTER + SEARCH ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4 space-y-3">
        {/* Row 1: Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {/* WO-UX-01: search juga meliputi Jenis WO, Keterangan, Status */}
            <input type="text" placeholder="Cari Subject / Team / Jenis / Status / Keterangan..."
              value={search} onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
          </div>
          {/* WO-FITUR-01: Date range */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={12} className="text-slate-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 bg-slate-50 outline-none focus:ring-1 focus:ring-blue-400" />
            <span className="text-[10px] text-slate-400 shrink-0">s/d</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 bg-slate-50 outline-none focus:ring-1 focus:ring-blue-400" />
            {(dateFrom || dateTo || search) && (
              <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); resetPage(); }}
                className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors">
                <X size={10} className="inline mr-0.5" />Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'PROGRESS', 'PENDING', 'OPEN', 'SOLVED', 'CANCEL'] as const).map(s => {
            const cnt = s === 'ALL' ? wos.length : (statusCounts[s] || 0);
            return (
              <button key={s} onClick={() => { setStatusFilter(s); resetPage(); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {s === 'ALL' ? `Semua (${cnt})` : `${s} (${cnt})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {/* WO-FITUR-02: sortable headers */}
                {[
                  { label: 'Tanggal',    field: 'TANGGAL' },
                  { label: 'Subject WO', field: 'SUBJECT WO' },
                  { label: 'Status',     field: 'STATUS' },
                  { label: 'Jenis',      field: 'JENIS WO' },
                  { label: 'Team',       field: 'NAMA TEAM' },
                ].map(col => (
                  <th key={col.label}
                    className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600"
                    onClick={() => toggleSort(col.field)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.field
                        ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
                        : <ArrowUpDown size={9} className="opacity-30" />}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[1,2,3,4,5,6].map(j => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + j * 12}px` }} />
                    </td>
                  ))}</tr>
                ))
              ) : paginatedWos.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 text-sm italic">Tidak ada data ditemukan.</td></tr>
              ) : paginatedWos.map(wo => {
                const hasPendingEdit = editRequests.some(r => r.target_id === wo.id);
                return (
                  <tr key={wo.id} className={`hover:bg-slate-50 transition-colors group ${hasPendingEdit ? 'bg-amber-50/40' : ''}`}>
                    {/* WO-BUG-04: Tampilkan tanggal dalam format Indonesia */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-medium">
                      {formatTanggalWO(wo.TANGGAL || '')}
                    </td>
                    <td className="px-5 py-3.5 max-w-[280px]">
                      <p className="font-semibold text-slate-800 text-xs truncate">{wo['SUBJECT WO'] || '—'}</p>
                      {wo.KETERANGAN && (
                        <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{wo.KETERANGAN}</p>
                      )}
                      {hasPendingEdit && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                          <Clock size={8} /> Menunggu Approval Edit
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={wo.STATUS || 'OPEN'} />
                    </td>
                    <td className="px-5 py-3.5">
                      {wo['JENIS WO'] ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold uppercase">
                          {wo['JENIS WO']}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {wo['NAMA TEAM'] ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold">
                          {wo['NAMA TEAM']}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link href={`/work-orders/${wo.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors">
                        <Eye size={12} /> Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination (WO-UX-03) */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {filteredWos.length === 0 ? 'Tidak ada data' : (
              <>Menampilkan <span className="font-semibold text-slate-600">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredWos.length)}
              </span> dari <span className="font-semibold text-slate-600">{filteredWos.length}</span> WO</>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors text-slate-500">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1
                  : currentPage <= 3 ? i + 1
                  : currentPage >= totalPages - 2 ? totalPages - 4 + i
                  : currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-[11px] font-semibold transition-colors ${
                      currentPage === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600'
                    }`}>{p}</button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors text-slate-500">
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── WO-UX-05: HISTORY MODAL ─────────────────── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><History size={14} /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Riwayat Edit Request</h3>
                  <p className="text-[11px] text-slate-500">50 riwayat terbaru (Approved &amp; Rejected)</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {historyRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <History size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400 italic">Belum ada riwayat</p>
                </div>
              ) : historyRequests.map(req => (
                <div key={req.id} className="border border-slate-100 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{req.target_subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {req.requested_by} → {req.reviewed_by || '—'}
                        {req.reviewed_at && ' · ' + format(new Date(req.reviewed_at), 'dd MMM yyyy HH:mm', { locale: indonesia })}
                      </p>
                    </div>
                    <span className={`shrink-0 ml-2 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>{req.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(req.proposed_changes || {}).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
                        <span className="font-bold">{k}:</span> {String(req.original_data?.[k] || '—')} → <span className="text-emerald-600 font-semibold">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                  {req.alasan && (
                    <p className="text-[10px] italic text-slate-500">Alasan: "{req.alasan}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVAL PANEL MODAL ────────────────────── */}
      {showApprovalPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><ShieldAlert size={15} /></div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Pending Edit Requests</h3>
                  <p className="text-[11px] text-amber-600">{editRequests.length} request menunggu persetujuan</p>
                </div>
              </div>
              <button onClick={() => setShowApprovalPanel(false)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {editRequests.length === 0 ? (
                <p className="text-center text-slate-400 text-sm italic py-8">Tidak ada request pending.</p>
              ) : editRequests.map(req => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{req.target_subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Diminta oleh <span className="font-semibold text-slate-600">{req.requested_by}</span>
                        {' · '}{req.created_at ? format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: indonesia }) : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">PENDING</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Alasan Edit</p>
                    <p className="text-xs text-slate-700 italic">"{req.alasan}"</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Perubahan yang Diusulkan</p>
                    <div className="space-y-1.5">
                      {Object.entries(req.proposed_changes || {}).map(([key, newVal]) => (
                        <div key={key} className="grid grid-cols-3 gap-2 text-[10px]">
                          <span className="font-bold text-slate-500 uppercase">{key}</span>
                          <span className="text-rose-500 line-through truncate">{String(req.original_data?.[key] || '—')}</span>
                          <span className="text-emerald-600 font-semibold truncate">{String(newVal || '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleApprove(req)}
                      className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                      <Check size={12} /> Approve & Terapkan
                    </button>
                    <button onClick={() => handleReject(req)}
                      className="flex items-center justify-center gap-1.5 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors">
                      <X size={12} /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
