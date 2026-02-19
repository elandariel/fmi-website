'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Upload, Download, X, FileSpreadsheet, 
  Info, FileText, Table, Search, Loader2, ArrowRight, User, Database,
  Moon, Star, Sparkles, BellRing
} from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

import { NotificationBell } from './NotificationBell';

export default function Header() {
  const isRamadhan = true; // SAKLAR UTAMA TEMA

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [exportConfig, setExportConfig] = useState({ table: '', format: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const TABLE_GUIDE: Record<string, string[]> = {
    "Report Bulanan": ["TANGGAL", "SUBJECT WO", "STATUS", "JENIS WO", "KETERANGAN", "SELESAI ACTION", "NAMA TEAM"],
    "Berlangganan 2026": ["TANGGAL", "SUBJECT BERLANGGANAN", "PROBLEM", "TEAM", "STATUS", "BTS", "DEVICE", "ISP"],
    "Berhenti Berlangganan 2026": ["TANGGAL", "SUBJECT BERHENTI BERLANGGANAN", "PROBLEM", "TEAM", "STATUS", "BTS", "DEVICE", "ISP", "REASON"],
    "Berhenti Sementara 2026": ["TANGGAL", "SUBJECT BERHENTI SEMENTARA", "PROBLEM", "TEAM", "STATUS", "BTS", "DEVICE", "ISP", "REASON"],
    "Upgrade 2026": ["TANGGAL", "SUBJECT UPGRADE", "PROBLEM", "TEAM", "STATUS", "BTS", "DEVICE", "ISP", "REASON"],
    "Downgrade 2026": ["TANGGAL", "SUBJECT DOWNGRADE", "PROBLEM", "TEAM", "STATUS", "BTS", "DEVICE", "ISP", "REASON"],
    "Data Client Corporate": ["ID PELANGGAN", "NAMA PELANGGAN", "LAYANAN", "KAPASITAS", "STATUS", "REDAMAN"],
    "VLAN Database": ["VLAN ID", "NAMA VLAN", "IP GATEWAY", "INTERFACE", "KETERANGAN"]
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGlobalSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const clientsQuery = supabase.from('Data Client Corporate').select('id, "Nama Pelanggan", "ID Pelanggan"').or(`"Nama Pelanggan".ilike.%${query}%,"ID Pelanggan".ilike.%${query}%`).limit(3);
      const reportsQuery = supabase.from('Report Bulanan').select('id, "SUBJECT WO", TANGGAL').ilike('SUBJECT WO', `%${query}%`).limit(3);
      const vlanTables = ['Daftar Vlan 1-1000', 'Daftar Vlan 1000+', 'Daftar Vlan 2000+', 'Daftar Vlan 3000+'];
      const vlanQueries = vlanTables.map(tableName => {
        const isNumeric = !isNaN(Number(query));
        return isNumeric ? supabase.from(tableName).select('VLAN, NAME').or(`NAME.ilike.%${query}%,VLAN.eq.${query}`).limit(2) : supabase.from(tableName).select('VLAN, NAME').ilike('NAME', `%${query}%`).limit(2);
      });
      const [clients, reports, ...vlanResults] = await Promise.all([clientsQuery, reportsQuery, ...vlanQueries]);
      const allVlanData = vlanResults.flatMap(res => res.data || []);
      const combined = [
        ...(clients.data?.map(i => ({ type: 'Client', icon: <User size={14}/>, label: i['Nama Pelanggan'], subLabel: i['ID Pelanggan'], link: '/clients' })) || []),
        ...(reports.data?.map(i => ({ type: 'Work Order', icon: <FileText size={14}/>, label: i['SUBJECT WO'], subLabel: i['TANGGAL'], link: '/work-orders' })) || []),
        ...(allVlanData.map(i => ({ type: 'VLAN', icon: <Database size={14}/>, label: i['NAME'], subLabel: `VLAN ID: ${i['VLAN']}`, link: '/vlan-database' })) || [])
      ];
      setSearchResults(combined);
    } catch (err) { console.error("Search Error:", err); } finally { setIsSearching(false); }
  };

  const handleProcessExport = async () => {
    const { table, format: fileFormat } = exportConfig;
    if (!table || !fileFormat) return toast.error("Pilih data dan format export!");
    const loadingToast = toast.loading(`Menyiapkan data ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select('*');
      toast.dismiss(loadingToast);
      if (error || !data || data.length === 0) return toast.error("Gagal mengambil data atau data kosong");
      const fileName = `${table}_${format(new Date(), 'yyyyMMdd_HHmm')}`;
      if (fileFormat === 'CSV') {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${fileName}.csv`);
        link.click();
      } else if (fileFormat === 'EXCEL') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else if (fileFormat === 'PDF') {
        const doc = new jsPDF('l', 'mm', 'a4');
        autoTable(doc, { head: [Object.keys(data[0])], body: data.map((item: any) => Object.values(item)), startY: 25 });
        doc.save(`${fileName}.pdf`);
      }
      toast.success(`Berhasil export ${table}`);
      setShowExportModal(false);
    } catch (err) { toast.error("Terjadi kesalahan sistem"); }
  };

  const processImport = (file: File) => {
    if (!selectedTable) return toast.error("Pilih tabel tujuan");
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const { error } = await supabase.from(selectedTable).insert(results.data);
        if (error) toast.error("Gagal: " + error.message);
        else { toast.success("Berhasil Import"); setShowImportModal(false); setTimeout(() => window.location.reload(), 1500); }
      }
    });
  };

  if (!mounted) return null;

  return (
    <header className={`sticky top-0 z-40 w-full transition-colors duration-500 shadow-xl ${isRamadhan ? 'bg-[#041a14] border-b border-emerald-800' : 'bg-white border-b border-slate-200'}`}>
      
      {/* 🚀 RUNNING TEXT BAR */}
      {isRamadhan && (
        <div className="bg-emerald-900/50 border-b border-emerald-800/50 py-1 overflow-hidden relative group">
          <div className="flex animate-marquee whitespace-nowrap">
             <div className="flex items-center gap-8 px-4">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
                    <span className="flex items-center gap-2"><Sparkles size={10} className="text-amber-400"/> Marhaban Ya Ramadhan 1447 H</span>
                    <span className="text-amber-500/50">•</span>
                    <span>Jaga Integritas, Maksimalkan Ibadah & Pelayanan NOC</span>
                    <span className="text-amber-500/50">•</span>
                    <span className="flex items-center gap-2"><Moon size={10} className="text-amber-400 fill-amber-400"/> Selamat Menunaikan Ibadah Puasa</span>
                    <span className="text-amber-500/50">✦</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 md:px-6 md:h-[73px] gap-3 md:gap-8 relative">
        {/* LOGO SECTION */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2 md:gap-3 shrink-0 group">
            <div className={`p-2 rounded-xl transition-all group-hover:rotate-12 ${isRamadhan ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/50' : 'bg-blue-600'}`}>
              <Wifi className="text-white" size={18} />
            </div>
            <div>
              <h1 className={`text-xs md:text-sm font-black uppercase tracking-tighter ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                NOC FMI {isRamadhan && <span className="text-amber-400 ml-1">✦</span>}
              </h1>
              <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${isRamadhan ? 'text-emerald-500' : 'text-slate-500'}`}>=============</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <NotificationBell />
            <div className={`text-right border-l pl-3 ${isRamadhan ? 'border-emerald-800' : 'border-slate-200'}`}>
               <p className={`text-sm font-mono font-bold ${isRamadhan ? 'text-emerald-400' : 'text-slate-700'}`}>{format(time, 'HH:mm')}</p>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full max-w-xl md:flex-1" ref={searchRef}>
          <div className="relative group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isRamadhan ? 'text-emerald-600 group-focus-within:text-amber-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} size={16} />
            <input 
              type="text"
              placeholder="Cari Client, WO, atau VLAN..."
              className={`w-full border rounded-xl py-2.5 pl-10 pr-10 text-[11px] md:text-xs outline-none transition-all font-bold tracking-wide ${
                isRamadhan 
                ? 'bg-[#062c22] border-emerald-800 text-emerald-50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 placeholder:text-emerald-800' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white'
              }`}
              value={searchQuery}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={14} />}
          </div>

          {/* SEARCH DROPDOWN */}
          {showResults && (
            <div className={`absolute top-full left-0 mt-2 w-full shadow-2xl rounded-2xl overflow-hidden border z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${isRamadhan ? 'bg-emerald-950 border-emerald-800' : 'bg-white border-slate-200'}`}>
              <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? searchResults.map((result, idx) => (
                  <button key={idx} onClick={() => { router.push(result.link); setShowResults(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left mb-1 ${isRamadhan ? 'hover:bg-emerald-900 text-emerald-100' : 'hover:bg-slate-50 text-slate-900'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isRamadhan ? 'bg-emerald-800 text-amber-400' : 'bg-slate-100 text-slate-500'}`}>{result.icon}</div>
                      <div>
                        <p className="text-[11px] font-bold line-clamp-1 uppercase tracking-tight">{result.label}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{result.type} • {result.subLabel}</p>
                      </div>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                )) : <div className="p-6 text-center italic text-xs text-emerald-700">Data tidak ditemukan.</div>}
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS & CLOCK */}
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
          <div className={`flex items-center gap-2 flex-1 md:flex-none md:border-r md:pr-6 md:mr-2 ${isRamadhan ? 'border-emerald-800' : 'border-slate-200'}`}>
            <button onClick={() => setShowImportModal(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all border shadow-sm ${isRamadhan ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 hover:bg-emerald-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'}`}>
              <Upload size={14} /> Import
            </button>
            <button onClick={() => setShowExportModal(true)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all border shadow-sm ${isRamadhan ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 hover:bg-emerald-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50'}`}>
              <Download size={14} /> Export
            </button>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <NotificationBell />
            <div className={`text-right border-l pl-6 flex flex-col justify-center ${isRamadhan ? 'border-emerald-800' : 'border-slate-200'}`}>
              <p className={`text-xl font-mono font-black leading-none ${isRamadhan ? 'text-emerald-100' : 'text-slate-700'}`}>{format(time, 'HH:mm:ss')}</p>
              <p className={`text-[9px] font-black uppercase mt-1 tracking-widest ${isRamadhan ? 'text-amber-500' : 'text-slate-400'}`}>{format(time, 'dd MMM yyyy', { locale: indonesia })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL EXPORT --- */}
      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border ${isRamadhan ? 'bg-[#041a14] border-emerald-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isRamadhan ? 'border-emerald-800 bg-emerald-900/20' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-bold flex items-center gap-2 text-sm ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                <Download size={18} className="text-amber-500" /> Export Database
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <select 
                className={`w-full p-3 rounded-xl text-sm font-bold outline-none border ${isRamadhan ? 'bg-[#062c22] border-emerald-800 text-emerald-50' : 'bg-slate-50 border-slate-200'}`}
                onChange={(e) => setExportConfig({...exportConfig, table: e.target.value})}
              >
                <option value="">-- Pilih Data --</option>
                {Object.keys(TABLE_GUIDE).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {['CSV', 'EXCEL', 'PDF'].map((f) => (
                  <button key={f} onClick={() => setExportConfig({...exportConfig, format: f})} className={`p-3 rounded-xl border text-[10px] font-black transition-all ${exportConfig.format === f ? 'bg-amber-500 text-black' : 'bg-transparent text-slate-400 border-slate-700'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={handleProcessExport} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all">
                Eksekusi Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL IMPORT --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border ${isRamadhan ? 'bg-[#041a14] border-emerald-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isRamadhan ? 'border-emerald-800 bg-emerald-900/20' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-bold flex items-center gap-2 text-sm ${isRamadhan ? 'text-emerald-50' : 'text-slate-800'}`}>
                <FileSpreadsheet size={18} className="text-amber-500" /> Import CSV
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <select 
                className={`w-full p-3 rounded-xl text-sm font-bold outline-none border ${isRamadhan ? 'bg-[#062c22] border-emerald-800 text-emerald-50' : 'bg-slate-50 border-slate-200'}`}
                onChange={(e) => setSelectedTable(e.target.value)}
              >
                <option value="">-- Pilih Database Tujuan --</option>
                {Object.keys(TABLE_GUIDE).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {selectedTable && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className={`p-4 rounded-xl border ${isRamadhan ? 'bg-emerald-900/20 border-emerald-800' : 'bg-amber-50 border-amber-200'}`}>
                    <p className="text-[10px] font-black text-amber-500 uppercase mb-2">Required Headers:</p>
                    <div className="flex flex-wrap gap-1">
                      {TABLE_GUIDE[selectedTable].map(h => (
                        <span key={h} className="px-2 py-0.5 bg-black/20 rounded text-[9px] font-bold text-emerald-400 border border-emerald-800 uppercase">{h}</span>
                      ))}
                    </div>
                  </div>
                  <label className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-emerald-800 bg-emerald-900/10 rounded-2xl hover:bg-emerald-900/20 cursor-pointer transition-all">
                    <Upload size={32} className="text-emerald-500 mb-2" />
                    <span className="text-xs font-bold text-emerald-400">Klik untuk pilih file CSV</span>
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && processImport(e.target.files[0])} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </header>
  );
}