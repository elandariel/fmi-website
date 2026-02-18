'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Wrench, Calculator, Activity, FileText, Shuffle, 
  Copy, Download, RefreshCcw, ArrowLeft, ArrowRight,
  Search, CheckCircle, Lock, Server, Calendar,
  Loader2, User, Database, Moon, Stars, Sparkles, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

// Import RBAC Helper
import { PERMISSIONS, hasAccess, Role } from '@/lib/permissions';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TOOLS = [
  { id: 'ipcalc', label: 'IP Subnet Calculator', icon: Calculator, desc: 'Hitung subnet, range IP, dan broadcast.', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
  { id: 'speedtest', label: 'Server Speed Test', icon: Activity, desc: 'Cek bandwidth & latensi server lokal.', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
  { id: 'backbone', label: 'Report Generator', icon: FileText, desc: 'Buat draft laporan teknis (.txt) otomatis.', color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-500/20' },
  { id: 'distributor', label: 'WO Distributor', icon: Shuffle, desc: 'Bagikan tiket WO ke tim teknisi.', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-500/20', restricted: true },
];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

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
      <div className="p-8 bg-[#020c09] min-h-screen font-sans relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Moon size={400} className="text-emerald-500" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="mb-12 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
               <Sparkles size={12}/> Ramadhan Tech Suite
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
              NOC <span className="text-emerald-500">WORKSHOP</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TOOLS.map((tool) => {
              const isRestricted = tool.restricted && !hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_VIEW) && userRole !== 'CS';
              return (
                <button
                  key={tool.id}
                  disabled={isRestricted}
                  onClick={() => setActiveTool(tool.id)}
                  className={`relative p-8 rounded-[2.5rem] border transition-all duration-500 group overflow-hidden flex flex-col items-center text-center ${
                    isRestricted 
                      ? 'bg-slate-900/50 border-white/5 cursor-not-allowed opacity-50 grayscale' 
                      : `bg-[#041a14]/80 backdrop-blur-md ${tool.border} hover:border-emerald-500/50 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] hover:-translate-y-2`
                  }`}
                >
                  <div className={`p-5 rounded-3xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${tool.bg} ${tool.color}`}>
                    {isRestricted ? <Lock size={32}/> : <tool.icon size={36} />}
                  </div>
                  <h3 className="text-lg font-black text-white mb-3 uppercase tracking-tight">{tool.label}</h3>
                  <p className="text-[11px] text-emerald-900 font-bold leading-relaxed uppercase tracking-tighter italic">
                    {isRestricted ? 'AKSES DIBATASI' : tool.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#020c09] min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => setActiveTool(null)} 
          className="group flex items-center gap-3 text-emerald-800 hover:text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-8 transition-all"
        >
          <div className="p-2 rounded-xl bg-[#041a14] border border-emerald-900/50 group-hover:border-emerald-500/50">
            <ArrowLeft size={16} />
          </div>
          Kembali ke Menu
        </button>

        <div className="bg-[#041a14] rounded-[3rem] shadow-2xl border border-emerald-900/30 overflow-hidden min-h-[700px]">
          {activeTool === 'ipcalc' && <IpCalculator />}
          {activeTool === 'speedtest' && <SpeedTest />}
          {activeTool === 'backbone' && <ReportBackbone userRole={userRole} />}
          {activeTool === 'distributor' && <WoDistributor userRole={userRole} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. IP CALCULATOR (Re-Verified)
// ==========================================
function IpCalculator() {
  const [ipInput, setIpInput] = useState('');
  const [cidr, setCidr] = useState(24);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    if (!ipInput) return toast.error("IP wajib diisi!");
    const ipParts = ipInput.split('.').map(Number);
    if (ipParts.length !== 4) return toast.error("Format IP Salah!");
    
    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const mask = 0xffffffff << (32 - cidr);
    const networkInt = ipInt & mask; 
    const broadcastInt = networkInt | (~mask); 
    const intToIp = (int: number) => [(int >>> 24) & 0xFF, (int >>> 16) & 0xFF, (int >>> 8) & 0xFF, int & 0xFF].join('.');

    setResult({
        network: intToIp(networkInt),
        broadcast: intToIp(broadcastInt),
        netmask: intToIp(mask),
        hosts: (Math.pow(2, 32 - cidr) - (cidr >= 31 ? 0 : 2)).toLocaleString(),
        firstUsable: intToIp(cidr >= 31 ? networkInt : networkInt + 1),
        lastUsable: intToIp(cidr >= 31 ? broadcastInt : broadcastInt - 1),
        cidr
    });
    toast.success("Kalkulasi Selesai");
  };

  return (
    <div className="p-8 md:p-12 h-full">
      <div className="flex items-center gap-5 mb-10">
        <div className="p-4 bg-amber-500 text-black rounded-3xl shadow-lg shadow-amber-500/20"><Calculator size={32}/></div>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">IP SUBNET <span className="text-amber-500">CALC</span></h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 bg-[#020c09] p-8 rounded-[2.5rem] border border-emerald-900/40">
           <label className="text-[10px] font-black text-emerald-800 uppercase mb-3 block italic tracking-widest">IP Address</label>
           <input type="text" value={ipInput} onChange={(e)=>setIpInput(e.target.value)} className="w-full p-4 bg-[#041a14] border border-emerald-900/50 rounded-2xl mb-6 font-mono font-black text-amber-500 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="192.168.1.1"/>
           <label className="text-[10px] font-black text-emerald-800 uppercase mb-3 block flex justify-between tracking-widest italic">Prefix <span>/{cidr}</span></label>
           <input type="range" min="1" max="32" value={cidr} onChange={(e)=>setCidr(Number(e.target.value))} className="w-full mb-8 accent-amber-500"/>
           <button onClick={handleCalculate} className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20">HITUNG SEKARANG</button>
        </div>
        <div className="lg:col-span-8">
           {result ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
                <ResultCard label="Network" value={`${result.network}/${result.cidr}`} highlight />
                <ResultCard label="Total Hosts" value={result.hosts} />
                <ResultCard label="Netmask" value={result.netmask} />
                <ResultCard label="Broadcast" value={result.broadcast} />
                <ResultCard label="First IP" value={result.firstUsable} />
                <ResultCard label="Last IP" value={result.lastUsable} />
             </div>
           ) : <div className="h-full min-h-[300px] border-4 border-dashed border-emerald-900/20 rounded-[3rem] flex items-center justify-center text-emerald-900 font-black uppercase tracking-widest text-xs">Waiting for input...</div>}
        </div>
      </div>
    </div>
  );
}

function ResultCard({label, value, highlight}: any) {
    return (
        <div className={`p-6 rounded-[2rem] border flex justify-between items-center ${highlight ? 'bg-amber-500 border-amber-400 text-black' : 'bg-[#020c09] border-emerald-900/30 text-white'}`}>
            <div>
                <p className={`text-[9px] font-black uppercase mb-1 tracking-widest opacity-60`}>{label}</p>
                <p className="font-mono font-black text-lg">{value}</p>
            </div>
            <button onClick={() => {navigator.clipboard.writeText(value); toast.success("Copied!");}} className="p-2 hover:opacity-50 transition"><Copy size={18}/></button>
        </div>
    );
}

// ==========================================
// 2. SPEED TEST (Verified)
// ==========================================
function SpeedTest() {
  return (
    <div className="h-full bg-black">
        <div className="p-6 bg-[#041a14] border-b border-emerald-900/30 flex items-center gap-4">
            <Activity size={24} className="text-emerald-500" />
            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Server Speed Test</h2>
        </div>
        <iframe src="https://openspeedtest.com/Get-widget.php" className="w-full h-[650px] border-0 grayscale invert opacity-70"></iframe>
    </div>
  );
}

// ==========================================
// 3. REPORT GENERATOR (RESTORED MISSING FIELDS)
// ==========================================
function ReportBackbone({ userRole }: { userRole: Role | null }) {
  const [form, setForm] = useState({ tiket: '', impact: '', status: 'Solved', problem: '', action: '', tagging: '', power: '' });
  const isCS = userRole === 'CS';

  const handleDownload = () => {
    if (isCS) return toast.error("Akses Ditolak!");
    const text = `SUMMARY REPORT BACKBONE PROBLEM\n===============================\n\nTiket\t: ${form.tiket || '-'}\nImpact\t: ${form.impact || '-'}\nStatus\t: ${form.status}\n\nProblem analysis details :\n${form.problem || '-'}\n\nAction :\n${form.action || '-'}\n\nData Tagging\n${form.tagging || '-'}\n\nRecord Power After Maintenance :\n${form.power || '-'}\n`;

    const file = new Blob([text], {type: 'text/plain'});
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `Report_${form.tiket.substring(0, 10) || 'Backbone'}.txt`;
    element.click();
    toast.success("Report diunduh!");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
       <div className="p-8 border-b border-emerald-900/30 flex items-center gap-5">
          <div className="p-4 bg-sky-500 text-black rounded-3xl shadow-lg shadow-sky-500/20"><FileText size={32}/></div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">REPORT <span className="text-sky-500">GENERATOR</span></h2>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 overflow-hidden">
          {/* KOLOM INPUT (Scrollable) */}
          <div className="lg:col-span-2 p-8 space-y-6 overflow-y-auto custom-scrollbar bg-[#020c09]/30">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#041a14] p-6 rounded-[2rem] border border-emerald-900/30">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest">Tiket / Subject</label>
                    <input style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-bold" placeholder="HT155..." onChange={(e)=>setForm({...form, tiket: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest">Impact</label>
                    <input style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-bold" placeholder="CCC <> KARAWANG" onChange={(e)=>setForm({...form, impact: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest">Status</label>
                    <select style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-bold" onChange={(e)=>setForm({...form, status: e.target.value})}>
                        <option>Solved</option><option>Monitoring</option><option>Open</option>
                    </select>
                </div>
             </div>

             {/* TEXT AREAS - SEMUA FIELD DIKEMBALIKAN */}
             <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest">Problem Analysis</label>
                    <textarea rows={3} style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-medium" placeholder="Analisa masalah..." onChange={(e)=>setForm({...form, problem: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest">Action Taken</label>
                    <textarea rows={3} style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-medium" placeholder="Tindakan..." onChange={(e)=>setForm({...form, action: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest text-sky-500">Data Tagging (Lokasi/Core/Maps)</label>
                    <textarea rows={3} style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-mono" placeholder="Closure titik 8,7 km..." onChange={(e)=>setForm({...form, tagging: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-emerald-800 uppercase mb-2 block italic tracking-widest text-sky-500">Record Power After Maintenance</label>
                    <textarea rows={3} style={{ color: '#bae6fd' }} className="w-full p-4 bg-[#020c09] border border-emerald-900/50 rounded-2xl outline-none text-sm font-mono" placeholder="- SISI KARAWANG : -20.96..." onChange={(e)=>setForm({...form, power: e.target.value})} />
                </div>
             </div>
          </div>

          {/* PREVIEW */}
          <div className="lg:col-span-1 bg-[#020c09] p-8 flex flex-col border-l border-emerald-900/30 h-full overflow-hidden">
             <div className="bg-[#041a14] p-6 rounded-[2rem] border border-emerald-900/30 mb-6 flex-1 overflow-y-auto custom-scrollbar shadow-2xl">
                <h4 className="font-black text-emerald-500 mb-4 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-900/30 pb-3">
                   <Stars size={14}/> LIVE PREVIEW
                </h4>
                <div className="text-[10px] text-emerald-100 font-mono space-y-4 whitespace-pre-wrap leading-relaxed italic opacity-70">
                    <p className="font-bold border-b border-emerald-900/50 pb-2">SUMMARY REPORT BACKBONE</p>
                    <p>Tiket: {form.tiket || '-'}</p>
                    <p>Status: {form.status}</p>
                    <p className="text-sky-500 font-bold">Action Taken:</p>
                    <p>{form.action || '-'}</p>
                    <p className="text-sky-500 font-bold">Data Tagging:</p>
                    <p>{form.tagging || '-'}</p>
                    <p className="text-sky-500 font-bold">Power Record:</p>
                    <p>{form.power || '-'}</p>
                </div>
             </div>
             <button onClick={handleDownload} disabled={isCS} className="w-full py-5 bg-sky-500 text-black rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase hover:bg-sky-400 active:scale-95 transition-all shadow-xl shadow-sky-500/20">
                {isCS ? 'RESTRICTED' : 'DOWNLOAD REPORT (.TXT)'}
             </button>
          </div>
       </div>
    </div>
  );
}

// ==========================================
// 4. WO DISTRIBUTOR (RESTORED TICKET FORMATTING LOGIC)
// ==========================================
function WoDistributor({ userRole }: { userRole: Role | null }) {
  const [woList, setWoList] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]); 
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedWO, setSelectedWO] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

  const canDistribute = hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_ACTION);

  const fetchWO = async () => {
    setLoading(true);
    setSelectedWO([]);
    try {
      const dateObj = new Date(filterDate);
      const searchString = format(dateObj, 'd MMMM yyyy', { locale: idLocale });
      const { data, error } = await supabase.from('Report Bulanan')
        .select('*')
        .or('STATUS.eq.PENDING,STATUS.eq.PROGRESS,STATUS.eq.OPEN')
        .ilike('KETERANGAN', `%${searchString}%`)
        .order('id', { ascending: false }).limit(100);
      
      if (error) throw error;
      setWoList(data || []);
      toast.success(`${data?.length || 0} WO ditemukan`);
    } catch (err) { toast.error("Gagal ambil data"); } finally { setLoading(false); }
  };

  useEffect(() => {
    async function getTechs() {
      if (!canDistribute) return;
      const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['NOC', 'AKTIVATOR', 'SUPER_DEV']); 
      if (data) setTechnicians(data);
    }
    getTechs();
  }, [canDistribute]);

  const distributeWO = async () => {
    if (selectedTechs.length === 0 || selectedWO.length === 0) return toast.error("Pilih Tim & WO!");
    setDistributing(true);
    try {
      const woIds = woList.filter(wo => selectedWO.includes(wo.id)).map(w => w.id);
      
      const inboxPromises = selectedTechs.map(async (techName) => {
        const { count } = await supabase.from('inbox_tugas').select('*', { count: 'exact', head: true });
        // Restore abbreviation logic
        const nameAbbr = techName.toUpperCase().replace(/[AEIOU\s]/g, '').slice(0, 4);
        const customId = `PND/PRG-${nameAbbr}-${String((count || 0) + 1).padStart(5, '0')}`;
        
        return supabase.from('inbox_tugas').insert({ 
          id_tiket_custom: customId, 
          assigned_to: techName, 
          wo_ids: woIds, 
          status: 'OPEN' 
        });
      });

      await Promise.all([
        ...inboxPromises, 
        supabase.from('Report Bulanan').update({ 'NAMA TEAM': selectedTechs.join(', '), 'STATUS': 'OPEN' }).in('id', woIds)
      ]);
      
      toast.success(`Distribusi Berhasil!`);
      fetchWO(); setSelectedWO([]); setSelectedTechs([]);
    } catch (error) { toast.error("Gagal!"); } finally { setDistributing(false); }
  };

  return (
    <div className="p-6 md:p-8 h-[700px] flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500 text-black rounded-2xl"><Shuffle size={24}/></div>
            <h2 className="text-xl font-black text-white uppercase italic">WO Distributor</h2>
          </div>
          <div className="flex items-center gap-3 bg-[#020c09] p-2 rounded-xl border border-emerald-900/50">
             <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-emerald-400 font-bold text-xs px-2 outline-none uppercase" />
             <button onClick={fetchWO} className="bg-emerald-500 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400">
                {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCcw size={12} />} GET DATA
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* WO PANEL */}
          <div className="lg:col-span-2 flex flex-col bg-[#020c09] rounded-[2rem] border border-emerald-900/30 overflow-hidden">
             <div className="p-4 border-b border-emerald-900/30 bg-[#041a14]/50 flex justify-between items-center italic">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{selectedWO.length} WO SELECTED</span>
                <button onClick={() => setSelectedWO(selectedWO.length === woList.length ? [] : woList.map(w => w.id))} className="text-[9px] font-black text-emerald-500 underline">SELECT ALL</button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {woList.map((wo) => (
                   <label key={wo.id} className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${selectedWO.includes(wo.id) ? 'bg-emerald-500/10 border-emerald-500' : 'bg-[#041a14] border-emerald-900/20'}`}>
                      <input type="checkbox" className="w-4 h-4 rounded border-emerald-900 bg-black" checked={selectedWO.includes(wo.id)} onChange={() => {
                         setSelectedWO(prev => prev.includes(wo.id) ? prev.filter(i => i !== wo.id) : [...prev, wo.id]);
                      }} />
                      <div className="min-w-0">
                         <p className="text-[9px] text-emerald-800 font-black uppercase mb-1 tracking-tighter">
                            {wo.TANGGAL ? format(new Date(wo.TANGGAL), 'dd/MM/yyyy') : 'NO DATE'} | {wo.STATUS}
                         </p>
                         <p className="text-xs font-black text-white truncate italic tracking-tight">{wo['SUBJECT WO'] || 'No Subject'}</p>
                      </div>
                   </label>
                ))}
             </div>
          </div>

          {/* TECH PANEL */}
          <div className="flex flex-col bg-[#041a14] rounded-[2rem] border border-emerald-900/30 overflow-hidden">
             <div className="p-5 border-b border-emerald-900/30 bg-purple-500/5">
                <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 italic">
                  <User size={14}/> PILIH TIM TEKNISI
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {technicians.map((tech) => (
                   <label key={tech.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedTechs.includes(tech.full_name) ? 'bg-purple-500/20 border-purple-500' : 'bg-[#020c09] border-emerald-900/20'}`}>
                      <input type="checkbox" checked={selectedTechs.includes(tech.full_name)} onChange={() => {
                         setSelectedTechs(prev => prev.includes(tech.full_name) ? prev.filter(t => t !== tech.full_name) : [...prev, tech.full_name]);
                      }} className="rounded-full text-purple-600 bg-black border-emerald-900" />
                      <div>
                         <p className="text-xs font-black text-white italic">{tech.full_name}</p>
                         <p className="text-[8px] text-emerald-900 font-bold uppercase tracking-widest">{tech.role}</p>
                      </div>
                   </label>
                ))}
             </div>
             <div className="p-6 bg-[#020c09] border-t border-emerald-900/30">
                <button onClick={distributeWO} disabled={distributing || selectedWO.length === 0} className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-emerald-400 flex items-center justify-center gap-2">
                   {distributing ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} DISTRIBUSI SEKARANG
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}