'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Search, RefreshCcw, Server, Database, Filter,
  Edit, Save, Trash2, X, AlertCircle, CheckCircle,
  Router, ShieldCheck, AlertTriangle,
  ChevronLeft, ChevronRight, Share2, Loader2,
} from 'lucide-react';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { toast } from 'sonner';
import { logActivity, getActorName } from '@/lib/logger';

const VLAN_TABLES = [
  { name: 'VLAN 1-1000',  table: 'Daftar Vlan 1-1000' },
  { name: 'VLAN 1000+',   table: 'Daftar Vlan 1000+' },
  { name: 'VLAN 2000+',   table: 'Daftar Vlan 2000+' },
  { name: 'VLAN 3000+',   table: 'Daftar Vlan 3000+' },
  { name: 'VLAN 3500+',   table: 'Daftar Vlan 3500+' },
  { name: 'VLAN 4003+',   table: 'Daftar Vlan 4003+' },
];

const SPREADSHEET_ID = '1kojKLgb04yCirdTfRcb3C_1xqkKs8N68bmzuz0-4-N4';

// VLAN-BUG-04: helper terpusat — FREE jika NAME kosong / '-' / 'AVAILABLE' (case-insensitive)
function isVlanUsed(row: any): boolean {
  const name = (row.NAME || '').toUpperCase().trim();
  return name !== '' && name !== '-' && name !== 'AVAILABLE';
}

