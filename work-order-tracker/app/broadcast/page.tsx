'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Megaphone, Send, Copy, RefreshCcw, Trash2, 
  FileText, User
} from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

// 1. IMPORT TOAST
import { toast } from 'sonner';

// --- SETUP SUPABASE ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// --- TEMPLATES PESAN ---
const TEMPLATES = [
  {
    label: 'Gangguan Massal',
    type: 'URGENT',
    title: 'INFO GANGGUAN KONEKSI',
    text: 'Yth. Pelanggan,\n\nDiinformasikan saat ini sedang terjadi gangguan koneksi internet di area [AREA] yang disebabkan oleh putusnya kabel Fiber Optic (FO Cut).\n\nTim teknis kami sedang meluncur ke lokasi untuk perbaikan. Estimasi pengerjaan akan kami update berkala.\n\nMohon maaf atas ketidaknyamanan ini.'
  },
  {
    label: 'Maintenance',
    type: 'INFO',
    title: 'INFO PEMELIHARAAN JARINGAN',
    text: 'Yth. Pelanggan,\n\nDalam upaya peningkatan kualitas layanan, kami akan melakukan pemeliharaan perangkat (Maintenance) pada:\n\nHari/Tgl: [HARI, TANGGAL]\nJam: [JAM MULAI] - [JAM SELESAI]\nDampak: Koneksi akan terputus sementara (Downtime)\n\nMohon maaf atas ketidaknyamanan ini.'
  },
  {
    label: 'Gangguan Selesai',
    type: 'INFO',
    title: 'UPDATE GANGGUAN: SOLVED',
    text: 'Yth. Pelanggan,\n\nDiinformasikan bahwa gangguan koneksi di area [AREA] telah SELESAI ditangani dan layanan sudah normal kembali.\n\nSilakan restart perangkat jika masih terkendala. Terima kasih atas kesabaran Anda.'
  }
];

