'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Users, Shield, Trash2, Search,
  Loader2, XCircle, ShieldCheck, UserPlus,
  CheckCircle2, Link2, RefreshCw, AlertCircle,
  AlertTriangle, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { Role } from '@/lib/permissions';
import { toast } from 'sonner';
import { logActivity, getActorName } from '@/lib/logger';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ODOO_ROLES = ['SUPER_DEV', 'NOC', 'ADMIN'];

type OdooFilter = 'all' | 'connected' | 'missing' | 'na';

// ─────────────────────────────────────────────
// PASSWORD STRENGTH HELPER  — TM-UX-03
// ─────────────────────────────────────────────
function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8)            score++;
  if (pw.length >= 12)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  if (score <= 1) return { score, label: 'Lemah',  bar: 'bg-rose-500',    text: 'text-rose-500' };
  if (score <= 3) return { score, label: 'Sedang', bar: 'bg-amber-500',   text: 'text-amber-500' };
  return           { score, label: 'Kuat',  bar: 'bg-emerald-500', text: 'text-emerald-500' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const s = getPasswordStrength(password);
  const pct = Math.round((s.score / 5) * 100);
  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${s.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[10px] font-bold mt-1 ${s.text}`}>{s.label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function ManageUsersPage() {
  // ── TM-BUG-03: supabase in useMemo ──
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL    || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  // ── Core state ──
  const [profiles, setProfiles]               = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm]           = useState('');

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'tim' | 'odoo'>('tim');

  // ── Odoo tab ──
  const [odooUsers, setOdooUsers]     = useState<any[]>([]);
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooFilter, setOdooFilter]   = useState<OdooFilter>('all');

  // ── TM-BUG-01: delete confirmation modal ──
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  // ── Create user modal ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePw, setShowCreatePw]       = useState(false);
  const [newUser, setNewUser] = useState({
    email: '', password: '', full_name: '', role: 'CS' as Role,
  });

  // ── TM-UX-01: reset password modal ──
  const [resetTarget, setResetTarget]         = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetPw, setResetPw]                 = useState('');
  const [resetPwConfirm, setResetPwConfirm]   = useState('');
  const [showResetPw, setShowResetPw]         = useState(false);
  const [showResetPwConfirm, setShowResetPwConfirm] = useState(false);

  // ────────────────────────────────
  // Data fetching
  // ────────────────────────────────
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setProfiles(data);
    setLoading(false);
  }

  const fetchOdooStatuses = useCallback(async () => {
    setOdooLoading(true);
    try {
      const res  = await fetch('/api/my-odoo-key?all=1');
      const data = await res.json();
      if (data.success) setOdooUsers(data.users ?? []);
      else toast.error(data.error || 'Gagal memuat data Odoo');
    } catch {
      toast.error('Koneksi bermasalah');
    } finally {
      setOdooLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activeTab === 'odoo' && odooUsers.length === 0) fetchOdooStatuses();
  }, [activeTab]);

  // ────────────────────────────────
  // Create user — TM-BUG-02: show/hide pw + TM-UX-03: strength validation
  // ────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // TM-UX-03: block if password is too weak
    const strength = getPasswordStrength(newUser.password);
    if (strength.score < 2) {
      toast.error('Password terlalu lemah!', { description: 'Gunakan min. 8 karakter dengan huruf besar dan angka.' });
      return;
    }

    setIsActionLoading('creating');
    const toastId = toast.loading('Mendaftarkan user baru...');
    try {
      // TM-BUG-02: sent over HTTPS (Vercel enforces TLS) — standard web pattern
      const response = await fetch('/api/admin/manage-team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(newUser),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('User berhasil didaftarkan!', { id: toastId });
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', full_name: '', role: 'CS' });
        fetchData();
        const actorName = await getActorName(supabase);
        await logActivity({
          activity: 'USER_CREATE',
          subject:  `${newUser.full_name} (${newUser.email})`,
          actor:    actorName,
          detail:   `Role: ${newUser.role}`,
        });
      } else {
        toast.error('Gagal mendaftarkan user', { id: toastId, description: result.error });
      }
    } catch {
      toast.error('Kesalahan koneksi ke server', { id: toastId });
    } finally {
      setIsActionLoading(null);
    }
  };

  // ────────────────────────────────
  // Delete — TM-BUG-01: modal confirmation
  // ────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id, email } = deleteTarget;
    setDeleteTarget(null);
    setIsActionLoading(id);
    const toastId = toast.loading('Menghapus user...');
    try {
      const response = await fetch(`/api/admin/manage-team?id=${id}`, { method: 'DELETE' });
      const result   = await response.json();
      if (response.ok) {
        toast.success('User berhasil dihapus!', { id: toastId });
        fetchData();
        const actorName = await getActorName(supabase);
        await logActivity({ activity: 'USER_DELETE', subject: email, actor: actorName, detail: `User ID: ${id}` });
      } else {
        toast.error('Gagal hapus user', { id: toastId, description: result.error });
      }
    } catch {
      toast.error('Koneksi bermasalah', { id: toastId });
    } finally {
      setIsActionLoading(null);
    }
  };

  // ────────────────────────────────
  // Reset password — TM-UX-01
  // ────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    if (resetPw !== resetPwConfirm) {
      toast.error('Password tidak cocok!');
      return;
    }
    const strength = getPasswordStrength(resetPw);
    if (strength.score < 2) {
      toast.error('Password terlalu lemah!', { description: 'Gunakan min. 8 karakter dengan huruf besar dan angka.' });
      return;
    }

    setIsActionLoading('resetting');
    const toastId = toast.loading('Mereset password...');
    try {
      const response = await fetch('/api/admin/manage-team', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: resetTarget.id, newPassword: resetPw }),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('Password berhasil direset!', { id: toastId, description: `Akun: ${resetTarget.email}` });
        setResetTarget(null);
        setResetPw('');
        setResetPwConfirm('');
        const actorName = await getActorName(supabase);
        await logActivity({
          activity: 'USER_RESET_PASSWORD',
          subject:  resetTarget.name || resetTarget.email,
          actor:    actorName,
          detail:   `Force reset password untuk ${resetTarget.email}`,
        });
      } else {
        toast.error('Gagal reset password', { id: toastId, description: result.error });
      }
    } catch {
      toast.error('Koneksi bermasalah', { id: toastId });
    } finally {
      setIsActionLoading(null);
    }
  };

  // ────────────────────────────────
  // Update role
  // ────────────────────────────────
  const updateRole = async (id: string, newRole: Role) => {
    setIsActionLoading(id);
    const targetUser = profiles.find(p => p.id === id);
    const { error }  = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) {
      toast.error('Gagal update role', { description: error.message });
    } else {
      await fetchData();
      const actorName = await getActorName(supabase);
      await logActivity({ activity: 'USER_ROLE_CHANGE', subject: targetUser?.full_name || id, actor: actorName, detail: `Role diubah menjadi ${newRole}` });
    }
    setIsActionLoading(null);
  };

  // ────────────────────────────────
  // Revoke Odoo key
  // ────────────────────────────────
  const handleRevokeOdooKey = async (userId: string, name: string) => {
    toast.warning(`Cabut API Key Odoo milik ${name}?`, {
      action: {
        label: 'Ya, Cabut',
        onClick: async () => {
          const res  = await fetch(`/api/my-odoo-key?userId=${userId}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) { toast.success(data.message); fetchOdooStatuses(); }
          else toast.error(data.error);
        },
      },
      cancel:   { label: 'Batal', onClick: () => {} },
      duration: 7000,
    });
  };

  // ────────────────────────────────
  // Derived
  // ────────────────────────────────
  const filteredProfiles = profiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email     || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const odooStats = {
    connected: odooUsers.filter(u => u.odoo?.is_active).length,
    missing:   odooUsers.filter(u => !u.odoo && ODOO_ROLES.includes(u.role)).length,
    na:        odooUsers.filter(u => !ODOO_ROLES.includes(u.role)).length,
  };

  const filteredOdoo = odooUsers.filter(u => {
    if (odooFilter === 'connected') return u.odoo?.is_active;
    if (odooFilter === 'missing')   return !u.odoo && ODOO_ROLES.includes(u.role);
    if (odooFilter === 'na')        return !ODOO_ROLES.includes(u.role);
    return true;
  });

  function OdooStatusBadge({ user }: { user: any }) {
    if (!ODOO_ROLES.includes(user.role))
      return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">⚪ N/A</span>;
    if (user.odoo?.is_active)
      return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✅ Terhubung</span>;
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 border border-rose-200 flex items-center gap-1 w-fit"><AlertCircle size={10} /> Belum Set</span>;
  }

  function fmtDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="p-8 min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* ── DELETE CONFIRM MODAL — TM-BUG-01 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={26} className="text-rose-500" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Hapus Akun Permanen?</h2>
              <p className="text-sm text-slate-500 mt-1.5">
                Tindakan ini <span className="text-rose-600 font-semibold">tidak bisa dibatalkan</span>.<br />
                Akun <span className="font-mono font-bold text-slate-700">{deleteTarget.email}</span> akan dihapus dari sistem.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL — TM-UX-01 ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-500" />
                  Reset Password
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{resetTarget.name} · {resetTarget.email}</p>
              </div>
              <button
                onClick={() => { setResetTarget(null); setResetPw(''); setResetPwConfirm(''); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {/* New password */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    required
                    type={showResetPw ? 'text' : 'password'}
                    value={resetPw}
                    onChange={e => setResetPw(e.target.value)}
                    placeholder="Min. 8 karakter"
                    autoComplete="new-password"
                    className="w-full p-3 pr-10 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw(!showResetPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* TM-UX-03: strength bar */}
                <PasswordStrengthBar password={resetPw} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showResetPwConfirm ? 'text' : 'password'}
                    value={resetPwConfirm}
                    onChange={e => setResetPwConfirm(e.target.value)}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    className={`w-full p-3 pr-10 border rounded-xl bg-white text-slate-900 outline-none focus:ring-2 font-medium text-sm transition-colors ${
                      resetPwConfirm && resetPw !== resetPwConfirm
                        ? 'border-rose-300 focus:ring-rose-400'
                        : 'border-slate-200 focus:ring-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPwConfirm(!showResetPwConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {resetPwConfirm && resetPw !== resetPwConfirm && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">Password tidak cocok</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isActionLoading === 'resetting'}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3.5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isActionLoading === 'resetting'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <KeyRound size={18} />}
                {isActionLoading === 'resetting' ? 'Mereset...' : 'Reset Password Sekarang'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE USER MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftarkan Anggota Baru</h2>
              <button
                onClick={() => { setShowCreateModal(false); setShowCreatePw(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Nama Lengkap</label>
                <input
                  required type="text" placeholder="Contoh: Budi Santoso"
                  autoComplete="name"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Email Kerja</label>
                <input
                  required type="email" placeholder="budi@fibermedia.co.id"
                  autoComplete="username"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              {/* Password — TM-BUG-02: show/hide toggle + TM-UX-03: strength meter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showCreatePw ? 'text' : 'password'}
                    placeholder="Min. 8 karakter"
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full p-3 pr-10 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePw(!showCreatePw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={newUser.password} />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Role Jabatan</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                  defaultValue="CS"
                >
                  <option value="CS">CS (Customer Service)</option>
                  <option value="NOC">NOC</option>
                  <option value="AKTIVATOR">AKTIVATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_DEV">SUPER_DEV</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isActionLoading === 'creating'}
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black mt-4 hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {isActionLoading === 'creating' ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                Daftarkan Sekarang
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Manajemen Tim</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Kelola hak akses team NOC FMI</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {activeTab === 'tim' && (
            <>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Cari personel..."
                  className="pl-12 pr-6 py-3 border border-slate-200 rounded-2xl w-full md:w-80 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-transform active:scale-95"
              >
                <UserPlus size={20} /> Tambah Anggota
              </button>
            </>
          )}
          {activeTab === 'odoo' && (
            <button
              onClick={fetchOdooStatuses}
              disabled={odooLoading}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-2xl font-bold transition-all"
            >
              {odooLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('tim')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'tim' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} /> Data Tim
        </button>
        <button
          onClick={() => setActiveTab('odoo')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'odoo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Link2 size={16} /> Integrasi Odoo
          {odooStats.missing > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {odooStats.missing}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════
          TAB: DATA TIM
      ══════════════════════════════════════ */}
      {activeTab === 'tim' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-slate-500 font-medium">Memuat data tim...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Informasi Personel</th>
                    <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Jabatan</th>
                    <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProfiles.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-all group">
                      {/* Personel info */}
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{user.full_name || 'No Name'}</p>
                            <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role select */}
                      <td className="p-5 text-center">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value as Role)}
                          disabled={isActionLoading === user.id}
                          className={`text-xs font-bold py-1.5 px-3 border rounded-full outline-none cursor-pointer transition-colors ${
                            user.role === 'SUPER_DEV' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            user.role === 'ADMIN'     ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-blue-50 text-blue-600 border-blue-200'
                          }`}
                        >
                          <option value="SUPER_DEV">SUPER_DEV</option>
                          <option value="NOC">NOC</option>
                          <option value="AKTIVATOR">AKTIVATOR</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="CS">CS</option>
                        </select>
                      </td>

                      {/* Actions: reset pw + delete */}
                      <td className="p-5">
                        <div className="flex items-center justify-end gap-1">
                          {/* TM-UX-01: reset password button */}
                          <button
                            onClick={() => {
                              setResetTarget({ id: user.id, name: user.full_name || '', email: user.email });
                              setResetPw('');
                              setResetPwConfirm('');
                              setShowResetPw(false);
                              setShowResetPwConfirm(false);
                            }}
                            disabled={isActionLoading === user.id}
                            className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                            title="Reset Password"
                          >
                            <KeyRound size={16} />
                          </button>

                          {/* TM-BUG-01: sets deleteTarget instead of deleting directly */}
                          <button
                            onClick={() => setDeleteTarget({ id: user.id, email: user.email })}
                            disabled={isActionLoading === user.id}
                            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Hapus User"
                          >
                            {isActionLoading === user.id
                              ? <Loader2 className="animate-spin" size={18} />
                              : <Trash2 size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: INTEGRASI ODOO
      ══════════════════════════════════════ */}
      {activeTab === 'odoo' && (
        <div className="space-y-6">

          {/* Summary cards */}
          {!odooLoading && odooUsers.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{odooStats.connected}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Terhubung</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertCircle className="text-rose-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{odooStats.missing}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Belum Set</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <XCircle className="text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{odooStats.na}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tidak Perlu</p>
                </div>
              </div>
            </div>
          )}

          {/* Filter chips */}
          {odooUsers.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(['all', 'connected', 'missing', 'na'] as OdooFilter[]).map(f => {
                const labels: Record<OdooFilter, string> = {
                  all:       `Semua (${odooUsers.length})`,
                  connected: `✅ Terhubung (${odooStats.connected})`,
                  missing:   `❌ Belum Set (${odooStats.missing})`,
                  na:        `⚪ N/A (${odooStats.na})`,
                };
                return (
                  <button
                    key={f}
                    onClick={() => setOdooFilter(f)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border ${
                      odooFilter === f
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {odooLoading ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-violet-600" size={40} />
                <p className="text-slate-500 font-medium">Memuat status integrasi...</p>
              </div>
            ) : filteredOdoo.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-medium">
                Tidak ada data untuk filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Personel</th>
                      <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Role</th>
                      <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status Odoo</th>
                      <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">UID · Verifikasi</th>
                      <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredOdoo.map((user) => (
                      <tr key={user.id} className="hover:bg-violet-50/20 transition-all group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm group-hover:bg-violet-600 group-hover:text-white transition-all">
                              {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{user.full_name || 'No Name'}</p>
                              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                            user.role === 'SUPER_DEV' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            user.role === 'ADMIN'     ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            user.role === 'NOC'       ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <OdooStatusBadge user={user} />
                        </td>
                        <td className="p-5">
                          {user.odoo ? (
                            <div>
                              <p className="text-xs font-mono font-bold text-slate-600">UID: {user.odoo.odoo_uid ?? '—'}</p>
                              <p className="text-[11px] text-slate-400">{fmtDate(user.odoo.verified_at)}</p>
                            </div>
                          ) : ODOO_ROLES.includes(user.role) ? (
                            <p className="text-[11px] text-rose-400 font-medium">Belum pernah set API Key</p>
                          ) : (
                            <p className="text-[11px] text-slate-300">—</p>
                          )}
                        </td>
                        <td className="p-5 text-right">
                          {user.odoo?.is_active && (
                            <button
                              onClick={() => handleRevokeOdooKey(user.id, user.full_name || user.email)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="Cabut API Key"
                            >
                              <XCircle size={17} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Admin hanya dapat melihat status & mencabut key. User mengatur API Key sendiri di halaman <strong>Profil</strong>.
          </p>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-8 bg-slate-900 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-2 bg-amber-400 rounded-lg"><ShieldCheck size={20} className="text-slate-900" /></div>
          <div>
            <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider italic">Master Control Active</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-2xl">
              Gunakan fitur ini untuk menambah atau menghapus akses tim. Perubahan role akan langsung aktif tanpa perlu login ulang.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5"><Shield size={120} className="text-white" /></div>
      </div>
    </div>
  );
}
