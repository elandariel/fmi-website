'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Loader2, Moon, Sparkles, Stars } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Memverifikasi akun di malam yang berkah...');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error('Login Gagal!', {
        id: toastId,
        description: error.message === 'Invalid login credentials' ? 'Email atau Password salah.' : error.message
      });
    } else {
      toast.success('Selamat Datang!', {
        id: toastId,
        description: 'Berhasil masuk ke Dashboard NOC.'
      });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#020c09] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor - Ramadhan Vibes */}
      <div className="absolute top-[-10%] right-[-5%] opacity-10 pointer-events-none">
        <Moon size={400} className="text-emerald-500 rotate-12" />
      </div>
      <div className="absolute bottom-[-5%] left-[-5%] opacity-10 pointer-events-none rotate-180">
        <Sparkles size={300} className="text-emerald-500" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-emerald-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img 
                src="/FMI.png" 
                alt="Logo" 
                className="relative h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
             <Stars size={12}/> Ramadhan Edition
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            NOC <span className="text-emerald-500">GATEWAY</span>
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto mt-2 opacity-50"></div>
        </div>

        {/* Card Login */}
        <div className="bg-[#041a14]/80 backdrop-blur-2xl border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Input Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-700 uppercase ml-1 tracking-[0.2em] italic">Access Key (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-900 group-focus-within:text-emerald-400 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="operator@fmi.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-[#020c09] text-emerald-100 rounded-2xl border border-emerald-900/50 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-emerald-900 font-bold text-sm"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-700 uppercase ml-1 tracking-[0.2em] italic">Secret Token (Password)</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-900 group-focus-within:text-emerald-400 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-[#020c09] text-emerald-100 rounded-2xl border border-emerald-900/50 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-emerald-900 font-bold text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-900 hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:opacity-50 text-[#020c09] rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-3 active:scale-[0.97] mt-8"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  MEMVERIFIKASI...
                </>
              ) : (
                <>MASUK KE SISTEM</>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
            <p className="text-emerald-900 text-[10px] font-black uppercase tracking-[0.3em] italic">
              &copy; 2026 FIBER MEDIA INDONESIA
            </p>
            <p className="text-emerald-950 text-[9px] mt-1 font-bold">
              Operational Intelligence & Security
            </p>
        </div>
      </div>
    </div>
  );
}