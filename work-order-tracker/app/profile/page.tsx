'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, Lock, Save, Loader2, Shield, UserCheck, Link2, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Role } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [myRole, setMyRole] = useState<Role | ''>('');

  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Odoo integration state ─────────────────────────────────
  const [odooApiKey, setOdooApiKey]   = useState('');
  const [showOdooKey, setShowOdooKey] = useState(false);
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooStatus, setOdooStatus]   = useState<{
    hasKey: boolean;
    odoo_uid: number | null;
    verified_at: string | null;
    is_active: boolean;
  } | null>(null);

  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        setEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name || '');
          setMyRole(profile.role as Role);
          setSelectedRole(profile.role as Role);
        }
      }
      setLoading(false);
    }
    getProfile();
    fetchOdooStatus();
  }, []);

  async function fetchOdooStatus() {
    try {
      const res  = await fetch('/api/my-odoo-key');
      const data = await res.json();
      if (data.success) setOdooStatus(data);
    } catch { /* ignore */ }
  }

  async function handleSaveOdooKey(e: React.FormEvent) {
    e.preventDefault();
    if (!odooApiKey.trim()) return;
    setOdooLoading(true);
    const toastId = toast.loading('Memverifikasi ke Odoo...');
    try {
      const res  = await fetch('/api/my-odoo-key', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ api_key: odooApiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message, { id: toastId });
        setOdooApiKey('');
        fetchOdooStatus();
      } else {
        toast.error('Gagal', { id: toastId, description: data.error });
      }
    } catch {
      toast.error('Koneksi bermasalah', { id: toastId });
    } finally {
      setOdooLoading(false);
    }
  }

  async function handleRevokeOdooKey() {
    toast.warning('Hapus API Key Odoo kamu?', {
      action: {
        label: 'Ya, Hapus',
        onClick: async () => {
          const res  = await fetch('/api/my-odoo-key', { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            toast.success(data.message);
            setOdooStatus(null);
          } else {
            toast.error(data.error);
          }
        },
      },
      cancel: { label: 'Batal', onClick: () => {} },
      duration: 6000,
    });
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const updates = {
      id: user.id,
      full_name: fullName,
      // Jika bukan Super Dev, paksa gunakan role asli (myRole) agar tidak bisa hack via Inspect Element
      role: myRole === 'SUPER_DEV' ? selectedRole : myRole, 
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      toast.error('Gagal update profile', { description: error.message });
    } else {
      toast.success('Profile berhasil diperbarui!');
      await logActivity({
        activity: 'PROFILE_UPDATE',
        subject: fullName,
        actor: fullName,
        detail: myRole === 'SUPER_DEV' ? `Role: ${selectedRole}` : undefined,
      });
      // router.refresh() agar sidebar nama terupdate tanpa full reload
      router.refresh();
    }
    setUpdating(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Password konfirmasi tidak cocok!');
      return;
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter!');
      return;
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Gagal ganti password', { description: error.message });
    } else {
      toast.success('Password berhasil diganti!');
      await logActivity({
        activity: 'PASSWORD_CHANGE',
        subject: fullName || email || 'User',
        actor: fullName || email || 'User',
      });
      setPassword('');
      setConfirmPassword('');
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Menghubungkan ke server...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/20 rotate-3">
          <span className="-rotate-3">{email.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pengaturan Akun</h1>
          <p className="text-sm text-slate-500">Kelola identitas dan keamanan akses Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* KIRI: EDIT PROFILE */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
                <User className="text-blue-600" size={20} />
                <h2 className="font-bold text-slate-800">Informasi Pribadi</h2>
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${myRole === 'SUPER_DEV' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                {myRole}
            </span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Email Terdaftar</label>
              <input type="text" value={email} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-medium text-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Nama Lengkap</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="Nama Anda"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Jabatan / Role</label>
              <div className="relative">
                <select 
                  value={selectedRole} 
                  disabled={myRole !== 'SUPER_DEV'} 
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className={`w-full p-3 border border-slate-200 rounded-xl text-slate-800 outline-none transition-all text-sm appearance-none ${myRole !== 'SUPER_DEV' ? 'bg-slate-50 cursor-not-allowed text-slate-500' : 'focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-slate-300'}`}
                >
                  <option value="SUPER_DEV">SUPER_DEV</option>
                  <option value="NOC">NOC</option>
                  <option value="AKTIVATOR">AKTIVATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CS">CS</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                    <UserCheck size={16} />
                </div>
              </div>
              {myRole !== 'SUPER_DEV' && (
                <p className="mt-2 text-[10px] text-amber-600 font-medium italic">* Hanya Super Dev yang dapat mengubah Jabatan.</p>
              )}
            </div>

            <div className="pt-4">
              <button type="submit" disabled={updating} className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg disabled:bg-slate-300">
                {updating ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>

        {/* KANAN: GANTI PASSWORD */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
            <Shield className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-800">Keamanan Akun</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-[11px] text-emerald-800 leading-relaxed">
              <strong>Tips Keamanan:</strong> Gunakan minimal 6 karakter dengan kombinasi huruf besar, kecil, dan angka untuk melindungi akses sistem NOC.
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-300" size={16} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Ulangi Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-300" size={16} />
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={updating || !password} className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 disabled:bg-slate-200 disabled:shadow-none">
                {updating ? <Loader2 className="animate-spin" size={18}/> : <Shield size={18}/>}
                Ganti Password
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* ── INTEGRASI ODOO ─────────────────────────────────── */}
      <div className="mt-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link2 className="text-violet-600" size={20} />
            <h2 className="font-bold text-slate-800">Integrasi Odoo Helpdesk</h2>
          </div>
          {/* Status badge */}
          {odooStatus === null ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              ⚪ Memuat...
            </span>
          ) : odooStatus.hasKey && odooStatus.is_active ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={12} /> Terhubung · UID {odooStatus.odoo_uid}
            </span>
          ) : (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
              <XCircle size={12} /> Belum Dikonfigurasi
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kiri: form input */}
          <form onSubmit={handleSaveOdooKey} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                Email Odoo (Otomatis dari Akun Login)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-medium text-sm pr-16"
                />
                <span className="absolute right-3 top-3 text-[9px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Auto
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Email ini dipakai sebagai username saat autentikasi ke Odoo.</p>
            </div>

            {/* API Key input */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                {odooStatus?.hasKey ? 'Ganti Odoo API Key' : 'Odoo API Key'}
              </label>
              <div className="relative">
                <input
                  type={showOdooKey ? 'text' : 'password'}
                  value={odooApiKey}
                  onChange={(e) => setOdooApiKey(e.target.value)}
                  placeholder={odooStatus?.hasKey ? '••••••• (isi untuk mengganti)' : 'Paste API Key dari Odoo...'}
                  className="w-full p-3 pr-12 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOdooKey(v => !v)}
                  className="absolute right-3 top-3 text-slate-300 hover:text-slate-500 transition-colors"
                  tabIndex={-1}
                >
                  {showOdooKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Verified at info */}
            {odooStatus?.verified_at && (
              <p className="text-[11px] text-slate-400">
                Terakhir diverifikasi: {new Date(odooStatus.verified_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={odooLoading || !odooApiKey.trim()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-200 disabled:shadow-none"
              >
                {odooLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Simpan & Verifikasi
              </button>
              {odooStatus?.hasKey && (
                <button
                  type="button"
                  onClick={() => { setOdooApiKey(''); fetchOdooStatus(); }}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-slate-50"
                >
                  <RefreshCw size={14} /> Refresh Status
                </button>
              )}
              {odooStatus?.hasKey && (
                <button
                  type="button"
                  onClick={handleRevokeOdooKey}
                  className="flex items-center gap-2 text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Cabut Key
                </button>
              )}
            </div>
          </form>

          {/* Kanan: panduan */}
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-5">
              <p className="text-[11px] font-black text-violet-700 uppercase tracking-widest mb-3">
                📋 Cara Mendapatkan API Key
              </p>
              <ol className="text-[12px] text-violet-800 space-y-2 leading-relaxed">
                <li className="flex gap-2"><span className="font-black text-violet-400">1.</span> Login ke <span className="font-mono bg-violet-100 px-1 rounded text-[11px]">portal.fibermedia.co.id</span></li>
                <li className="flex gap-2"><span className="font-black text-violet-400">2.</span> Klik foto profil kanan atas → <strong>Preferences</strong></li>
                <li className="flex gap-2"><span className="font-black text-violet-400">3.</span> Buka tab <strong>Account Security</strong></li>
                <li className="flex gap-2"><span className="font-black text-violet-400">4.</span> Klik <strong>New API Key</strong> → beri nama → <strong>Generate</strong></li>
                <li className="flex gap-2"><span className="font-black text-violet-400">5.</span> <strong>Salin key</strong> lalu paste di sini</li>
              </ol>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                <strong>⚠️ Penting:</strong> API Key bersifat pribadi dan hanya bisa dilihat sekali di Odoo. Tiket yang dibuat/diupdate akan tercatat atas nama akunmu di Odoo.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}