// app/layout.tsx
'use client';

import { Plus_Jakarta_Sans } from 'next/font/google'; // 1. IMPORT FONT
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header'; 
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';
import { 
  LayoutDashboard, Users, Activity, LineChart, Server, 
  History, Menu, LogOut, ClipboardList, Wrench, Megaphone,
  ShieldCheck, ShieldAlert 
} from 'lucide-react';
import GlobalBroadcast from '@/components/GlobalBroadcast';
import { Toaster } from 'sonner';

// Inisialisasi Font
const jakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

function SidebarItem({ href, icon, label, show = true }: { href: string, icon: any, label: string, show?: boolean }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!show) return null;

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm mb-1 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      }`}>
        <span className={isActive ? 'text-white' : 'text-slate-500'}>{icon}</span>
        <span className="tracking-tight">{label}</span>
      </div>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ... (Logic state & useEffect lu tetep sama)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<{name: string, role: Role | null}>({ name: 'Loading...', role: null });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); 
  const isLoginPage = pathname === '/login';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        
        if(profile) {
          setUserProfile({ 
            name: profile.full_name || user.email?.split('@')[0] || 'User', 
            role: profile.role as Role 
          });
        }
      } else if (!isLoginPage) {
        router.push('/login');
      }
      setLoading(false);
    }
    loadUser();
  }, [pathname, isLoginPage, router]);

  const canAccessPage = () => {
    if (loading || isLoginPage) return true;
    if (pathname.startsWith('/broadcast')) return hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS);
    if (pathname.startsWith('/manage-users')) return hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS);
    return true;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); 
    router.refresh(); 
  };

  return (
    <html lang="en">
      {/* 2. TERAPKAN FONT & ANTIALIASED */}
      <body suppressHydrationWarning className={`${jakartaSans.className} antialiased ${isLoginPage ? 'bg-slate-900' : 'bg-slate-50 text-slate-900'}`}>
        <Toaster richColors position="top-center" />
        <GlobalBroadcast />
        
        {isLoginPage ? (
          <main className="w-full h-full">{children}</main>
        ) : (
          <div className="flex h-screen overflow-hidden">
            {/* SIDEBAR */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-950 text-white transition-all duration-300 flex flex-col border-r border-slate-800 relative z-50`}>
              <div className="p-6 flex items-center gap-3 border-b border-slate-800 h-[73px]">
                <Image src="/logo-fmi.jpg" alt="Logo" width={32} height={32} className="rounded-lg shadow-inner" />
                {sidebarOpen && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <h1 className="font-extrabold text-base tracking-tight leading-none">NOC <span className="text-blue-500">FMI</span></h1>
                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Achieve More</p>
                  </div>
                )}
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <p className="px-4 text-[10px] font-bold text-slate-600 uppercase mb-3 mt-2 tracking-[0.2em]">Main Menu</p>
                <SidebarItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                <SidebarItem href="/clients" icon={<Users size={18} />} label="Data Client" />
                <SidebarItem href="/work-orders" icon={<ClipboardList size={18} />} label="Monthly Report" />
                <SidebarItem href="/tracker" icon={<LineChart size={18} />} label="Weekly Report" />
                
                <p className="px-4 text-[10px] font-bold text-slate-600 uppercase mb-3 mt-6 tracking-[0.2em]">Analytics</p>
                <SidebarItem href="/vlan" icon={<Server size={18} />} label="VLAN Database" />
                <SidebarItem href="/logs" icon={<History size={18} />} label="Activity Log" />
                <SidebarItem href="/tools" icon={<Wrench size={18} />} label="Tools" />
              </nav>

              {/* PROFILE SECTION */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-lg shadow-blue-500/20">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && (
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{userProfile.name}</p>
                        <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">{userProfile.role}</p>
                      </div>
                    )}
                  </div>
                  {sidebarOpen && (
                    <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
              <Header />
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {!loading && !canAccessPage() ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <ShieldAlert size={48} className="text-rose-500 mb-4" />
                    <h2 className="text-xl font-bold">Akses Terbatas</h2>
                    <Link href="/" className="mt-4 text-blue-500 font-bold text-sm">Kembali</Link>
                  </div>
                ) : children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}