'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Wrench, Calculator, Activity, FileText, Shuffle, 
  Copy, Download, RefreshCcw, ArrowLeft, ArrowRight,
  Search, CheckCircle, Lock, Server, RotateCcw, Calendar,
  Loader2, User, Database // <-- User sudah ditambahin di sini biar gak error
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

// --- DAFTAR TOOLS ---
const TOOLS = [
  { id: 'ipcalc', label: 'IP Subnet Calculator', icon: Calculator, desc: 'Hitung subnet, range IP, dan broadcast.', color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'speedtest', label: 'Server Speed Test', icon: Activity, desc: 'Cek bandwidth & latensi server lokal.', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { id: 'backbone', label: 'Report Generator', icon: FileText, desc: 'Buat draft laporan teknis (.txt) otomatis.', color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: 'distributor', label: 'WO Distributor', icon: Shuffle, desc: 'Bagikan tiket WO ke tim teknisi.', color: 'text-purple-600', bg: 'bg-purple-100', restricted: true },
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

  // --- RENDER MENU UTAMA (GRID) ---
  if (!activeTool) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-4">
               <Wrench size={48} className="text-slate-800" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Tools & Utilities</h1>
            <p className="text-slate-500 mt-2">Pilih alat bantu operasional yang Anda butuhkan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool) => {
              const isRestricted = tool.restricted && !hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_VIEW) && userRole !== 'CS';
              return (
                <button
                  key={tool.id}
                  disabled={isRestricted}
                  onClick={() => setActiveTool(tool.id)}
                  className={`relative p-6 rounded-2xl border text-left transition-all duration-300 group overflow-hidden ${
                    isRestricted 
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className={`p-4 rounded-xl w-fit mb-4 ${tool.bg} ${tool.color}`}>
                    {isRestricted ? <Lock size={24}/> : <tool.icon size={28} />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{tool.label}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {isRestricted ? 'Akses terbatas untuk role Anda.' : tool.desc}
                  </p>
                  
                  {!isRestricted && (
                    <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                      <ArrowRight className="text-blue-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER ACTIVE TOOL ---
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => setActiveTool(null)} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Kembali ke Menu
        </button>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[600px]">
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
// 1. IP SUBNET CALCULATOR (Fix Visibility with Inline Style)
// ==========================================
function IpCalculator() {
  const [ipInput, setIpInput] = useState('');
  const [cidr, setCidr] = useState(24);
  const [result, setResult] = useState<any>(null);

  const validateIP = (ip: string) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    return ip.split('.').every(num => parseInt(num) >= 0 && parseInt(num) <= 255);
  };

  const intToIp = (int: number) => {
    return [(int >>> 24) & 0xFF, (int >>> 16) & 0xFF, (int >>> 8) & 0xFF, int & 0xFF].join('.');
  };

  const handleCalculate = () => {
    if (!ipInput) return toast.error("IP Address wajib diisi!");
    if (!validateIP(ipInput)) return toast.error("Format IP Salah (ex: 192.168.1.1)");

    try {
        const ipParts = ipInput.split('.').map(Number);
        const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
        const mask = 0xffffffff << (32 - cidr);
        
        const networkInt = ipInt & mask; 
        const broadcastInt = networkInt | (~mask); 
        
        let firstUsableInt = networkInt + 1;
        let lastUsableInt = broadcastInt - 1;
        let hosts = Math.pow(2, 32 - cidr) - 2;

        if(cidr >= 31) { 
            firstUsableInt = networkInt;
            lastUsableInt = broadcastInt;
            hosts = cidr === 32 ? 1 : 2;
        }

        setResult({
            network: intToIp(networkInt),
            broadcast: intToIp(broadcastInt),
            netmask: intToIp(mask),
            hosts: hosts.toLocaleString(),
            firstUsable: intToIp(firstUsableInt),
            lastUsable: intToIp(lastUsableInt),
            cidr: cidr
        });
        toast.success("Kalkulasi Selesai");
    } catch (e) { toast.error("Error kalkulasi"); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calculator size={24}/></div>
        <h2 className="text-xl font-bold text-slate-800">IP Subnet Calculator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">IP Address</label>
           {/* FIX: PAKSA WARNA HITAM VIA STYLE */}
           <input 
             type="text" 
             value={ipInput} 
             onChange={(e)=>setIpInput(e.target.value)} 
             style={{ color: 'black' }} 
             className="w-full p-3 border border-slate-300 bg-white rounded-lg mb-4 font-mono font-bold text-black placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" 
             placeholder="192.168.1.1"
           />
           
           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">CIDR (/{cidr})</label>
           <input type="range" min="1" max="32" value={cidr} onChange={(e)=>setCidr(Number(e.target.value))} className="w-full mb-2 accent-blue-600"/>
           <div className="text-right font-bold text-blue-600 mb-6">/{cidr}</div>

           <button onClick={handleCalculate} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
             Hitung Sekarang
           </button>
        </div>

        <div className="lg:col-span-2">
           {result ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                <ResultCard label="Network Address" value={`${result.network}/${result.cidr}`} highlight />
                <ResultCard label="Total Usable Hosts" value={result.hosts} />
                <ResultCard label="Subnet Mask" value={result.netmask} />
                <ResultCard label="Broadcast" value={result.broadcast} />
                <ResultCard label="First IP" value={result.firstUsable} />
                <ResultCard label="Last IP" value={result.lastUsable} />
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[300px]">
                <Server size={48} className="mb-2 opacity-50"/>
                <p>Masukkan IP untuk melihat hasil</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({label, value, highlight}: any) {
    const copy = () => { navigator.clipboard.writeText(value); toast.success("Disalin!"); };
    return (
        <div className={`p-4 rounded-xl border flex justify-between items-center group ${highlight ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div>
                <p className={`text-[10px] font-bold uppercase mb-1 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>{label}</p>
                <p className={`font-mono font-bold text-lg ${highlight ? 'text-white' : 'text-slate-700'}`}>{value}</p>
            </div>
            <button onClick={copy} className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition ${highlight ? 'hover:bg-slate-700' : 'hover:bg-slate-100 text-slate-400'}`}>
                <Copy size={16}/>
            </button>
        </div>
    )
}

// ==========================================
// 2. SPEED TEST 
// ==========================================
function SpeedTest() {
  return (
    <div className="flex flex-col h-full">
       <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Activity size={24}/></div>
          <h2 className="text-xl font-bold text-slate-800">Server Speed Test</h2>
       </div>
       <div className="flex-1 bg-slate-100 p-1">
          <iframe src="https://openspeedtest.com/Get-widget.php" className="w-full h-full border-0 min-h-[600px]"></iframe>
       </div>
    </div>
  );
}

// ==========================================
// 3. REPORT GENERATOR (Fix Visibility with Inline Style)
// ==========================================
function ReportBackbone({ userRole }: { userRole: Role | null }) {
  const [form, setForm] = useState({
    tiket: '',
    impact: '',
    status: 'Solved',
    problem: '',
    action: '',
    tagging: '',
    power: ''
  });
  const isCS = userRole === 'CS';

  const handleDownload = () => {
    if (isCS) return toast.error("Akses Ditolak: CS Mode View Only.");
    
    // FORMAT BARU SESUAI REQUEST
    const text = `SUMMARY REPORT BACKBONE PROBLEM
===============================

Tiket\t: ${form.tiket || '-'}
Impact\t: ${form.impact || '-'}
Status\t: ${form.status}

Problem analysis details :
${form.problem || '-'}

Action :
${form.action || '-'}

Data Tagging
${form.tagging || '-'}

Record Power After Maintenance :
${form.power || '-'}
`;

    const file = new Blob([text], {type: 'text/plain'});
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    const fileNameSafe = form.tiket.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || 'Report';
    element.download = `Report_${fileNameSafe}.txt`;
    element.click();
    toast.success("Report Backbone berhasil diunduh");
  };

  return (
    <div className="flex flex-col h-full">
       <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FileText size={24}/></div>
          <h2 className="text-xl font-bold text-slate-800">Report Generator</h2>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 min-h-[600px]">
          
          {/* KOLOM INPUT */}
          <div className="lg:col-span-2 p-8 space-y-5 overflow-y-auto border-r border-slate-100">
             
             {/* HEADERS */}
             <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">Tiket (Subject Lengkap)</label>
                    <input 
                      style={{ color: 'black' }}
                      className="w-full p-2.5 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-black placeholder:text-gray-500" 
                      placeholder="HT155380 - Major - Backbone - Karawang <> CCC 2x10G..." 
                      onChange={(e)=>setForm({...form, tiket: e.target.value})} 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase">Impact</label>
                        <input 
                          style={{ color: 'black' }}
                          className="w-full p-2.5 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-black placeholder:text-gray-500" 
                          placeholder="CCC <> KARAWANG 200G" 
                          onChange={(e)=>setForm({...form, impact: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
                        <select 
                          style={{ color: 'black' }}
                          className="w-full p-2.5 border border-slate-300 rounded-lg mt-1 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-black" 
                          onChange={(e)=>setForm({...form, status: e.target.value})}
                        >
                            <option>Solved</option><option>Monitoring</option><option>Open</option>
                        </select>
                    </div>
                </div>
             </div>

             {/* DETAILS */}
             <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Problem Analysis Details</label>
                <textarea 
                  rows={3} 
                  style={{ color: 'black' }}
                  className="w-full p-3 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-black placeholder:text-gray-500" 
                  placeholder="- Link low power..." 
                  onChange={(e)=>setForm({...form, problem: e.target.value})} 
                />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Action Taken</label>
                <textarea 
                  rows={4} 
                  style={{ color: 'black' }}
                  className="w-full p-3 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-black placeholder:text-gray-500" 
                  placeholder="- Pengecekan di sisi BTS..." 
                  onChange={(e)=>setForm({...form, action: e.target.value})} 
                />
             </div>
             
             {/* DATA TAGGING */}
             <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Data Tagging (Lokasi/Core/Maps)</label>
                <textarea 
                  rows={4} 
                  style={{ color: 'black' }}
                  className="w-full p-3 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono font-bold text-black placeholder:text-gray-500" 
                  placeholder="Closure titik 8,7 km... (Paste Info Lengkap)" 
                  onChange={(e)=>setForm({...form, tagging: e.target.value})} 
                />
             </div>

             {/* RECORD POWER */}
             <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Record Power After Maintenance</label>
                <textarea 
                  rows={4} 
                  style={{ color: 'black' }}
                  className="w-full p-3 border border-slate-300 bg-white rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono font-bold text-black placeholder:text-gray-500" 
                  placeholder="- SISI KARAWANG : -20.96..." 
                  onChange={(e)=>setForm({...form, power: e.target.value})} 
                />
             </div>

          </div>

          {/* KOLOM PREVIEW */}
          <div className="lg:col-span-1 bg-slate-50 p-6 flex flex-col border-l border-slate-200">
             <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 shadow-sm flex-1 overflow-y-auto max-h-[600px]">
                <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                   <FileText size={16}/> Preview Report
                </h4>
                <div className="text-[10px] text-slate-600 font-mono space-y-3 whitespace-pre-wrap leading-relaxed">
                    <p className="font-bold">SUMMARY REPORT BACKBONE PROBLEM</p>
                    <hr className="border-slate-200"/>
                    <p><span className="font-bold text-slate-800">Tiket:</span> {form.tiket || '...'}</p>
                    <p><span className="font-bold text-slate-800">Impact:</span> {form.impact || '...'}</p>
                    <p><span className="font-bold text-slate-800">Status:</span> {form.status}</p>
                    <div className="pt-2">
                        <span className="font-bold text-slate-800 underline">Problem Analysis:</span>
                        <p className="mt-1">{form.problem || '-'}</p>
                    </div>
                    <div>
                        <span className="font-bold text-slate-800 underline">Action:</span>
                        <p className="mt-1">{form.action || '-'}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="font-bold text-slate-800">Data Tagging:</span>
                        <p className="mt-1">{form.tagging || '-'}</p>
                    </div>
                </div>
             </div>
             <button 
                onClick={handleDownload} 
                disabled={isCS}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition ${isCS ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
             >
               <Download size={18}/> {isCS ? 'Restricted' : 'Download .TXT'}
             </button>
          </div>
       </div>
    </div>
  );
}

// ==========================================
// 4. WO DISTRIBUTOR (FIXED HEIGHT & INTERNAL SCROLL)
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
      let query = supabase.from('Report Bulanan').select('*');
      if (filterDate) {
        const dateObj = new Date(filterDate);
        const searchString = format(dateObj, 'd MMMM yyyy', { locale: idLocale });
        query = query.or('STATUS.eq.PENDING,STATUS.eq.PROGRESS,STATUS.eq.OPEN').ilike('KETERANGAN', `%${searchString}%`);
      } else {
        query = query.in('STATUS', ['PENDING', 'OPEN', 'PROGRESS']).is('NAMA TEAM', null);
      }
      const { data, error } = await query.order('id', { ascending: false }).limit(100);
      if (error) throw error;
      setWoList(data || []);
      toast.success(`${data?.length || 0} WO ditemukan`);
    } catch (err: any) {
      toast.error("Gagal ambil data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleWO = (id: string) => {
    setSelectedWO(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleAllWO = () => {
    if (selectedWO.length === woList.length) setSelectedWO([]);
    else setSelectedWO(woList.map(wo => wo.id));
  };

  useEffect(() => {
    async function getTechs() {
      if (!canDistribute) return;
      const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['NOC', 'AKTIVATOR', 'SUPER_DEV']); 
      if (data) setTechnicians(data);
    }
    getTechs();
  }, [canDistribute]);

  const toggleTech = (name: string) => {
    setSelectedTechs(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

const distributeWO = async () => {
    if (selectedTechs.length === 0 || selectedWO.length === 0) {
      return toast.error("Pilih minimal 1 tim dan 1 WO!");
    }

    setDistributing(true);

    // Fungsi untuk membuat singkatan nama (Hilangkan Vokal)
    const getAbbreviation = (name: string) => {
      return name.toUpperCase().replace(/[AEIOU\s]/g, '').slice(0, 4);
    };

    try {
      const targetWOs = woList.filter(wo => selectedWO.includes(wo.id));
      const woIds = targetWOs.map(w => w.id);

      const inboxPromises = selectedTechs.map(async (techName) => {
        // 1. Ambil jumlah tiket saat ini untuk membuat nomor urut (00001)
        const { count } = await supabase
          .from('inbox_tugas')
          .select('*', { count: 'exact', head: true });
        
        const nextNumber = (count || 0) + 1;
        const formattedNumber = String(nextNumber).padStart(5, '0');
        const nameAbbr = getAbbreviation(techName);
        
        // 2. Format Tiket: PND/PRG-ILHM-00001
        const customTicketId = `PND/PRG-${nameAbbr}-${formattedNumber}`;

        return supabase.from('inbox_tugas').insert({
          id_tiket_custom: customTicketId, // Simpan ke kolom baru
          assigned_to: techName,
          wo_ids: woIds,
          status: 'OPEN'
        });
      });

      // Update Report Bulanan
      const woUpdate = supabase
        .from('Report Bulanan')
        .update({ 
          'NAMA TEAM': selectedTechs.join(', '), 
          'STATUS': 'OPEN' 
        })
        .in('id', woIds);

      await Promise.all([...inboxPromises, woUpdate]);
      toast.success(`Berhasil! Tiket grup telah dibuat.`);
      
      fetchWO(); setSelectedWO([]); setSelectedTechs([]);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal: " + error.message);
    } finally {
      setDistributing(false);
    }
  };

  return (
    // Grid Utama: Kita kunci tinggi maksimalnya di sini agar tidak memanjang ke bawah
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 items-start text-slate-800 font-sans">
       
       {/* PANEL KIRI: LIST WO (Scrollable Internal) */}
       <div className="lg:col-span-2 flex flex-col border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm h-[65vh] min-h-[500px]">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                  checked={selectedWO.length === woList.length && woList.length > 0}
                  onChange={toggleAllWO}
                />
                <h3 className="font-bold text-sm text-slate-700">Terpilih: {selectedWO.length} WO</h3>
             </div>
             <div className="flex items-center gap-2">
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-black outline-none bg-white"/>
                <button onClick={fetchWO} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                   {loading ? <Loader2 size={14} className="animate-spin"/> : <RefreshCcw size={14} />} Get Data
                </button>
             </div>
          </div>

          {/* AREA SCROLL KIRI */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/20 custom-scrollbar">
             {woList.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed rounded-2xl">
                  <Search size={32} className="opacity-20"/>
                  <p className="text-xs italic">Cari data berdasarkan tanggal di atas.</p>
               </div>
             ) : (
               woList.map((wo, idx) => (
                 <label 
                   key={idx} 
                   className={`p-4 border rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:border-blue-300 ${
                     selectedWO.includes(wo.id) ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-200'
                   }`}
                 >
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 shrink-0"
                      checked={selectedWO.includes(wo.id)}
                      onChange={() => toggleWO(wo.id)}
                    />
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                             {wo.TANGGAL && !isNaN(new Date(wo.TANGGAL).getTime()) 
                               ? format(new Date(wo.TANGGAL), 'dd/MM/yyyy') 
                               : 'No Date'}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border ${
                            wo.STATUS === 'PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                             {wo.STATUS}
                          </span>
                       </div>
                       <p className="text-xs font-bold text-slate-800 line-clamp-1 uppercase tracking-tight">{wo['SUBJECT WO'] || 'No Subject'}</p>
                       <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">{wo['KETERANGAN'] || '-'}</p>
                    </div>
                 </label>
               ))
             )}
          </div>
       </div>

       {/* PANEL KANAN: PILIH TIM & TOMBOL DISTRIBUSI (Sticky di dalam kontainer) */}
       <div className="flex flex-col border border-slate-200 rounded-3xl p-5 bg-white shadow-sm h-[65vh] min-h-[500px] overflow-hidden">
          <h3 className="font-bold text-sm text-slate-800 mb-5 flex items-center gap-2 shrink-0 underline decoration-purple-200 decoration-2">
             <User size={18} className="text-purple-600"/> Pilih Tim Teknisi
          </h3>
          
          {/* AREA SCROLL KANAN */}
          <div className="flex-1 space-y-2 overflow-y-auto pr-2 mb-4 custom-scrollbar">
             {technicians.map((tech) => (
                <label key={tech.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selectedTechs.includes(tech.full_name) ? 'bg-blue-50 border-blue-300 shadow-inner' : 'border-slate-100 hover:bg-slate-50'}`}>
                   <input type="checkbox" checked={selectedTechs.includes(tech.full_name)} onChange={() => toggleTech(tech.full_name)} className="rounded text-blue-600 w-4 h-4"/>
                   <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 leading-none truncate">{tech.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-tighter">{tech.role}</p>
                   </div>
                </label>
             ))}
          </div>
          
          {/* TOMBOL DISTRIBUSI (Selalu di bawah panel kanan) */}
          <div className="pt-4 border-t shrink-0">
            <button 
              onClick={distributeWO} 
              disabled={!canDistribute || selectedTechs.length === 0 || selectedWO.length === 0 || distributing} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2 mb-2"
            >
               {distributing ? <Loader2 size={18} className="animate-spin"/> : <Shuffle size={18}/>}
               Distribusi {selectedWO.length} Tiket
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-tight">Status WO otomatis berubah menjadi OPEN</p>
          </div>
       </div>
    </div>
  );
}