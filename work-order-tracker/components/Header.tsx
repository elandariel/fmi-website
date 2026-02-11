'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Upload, Download, X, FileSpreadsheet, AlertCircle, 
  Info, FileText, Table, Search, Loader2, ArrowRight, User, Database, Clock 
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

// Import Komponen Lonceng Notifikasi Baru
import { NotificationBell } from './NotificationBell';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [exportConfig, setExportConfig] = useState({ table: '', format: '' });
  
  // State Global Search
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
    "Data Client Corporate": ["ID PELANGGAN", "NAMA PELANGGAN", "LAYANAN", "KAPASITAS", "STATUS", "REDAMAN"],
    "VLAN Database": ["VLAN ID", "NAMA VLAN", "IP GATEWAY", "INTERFACE", "KETERANGAN"]
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- LOGIKA GLOBAL SEARCH ---
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
      const clientsQuery = supabase
        .from('Data Client Corporate')
        .select('id, "Nama Pelanggan", "ID Pelanggan"')
        .or(`"Nama Pelanggan".ilike.%${query}%,"ID Pelanggan".ilike.%${query}%`)
        .limit(3);

      const reportsQuery = supabase
        .from('Report Bulanan')
        .select('id, "SUBJECT WO", TANGGAL')
        .ilike('SUBJECT WO', `%${query}%`)
        .limit(3);

      const [clients, reports] = await Promise.all([clientsQuery, reportsQuery]);

      const combined = [
        ...(clients.data?.map(i => ({ 
          type: 'Client', 
          icon: <User size={14}/>, 
          label: i['Nama Pelanggan'], 
          subLabel: i['ID Pelanggan'], 
          link: '/clients' 
        })) || []),
        ...(reports.data?.map(i => ({ 
          type: 'Work Order', 
          icon: <FileText size={14}/>, 
          label: i['SUBJECT WO'], 
          subLabel: i['TANGGAL'],
          link: '/work-orders' 
        })) || [])
      ];

      setSearchResults(combined);
    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // --- LOGIKA EXPORT ---
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
      } 
      else if (fileFormat === 'EXCEL') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } 
      else if (fileFormat === 'PDF') {
        const doc = new jsPDF('l', 'mm', 'a4');
        autoTable(doc, {
          head: [Object.keys(data[0])],
          body: data.map((item: any) => Object.values(item)),
          styles: { fontSize: 7 }
        });
        doc.save(`${fileName}.pdf`);
      }

      toast.success(`Berhasil export ke ${fileFormat}`);
      setShowExportModal(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Export Gagal");
    }
  };

  const processImport = (file: File) => {
    if (!selectedTable) return toast.error("Pilih tabel tujuan");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { error } = await supabase.from(selectedTable).insert(results.data);
        if (error) toast.error("Gagal Import: " + error.message);
        else {
          toast.success("Berhasil Import Data");
          setShowImportModal(false);
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    });
  };

  if (!mounted) return null;

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row justify-between items-center shadow-sm sticky top-0 z-40 md:h-[73px] gap-3 md:gap-8">
      
      {/* BAGIAN KIRI: BRANDING & SEARCH */}
      <div className="flex flex-col md:flex-row items-center gap-3 md:gap-8 w-full flex-1">
        <div className="flex items-center justify-between w-full md:w-auto shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
              <Wifi className="text-white" size={18} />
            </div>
            <div className="block">
              <h1 className="text-xs md:text-sm font-black text-slate-800 leading-none uppercase">NOC COMMAND</h1>
              <p className="text-[8px] md:text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Monitoring System</p>
            </div>
          </div>
          
          {/* Mobile Clock & Notif (Only Mobile) */}
          <div className="flex items-center gap-3 md:hidden">
             <NotificationBell />
             <div className="text-right">
                <p className="text-xs font-mono font-bold text-slate-700 leading-none">{format(time, 'HH:mm')}</p>
             </div>
          </div>
        </div>

        {/* INPUT GLOBAL SEARCH */}
        <div className="relative w-full max-w-xl" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Cari Client, WO, atau VLAN..."
              className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-[11px] md:text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold text-slate-900"
              value={searchQuery}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={14} />
            ) : searchQuery && (
              <button onClick={() => {setSearchQuery(''); setSearchResults([]);}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-2 max-h-[60vh] md:max-h-[350px] overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { router.push(result.link); setShowResults(false); }}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{result.icon}</div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-900 line-clamp-1">{result.label}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{result.type}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 italic">Data tidak ditemukan.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BAGIAN KANAN: ACTIONS & TIME */}
      <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all border border-slate-200 shadow-sm active:scale-95"
          >
            <Upload size={14} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-tight">Import</span>
          </button>

          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all border border-slate-200 shadow-sm active:scale-95"
          >
            <Download size={14} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-tight">Export</span>
          </button>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
            <NotificationBell />
            <div className="text-right border-l border-slate-200 pl-6 flex flex-col justify-center">
              <p className="text-xl font-mono font-bold text-slate-700 leading-none">{format(time, 'HH:mm:ss')}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{format(time, 'EEEE, dd MMM yyyy', { locale: indonesia })}</p>
            </div>
        </div>
      </div>

      {/* MODAL EXPORT */}
      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Download size={18}/> Export Data</h3>
              <button onClick={() => setShowExportModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <select 
                className="w-full p-3 bg-slate-100 border rounded-xl text-sm font-bold"
                onChange={(e) => setExportConfig({...exportConfig, table: e.target.value})}
              >
                <option value="">-- Pilih Sumber Data --</option>
                {Object.keys(TABLE_GUIDE).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {['CSV', 'EXCEL', 'PDF'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setExportConfig({...exportConfig, format: f})}
                    className={`p-3 rounded-xl border text-[10px] font-bold ${exportConfig.format === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={handleProcessExport} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Mulai Export</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full md:max-w-xl rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18}/> Import Data CSV</h3>
              <button onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <select 
                className="w-full p-3 bg-slate-100 border rounded-xl text-sm font-bold"
                onChange={(e) => setSelectedTable(e.target.value)}
              >
                <option value="">-- Pilih Tabel Tujuan --</option>
                {Object.keys(TABLE_GUIDE).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {selectedTable && (
                <label className="w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-blue-200 bg-blue-50 rounded-2xl cursor-pointer">
                   <Upload size={32} className="text-blue-500 mb-2"/>
                   <span className="text-xs font-bold text-slate-600">Klik untuk pilih file CSV</span>
                   <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && processImport(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}