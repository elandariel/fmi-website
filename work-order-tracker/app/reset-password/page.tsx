'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, Radio } from 'lucide-react';
import { toast } from 'sonner';

const YEAR = new Date().getFullYear();

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Lemah',  bar: 'bg-rose-500',    text: 'text-rose-400' };
  if (score <= 3) return { score, label: 'Sedang', bar: 'bg-amber-500',   text: 'text-amber-400' };
  return           { score, label: 'Kuat',  bar: 'bg-emerald-500', text: 'text-emerald-400' };
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const router = useRouter();

  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                 = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [sessionReady, setSessionReady]     = useState(false);

  // Supabase puts the access token in the URL hash on redirect from email link.
  // The browser client picks it up automatically when the page loads.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // No active session — listen for auth state change triggered by hash token
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setSessionReady(true);
          }
        });
        return () => subscription.unsubscribe();
      }
    });
  }, [supabase]);

  const strength = getPasswordStrength(password);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }
    if (strength.score < 2) {
      toast.error('Password terlalu lemah!', { description: 'Gunakan min. 8 karakter dengan huruf besar dan angka.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error('Gagal reset password', { description: error.message });
    } else {
      setDone(true);
      toast.success('Password berhasil direset!');
      setTimeout(() => router.push('/'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#080f1e] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Grid mesh */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#4f8ef7 1px, transparent 1px), linear-gradient(90deg, #4f8ef7 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <Radio size={11} className="text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
          <span className="opacity-40">·</span>
          <span>NOC FMI BizLink</span>
        </div>
        <div className="text-[11px] font-mono text-slate-600">v2.0 · {YEAR}</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md z-10 mt-8">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <img
              src="/FMI.png"
              alt="Logo Fibermedia Indonesia"
              className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Network Operating Center</h1>
          <p className="text-slate-500 mt-1 text-xs font-mono tracking-[0.2em] uppercase">Fiber Media Indonesia</p>
        </div>

        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          <div className="p-8">
            {done ? (
              /* ── SUCCESS STATE ── */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Password Diperbarui!</h2>
                <p className="text-slate-400 text-sm">Mengalihkan ke dashboard...</p>
                <Loader2 size={18} className="animate-spin text-slate-500 mx-auto mt-4" />
              </div>
            ) : !sessionReady ? (
              /* ── WAITING FOR SESSION ── */
              <div className="text-center py-8">
                <Loader2 size={28} className="animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Memverifikasi link reset...</p>
                <p className="text-slate-600 text-xs mt-2">Pastikan kamu membuka link dari email.</p>
              </div>
            ) : (
              /* ── RESET FORM ── */
              <>
                <div className="mb-7">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={20} className="text-emerald-400" />
                    <h2 className="text-xl font-black text-white tracking-tight">Buat Password Baru</h2>
                  </div>
                  <p className="text-slate-400 text-sm">Gunakan kombinasi huruf, angka, dan simbol.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-5">
                  {/* New password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      Password Baru
                    </label>
                    <div className="relative group">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors"
                        size={17}
                      />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 karakter"
                        required
                        autoComplete="new-password"
                        className="w-full pl-10 pr-11 py-3 bg-white/10 text-white rounded-xl border border-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password && (
                      <div className="mt-2">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strength.bar}`}
                            style={{ width: `${Math.round((strength.score / 5) * 100)}%` }}
                          />
                        </div>
                        <p className={`text-[10px] font-bold mt-1 ${strength.text}`}>{strength.label}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      Konfirmasi Password
                    </label>
                    <div className="relative group">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors"
                        size={17}
                      />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password"
                        required
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-11 py-3 bg-white/10 text-white rounded-xl border focus:ring-2 outline-none transition-all placeholder:text-slate-600 text-sm ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-rose-500/50 focus:ring-rose-500/20'
                            : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-[10px] text-rose-400 font-bold mt-1">Password tidak cocok</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> Menyimpan...</>
                    ) : (
                      <><ShieldCheck size={18} /> Simpan Password Baru</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        <p className="text-center text-slate-600 text-[11px] mt-6 font-mono">
          &copy; {YEAR} Fiber Media Indonesia. All rights reserved.
        </p>
      </div>
    </div>
  );
}