export default function VlanPage() {
  const [selectedTable, setSelectedTable] = useState(VLAN_TABLES[0]);
  const [vlanList,  setVlanList]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLabel, setSyncLabel] = useState('');
  const [search,    setSearch]    = useState('');
  const [userRole,  setUserRole]  = useState<Role | null>(null);

  // VLAN-UX-01: filter status
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'USED' | 'FREE'>('ALL');

  const [currentPage,  setCurrentPage]  = useState(1);
  const itemsPerPage = 50;

  // VLAN-BUG-05: supabase singleton
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [editingVlan,       setEditingVlan]        = useState<any>(null);
  const [isSaving,          setIsSaving]           = useState(false);
  const [showResetConfirm,  setShowResetConfirm]   = useState(false);
  const [showSyncConfirm,   setShowSyncConfirm]    = useState(false); // VLAN-UX-04

  const [stats, setStats] = useState({ total: 0, used: 0, free: 0 });

  // ── Fetch data ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role as Role);
    }
    const { data, error } = await supabase
      .from(selectedTable.table).select('*').order('VLAN', { ascending: true });
    if (error) {
      toast.error('Gagal memuat data VLAN');
    } else {
      const rows = data || [];
      setVlanList(rows);
      const used = rows.filter(isVlanUsed).length;
      setStats({ total: rows.length, used, free: rows.length - used });
    }
    setLoading(false);
  }, [selectedTable, supabase]);

  useEffect(() => { fetchData(); setCurrentPage(1); }, [selectedTable]);

  // ── VLAN-BUG-02 fix: sync via server-side proxy (/api/vlan-sync)
  //    Sebelumnya: mode:'no-cors' → response selalu "ok" meski gagal
  //    Sekarang: fetch ke Next.js API route → proxy tanpa CORS ke Google Script
  //
  // VLAN-UX-04: sync SEMUA tabel sekaligus tanpa harus pindah manual
  const handleSyncAll = async () => {
    setShowSyncConfirm(false);
    setIsSyncing(true);

    const syncId = toast.loading('Memulai sinkronisasi semua VLAN...');
    let success = 0;
    let failed  = 0;

    for (let i = 0; i < VLAN_TABLES.length; i++) {
      const t = VLAN_TABLES[i];
      const prog = `(${i + 1}/${VLAN_TABLES.length})`;
      setSyncLabel(`${t.name} ${prog}`);
      toast.loading(`Sinkronisasi ${t.name}... ${prog}`, { id: syncId });

      try {
        // 1. Ambil data dari Supabase
        const { data, error } = await supabase
          .from(t.table).select('*').order('VLAN', { ascending: true });
        if (error || !data) { failed++; continue; }

        // 2. Kirim ke proxy API route (server-side — tidak ada CORS)
        const res = await fetch('/api/vlan-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetName: t.table,
            rows: data,
          }),
        });

        const json = await res.json().catch(() => ({ success: false }));
        if (res.ok && json.success) success++;
        else { failed++; console.error(`[vlan-sync] ${t.name}:`, json.error); }
      } catch (err) {
        failed++;
        console.error(`[vlan-sync] ${t.name}:`, err);
      }
    }

    setSyncLabel('');
    if (failed === 0) {
      toast.success(`Sync selesai! ${success} tabel berhasil disinkronkan ke Spreadsheet.`, { id: syncId });
    } else {
      toast.error(`Selesai: ${success} berhasil, ${failed} gagal. Cek konsol untuk detail.`, { id: syncId });
    }
    setIsSyncing(false);
  };

  // ── Edit & Save ─────────────────────────────────────────────
  const handleEditClick = (vlanItem: any) => {
    setEditingVlan({ ...vlanItem });
    setIsModalOpen(true);
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingVlan({ ...editingVlan, [e.target.name]: e.target.value });
  };

  // VLAN-BUG-03 fix: selalu match by VLAN (int8, tidak ada kolom id)
  const vlanMatch = (vlan: any) => ({ VLAN: typeof vlan === 'object' ? vlan.VLAN : vlan });

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from(selectedTable.table)
      .update({
        'NAME':         editingVlan.NAME,
        'SERVICE ID':   editingVlan['SERVICE ID'],
        'NE_SWITCH POP':editingVlan['NE_SWITCH POP'],
        'NE_PORT':      editingVlan['NE_PORT'],
        'NE_MODE':      editingVlan['NE_MODE'],
        'FE_SWITCH POP':editingVlan['FE_SWITCH POP'],
        'FE_PORT':      editingVlan['FE_PORT'],
        'FE_MODE':      editingVlan['FE_MODE'],
      })
      .match(vlanMatch(editingVlan));

    if (error) {
      toast.error('Gagal update: ' + error.message);
    } else {
      toast.success('Data VLAN berhasil diupdate!');
      setIsModalOpen(false);
      fetchData();
      const actor = await getActorName(supabase);
      await logActivity({
        activity: 'VLAN_EDIT',
        subject: `VLAN ${editingVlan.VLAN} — ${editingVlan.NAME || 'AVAILABLE'}`,
        actor,
        detail: `Tabel: ${selectedTable.name}`,
      });
    }
    setIsSaving(false);
  };

  const executeResetVlan = async () => {
    setIsSaving(true);
    setShowResetConfirm(false);
    const { error } = await supabase
      .from(selectedTable.table)
      .update({
        'NAME': 'AVAILABLE', 'SERVICE ID': '-',
        'NE_SWITCH POP': '-', 'NE_PORT': '-', 'NE_MODE': '-',
        'FE_SWITCH POP': '-', 'FE_PORT': '-', 'FE_MODE': '-',
      })
      .match(vlanMatch(editingVlan));

    if (error) {
      toast.error('Gagal reset: ' + error.message);
    } else {
      toast.success(`VLAN ${editingVlan.VLAN} berhasil dikosongkan!`);
      setIsModalOpen(false);
      fetchData();
      const actor = await getActorName(supabase);
      await logActivity({
        activity: 'VLAN_RESET',
        subject: `VLAN ${editingVlan.VLAN}`,
        actor,
        detail: `Dikosongkan di ${selectedTable.name}`,
      });
    }
    setIsSaving(false);
  };

  // ── Filter & Pagination ─────────────────────────────────────
  const filteredVlan = useMemo(() => {
    const s = search.toLowerCase();
    return vlanList.filter(item => {
      // VLAN-UX-01: filter status
      if (statusFilter === 'USED' && !isVlanUsed(item)) return false;
      if (statusFilter === 'FREE' &&  isVlanUsed(item)) return false;

      if (!s) return true;
      // VLAN-UX-03: search diperluas ke NE/FE Switch POP
      return (
        (item.VLAN?.toString()         || '').includes(s) ||
        (item.NAME?.toLowerCase()      || '').includes(s) ||
        (item['SERVICE ID']?.toLowerCase()      || '').includes(s) ||
        (item['NE_SWITCH POP']?.toLowerCase()   || '').includes(s) ||
        (item['FE_SWITCH POP']?.toLowerCase()   || '').includes(s) ||
        (item['NE_PORT']?.toLowerCase()         || '').includes(s) ||
        (item['FE_PORT']?.toLowerCase()         || '').includes(s)
      );
    });
  }, [vlanList, search, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const totalPages    = Math.max(1, Math.ceil(filteredVlan.length / itemsPerPage));
  const paginatedData = filteredVlan.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // VLAN-UX-02: occupancy percentage
  const occupancyPct = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;

  const canEditDelete = hasAccess(userRole, PERMISSIONS.VLAN_EDIT_DELETE);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" /> Database VLan
          </h1>
          <p className="text-sm text-slate-500">Database alokasi VLAN & IP Network</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* VLAN-UX-04: Sync button → konfirmasi dulu, lalu sync semua tabel */}
          <button
            onClick={() => setShowSyncConfirm(true)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {isSyncing
              ? <><Loader2 size={16} className="animate-spin" /> {syncLabel || 'Syncing...'}</>
              : <><Share2 size={16} /> Sync Semua ke Sheets</>
            }
          </button>

          <div className="relative">
            <select
              className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-8 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-sm"
              value={selectedTable.name}
              onChange={e => setSelectedTable(VLAN_TABLES.find(t => t.name === e.target.value) || VLAN_TABLES[0])}
            >
              {VLAN_TABLES.map((t, i) => <option key={i} value={t.name}>{t.name}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
              <Filter size={14} />
            </div>
          </div>

          <button onClick={fetchData} className="p-2 bg-white border rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── STAT CARDS — VLAN-UX-02: tambah occupancy % ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total VLAN</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedTable.name}</p>
          </div>
          <Database className="text-blue-200" size={32} />
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-rose-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Terpakai (Used)</p>
            <h3 className="text-2xl font-bold text-rose-600">{stats.used}</h3>
            {/* Occupancy bar */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-24 bg-slate-100 rounded-full h-1.5">
                <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${occupancyPct}%` }} />
              </div>
              <span className="text-[10px] font-bold text-rose-500">{occupancyPct}% terpakai</span>
            </div>
          </div>
          <AlertCircle className="text-rose-200" size={32} />
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Tersedia (Free)</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.free}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-24 bg-slate-100 rounded-full h-1.5">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${100 - occupancyPct}%` }} />
              </div>
              <span className="text-[10px] font-bold text-emerald-600">{100 - occupancyPct}% tersedia</span>
            </div>
          </div>
          <CheckCircle className="text-emerald-200" size={32} />
        </div>
      </div>

      {/* ── TABLE SECTION ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-1">
            {/* Search — VLAN-UX-03: meliputi NE/FE Switch POP */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari VLAN ID / Nama / NE / FE Switch POP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>

            {/* VLAN-UX-01: Status filter */}
            <div className="flex items-center gap-1.5">
              {(['ALL', 'USED', 'FREE'] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    statusFilter === f
                      ? f === 'USED' ? 'bg-rose-600 text-white border-rose-600'
                        : f === 'FREE' ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {f === 'ALL'  ? `Semua (${vlanList.length})`
                    : f === 'USED' ? `Used (${stats.used})`
                    : `Free (${stats.free})`}
                </button>
              ))}
            </div>
          </div>

          {/* Pagination top */}
          <div className="text-xs text-slate-500 font-bold flex items-center gap-2 shrink-0">
            <span className="text-slate-400">{filteredVlan.length} data</span>
            <span>·</span>
            <span>Hal {currentPage}/{totalPages}</span>
            <div className="flex gap-0.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-40"><ChevronLeft size={15} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-40"><ChevronRight size={15} /></button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3 border-b text-center w-24 sticky left-0 bg-slate-100 z-10 shadow-sm">Status</th>
                <th className="px-6 py-3 border-b w-20">VLAN ID</th>
                <th className="px-6 py-3 border-b min-w-[200px]">Customer Name</th>
                <th className="px-6 py-3 border-b">Service ID</th>
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700 min-w-[150px]">Near End</th>
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700">NE Port</th>
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700">NE Mode</th>
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700 min-w-[150px]">Far End</th>
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700">FE Port</th>
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700">FE Mode</th>
                <th className="px-6 py-3 border-b text-center sticky right-0 bg-slate-100 z-10 shadow-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-500">
                  <Loader2 size={20} className="animate-spin inline-block mr-2 text-blue-500" />
                  Memuat data VLAN...
                </td></tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((v, index) => {
                  const used = isVlanUsed(v);
                  return (
                    <tr key={v.VLAN ?? index} className={`hover:bg-slate-50 transition-colors ${!used ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-6 py-3 text-center sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {used
                          ? <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase">USED</span>
                          : <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">FREE</span>
                        }
                      </td>
                      <td className="px-6 py-3 font-mono font-bold text-blue-700 text-base">{v.VLAN}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">
                        {v.NAME || <span className="text-slate-400 italic">AVAILABLE</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{v['SERVICE ID'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_SWITCH POP'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_PORT'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_MODE'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_SWITCH POP'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_PORT'] || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_MODE'] || '—'}</td>
                      <td className="px-6 py-3 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {canEditDelete ? (
                          <button onClick={() => handleEditClick(v)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit VLAN">
                            <Edit size={16} />
                          </button>
                        ) : (
                          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 font-bold border border-slate-200 flex items-center justify-center gap-1 w-fit mx-auto cursor-not-allowed">
                            <ShieldCheck size={12} /> View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-center">
          <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
              Previous
            </button>
            <span>Halaman {currentPage} dari {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── VLAN-UX-04: SYNC CONFIRMATION MODAL ────────────── */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] overflow-hidden border border-slate-200">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 size={26} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Sync Semua VLAN ke Spreadsheet?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Proses ini akan menyinkronkan <strong>seluruh data VLAN 1–4096</strong> dari semua {VLAN_TABLES.length} tabel ke Google Sheets secara otomatis.
                Tidak perlu pindah tabel satu per satu.
              </p>
              <div className="mt-3 flex flex-col gap-1">
                {VLAN_TABLES.map(t => (
                  <span key={t.name} className="text-[11px] text-slate-400 font-mono">✓ {t.name} ({t.table})</span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setShowSyncConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-100 transition">
                Batal
              </button>
              <button onClick={handleSyncAll}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                <Share2 size={15} /> Ya, Sync Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT VLAN MODAL ─────────────────────────────────── */}
      {isModalOpen && editingVlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit size={18} /> Edit VLAN {editingVlan.VLAN}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-700 p-1 rounded"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Informasi Layanan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Customer Name</label>
                    <input type="text" name="NAME" value={editingVlan.NAME || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Service ID</label>
                    <input type="text" name="SERVICE ID" value={editingVlan['SERVICE ID'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Server size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Near End (POP Side)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Switch Name</label>
                    <input type="text" name="NE_SWITCH POP" value={editingVlan['NE_SWITCH POP'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Port</label>
                    <input type="text" name="NE_PORT" value={editingVlan['NE_PORT'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mode</label>
                    <input type="text" name="NE_MODE" value={editingVlan['NE_MODE'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <Router size={14} className="text-purple-600" />
                  <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider">Far End (CPE Side)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Device Name</label>
                    <input type="text" name="FE_SWITCH POP" value={editingVlan['FE_SWITCH POP'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Port</label>
                    <input type="text" name="FE_PORT" value={editingVlan['FE_PORT'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mode</label>
                    <input type="text" name="FE_MODE" value={editingVlan['FE_MODE'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-400 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
              <button onClick={() => setShowResetConfirm(true)} disabled={isSaving}
                className="text-rose-600 text-sm font-bold hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                <Trash2 size={16} /> Reset / Kosongkan
              </button>
              <div className="flex gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Batal</button>
                <button onClick={handleSaveChanges} disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg flex items-center gap-2">
                  {isSaving ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRM MODAL ─────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden border border-slate-200">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-14 h-14 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Lepas VLAN {editingVlan?.VLAN}?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Data customer akan dihapus dan status VLAN akan kembali menjadi <strong className="text-emerald-600">AVAILABLE</strong>.
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-100 transition">
                Batal
              </button>
              <button onClick={executeResetVlan}
                className="flex-1 py-2.5 px-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-500/20">
                Ya, Lepas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
