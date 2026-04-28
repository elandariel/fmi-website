'use client';

import { useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  Lock, Mail, Eye, EyeOff, Loader2,
  ArrowLeft, Send, CheckCircle2, Radio,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
// LOGIN-BUG-01: dynamic year
const YEAR = new Date().getFullYear();

type Mode = 'login' | 'forgot' | 'forgot-sent';

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function LoginPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');

  // Login form
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPw]   = useState(false);
  const [loading, setLoading]       = useState(false);

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');

  // ────────────────────────────────
  // Login handler
  // ────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Memverifikasi akun...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error('Login Gagal!', {
        id: toastId,
        description: error.message === 'Invalid login credentials'
          ? 'Email atau Password salah.'
          : error.message,
      });
    } else {
      toast.success('Login Berhasil', {
        id: toastId,
        description: 'Selamat datang kembali di Dashboard NOC.',
      });
      router.push('/');
      router.refresh();
    }
  };

  // ────────────────────────────────
  // Forgot password handler — LOGIN-BUG-02
  // ────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error('Gagal mengirim email', { description: error.message });
    } else {
      setMode('forgot-sent');
    }
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080f1e] flex items-center justify-center p-4 relative overflow-hidden select-none">

      {/* ── Ambient background glows ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30%] h-[30%] bg-violet-600/8 rounded-full blur-[100px]" />
      </div>

      {/* ── Grid mesh overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#4f8ef7 1px, transparent 1px), linear-gradient(90deg, #4f8ef7 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── NOC status bar (top) ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <Radio size={11} className="text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
          <span className="opacity-40">·</span>
          <span>NOC FMI BizLink</span>
        </div>
        <div className="text-[11px] font-mono text-slate-600">
          v2.0 · {YEAR}
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="w-full max-w-md z-10 mt-8">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl scale-110" />
              <img
                src="/FMI.png"
                alt="Logo Fibermedia Indonesia"
                className="relative h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Network Operating Center
          </h1>
          <p className="text-slate-500 mt-1 text-xs font-mono tracking-[0.2em] uppercase">
            Fiber Media Indonesia
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* Card header stripe */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

          <div className="p-8">

            {/* ══ MODE: LOGIN ══ */}
            {mode === 'login' && (
              <>
                <div className="mb-7">
                  <h2 className="text-xl font-black text-white tracking-tight">Masuk ke Sistem</h2>
                  <p className="text-slate-400 text-sm mt-1">Gunakan kredensial akun NOC kamu.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"
                        size={17}
                      />
                      <input
                        type="email"
                        placeholder="nama@fibermedia.co.id"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-3 bg-white/10 text-white rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Password
                      </label>
                      {/* LOGIN-BUG-02: forgot password link */}
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setForgotEmail(email); }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        Lupa password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"
                        size={17}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full pl-10 pr-11 py-3 bg-white/10 text-white rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> Memverifikasi...</>
                    ) : (
                      'SIGN IN'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ══ MODE: FORGOT PASSWORD ══ */}
            {mode === 'forgot' && (
              <>
                <div className="mb-7">
                  <button
                    onClick={() => setMode('login')}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-4 transition-colors"
                  >
                    <ArrowLeft size={14} /> Kembali ke Login
                  </button>
                  <h2 className="text-xl font-black text-white tracking-tight">Reset Password</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Masukkan email akunmu. Link reset akan dikirim ke inbox.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      Email Terdaftar
                    </label>
                    <div className="relative group">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"
                        size={17}
                      />
                      <input
                        type="email"
                        placeholder="nama@fibermedia.co.id"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-white/10 text-white rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> Mengirim...</>
                    ) : (
                      <><Send size={16} /> Kirim Link Reset</>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ══ MODE: FORGOT SENT ══ */}
            {mode === 'forgot-sent' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Email Terkirim!</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-1">
                  Link reset password telah dikirim ke:
                </p>
                <p className="text-blue-400 font-mono font-bold text-sm mb-6 break-all">
                  {forgotEmail}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  Cek inbox atau folder spam. Link akan kadaluarsa dalam 1 jam.
                </p>
                <button
                  onClick={() => { setMode('login'); setForgotEmail(''); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-semibold transition-colors mx-auto"
                >
                  <ArrowLeft size={14} /> Kembali ke Login
                </button>
              </div>
            )}
          </div>

          {/* Card footer stripe */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-[11px] mt-6 font-mono">
          &copy; {YEAR} Fiber Media Indonesia. All rights reserved.
        </p>
      </div>
    </div>
  );
}
