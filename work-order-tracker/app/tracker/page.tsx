'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  Search, Download, X, TrendingUp, UserPlus,
  Server, Plus, Calendar, FileEdit, Clock,
  Check, ShieldAlert, Send, ArrowUpRight, ArrowDownRight,
  MinusCircle, Activity, Users, BarChart2, RefreshCw,
  ChevronUp, ChevronDown, Info, History, ChevronLeft,
  ChevronRight, Filter, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner';
import MonthlySummary from '@/components/MonthlySummary';
import { logActivity } from '@/lib/logger';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TABLE_MAP: Record<string, string> = {
  'Berlangganan': 'Berlangganan 2026',
  'Berhenti Berlangganan': 'Berhenti Berlangganan 2026',
  'Berhenti Sementara': 'Berhenti Sementara 2026',
  'Upgrade': 'Upgrade 2026',
  'Downgrade': 'Downgrade 2026',
};

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; text: string }> = {
  'Berlangganan':          { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  'Berhenti Berlangganan': { color: '#ef4444', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
  'Berhenti Sementara':    { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  'Upgrade':               { color: '#2d7dd2', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  'Downgrade':             { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#334155' },
};

const APPROVER_ROLES = ['ADMIN', 'SUPER_DEV', 'NOC'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function TrackerPage() {
  const [selectedCategory, setSelectedCategory] = useState('Berlangganan');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const summaryRef = useRef<any>(null);
  const [targetMonth, setTargetMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showModal, setShowModal] = useState(false);
  const [modalChartMode, setModalChartMode] = useState<'ISP' | 'BTS' | 'MONTHLY'>('MONTHLY');

  const [globalStats, setGlobalStats] = useState<any>({
    pasang: 0, putus: 0, cuti: 0, upgrade: 0, downgrade: 0,
    netGrowth: 0, byIsp: [], byBts: [],
    monthlyTrend: [], monthlyPasang: [], monthlyPutus: [],
    topBts: [], retentionRate: 0,
  });

  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);

  // Request edit modal
  const [showRequestModal, setShowRequestModal]     = useState(false);
  const [isDirectEdit, setIsDirectEdit]             = useState(false); // BUG-04: approver edit langsung
  const [selectedRowForEdit, setSelectedRowForEdit] = useState<any>(null);
  const [requestAlasan, setRequestAlasan]           = useState('');
  const [proposedFields, setProposedFields] = useState({ subject: '', ISP: '', BTS: '', DEVICE: '' });
  const [submitting, setSubmitting]                 = useState(false);
  const [indexOptions, setIndexOptions] = useState<{ bts: string[]; isp: string[]; device: string[] }>({
    bts: [], isp: [], device: [],
  });
  const [indexLoadError, setIndexLoadError] = useState(false); // UX-04: retry support

  const [chartTrend, setChartTrend] = useState<any>({ series: [], options: {} });
  const [chartTeam, setChartTeam]   = useState<any>({ series: [], options: {} });

  // ── Pagination (UX-02 / FITUR-02) ─────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Sorting (FITUR-04) ─────────────────────────────────────
  const [sortField, setSortField] = useState<string>('TANGGAL');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');

  // ── Filter dropdowns (FITUR-09) ───────────────────────────
  const [filterISP,  setFilterISP]  = useState('');
  const [filterBTS,  setFilterBTS]  = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  // ── Date range filter (FITUR-03) ──────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // ── History modal (FITUR-07) ──────────────────────────────
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRequests,  setHistoryRequests]  = useState<any[]>([]);

  // BUG-09 fix: supabase stabil, tidak dibuat ulang tiap render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  const canInput = hasAccess(userRole, PERMISSIONS.TRACKER_INPUT);
  const isApprover = APPROVER_ROLES.includes(userRole || '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      if (profile) { setUserRole(profile.role as Role); setUserFullName(profile.full_name || ''); }
    }
    const tableName = TABLE_MAP[selectedCategory];
    if (!tableName) { setLoading(false); return; }
    const { data, error } = await supabase.from(tableName).select('*').order('TANGGAL', { ascending: false });
    if (error) toast.error('Gagal memuat data: ' + error.message);
    else { setDataList(data || []); processCharts(data || [], selectedCategory); }
    setLoading(false);
  }, [selectedCategory]);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const [rPasang, rPutus, rCuti, rUpgrade, rDowngrade] = await Promise.all([
        supabase.from('Berlangganan 2026').select('id, ISP, BTS, TANGGAL'),
        supabase.from('Berhenti Berlangganan 2026').select('id, TANGGAL'),
        supabase.from('Berhenti Sementara 2026').select('id, TANGGAL'),
        supabase.from('Upgrade 2026').select('id, TANGGAL'),
        supabase.from('Downgrade 2026').select('id, TANGGAL'),
      ]);

      const pasang = rPasang.data?.length || 0;
      const putus  = rPutus.data?.length  || 0;
      const cuti   = rCuti.data?.length   || 0;
      const upgrade   = rUpgrade.data?.length   || 0;
      const downgrade = rDowngrade.data?.length || 0;

      // ISP & BTS mapping
      const ispMap: Record<string, number> = {};
      const btsMap: Record<string, number> = {};
      rPasang.data?.forEach(row => {
        const isp = row.ISP || 'Unknown'; ispMap[isp] = (ispMap[isp] || 0) + 1;
        const bts = row.BTS || 'Unknown'; btsMap[bts] = (btsMap[bts] || 0) + 1;
      });

      // Monthly trend (12 bulan)
      const groupByMonth = (data: any[]) => {
        const m = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) m[new Date(row.TANGGAL).getMonth()]++; });
        return m;
      };
      const mPasang  = groupByMonth(rPasang.data || []);
      const mPutus   = groupByMonth(rPutus.data  || []);
      const mNet     = mPasang.map((v, i) => v - mPutus[i]);

      // Top BTS
      const topBts = Object.entries(btsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // BUG-10 fix: retention = 1 - churn rate, clamp ke [0, 100]
      // Formula: berapa % pelanggan yang tidak berhenti dari total yang pernah pasang
      const retentionRate = pasang > 0
        ? Math.min(100, Math.max(0, Math.round(((pasang - putus) / pasang) * 100)))
        : 0;

      setGlobalStats({
        pasang, putus, cuti, upgrade, downgrade,
        netGrowth: pasang - putus,
        byIsp: Object.entries(ispMap).sort((a,b) => b[1]-a[1]).slice(0,15).map(([name,data]) => ({ name, data })),
        byBts: Object.entries(btsMap).sort((a,b) => b[1]-a[1]).slice(0,15).map(([name,data]) => ({ name, data })),
        monthlyPasang: mPasang,
        monthlyPutus: mPutus,
        monthlyNet: mNet,
        topBts,
        retentionRate,
      });
    } catch (err) { console.error('Global stats error', err); }
  }, []);

  const fetchEditRequests = useCallback(async () => {
    const { data } = await supabase
      .from('WO_Edit_Requests')
      .select('*')
      .eq('request_type', 'TRACKER')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    setEditRequests(data || []);
  }, []);

  // FITUR-07: ambil history request (approved + rejected)
  const fetchHistoryRequests = useCallback(async () => {
    const { data } = await supabase
      .from('WO_Edit_Requests')
      .select('*')
      .eq('request_type', 'TRACKER')
      .in('status', ['APPROVED', 'REJECTED'])
      .order('reviewed_at', { ascending: false })
      .limit(50);
    setHistoryRequests(data || []);
  }, []);

  // UX-04: fetch index options dengan support retry
  const fetchIndexOptions = useCallback(async () => {
    setIndexLoadError(false);
    const { data, error } = await supabase.from('Index').select('BTS, ISP, DEVICE');
    if (error || !data) { setIndexLoadError(true); return; }
    const getUnique = (key: string) =>
      [...new Set(data.map((item: any) => item[key]).filter(Boolean))] as string[];
    setIndexOptions({ bts: getUnique('BTS'), isp: getUnique('ISP'), device: getUnique('DEVICE') });
  }, []);

  useEffect(() => { fetchData(); }, [selectedCategory]);
  useEffect(() => { fetchGlobalStats(); fetchEditRequests(); fetchIndexOptions(); }, []);

  // Realtime edit requests
  useEffect(() => {
    const channel = supabase
      .channel('tracker-edit-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'WO_Edit_Requests' }, () => fetchEditRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Parser tanggal Indonesia ("Rabu, 27 April 2026" → ISO key + label pendek) ──
  const BULAN_PARSE: Record<string, number> = {
    Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
    Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
  };
  const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  const parseTanggal = (val: string): { key: string; label: string } | null => {
    // Hilangkan prefix hari jika ada: "Rabu, 27 April 2026" → "27 April 2026"
    const clean = val.replace(/^[A-Za-zÀ-ÿ]+,\s*/, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length < 3) return null;
    const dd  = parseInt(parts[0], 10);
    const mm  = BULAN_PARSE[parts[1]];
    const yy  = parseInt(parts[2], 10);
    if (isNaN(dd) || mm === undefined || isNaN(yy)) return null;
    const key   = `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const label = `${dd} ${BULAN_SHORT[mm]}`;
    return { key, label };
  };

  // ── Custom tooltip HTML (inline styles — kebal terhadap dark mode CSS body color) ──
  const mkTooltipSingle = (label: string, dotColor: string, seriesName: string, val: number) =>
    `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;
                 box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:130px;font-family:inherit;">
      <div style="color:#374151;font-size:11px;font-weight:700;margin-bottom:5px;
                  padding-bottom:4px;border-bottom:1px solid #f1f5f9;">${label}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};
                     display:inline-block;flex-shrink:0;"></span>
        <span style="color:#374151;font-size:11px;">${seriesName}:&nbsp;
          <strong style="color:#1e293b;">${val} WO</strong>
        </span>
      </div>
    </div>`;

  const mkTooltipMulti = (label: string, series: number[][], seriesIndex: number, dataPointIndex: number, colors: string[], names: string[]) => {
    const rows = series.map((s, i) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-top:${i > 0 ? 4 : 0}px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};display:inline-block;flex-shrink:0;"></span>
        <span style="color:#374151;font-size:11px;">${names[i]}:&nbsp;<strong style="color:#1e293b;">${s[dataPointIndex]} WO</strong></span>
      </div>`
    ).join('');
    return `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;
                        box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:140px;font-family:inherit;">
      <div style="color:#374151;font-size:11px;font-weight:700;margin-bottom:5px;
                  padding-bottom:4px;border-bottom:1px solid #f1f5f9;">${label}</div>
      ${rows}
    </div>`;
  };

  const processCharts = (data: any[], category: string) => {
    const cfg = CATEGORY_CONFIG[category];
    const color = cfg?.color || '#2d7dd2';

    // ── Tren per-tanggal: parse format Indonesia → group by ISO key ──
    const dateMap: Record<string, { count: number; label: string }> = {};
    data.forEach(row => {
      if (row.TANGGAL) {
        const parsed = parseTanggal(String(row.TANGGAL));
        if (parsed) {
          if (!dateMap[parsed.key]) dateMap[parsed.key] = { count: 0, label: parsed.label };
          dateMap[parsed.key].count++;
        }
      }
    });
    // Sort secara kronologis (ISO key sorts correctly)
    const sortedKeys   = Object.keys(dateMap).sort();
    const dateLabels   = sortedKeys.map(k => dateMap[k].label);   // "27 Apr"
    const dateCounts   = sortedKeys.map(k => dateMap[k].count);

    setChartTrend({
      series: [{ name: 'Jumlah WO', data: dateCounts }],
      options: {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'transparent', animations: { enabled: true, speed: 500 } },
        xaxis: { categories: dateLabels, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, rotate: -30 } },
        yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        colors: [color],
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        title: { text: `Tren ${category}`, style: { color: '#334155', fontSize: '12px', fontWeight: '700' } },
        dataLabels: { enabled: false },
        // Custom tooltip: inline styles → kebal dark mode
        tooltip: {
          custom: ({ series, seriesIndex, dataPointIndex, w }: any) =>
            mkTooltipSingle(
              w.globals.labels[dataPointIndex],
              w.globals.colors[0],
              'Jumlah WO',
              series[seriesIndex][dataPointIndex]
            )
        },
      }
    });

    const teamMap: Record<string, number> = {};
    data.forEach(row => { const t = row.TEAM || 'Unknown'; teamMap[t] = (teamMap[t] || 0) + 1; });
    const sortedTeams = Object.keys(teamMap).sort((a,b) => teamMap[b]-teamMap[a]).slice(0,5);

    setChartTeam({
      series: [{ name: 'Total WO', data: sortedTeams.map(t => teamMap[t]) }],
      options: {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'transparent' },
        xaxis: { categories: sortedTeams, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
        colors: [color],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        title: { text: 'Top Performance Team', style: { color: '#334155', fontSize: '12px', fontWeight: '700' } },
        dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '10px', fontWeight: '600' } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
        // Custom tooltip: inline styles → kebal dark mode
        tooltip: {
          custom: ({ series, seriesIndex, dataPointIndex, w }: any) =>
            mkTooltipSingle(
              w.globals.labels[dataPointIndex],
              w.globals.colors[0],
              'Total WO',
              series[seriesIndex][dataPointIndex]
            )
        },
      }
    });
  };

  const getSubject = (row: any) =>
    row['SUBJECT BERLANGGANAN'] || row['SUBJECT BERHENTI BERLANGGANAN'] ||
    row['SUBJECT BERHENTI SEMENTARA'] || row['SUBJECT UPGRADE'] ||
    row['SUBJECT DOWNGRADE'] || row['SUBJECT'] || row['NAMA PELANGGAN'] || '—';

  // UX-01 + FITUR-03 + FITUR-04 + FITUR-09: filter + sort terpadu
  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    let result = dataList.filter(item => {
      // UX-01 fix: search juga mencakup ISP
      const matchSearch = !s ||
        getSubject(item).toLowerCase().includes(s) ||
        (item.BTS  || '').toLowerCase().includes(s) ||
        (item.TEAM || '').toLowerCase().includes(s) ||
        (item.ISP  || '').toLowerCase().includes(s);

      // FITUR-09: filter dropdown ISP / BTS / Team
      const matchISP  = !filterISP  || (item.ISP  || '') === filterISP;
      const matchBTS  = !filterBTS  || (item.BTS  || '') === filterBTS;
      const matchTeam = !filterTeam || (item.TEAM || '') === filterTeam;

      // FITUR-03: filter rentang tanggal
      const matchDateFrom = !dateFrom || (item.TANGGAL && item.TANGGAL >= dateFrom);
      const matchDateTo   = !dateTo   || (item.TANGGAL && item.TANGGAL <= dateTo);

      return matchSearch && matchISP && matchBTS && matchTeam && matchDateFrom && matchDateTo;
    });

    // FITUR-04: sorting
    result = [...result].sort((a, b) => {
      const va = (a[sortField] ?? '') as string;
      const vb = (b[sortField] ?? '') as string;
      const cmp = String(va).localeCompare(String(vb), 'id', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [dataList, search, filterISP, filterBTS, filterTeam, dateFrom, dateTo, sortField, sortDir]);

  // Pagination derived data
  const totalPages   = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1); };

  // FITUR-04: toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  // Options untuk filter dropdown — unik dari data
  const ispOptions  = useMemo(() => [...new Set(dataList.map(d => d.ISP).filter(Boolean))].sort(), [dataList]);
  const btsOptions  = useMemo(() => [...new Set(dataList.map(d => d.BTS).filter(Boolean))].sort(), [dataList]);
  const teamOptions = useMemo(() => [...new Set(dataList.map(d => d.TEAM).filter(Boolean))].sort(), [dataList]);

  // BUG-04 fix: approver langsung edit (isDirectEdit=true), non-approver kirim request
  const openRequestModal = async (row: any, directEdit = false) => {
    setIsDirectEdit(directEdit);
    setSelectedRowForEdit(row);
    setProposedFields({
      subject: getSubject(row),
      ISP: row.ISP || '',
      BTS: row.BTS || '',
      DEVICE: row.DEVICE || '',
    });
    setRequestAlasan('');
    setShowRequestModal(true);
    // Fetch index options jika belum ada (fetchIndexOptions sudah dipanggil di useEffect)
    if (indexOptions.bts.length === 0) fetchIndexOptions();
  };

  const handleSubmitRequest = async () => {
    if (!requestAlasan.trim()) { toast.error('Alasan edit wajib diisi!'); return; }
    const tableName = TABLE_MAP[selectedCategory];

    // Cari kolom subject yang tepat sesuai kategori
    let subjectKey = 'SUBJECT BERLANGGANAN';
    if (selectedCategory === 'Berhenti Sementara') subjectKey = 'SUBJECT BERHENTI SEMENTARA';
    else if (selectedCategory === 'Berhenti Berlangganan') subjectKey = 'SUBJECT BERHENTI BERLANGGANAN';
    else if (selectedCategory === 'Upgrade') subjectKey = 'SUBJECT UPGRADE';
    else if (selectedCategory === 'Downgrade') subjectKey = 'SUBJECT DOWNGRADE';

    const originalSubject = getSubject(selectedRowForEdit);

    // Kumpulkan hanya field yang benar-benar berubah
    const proposed_changes: Record<string, string> = {};
    const original_data: Record<string, string> = {};

    if (proposedFields.subject !== originalSubject) {
      proposed_changes[subjectKey] = proposedFields.subject;
      original_data[subjectKey] = originalSubject;
    }
    if (proposedFields.ISP !== (selectedRowForEdit.ISP || '')) {
      proposed_changes['ISP'] = proposedFields.ISP;
      original_data['ISP'] = selectedRowForEdit.ISP || '';
    }
    if (proposedFields.BTS !== (selectedRowForEdit.BTS || '')) {
      proposed_changes['BTS'] = proposedFields.BTS;
      original_data['BTS'] = selectedRowForEdit.BTS || '';
    }
    if (proposedFields.DEVICE !== (selectedRowForEdit.DEVICE || '')) {
      proposed_changes['DEVICE'] = proposedFields.DEVICE;
      original_data['DEVICE'] = selectedRowForEdit.DEVICE || '';
    }

    if (Object.keys(proposed_changes).length === 0) {
      toast.error('Tidak ada perubahan yang dibuat.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Mengirim request...');

    const { error } = await supabase.from('WO_Edit_Requests').insert({
      request_type: 'TRACKER',
      target_table: tableName,
      target_id: selectedRowForEdit.id,
      target_subject: originalSubject,
      requested_by: userFullName,
      requested_by_role: userRole,
      alasan: requestAlasan,
      proposed_changes,
      original_data,
      status: 'PENDING'
    });

    if (error) toast.error('Gagal: ' + error.message, { id: toastId });
    else {
      toast.success('Request edit terkirim!', { id: toastId });
      setShowRequestModal(false);
      fetchEditRequests();
      await logActivity({
        activity: 'TRACKER_EDIT_REQUEST',
        subject: getSubject(selectedRowForEdit),
        actor: userFullName,
        detail: `Alasan: ${requestAlasan} · Tabel: ${TABLE_MAP[selectedCategory]}`,
      });
    }
    setSubmitting(false);
  };

  // BUG-04 fix: approver langsung update tanpa buat WO_Edit_Requests
  const handleDirectApply = async () => {
    if (!selectedRowForEdit) return;
    const tableName = TABLE_MAP[selectedCategory];
    let subjectKey = 'SUBJECT BERLANGGANAN';
    if (selectedCategory === 'Berhenti Sementara')     subjectKey = 'SUBJECT BERHENTI SEMENTARA';
    else if (selectedCategory === 'Berhenti Berlangganan') subjectKey = 'SUBJECT BERHENTI BERLANGGANAN';
    else if (selectedCategory === 'Upgrade')           subjectKey = 'SUBJECT UPGRADE';
    else if (selectedCategory === 'Downgrade')         subjectKey = 'SUBJECT DOWNGRADE';

    const updates: Record<string, string> = {};
    const original = getSubject(selectedRowForEdit);
    if (proposedFields.subject !== original)                      updates[subjectKey]  = proposedFields.subject;
    if (proposedFields.ISP    !== (selectedRowForEdit.ISP    || '')) updates['ISP']    = proposedFields.ISP;
    if (proposedFields.BTS    !== (selectedRowForEdit.BTS    || '')) updates['BTS']    = proposedFields.BTS;
    if (proposedFields.DEVICE !== (selectedRowForEdit.DEVICE || '')) updates['DEVICE'] = proposedFields.DEVICE;

    if (Object.keys(updates).length === 0) { toast.error('Tidak ada perubahan.'); return; }

    setSubmitting(true);
    const toastId = toast.loading('Menyimpan perubahan...');
    const { error } = await supabase.from(tableName).update(updates).eq('id', selectedRowForEdit.id);
    if (error) { toast.error('Gagal: ' + error.message, { id: toastId }); }
    else {
      toast.success('Data berhasil diperbarui!', { id: toastId });
      setShowRequestModal(false);
      fetchData();
      await logActivity({
        activity: 'TRACKER_DIRECT_EDIT',
        subject: getSubject(selectedRowForEdit),
        actor: userFullName,
        detail: `Edit langsung oleh ${userRole} · Tabel: ${tableName}`,
      });
    }
    setSubmitting(false);
  };

  const handleApproveTracker = async (req: any) => {
    const toastId = toast.loading('Memproses...');
    const { error } = await supabase.from(req.target_table).update(req.proposed_changes).eq('id', req.target_id);
    if (error) { toast.error('Gagal: ' + error.message, { id: toastId }); return; }
    await supabase.from('WO_Edit_Requests').update({ status: 'APPROVED', reviewed_by: userFullName, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    toast.success('Approved!', { id: toastId });
    fetchData(); fetchEditRequests();
    await logActivity({
      activity: 'TRACKER_EDIT_APPROVED',
      subject: req.target_subject,
      actor: userFullName,
      detail: `Tabel: ${req.target_table} · Disetujui dari request ${req.requested_by}`,
    });
  };

  const handleRejectTracker = async (req: any) => {
    await supabase.from('WO_Edit_Requests').update({ status: 'REJECTED', reviewed_by: userFullName, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    toast.success('Request ditolak.');
    fetchEditRequests();
    await logActivity({
      activity: 'TRACKER_EDIT_REJECTED',
      subject: req.target_subject,
      actor: userFullName,
      detail: `Request dari ${req.requested_by} ditolak`,
    });
  };

  const activeConf = CATEGORY_CONFIG[selectedCategory];
  const currentMonthIdx = new Date().getMonth();
  const thisMonthPasang = globalStats.monthlyPasang?.[currentMonthIdx] || 0;
  const thisMonthPutus  = globalStats.monthlyPutus?.[currentMonthIdx]  || 0;

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><UserPlus size={17} /></div>
            Weekly Report
          </h1>
          <p className="text-xs text-slate-400 mt-1">Monitoring status perubahan & pertumbuhan pelanggan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isApprover && editRequests.length > 0 && (
            <button onClick={() => setShowApprovalPanel(true)} className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors">
              <ShieldAlert size={13} /> {editRequests.length} Request Edit
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors">
            <BarChart2 size={14} className="text-indigo-500" /> Global Stats
          </button>
          {canInput && (
            <Link href="/tracker/create">
              <button className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                <Plus size={13} /> Input Baru
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── QUICK STATS STRIP — BUG-08: tambah Downgrade ────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Berlangganan',     value: globalStats.pasang,    icon: <ArrowUpRight size={14}/>,  color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
          { label: 'Putus',            value: globalStats.putus,     icon: <ArrowDownRight size={14}/>,color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
          { label: 'Berhenti Smtr',    value: globalStats.cuti,      icon: <MinusCircle size={14}/>,   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Upgrade',          value: globalStats.upgrade,   icon: <TrendingUp size={14}/>,    color: '#2d7dd2', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Downgrade',        value: globalStats.downgrade, icon: <ChevronDown size={14}/>,   color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
          { label: 'Net Growth',       value: globalStats.netGrowth >= 0 ? `+${globalStats.netGrowth}` : globalStats.netGrowth,
            icon: <Activity size={14}/>, color: globalStats.netGrowth >= 0 ? '#059669' : '#dc2626',
            bg: globalStats.netGrowth >= 0 ? '#ecfdf5' : '#fff1f2', border: globalStats.netGrowth >= 0 ? '#a7f3d0' : '#fecdd3' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-3 flex items-center gap-3" style={{ background: s.bg, borderColor: s.border }}>
            <div className="p-1.5 bg-white rounded-lg" style={{ color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CATEGORY TABS ──────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
        {Object.keys(TABLE_MAP).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={selectedCategory === cat
                ? { background: cfg.color, color: '#fff' }
                : { color: '#64748b' }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── CHARTS — UX-03: empty state ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div style={{ height: 220 }}>
            {chartTrend.series.length > 0 && chartTrend.series[0]?.data?.length > 0 ? (
              <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height="100%" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                <BarChart2 size={32} />
                <p className="text-xs font-semibold text-slate-400">Belum ada data tren</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div style={{ height: 220 }}>
            {chartTeam.series.length > 0 && chartTeam.series[0]?.data?.length > 0 ? (
              <ReactApexChart options={chartTeam.options} series={chartTeam.series} type="bar" height="100%" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                <Users size={32} />
                <p className="text-xs font-semibold text-slate-400">Belum ada data team</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MONTHLY SUMMARY ─────────────────────────── */}
      <div className="mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600"><Calendar size={13} /></div>
            Monthly Summary Report
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <button onClick={() => summaryRef.current?.handleExport()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors border-r border-slate-100">
                <Download size={12} /> Excel
              </button>
              {/* BUG-07 fix: PDF hanya summary, bukan seluruh halaman */}
              <button onClick={() => summaryRef.current?.handlePdfExport()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                <Download size={12} /> PDF
              </button>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Periode:</span>
              <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="text-xs font-semibold text-blue-600 outline-none bg-transparent cursor-pointer" />
            </div>
          </div>
        </div>
        <MonthlySummary ref={summaryRef} selectedMonth={targetMonth} />
      </div>

      {/* ── DATA TABLE ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header: judul + search */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-800 text-sm">List {selectedCategory}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{ background: activeConf.bg, color: activeConf.color, borderColor: activeConf.border }}>
              {filteredData.length}
            </span>
            {/* FITUR-07: tombol History */}
            <button
              onClick={() => { fetchHistoryRequests(); setShowHistoryModal(true); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition-colors"
            >
              <History size={11} /> Riwayat
            </button>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            {/* UX-01 fix: placeholder mencerminkan ISP juga bisa dicari */}
            <input type="text" placeholder="Cari Subject / BTS / Team / ISP..." value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
          </div>
        </div>

        {/* FITUR-03 + FITUR-09: Filter row */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 items-center">
          <Filter size={11} className="text-slate-400 shrink-0" />
          {/* Date range */}
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400" />
          <span className="text-[10px] text-slate-400">s/d</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400" />
          {/* ISP dropdown */}
          <select value={filterISP} onChange={e => { setFilterISP(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Semua ISP</option>
            {ispOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {/* BTS dropdown */}
          <select value={filterBTS} onChange={e => { setFilterBTS(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Semua BTS</option>
            {btsOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {/* Team dropdown */}
          <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Semua Team</option>
            {teamOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {/* Reset filter */}
          {(dateFrom || dateTo || filterISP || filterBTS || filterTeam || search) && (
            <button onClick={() => {
              setSearch(''); setDateFrom(''); setDateTo('');
              setFilterISP(''); setFilterBTS(''); setFilterTeam('');
              setCurrentPage(1);
            }} className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors">
              <X size={10} className="inline mr-0.5" />Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {/* FITUR-04: sortable column headers */}
                {[
                  { label: 'Tanggal',           field: 'TANGGAL' },
                  { label: 'Subject Pelanggan', field: null },
                  { label: 'ISP',               field: 'ISP' },
                  { label: 'Team',              field: 'TEAM' },
                  { label: 'BTS',               field: 'BTS' },
                ].map(col => (
                  <th key={col.label}
                    className={`px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${col.field ? 'cursor-pointer select-none hover:text-slate-600' : ''}`}
                    onClick={() => col.field && toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.field && (
                        sortField === col.field
                          ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
                          : <ArrowUpDown size={9} className="opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>{[1,2,3,4,5,6].map(j => (
                    <td key={j} className="px-5 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${50+j*12}px` }} /></td>
                  ))}</tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr key={row.id ?? idx} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3 text-xs font-medium text-slate-600 font-mono">
                      {row.TANGGAL ? (() => { try { return format(new Date(row.TANGGAL), 'dd/MM/yyyy'); } catch { return row.TANGGAL; } })() : '—'}
                    </td>
                    <td className="px-5 py-3 max-w-[220px]">
                      <p className="font-semibold text-slate-800 text-xs truncate">{getSubject(row)}</p>
                      {(row['PROBLEM'] || row['REASON'] || row['KETERANGAN']) && (
                        <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{row['PROBLEM'] || row['REASON'] || row['KETERANGAN']}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold uppercase">{row.ISP || 'INTERNAL'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-semibold uppercase">{row.TEAM || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Server size={11} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-xs">{row.BTS || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {/* BUG-04 fix: approver buka modal edit langsung, bukan anchor mati */}
                      {isApprover ? (
                        <button onClick={() => openRequestModal(row, true)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold">
                          <FileEdit size={11} /> Edit
                        </button>
                      ) : (
                        <button onClick={() => openRequestModal(row, false)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 text-xs font-semibold transition-colors opacity-0 group-hover:opacity-100">
                          <FileEdit size={11} /> Request
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 text-sm italic">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* UX-02 / FITUR-02: Pagination footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] text-slate-500 font-medium">
              {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors text-slate-500">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 :
                  currentPage <= 3 ? i + 1 :
                  currentPage >= totalPages - 2 ? totalPages - 4 + i :
                  currentPage - 2 + i;
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
          </div>
        )}
      </div>

      {/* ── GLOBAL STATS MODAL ──────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp size={15} /></div>
                Summary Growth 2026
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"><X size={16} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">

              {/* ── Baris 1: KPI Utama ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Net Growth" value={globalStats.netGrowth >= 0 ? `+${globalStats.netGrowth}` : globalStats.netGrowth}
                  sub="Pasang - Putus" color={globalStats.netGrowth >= 0 ? '#059669' : '#dc2626'}
                  bg={globalStats.netGrowth >= 0 ? '#ecfdf5' : '#fff1f2'} icon={<Activity size={16}/>} />
                <KpiCard label="Total Berlangganan" value={globalStats.pasang} sub="Pelanggan baru 2026" color="#10b981" bg="#ecfdf5" icon={<ArrowUpRight size={16}/>} />
                <KpiCard label="Total Putus" value={globalStats.putus} sub="Berhenti berlangganan" color="#ef4444" bg="#fff1f2" icon={<ArrowDownRight size={16}/>} />
                <KpiCard label="Retention Rate" value={`${globalStats.retentionRate}%`} sub="Dari total pasang" color="#7c3aed" bg="#f5f3ff" icon={<Users size={16}/>} />
              </div>

              {/* ── Baris 2: Secondary stats ── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Berhenti Sementara', value: globalStats.cuti, color: '#f59e0b', bg: '#fffbeb' },
                  { label: 'Upgrade Layanan', value: globalStats.upgrade, color: '#2d7dd2', bg: '#eff6ff' },
                  { label: 'Downgrade Layanan', value: globalStats.downgrade, color: '#94a3b8', bg: '#f8fafc' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border p-3 text-center" style={{ background: s.bg, borderColor: s.color + '40' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Baris 3: Bulan ini highlight ── */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-blue-600" />
                  <p className="text-xs font-bold text-blue-800">Bulan Ini — {format(new Date(), 'MMMM yyyy', { locale: indonesia })}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pasang</p>
                    <p className="text-xl font-bold text-emerald-600">{thisMonthPasang}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Putus</p>
                    <p className="text-xl font-bold text-rose-600">{thisMonthPutus}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Net</p>
                    <p className={`text-xl font-bold ${thisMonthPasang - thisMonthPutus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {thisMonthPasang - thisMonthPutus >= 0 ? '+' : ''}{thisMonthPasang - thisMonthPutus}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Baris 4: Monthly trend chart ── */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Tren Bulanan 2026</h4>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-emerald-400 inline-block"/> Pasang</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-rose-400 inline-block"/> Putus</span>
                  </div>
                </div>
                <ReactApexChart
                  type="bar"
                  height={180}
                  series={[
                    { name: 'Pasang', data: globalStats.monthlyPasang || [] },
                    { name: 'Putus', data: globalStats.monthlyPutus || [] },
                  ]}
                  options={{
                    chart: { toolbar: { show: false }, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'transparent' },
                    colors: ['#10b981', '#ef4444'],
                    xaxis: { categories: MONTH_LABELS, labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
                    yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
                    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
                    dataLabels: { enabled: false },
                    legend: { show: false },
                    // Custom tooltip: inline styles → kebal dark mode
                    tooltip: {
                      custom: ({ series, seriesIndex, dataPointIndex, w }: any) =>
                        mkTooltipMulti(
                          w.globals.labels[dataPointIndex],
                          series, seriesIndex, dataPointIndex,
                          w.globals.colors,
                          w.globals.seriesNames
                        )
                    },
                  }}
                />
              </div>

              {/* ── Baris 5: Top BTS + Distribusi ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Top 5 BTS */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Top 5 BTS (Berlangganan)</h4>
                  <div className="space-y-2">
                    {globalStats.topBts?.map((bts: any, i: number) => {
                      const maxCount = globalStats.topBts[0]?.count || 1;
                      const pct = Math.round((bts.count / maxCount) * 100);
                      return (
                        <div key={bts.name}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">
                              <span className="text-slate-400 mr-1.5 font-mono text-[10px]">#{i+1}</span>{bts.name}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{bts.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* UX-06 fix: Distribusi Pasang — angka saja, lebih bersih */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Distribusi Pasang</h4>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      <button onClick={() => setModalChartMode('ISP')} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${modalChartMode === 'ISP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>ISP</button>
                      <button onClick={() => setModalChartMode('BTS')} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${modalChartMode === 'BTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>BTS</button>
                    </div>
                  </div>
                  {/* Tampilkan sebagai list angka, bukan chart horizontal yg jelek */}
                  {(() => {
                    const items = (modalChartMode === 'ISP' ? globalStats.byIsp : globalStats.byBts) as { name: string; data: number }[];
                    const maxVal = items[0]?.data || 1;
                    const accent = modalChartMode === 'ISP' ? '#2d7dd2' : '#7c3aed';
                    return items.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 italic">Belum ada data</p>
                    ) : (
                      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 200 }}>
                        {items.map((item, i) => {
                          const pct = Math.round((item.data / maxVal) * 100);
                          return (
                            <div key={item.name} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">#{i+1}</span>
                              <span className="text-[11px] font-semibold text-slate-700 truncate flex-1" style={{ minWidth: 0 }}>{item.name}</span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 shrink-0">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                              </div>
                              <span className="text-xs font-bold w-6 text-right shrink-0" style={{ color: accent }}>{item.data}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVAL PANEL ──────────────────────────── */}
      {showApprovalPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><ShieldAlert size={14} /></div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Pending Edit Requests — Tracker</h3>
                  <p className="text-[11px] text-amber-600">{editRequests.length} request menunggu persetujuan</p>
                </div>
              </div>
              <button onClick={() => setShowApprovalPanel(false)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {editRequests.map(req => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{req.target_subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {req.requested_by} · {req.target_table}
                        {req.created_at && ' · ' + format(new Date(req.created_at), 'dd MMM HH:mm', { locale: indonesia })}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">PENDING</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">Alasan</p>
                    <p className="text-xs italic text-slate-700">"{req.alasan}"</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 mb-1.5">Perubahan</p>
                    {Object.entries(req.proposed_changes || {}).map(([k, v]) => (
                      <div key={k} className="text-[10px] flex gap-2">
                        <span className="font-bold text-slate-500">{k}:</span>
                        <span className="text-rose-500 line-through">{String(req.original_data?.[k] || '—')}</span>
                        <span>→</span>
                        <span className="text-emerald-600 font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleApproveTracker(req)} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => handleRejectTracker(req)} className="flex items-center justify-center gap-1.5 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors">
                      <X size={11} /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FITUR-07: HISTORY MODAL ─────────────────── */}
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
                        {req.requested_by} → {req.reviewed_by || '—'} · {req.target_table}
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

      {/* ── REQUEST EDIT MODAL ──────────────────────── */}
      {showRequestModal && selectedRowForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* BUG-04: judul modal berbeda untuk approver (edit langsung) vs user biasa */}
            <div className={`px-5 py-4 border-b flex justify-between items-center ${isDirectEdit ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isDirectEdit ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  <FileEdit size={13} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isDirectEdit ? 'Edit Langsung' : 'Request Edit'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isDirectEdit ? 'Perubahan langsung diterapkan' : 'Perlu disetujui Admin/NOC'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Alasan — hanya untuk non-approver */}
              {!isDirectEdit && (
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Alasan Edit <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={requestAlasan}
                    onChange={(e) => setRequestAlasan(e.target.value)}
                    placeholder="Jelaskan alasan perubahan..."
                    rows={2}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                  />
                </div>
              )}

              {/* 4 fields yang bisa diedit */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field yang Diubah</p>

                {/* Subject */}
                <TrackerEditField
                  label="Subject / Nama Pelanggan"
                  original={getSubject(selectedRowForEdit)}
                  value={proposedFields.subject}
                  onChange={(v) => setProposedFields(p => ({ ...p, subject: v }))}
                />

                {/* UX-04 fix: pass retry props ke TrackerSelectField */}
                <TrackerSelectField
                  label="ISP"
                  original={selectedRowForEdit.ISP || '—'}
                  value={proposedFields.ISP}
                  options={indexOptions.isp}
                  hasError={indexLoadError}
                  onRetry={fetchIndexOptions}
                  onChange={(v) => setProposedFields(p => ({ ...p, ISP: v }))}
                />

                <TrackerSelectField
                  label="BTS"
                  original={selectedRowForEdit.BTS || '—'}
                  value={proposedFields.BTS}
                  options={indexOptions.bts}
                  hasError={indexLoadError}
                  onRetry={fetchIndexOptions}
                  onChange={(v) => setProposedFields(p => ({ ...p, BTS: v }))}
                />

                <TrackerSelectField
                  label="Device"
                  original={selectedRowForEdit.DEVICE || '—'}
                  value={proposedFields.DEVICE}
                  options={indexOptions.device}
                  hasError={indexLoadError}
                  onRetry={fetchIndexOptions}
                  onChange={(v) => setProposedFields(p => ({ ...p, DEVICE: v }))}
                />
              </div>

              {/* Preview perubahan */}
              {(() => {
                const original = getSubject(selectedRowForEdit);
                const hasChanges =
                  proposedFields.subject !== original ||
                  proposedFields.ISP !== (selectedRowForEdit.ISP || '') ||
                  proposedFields.BTS !== (selectedRowForEdit.BTS || '') ||
                  proposedFields.DEVICE !== (selectedRowForEdit.DEVICE || '');
                if (!hasChanges) return null;
                return (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Field yang akan diubah:</p>
                    {proposedFields.subject !== original && (
                      <div className="text-[10px] text-emerald-700 flex gap-2 mb-1">
                        <span className="font-bold w-16 shrink-0">Subject:</span>
                        <span className="text-rose-500 line-through truncate">{original}</span>
                        <span className="shrink-0">→</span>
                        <span className="font-semibold truncate">{proposedFields.subject}</span>
                      </div>
                    )}
                    {proposedFields.ISP !== (selectedRowForEdit.ISP || '') && (
                      <div className="text-[10px] text-emerald-700 flex gap-2 mb-1">
                        <span className="font-bold w-16 shrink-0">ISP:</span>
                        <span className="text-rose-500 line-through">{selectedRowForEdit.ISP || '—'}</span>
                        <span className="shrink-0">→</span>
                        <span className="font-semibold">{proposedFields.ISP || '—'}</span>
                      </div>
                    )}
                    {proposedFields.BTS !== (selectedRowForEdit.BTS || '') && (
                      <div className="text-[10px] text-emerald-700 flex gap-2 mb-1">
                        <span className="font-bold w-16 shrink-0">BTS:</span>
                        <span className="text-rose-500 line-through">{selectedRowForEdit.BTS || '—'}</span>
                        <span className="shrink-0">→</span>
                        <span className="font-semibold">{proposedFields.BTS || '—'}</span>
                      </div>
                    )}
                    {proposedFields.DEVICE !== (selectedRowForEdit.DEVICE || '') && (
                      <div className="text-[10px] text-emerald-700 flex gap-2">
                        <span className="font-bold w-16 shrink-0">Device:</span>
                        <span className="text-rose-500 line-through">{selectedRowForEdit.DEVICE || '—'}</span>
                        <span className="shrink-0">→</span>
                        <span className="font-semibold">{proposedFields.DEVICE || '—'}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex gap-2">
              {/* BUG-04 fix: tombol berbeda untuk approver (simpan langsung) vs user biasa (kirim request) */}
              <button
                onClick={isDirectEdit ? handleDirectApply : handleSubmitRequest}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-lg text-xs font-bold transition-colors disabled:bg-slate-300 ${
                  isDirectEdit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isDirectEdit ? <Check size={12} /> : <Send size={12} />}
                {submitting
                  ? (isDirectEdit ? 'Menyimpan...' : 'Mengirim...')
                  : (isDirectEdit ? 'Simpan Langsung' : 'Kirim Request')}
              </button>
              <button onClick={() => setShowRequestModal(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TRACKER EDIT FIELD (text input) ─────────────────────────
function TrackerEditField({ label, original, value, onChange }: {
  label: string; original: string; value: string; onChange: (v: string) => void;
}) {
  const changed = value !== original && !(value === '' && original === '—');
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-semibold text-slate-500">{label}</label>
        <span className="text-[9px] text-slate-400 italic truncate max-w-[160px]">
          Saat ini: <span className="text-slate-600 font-semibold not-italic">{original}</span>
        </span>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Isi ${label} baru...`}
        className={`w-full p-2 border rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          changed ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
        }`}
      />
    </div>
  );
}

// ── TRACKER SELECT FIELD (dropdown dari Index) ───────────────
// UX-04 fix: tambah hasError + onRetry untuk retry jika index gagal dimuat
function TrackerSelectField({ label, original, value, options, hasError, onRetry, onChange }: {
  label: string; original: string; value: string; options: string[];
  hasError?: boolean; onRetry?: () => void; onChange: (v: string) => void;
}) {
  const changed = value !== (original === '—' ? '' : original);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-semibold text-slate-500">{label}</label>
        <span className="text-[9px] text-slate-400 italic truncate max-w-[160px]">
          Saat ini: <span className="text-slate-600 font-semibold not-italic">{original}</span>
        </span>
      </div>
      {/* UX-04: tampilkan retry button jika error & options kosong */}
      {hasError && options.length === 0 ? (
        <div className="flex items-center gap-2 p-2 border border-rose-200 bg-rose-50 rounded-lg">
          <span className="text-[10px] text-rose-600 flex-1">Gagal memuat opsi {label}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 px-2 py-0.5 bg-white border border-rose-200 text-rose-600 rounded text-[10px] font-semibold hover:bg-rose-100 transition-colors"
            >
              <RefreshCw size={9} /> Coba Lagi
            </button>
          )}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-2 border rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer ${
            changed ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <option value="">— Pilih {label} —</option>
          {options.length === 0 ? (
            <option disabled>Memuat data...</option>
          ) : (
            options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))
          )}
        </select>
      )}
    </div>
  );
}

// ── KPI CARD ────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, bg, icon }: any) {
  return (
    <div className="rounded-xl border p-4" style={{ background: bg, borderColor: color + '30' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-1" style={{ color: color + 'aa' }}>{sub}</p>
    </div>
  );
}