export default function BroadcastPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    type: 'INFO',
    title: '',
    message: '',
    sender: 'Admin' 
  });

  // --- 1. FETCH DATA ---
  async function fetchHistory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Broadcasts') 
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setHistory(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Gagal memuat riwayat broadcast");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHistory(); }, []);

  // --- 2. HANDLERS ---
  const handleTemplate = (tmpl: any) => {
    setForm({ ...form, type: tmpl.type, title: tmpl.title, message: tmpl.text });
    toast.info('Template diterapkan', { duration: 2000 });
  };

  const handleSave = async () => {
    if (!form.title || !form.message) {
      toast.error('Judul dan Pesan wajib diisi!');
      return;
    }

    const combinedMessage = `[${form.title}]\n\n${form.message}`;

    const payload = {
      type: form.type,
      message: combinedMessage,
      sender: form.sender
    };

    // Loading indicator
    const toastId = toast.loading('Mengirim broadcast...');

    const { error } = await supabase.from('Broadcasts').insert([payload]);
    
    // Hapus loading
    toast.dismiss(toastId);

    if (error) {
      toast.error('Gagal simpan: ' + error.message);
    } else {
      fetchHistory();
      toast.success('Broadcast Terkirim!', {
        description: 'Pesan akan muncul di dashboard semua user.'
      });
      setForm({ ...form, title: '', message: '' }); 
    }
  };

  const handleDelete = async (id: any) => {
    if(!confirm('Hapus log ini?')) return;
    
    const { error } = await supabase.from('Broadcasts').delete().eq('id', id);
    if (error) {
       toast.error("Gagal hapus data");
    } else {
       toast.success("Log dihapus");
    }
    fetchHistory();
  };

  const handleCopy = (title: string, msg: string) => {
    const textToCopy = `*${title}*\n\n${msg}\n\n_Regards,_\n*NOC System*`;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Disalin ke Clipboard!', {
      description: 'Siap paste ke WhatsApp.'
    });
  };

  const handleCopyFromHistory = (fullMessage: string) => {
    let textToCopy = fullMessage;
    const match = fullMessage.match(/^\[(.*?)\]\n\n([\s\S]*)$/);
    if (match) {
        textToCopy = `*${match[1]}*\n\n${match[2]}\n\n_Regards,_\n*NOC System*`;
    }
    navigator.clipboard.writeText(textToCopy);
    toast.success('Teks disalin!');
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans flex flex-col lg:flex-row gap-6">
      
      {/* --- KIRI: FORM EDITOR --- */}
      <div className="flex-1 flex flex-col gap-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="text-blue-600" /> Broadcast Center
            </h1>
            <p className="text-sm text-slate-500">Generator pesan notifikasi massal.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
            <FileText size={14}/> Template Cepat
          </h3>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t, idx) => (
              <button 
                key={idx} 
                onClick={() => handleTemplate(t)}
                className="px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-bold transition-all"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
           <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Editor Pesan</h3>
              <div className="flex gap-2">
                <select 
                    value={form.sender} 
                    onChange={(e) => setForm({...form, sender: e.target.value})}
                    className="text-xs font-bold bg-slate-100 border border-slate-200 rounded px-2 py-1 outline-none text-slate-600"
                >
                    <option value="Admin">Admin</option>
                    <option value="NOC">NOC</option>
                    <option value="Bot">Bot</option>
                </select>
                <select 
                    value={form.type} 
                    onChange={(e) => setForm({...form, type: e.target.value})}
                    className="text-xs font-bold bg-blue-50 border border-blue-200 rounded px-2 py-1 outline-none text-blue-700"
                >
                    <option value="INFO">INFO</option>
                    <option value="URGENT">URGENT</option>
                    <option value="ASSIGNMENT">ASSIGNMENT</option>
                </select>
              </div>
           </div>

           <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Judul Broadcast</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 text-sm focus:border-blue-500 outline-none"
                  placeholder="Contoh: INFO GANGGUAN..."
                />
              </div>
              
              <div className="flex-1 flex flex-col h-full">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Isi Pesan</label>
                <textarea 
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg text-slate-700 text-sm leading-relaxed focus:border-blue-500 outline-none flex-1 min-h-[200px] font-mono"
                  placeholder="Ketik pesan di sini..."
                ></textarea>
              </div>
           </div>

           <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setForm({type:'INFO', title:'', message:'', sender:'Admin'})} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-bold transition">
                Reset
              </button>
              <div className="flex-1"></div>
              <button onClick={() => handleCopy(form.title, form.message)} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                <Copy size={16} /> Copy WA
              </button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition">
                <Send size={16} /> Kirim & Simpan
              </button>
           </div>
        </div>

      </div>

      {/* --- KANAN: HISTORY LIST --- */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit max-h-[calc(100vh-50px)]">
        
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
             <RefreshCcw size={16} className="text-slate-400"/> Riwayat Broadcast
           </h3>
           <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold">{history.length} Logs</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
           {loading ? <p className="text-center text-slate-400 text-xs py-4">Memuat data...</p> : 
            history.length === 0 ? <p className="text-center text-slate-400 text-xs py-10 italic">Belum ada riwayat.</p> :
            history.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${item.type === 'URGENT' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {item.type}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                            <User size={8}/> {item.sender}
                        </span>
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-rose-500 transition"><Trash2 size={14}/></button>
                 </div>
                 
                 <p className="text-xs text-slate-600 line-clamp-4 mb-3 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50 p-2 rounded border border-slate-100">
                    {item.message}
                 </p>
                 
                 <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">
                      {item.created_at ? format(new Date(item.created_at), 'dd MMM HH:mm', { locale: indonesia }) : '-'}
                    </span>
                    <button onClick={() => handleCopyFromHistory(item.message)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                      <Copy size={10}/> Salin
                    </button>
                 </div>
              </div>
            ))
           }
        </div>

      </div>

    </div>
  );
}