'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Wrench, Calculator, FileText, Shuffle,
  Copy, Download, RefreshCcw, ArrowLeft, ArrowRight,
  Search, Lock, Server, Calendar,
  Loader2, User, AlertTriangle, History, ChevronDown, ChevronUp,
  CheckCircle2, Clock3, X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { PERMISSIONS, hasAccess, Role } from '@/lib/permissions';
import { logActivity, getActorName } from '@/lib/logger';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// BUG-03: Report Generator dihapus (summary sudah otomatis di Backbone NOC)
// BUG-04: Speed Test dihapus (iframe third-party — pengganti dikonfirmasi terpisah)
const TOOLS = [
  {
    id: 'ipcalc',
    label: 'IP Subnet Calculator',
    icon: Calculator,
    desc: 'Hitung subnet, range IP, dan broadcast address dari CIDR notation.',
    color: 'text-blue-600', bg: 'bg-blue-50', accent: 'border-blue-200',
  },
  {
    id: 'distributor',
    label: 'WO Distributor',
    icon: Shuffle,
    desc: 'Distribusi WO Pending/Progress secara merata ke tim teknisi.',
    color: 'text-purple-600', bg: 'bg-purple-50', accent: 'border-purple-200',
    restricted: true,
  },
];

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [userRole,   setUserRole]   = useState<Role | null>(null);

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (data) setUserRole(data.role as Role);
      }
    }
    getRole();
  }, []);

  if (!activeTool) {
    return (
      <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700"><Wrench size={17} /></div>
              Tools & Utilities
            </h1>
            <p className="text-xs text-slate-400 mt-1 ml-0.5">Pilih alat bantu operasional yang Anda butuhkan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => {
              const isRestricted = tool.restricted && !hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_VIEW) && userRole !== 'CS';
              return (
                <button
                  key={tool.id}
                  disabled={isRestricted}
                  onClick={() => setActiveTool(tool.id)}
                  className={`relative p-5 rounded-xl border text-left transition-all group overflow-hidden ${
                    isRestricted
                      ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {!isRestricted && (
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${tool.bg.replace('50', '400')} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  )}
                  <div className={`p-2.5 rounded-lg w-fit mb-3.5 ${tool.bg} ${tool.color} border ${tool.accent}`}>
                    {isRestricted ? <Lock size={18} /> : <tool.icon size={20} />}
                  </div>
                  <h3 className={`font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors ${isRestricted ? 'text-slate-400' : ''}`}>
                    {tool.label}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isRestricted ? 'Akses terbatas untuk role Anda.' : tool.desc}
                  </p>
                  {!isRestricted && (
                    <ArrowRight size={15} className="absolute right-5 bottom-5 text-slate-300 group-hover:text-blue-400 transition-all translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-5"
        >
          <ArrowLeft size={15} /> Kembali ke Menu
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          {activeTool === 'ipcalc'      && <IpCalculator />}
          {activeTool === 'distributor' && <WoDistributor userRole={userRole} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TOOL HEADER
// ─────────────────────────────────────────────
function ToolHeader({ icon: Icon, title, iconBg, iconColor }: { icon: any; title: string; iconBg: string; iconColor: string }) {
  return (
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}><Icon size={18} /></div>
      <h2 className="font-bold text-slate-800">{title}</h2>
    </div>
  );
}

// ─────────────────────────────────────────────
// 1. IP SUBNET CALCULATOR (unchanged)
// ─────────────────────────────────────────────
function IpCalculator() {
  const [ipInput, setIpInput] = useState('');
  const [cidr, setCidr] = useState(24);
  const [result, setResult] = useState<any>(null);

  const validateIP = (ip: string) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    return ip.split('.').every(num => parseInt(num) >= 0 && parseInt(num) <= 255);
  };

  const intToIp = (int: number) =>
    [(int >>> 24) & 0xFF, (int >>> 16) & 0xFF, (int >>> 8) & 0xFF, int & 0xFF].join('.');

  const handleCalculate = () => {
    if (!ipInput)          return toast.error('IP Address wajib diisi!');
    if (!validateIP(ipInput)) return toast.error('Format IP salah (contoh: 192.168.1.1)');
    try {
      const ipParts = ipInput.split('.').map(Number);
      const ipInt   = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const mask    = 0xffffffff << (32 - cidr);
      const networkInt   = ipInt & mask;
      const broadcastInt = networkInt | (~mask);
      let firstUsableInt = networkInt + 1;
      let lastUsableInt  = broadcastInt - 1;
      let hosts          = Math.pow(2, 32 - cidr) - 2;
      if (cidr >= 31) { firstUsableInt = networkInt; lastUsableInt = broadcastInt; hosts = cidr === 32 ? 1 : 2; }
      setResult({
        network: intToIp(networkInt), broadcast: intToIp(broadcastInt),
        netmask: intToIp(mask), hosts: hosts.toLocaleString(),
        firstUsable: intToIp(firstUsableInt), lastUsable: intToIp(lastUsableInt), cidr
      });
      toast.success('Kalkulasi selesai');
    } catch { toast.error('Error kalkulasi'); }
  };

  return (
    <div>
      <ToolHeader icon={Calculator} title="IP Subnet Calculator" iconBg="bg-blue-50" iconColor="text-blue-600" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 h-fit">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">IP Address</label>
              <input type="text" value={ipInput} onChange={(e) => setIpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()} className="input font-mono" placeholder="192.168.1.1" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">CIDR Prefix</label>
                <span className="text-sm font-bold text-blue-600 font-mono">/{cidr}</span>
              </div>
              <input type="range" min="1" max="32" value={cidr} onChange={(e) => setCidr(Number(e.target.value))} className="w-full accent-blue-600" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1"><span>/1</span><span>/16</span><span>/32</span></div>
            </div>
            <button onClick={handleCalculate} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">Hitung Sekarang</button>
          </div>
          <div className="lg:col-span-2">
            {result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ResultCard label="Network Address"    value={`${result.network}/${result.cidr}`} highlight />
                <ResultCard label="Total Usable Hosts" value={result.hosts} />
                <ResultCard label="Subnet Mask"        value={result.netmask} />
                <ResultCard label="Broadcast"          value={result.broadcast} />
                <ResultCard label="First IP"           value={result.firstUsable} />
                <ResultCard label="Last IP"            value={result.lastUsable} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[280px] gap-3">
                <Server size={36} className="opacity-40" />
                <p className="text-sm">Masukkan IP untuk melihat hasil</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, highlight }: any) {
  const copy = () => { navigator.clipboard.writeText(value); toast.success('Disalin!'); };
  return (
    <div className={`p-4 rounded-xl border flex justify-between items-center group ${
      highlight ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">{label}</p>
        <p className={`font-mono font-bold text-lg leading-none ${highlight ? 'text-white' : 'text-slate-700'}`}>{value}</p>
      </div>
      <button onClick={copy} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
        highlight ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
      }`}><Copy size={14} /></button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. WO DISTRIBUTOR — complete rewrite
//    BUG-01: round-robin even distribution
//    BUG-02: timestamp-based collision-free ticket ID
//    UX-01:  confirmation modal with distribution preview
//    UX-03:  distribution history from inbox_tugas
// ─────────────────────────────────────────────

// Generate a collision-free ticket ID per distribution batch
// Format: DIST-{date}-{batchHex}-T{index}
// BUG-02: replaces getAbbr() which could collide
function makeTicketId(batchHex: string, idx: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  return `DIST-${date}-${batchHex}-T${String(idx + 1).padStart(2, '0')}`;
}

// Status badge helper
function WoBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const cls =
    s === 'PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100' :
    s === 'PENDING'  ? 'bg-amber-50 text-amber-600 border-amber-100' :
    s === 'OPEN'     ? 'bg-purple-50 text-purple-600 border-purple-100' :
    'bg-slate-50 text-slate-500 border-slate-200';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${cls}`}>{s}</span>;
}

function WoDistributor({ userRole }: { userRole: Role | null }) {
  const [woList,        setWoList]        = useState<any[]>([]);
  const [technicians,   setTechnicians]   = useState<any[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedWO,    setSelectedWO]    = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [distributing,  setDistributing]  = useState(false);
  const [filterDate,    setFilterDate]    = useState(new Date().toISOString().slice(0, 10));

  // UX-01: confirmation modal state
  const [showConfirm,   setShowConfirm]   = useState(false);

  // UX-03: history
  const [history,       setHistory]       = useState<any[]>([]);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyLoading,setHistoryLoading]= useState(false);

  const canDistribute = hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_ACTION);

  // BUG-01 fix: round-robin assignment preview
  // Returns: Record<techName, wo_ids[]>
  const distributionPlan = useMemo<Record<string, string[]>>(() => {
    if (selectedTechs.length === 0 || selectedWO.length === 0) return {};
    const targetWOs = woList.filter(wo => selectedWO.includes(String(wo.id)));
    const plan: Record<string, string[]> = {};
    selectedTechs.forEach(t => { plan[t] = []; });
    targetWOs.forEach((wo, i) => {
      const tech = selectedTechs[i % selectedTechs.length];
      plan[tech].push(String(wo.id));
    });
    return plan;
  }, [selectedWO, selectedTechs, woList]);

  // ── Fetch WOs from Monthly Report ─────────────────────────
  const fetchWO = async () => {
    setLoading(true);
    setSelectedWO([]);
    try {
      let query = supabase
        .from('Report Bulanan')
        .select('*')
        .in('STATUS', ['PENDING', 'PROGRESS']);

      // BUG-01 fix: filter by TANGGAL (Indonesian date), not KETERANGAN
      if (filterDate) {
        const dayStr = format(new Date(filterDate + 'T00:00:00'), 'd MMMM yyyy', { locale: idLocale });
        query = query.ilike('TANGGAL', `%${dayStr}%`);
      }

      const { data, error } = await query.order('id', { ascending: false }).limit(200);
      if (error) throw error;
      setWoList(data || []);
      toast.success(`${data?.length || 0} WO ditemukan`);
    } catch (err: any) {
      toast.error('Gagal ambil data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch technicians ──────────────────────────────────────
  useEffect(() => {
    async function getTechs() {
      if (!canDistribute) return;
      const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['NOC', 'AKTIVATOR', 'SUPER_DEV']);
      if (data) setTechnicians(data);
    }
    getTechs();
  }, [canDistribute]);

  // ── Fetch history ──────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('inbox_tugas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setHistory(data);
    setHistoryLoading(false);
  };

  useEffect(() => { if (historyOpen) fetchHistory(); }, [historyOpen]);

  // ── Selection toggles ──────────────────────────────────────
  const toggleWO     = (id: string) => setSelectedWO(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAllWO  = () => setSelectedWO(selectedWO.length === woList.length ? [] : woList.map(wo => String(wo.id)));
  const toggleTech   = (name: string) => setSelectedTechs(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);

  // ── Distribute — BUG-01: round-robin, BUG-02: unique ticket ID ──
  const distributeWO = async () => {
    setShowConfirm(false);
    setDistributing(true);

    // BUG-02: one timestamp-based batch hex, unique per call
    const batchHex = Date.now().toString(36).toUpperCase();

    try {
      const promises: PromiseLike<any>[] = [];

      Object.entries(distributionPlan).forEach(([techName, woIds], idx) => {
        if (woIds.length === 0) return;

        const ticketId = makeTicketId(batchHex, idx);

        // Insert into inbox_tugas — one record per tech
        promises.push(
          supabase.from('inbox_tugas').insert({
            id_tiket_custom: ticketId,
            assigned_to: techName,
            wo_ids: woIds,
            status: 'OPEN',
          }) as PromiseLike<any>
        );

        // Update each WO — NAMA TEAM = this tech only, STATUS → PROGRESS
        promises.push(
          (supabase.from('Report Bulanan')
            .update({ 'NAMA TEAM': techName, STATUS: 'PROGRESS' })
            .in('id', woIds)) as PromiseLike<any>
        );
      });

      await Promise.all(promises);
      toast.success(`${selectedWO.length} WO berhasil didistribusikan ke ${selectedTechs.length} tim!`);

      fetchWO();
      setSelectedWO([]);
      setSelectedTechs([]);
      if (historyOpen) fetchHistory();

      const actor = await getActorName(supabase);
      await logActivity({
        activity: 'WO_DISTRIBUTE',
        subject:  `${selectedWO.length} WO → ${selectedTechs.join(', ')}`,
        actor,
        detail:   Object.entries(distributionPlan)
          .map(([t, ids]) => `${t}: ${ids.length} WO`)
          .join(' | '),
      });
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setDistributing(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div>
      <ToolHeader icon={Shuffle} title="WO Distributor" iconBg="bg-purple-50" iconColor="text-purple-600" />

      {/* ── MAIN PANEL ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 items-start">

        {/* WO LIST */}
        <div className="lg:col-span-2 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-[58vh] min-h-[460px]">

          {/* Toolbar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0 gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
                checked={selectedWO.length === woList.length && woList.length > 0} onChange={toggleAllWO} />
              <span className="text-xs font-semibold text-slate-600">
                Terpilih: <span className="text-blue-600">{selectedWO.length}</span> / {woList.length} WO
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={12} className="text-blue-500" />
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none bg-white" />
              </div>
              <button onClick={fetchWO} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                Get Data
              </button>
            </div>
          </div>

          {/* WO scroll area */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-slate-50/30">
            {woList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200 rounded-xl">
                <Search size={28} className="opacity-40" />
                <p className="text-xs text-slate-400">Pilih tanggal dan klik "Get Data"</p>
                <p className="text-[10px] text-slate-300">Hanya WO dengan status PENDING / PROGRESS yang ditampilkan</p>
              </div>
            ) : (
              woList.map((wo) => {
                const id = String(wo.id);
                const isSelected = selectedWO.includes(id);
                return (
                  <label key={id} className={`p-3.5 border rounded-xl flex items-center gap-3 cursor-pointer transition-all hover:border-blue-300 ${
                    isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200'
                  }`}>
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 shrink-0 accent-blue-600"
                      checked={isSelected} onChange={() => toggleWO(id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {wo.TANGGAL || 'No Date'}
                        </span>
                        <WoBadge status={wo.STATUS} />
                        {wo['JENIS WO'] && (
                          <span className="text-[10px] font-semibold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white">
                            {wo['JENIS WO']}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate">{wo['SUBJECT WO'] || 'No Subject'}</p>
                      {wo['KETERANGAN'] && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 italic">{wo['KETERANGAN']}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* TECHNICIAN PANEL */}
        <div className="flex flex-col border border-slate-200 rounded-xl bg-white shadow-sm h-[58vh] min-h-[460px] overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-700 text-xs flex items-center gap-2 uppercase tracking-widest">
              <User size={13} className="text-purple-500" /> Pilih Tim Teknisi
            </h3>
          </div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {technicians.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Tidak ada teknisi tersedia</div>
            ) : (
              technicians.map((tech) => {
                const isSelected = selectedTechs.includes(tech.full_name);
                const woCount    = distributionPlan[tech.full_name]?.length || 0;
                return (
                  <label key={tech.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected ? 'bg-purple-50 border-purple-300 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input type="checkbox" className="rounded accent-blue-600 w-3.5 h-3.5"
                      checked={isSelected} onChange={() => toggleTech(tech.full_name)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{tech.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{tech.role}</p>
                    </div>
                    {isSelected && woCount > 0 && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full shrink-0">
                        {woCount} WO
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* UX-01: trigger confirmation modal, not direct distribute */}
          <div className="p-3.5 border-t border-slate-100 shrink-0 space-y-2">
            {/* Distribution preview */}
            {selectedWO.length > 0 && selectedTechs.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-[10px] text-purple-700 space-y-0.5">
                <p className="font-bold mb-1">Preview distribusi (merata):</p>
                {Object.entries(distributionPlan).map(([tech, ids]) => (
                  <p key={tech} className="flex justify-between">
                    <span className="truncate mr-2">{tech}</span>
                    <span className="font-bold shrink-0">{ids.length} WO</span>
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canDistribute || selectedTechs.length === 0 || selectedWO.length === 0 || distributing}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed text-white disabled:text-slate-400 py-2.5 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2"
            >
              {distributing ? <Loader2 size={15} className="animate-spin" /> : <Shuffle size={15} />}
              Distribusi {selectedWO.length > 0 ? `${selectedWO.length} ` : ''}Tiket
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Round-robin merata · STATUS → PROGRESS
            </p>
          </div>
        </div>
      </div>

      {/* UX-03: RIWAYAT DISTRIBUSI ─────────────────────────── */}
      <div className="mx-5 mb-5 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><History size={14} /></div>
            <span className="text-sm font-bold text-slate-700">Riwayat Distribusi</span>
            <span className="text-[10px] text-slate-400 font-semibold">30 entri terakhir</span>
          </div>
          {historyOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {historyOpen && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Memuat riwayat...
              </div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Belum ada riwayat distribusi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">WO Count</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((h, i) => (
                      <tr key={h.id ?? i} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {h.id_tiket_custom || `#${h.id}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                              {(h.assigned_to || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-700 text-[11px]">{h.assigned_to || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-slate-700">
                            {Array.isArray(h.wo_ids) ? h.wo_ids.length : '—'}
                          </span>
                          <span className="text-slate-400 ml-1 text-[10px]">WO</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            (h.status || '').toUpperCase() === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {h.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[10px]">
                          {h.created_at
                            ? formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: idLocale })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UX-01: CONFIRMATION MODAL ─────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shuffle size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 text-center">Konfirmasi Distribusi</h2>
              <p className="text-sm text-slate-500 text-center mt-1">
                <strong>{selectedWO.length} WO</strong> akan dibagi merata ke <strong>{selectedTechs.length} tim</strong>:
              </p>
            </div>

            <div className="px-6 py-4 space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(distributionPlan).map(([tech, ids]) => (
                <div key={tech} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                      {tech.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{tech}</span>
                  </div>
                  <span className="text-sm font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                    {ids.length} WO
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border-t border-amber-100 px-6 py-3">
              <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} /> Status WO akan otomatis berubah menjadi <strong>PROGRESS</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={distributing}
                className="flex-1 py-2.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-100 transition disabled:opacity-50">
                Batal
              </button>
              <button onClick={distributeWO} disabled={distributing}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                {distributing
                  ? <><Loader2 size={14} className="animate-spin" /> Memproses...</>
                  : <><Shuffle size={14} /> Ya, Distribusi</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
