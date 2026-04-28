'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Users, Shield, Trash2, Search,
  Loader2, XCircle, ShieldCheck, UserPlus,
  CheckCircle2, Link2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Role } from '@/lib/permissions';
import { toast } from 'sonner';
import { logActivity, getActorName } from '@/lib/logger';

// ─── Role yang butuh integrasi Odoo ───────────────────────────
const ODOO_ROLES = ['SUPER_DEV', 'NOC', 'ADMIN'];

type OdooFilter = 'all' | 'connected' | 'missing' | 'na';

export default function ManageUsersPage() {
  // ── existing state ────────────────────────────────────────
  const [profiles, setProfiles]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [newUser, setNewUser]             = useState({
    email: '', password: '', full_name: '', role: 'CS' as Role,
  });

  // ── tab state ─────────────────────────────────────────────
  const [activeTab, setActiveTab]         = useState<'tim' | 'odoo'>('tim');

  // ── odoo tab state ────────────────────────────────────────
  const [odooUsers, setOdooUsers]         = useState<any[]>([]);
  const [odooLoading, setOdooLoading]     = useState(false);
  const [odooFilter, setOdooFilter]       = useState<OdooFilter>('all');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => { fetchData(); }, []);

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

  // Auto-load Odoo tab on first switch
  useEffect(() => {
    if (activeTab === 'odoo' && odooUsers.length === 0) fetchOdooStatuses();
  }, [activeTab]);

  // ── Create user ───────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading('creating');
    const toastId = toast.loading('Mendaftarkan user baru...');
    try {
      const response = await fetch('/api/admin/manage-team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(newUser),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('User berhasil didaftarkan!', { id: toastId });
        setShowModal(false);
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

  // ── Delete user ───────────────────────────────────────────
  const handleDeleteUser = async (userId: string, email: string) => {
    toast.warning(`Hapus permanen akun ${email}?`, {
      action: {
        label: 'Ya, Hapus',
        onClick: async () => {
          setIsActionLoading(userId);
          const toastId = toast.loading('Menghapus user...');
          try {
            const response = await fetch(`/api/admin/manage-team?id=${userId}`, { method: 'DELETE' });
            const result   = await response.json();
            if (response.ok) {
              toast.success('User berhasil dihapus!', { id: toastId });
              fetchData();
              const actorName = await getActorName(supabase);
              await logActivity({ activity: 'USER_DELETE', subject: email, actor: actorName, detail: `User ID: ${userId}` });
            } else {
              toast.error('Gagal hapus user', { id: toastId, description: result.error });
            }
          } catch {
            toast.error('Koneksi bermasalah', { id: toastId });
          } finally {
            setIsActionLoading(null);
          }
        },
      },
      cancel: { label: 'Batal', onClick: () => {} },
      duration: 8000,
    });
  };

  // ── Update role ───────────────────────────────────────────
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

  // ── Revoke Odoo key (admin action) ────────────────────────
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

  const filteredProfiles = profiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email     || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Odoo tab: derive stats + filtered list ─────────────────
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

  // ── Verified at formatter ─────────────────────────────────
  function fmtDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-8 min-h-screen" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>

      {/* HEADER */}
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
                onClick={() => setShowModal(true)}
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

      {/* TABS */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('tim')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'tim'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} /> Data Tim
        </button>
        <button
          onClick={() => setActiveTab('odoo')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'odoo'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
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

      {/* ── TAB: DATA TIM ──────────────────────────────────── */}
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
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={isActionLoading === user.id}
                          className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Hapus User"
                        >
                          {isActionLoading === user.id
                            ? <Loader2 className="animate-spin" size={18} />
                            : <Trash2 size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: INTEGRASI ODOO ────────────────────────────── */}
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
                        {/* Personel */}
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

                        {/* Role */}
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

                        {/* Status */}
                        <td className="p-5 text-center">
                          <OdooStatusBadge user={user} />
                        </td>

                        {/* UID + verified at */}
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

                        {/* Actions */}
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

          {/* Info footer */}
          <p className="text-[11px] text-slate-400 text-center">
            Admin hanya dapat melihat status & mencabut key. User mengatur API Key sendiri di halaman <strong>Profil</strong>.
          </p>
        </div>
      )}

      {/* MODAL TAMBAH USER */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftarkan Anggota Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Nama Lengkap</label>
                <input required type="text" placeholder="Contoh: Budi Santoso"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Email Kerja</label>
                <input required type="email" placeholder="budi@fibermedia.co.id"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Password</label>
                <input required type="password" placeholder="Min. 6 Karakter" minLength={6}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Role Jabatan</label>
                <select className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })} defaultValue="CS">
                  <option value="CS">CS (Customer Service)</option>
                  <option value="NOC">NOC</option>
                  <option value="AKTIVATOR">AKTIVATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_DEV">SUPER_DEV</option>
                </select>
              </div>
              <button type="submit" disabled={isActionLoading === 'creating'}
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black mt-4 hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50">
                {isActionLoading === 'creating' ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                Daftarkan Sekarang
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
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
