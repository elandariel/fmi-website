'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  Users, Signal, MapPin, Download, FileSpreadsheet, FileText,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

// ── Sort types ─────────────────────────────────────────────────
type SortKey = 'id' | 'Nama Pelanggan' | 'STATUS' | 'Kapasitas';
type SortDir = 'asc' | 'desc';

export default function ClientListPage() {
  const [clients,       setClients]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [userRole,      setUserRole]      = useState<Role | null>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // CLIENT-UX-02: sort state
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // CLIENT-BUG-04: supabase singleton
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  // CLIENT-BUG-03: debounce search (350 ms)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 350);
  };

  // ── Toggle sort ─────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-slate-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ArrowUp   size={12} className="text-blue-500 ml-1 inline" />
      : <ArrowDown size={12} className="text-blue-500 ml-1 inline" />;
  };

  // ── Fetch paginated data ────────────────────────────────────
  async function fetchData() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role as Role);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to   = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from('Data Client Corporate').select('*', { count: 'exact' });
    if (debouncedSearch) {
      query = query.or(
        `"Nama Pelanggan".ilike.%${debouncedSearch}%,"ID Pelanggan".ilike.%${debouncedSearch}%`
      );
    }

    // CLIENT-UX-02: apply sort
    query = query.order(sortKey, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (!error) {
      setClients(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    }
    setLoading(false);
  }

  // ── Fetch ALL data for export ───────────────────────────────
  async function fetchAllData(): Promise<any[]> {
    let query = supabase.from('Data Client Corporate').select('*');
    if (debouncedSearch) {
      query = query.or(
        `"Nama Pelanggan".ilike.%${debouncedSearch}%,"ID Pelanggan".ilike.%${debouncedSearch}%`
      );
    }
    const { data, error } = await query.order(sortKey, { ascending: sortDir === 'asc' });
    if (error) return [];
    return data || [];
  }

  // ── EXPORT TO EXCEL ─────────────────────────────────────────
  async function handleExportExcel() {
    setExportLoading('excel');
    try {
      const allData = await fetchAllData();
      const XLSX    = await import('xlsx');

      const rows = allData.map((c) => ({
        'ID Pelanggan':  c['ID Pelanggan']  || '',
        'Nama Pelanggan': c['Nama Pelanggan'] || '',
        'Alamat':        c['ALAMAT']        || '',
        'Kapasitas':     c['Kapasitas']     || '',
        'Status':        c['STATUS']        || '',
        'RX ONT/SFP':   c['RX ONT/SFP']   || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 16 }, { wch: 36 }, { wch: 46 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Client');

      const filename = `data-client${debouncedSearch ? `-${debouncedSearch}` : ''}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('Gagal export Excel. Pastikan library xlsx tersedia.');
    } finally {
      setExportLoading(null);
    }
  }

  // ── EXPORT TO PDF ───────────────────────────────────────────
  async function handleExportPdf() {
    setExportLoading('pdf');
    try {
      const allData = await fetchAllData();

      const { jsPDF }    = await import('jspdf');
      const autoTable    = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Client Corporate', 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Diekspor: ${new Date().toLocaleString('id-ID')}  |  Total: ${allData.length} pelanggan`, 14, 23);
      if (debouncedSearch) doc.text(`Filter: "${debouncedSearch}"`, 14, 29);
      doc.setTextColor(0);

      const tableRows = allData.map((c) => [
        c['ID Pelanggan'] || '—',
        c['Nama Pelanggan'] || '—',
        c['ALAMAT'] ? c['ALAMAT'].substring(0, 50) + (c['ALAMAT'].length > 50 ? '…' : '') : '—',
        c['Kapasitas'] || '—',
        c['STATUS']    || '—',
        c['RX ONT/SFP'] || '—',
      ]);

      autoTable(doc, {
        startY: debouncedSearch ? 33 : 28,
        head: [['ID Pelanggan', 'Nama Pelanggan', 'Alamat', 'Kapasitas', 'Status', 'RX ONT/SFP']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles:  { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 52 }, 2: { cellWidth: 80 },
          3: { cellWidth: 22 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const status = (data.cell.raw || '').toString().toLowerCase();
            if      (status.includes('active') || status.includes('ok'))          doc.setFillColor(236, 253, 245);
            else if (status.includes('suspend') || status.includes('isolir'))     doc.setFillColor(255, 241, 242);
          }
        },
      });

      const filename = `data-client${debouncedSearch ? `-${debouncedSearch}` : ''}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Gagal export PDF. Pastikan library jspdf & jspdf-autotable tersedia.');
    } finally {
      setExportLoading(null);
    }
  }

  useEffect(() => { fetchData(); }, [page, debouncedSearch, sortKey, sortDir]);

  const canAdd        = hasAccess(userRole, PERMISSIONS.CLIENT_ADD);
  const canEditDelete = hasAccess(userRole, PERMISSIONS.CLIENT_EDIT_DELETE);

  const rangeFrom = totalRecords === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const rangeTo   = Math.min(page * ITEMS_PER_PAGE, totalRecords);

  // Helper for sortable th
  const ThSort = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none cursor-pointer hover:text-slate-600 hover:bg-slate-100 transition-colors ${className}`}
    >
      {label}<SortIcon col={col} />
    </th>
  );

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={20} />
            </div>
            Data Client
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-0.5">Database pelanggan aktif &amp; teknis</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            disabled={exportLoading !== null || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors"
            title="Export ke Excel"
          >
            {exportLoading === 'excel'
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <FileSpreadsheet size={15} />}
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            disabled={exportLoading !== null || loading}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors"
            title="Export ke PDF"
          >
            {exportLoading === 'pdf'
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <FileText size={15} />}
            <span className="hidden sm:inline">PDF</span>
          </button>

          {canAdd && (
            <Link href="/clients/create">
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors">
                <Plus size={16} /> Client Baru
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 flex flex-col md:flex-row justify-between gap-3">
        {/* CLIENT-BUG-03: debounced search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Cari nama / ID pelanggan..."
            value={search}
            onChange={handleSearchInput}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-slate-700 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          {debouncedSearch && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Download size={11} /> Export akan menggunakan filter aktif
            </p>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
            <Filter size={13} className="text-slate-400" />
            <span>Total: <span className="text-slate-800 font-bold">{totalRecords}</span> Pelanggan</span>
          </div>
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {/* Non-sortable */}
                <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID</th>

                {/* CLIENT-UX-02: Sortable columns */}
                <ThSort col="Nama Pelanggan" label="Nama Pelanggan" />
                <ThSort col="Kapasitas"      label="Kapasitas" />
                <ThSort col="STATUS"         label="Status"    className="text-center" />

                {/* Redaman — not sortable (numeric stored as text) */}
                <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Redaman <span className="normal-case font-normal text-slate-300">(dBm)</span>
                </th>
                <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><div className="h-3.5 bg-slate-100 rounded animate-pulse w-12" /></td>
                    <td className="px-5 py-3.5">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse w-44 mb-1.5" />
                      <div className="h-3   bg-slate-100 rounded animate-pulse w-28" />
                    </td>
                    <td className="px-5 py-3.5"><div className="h-3.5 bg-slate-100 rounded animate-pulse w-20" /></td>
                    <td className="px-5 py-3.5 text-center"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-16 mx-auto" /></td>
                    <td className="px-5 py-3.5 text-center"><div className="h-3.5 bg-slate-100 rounded animate-pulse w-14 mx-auto" /></td>
                    <td className="px-5 py-3.5 text-center"><div className="h-7 bg-slate-100 rounded animate-pulse w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        #{client['ID Pelanggan']}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 text-[13px]">{client['Nama Pelanggan']}</p>
                      {client['ALAMAT'] && (
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {client['ALAMAT'].substring(0, 35)}{client['ALAMAT'].length > 35 ? '…' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                        {client['Kapasitas'] || 'Default'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={client['STATUS']} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {/* CLIENT-UX-03: updated thresholds + tooltip */}
                      <SignalIndicator value={client['RX ONT/SFP']} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {/* CLIENT-BUG-01/02: Edit & Delete sudah di halaman detail — hanya tampilkan Detail */}
                      <div className="flex justify-center items-center gap-1">
                        <Link href={`/clients/${client.id}`}>
                          <button className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all">
                            Detail <ChevronRight size={13} />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Users size={32} className="opacity-30" />
                      <p className="text-sm font-medium">Tidak ada data ditemukan</p>
                      {debouncedSearch && <p className="text-xs">Coba kata kunci lain</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ───────────────────────────────────── */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <p className="text-xs text-slate-400 font-medium">
            {totalRecords > 0
              ? <>Menampilkan <span className="text-slate-600 font-semibold">{rangeFrom}–{rangeTo}</span> dari <span className="text-slate-600 font-semibold">{totalRecords}</span> data</>
              : 'Tidak ada data'
            }
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-slate-500 font-medium px-1">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STATUS BADGE ────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  let style = 'bg-slate-100 text-slate-500 border-slate-200';
  if      (s.includes('active')   || s.includes('ok'))       style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  else if (s.includes('suspend')  || s.includes('isolir'))   style = 'bg-rose-50 text-rose-700 border-rose-200';
  else if (s.includes('dismantle'))                          style = 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style}`}>
      {status || 'Unknown'}
    </span>
  );
}

// ── SIGNAL INDICATOR — CLIENT-UX-03 ────────────────────────────
// Threshold SOP:
//   val > -15.00 dBm  → HIGH POWER  (terlalu bagus / peringatan) — amber
//   -24.50 ≤ val ≤ -15.00          → BATAS AMAN SOP              — emerald
//   val < -24.50 dBm  → LOW POWER  (perlu perbaikan)             — rose
function SignalIndicator({ value }: { value?: string }) {
  const val = parseFloat(value || '');
  if (!value || isNaN(val)) {
    return <span className="text-slate-300 text-xs">—</span>;
  }

  let colorClass  = 'text-emerald-600';
  let dotClass    = 'bg-emerald-500';
  let tipBg       = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  let tipArrow    = 'border-emerald-200 bg-emerald-50';
  let label       = 'Batas Aman SOP';
  let sublabel    = '-15.00 s/d -24.50 dBm';
  let indicator   = '✓';

  if (val > -15.00) {
    colorClass = 'text-amber-500';
    dotClass   = 'bg-amber-400';
    tipBg      = 'bg-amber-50 border-amber-200 text-amber-800';
    tipArrow   = 'border-amber-200 bg-amber-50';
    label      = 'High Power';
    sublabel   = 'Power terlalu bagus (> -15.00 dBm)';
    indicator  = '▲';
  } else if (val < -24.50) {
    colorClass = 'text-rose-600';
    dotClass   = 'bg-rose-500';
    tipBg      = 'bg-rose-50 border-rose-200 text-rose-800';
    tipArrow   = 'border-rose-200 bg-rose-50';
    label      = 'Low Power';
    sublabel   = 'Perlu perbaikan (< -24.50 dBm)';
    indicator  = '▼';
  }

  return (
    <div className="relative group inline-flex items-center justify-center">
      {/* Value display */}
      <div className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${colorClass} cursor-default`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0`} />
        <Signal size={11} />
        {value}
      </div>

      {/* Tooltip — visible on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
        <div className={`px-3 py-2 rounded-lg border shadow-lg text-left whitespace-nowrap ${tipBg}`}>
          <p className="text-[11px] font-bold leading-tight">
            {indicator} {label}
          </p>
          <p className="text-[10px] font-normal mt-0.5 opacity-80">{sublabel}</p>
          {/* Threshold legend */}
          <div className="mt-1.5 pt-1.5 border-t border-current/10 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="opacity-70">{'> -15.00 dBm'} : High Power</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="opacity-70">{'-15.00 ~ -24.50'} : Aman SOP</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="opacity-70">{'< -24.50 dBm'} : Low Power</span>
            </div>
          </div>
        </div>
        {/* Arrow */}
        <div className="flex justify-center -mt-px">
          <div className={`w-2.5 h-2.5 rotate-45 border-b border-r ${tipArrow}`} />
        </div>
      </div>
    </div>
  );
}
