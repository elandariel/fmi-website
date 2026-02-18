'use client';

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
  ShieldCheck, ShieldAlert, X, MoonStar, Sparkles 
} from 'lucide-react';

import GlobalBroadcast from '@/components/GlobalBroadcast';
import { Toaster } from 'sonner';

// --- SIDEBAR ITEM ---
function SidebarItem({ href, icon, label, show = true, onClick, isRamadhan }: { href: string, icon: any, label: string, show?: boolean, onClick?: () => void, isRamadhan: boolean }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!show) return null;

  return (
    <Link href={href} onClick={onClick}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm mb-1 ${
        isActive 
          ? isRamadhan 
            ? 'bg-gradient-to-r from-emerald-800 to-emerald-600 text-amber-300 border-l-4 border-amber-500 shadow-lg shadow-emerald-900/40' 
            : 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}>
        <span className={isActive && isRamadhan ? 'text-amber-400' : ''}>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}

// --- ORNAMEN LENTERA GANTUNG ---
const Lantern = () => (
  <div className="absolute top-0 right-4 hidden md:block z-20 pointer-events-none animate-sway">
    <div className="w-[1.5px] h-12 bg-amber-600 mx-auto"></div>
    <div className="w-6 h-9 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-full rounded-t-lg relative shadow-[0_0_20px_rgba(217,119,6,0.5)] border border-amber-300">
      <div className="absolute inset-1.5 bg-amber-200 opacity-40 rounded-full animate-pulse"></div>
    </div>
  </div>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // --- 🌙 SAKLAR TEMA RAMADHAN ---
  const isRamadhan = true; 

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (loading) return true;
    if (isLoginPage) return true;
    if (pathname.startsWith('/broadcast')) return hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS);
    if (pathname.startsWith('/manage-users')) return hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS);
    return true;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); 
    router.refresh(); 
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={`
        ${isRamadhan ? 'ramadhan-mode' : ''} 
        ${isLoginPage ? 'bg-slate-900' : 'bg-slate-50'} 
        min-h-screen font-sans ${isLoginPage ? '' : 'flex overflow-hidden'}
      `}>
        
        <Toaster richColors position="top-center" />
        <GlobalBroadcast />
        
        {isLoginPage ? (
          <main className="w-full h-full">{children}</main>
        ) : (
          <>
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden"
                onClick={toggleSidebar}
              />
            )}

            {/* SIDEBAR */}
            <aside className={`
              fixed md:relative z-[60] h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 border-r border-slate-800 overflow-y-auto overflow-x-hidden
              ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}
            `}>
              
              {/* HEADER SIDEBAR DENGAN LENTERA */}
              <div className="p-6 flex items-center justify-between border-b border-slate-800 h-[73px] shrink-0 relative">
                  <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity z-10">
                    <div className="relative">
                      <Image 
                        src="/logo-fmi.jpg"
                        alt="Logo FMI"
                        width={40} 
                        height={40}
                        className={`rounded-full object-cover shrink-0 border-2 transition-all duration-700 ${isRamadhan ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-blue-500/50'}`}
                      />
                      {isRamadhan && (
                        <Sparkles size={12} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                      )}
                    </div>
                    
                    {sidebarOpen && (
                      <div className="animate-in fade-in duration-300">
                        <h1 className="font-black text-lg tracking-tight whitespace-nowrap leading-none text-white italic">
                          NOC <span className={isRamadhan ? 'gold-glow' : 'text-blue-500'}>FMI</span>
                        </h1>
                        <p className={`text-[9px] uppercase font-bold tracking-[0.15em] mt-1 ${isRamadhan ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isRamadhan ? 'Ramadhan Kareem ✨' : 'ISP Management'}
                        </p>
                      </div>
                    )}
                  </Link>

                  {isRamadhan && sidebarOpen && <Lantern />}

                  {sidebarOpen && (
                    <button onClick={toggleSidebar} className="md:hidden text-slate-400 p-1">
                      <X size={20} />
                    </button>
                  )}
              </div>

              {/* NAVIGASI */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
                {/* Dekorasi Bintang Kecil di Sidebar */}
                {isRamadhan && sidebarOpen && (
                  <div className="absolute top-10 right-10 opacity-10 pointer-events-none">
                    <Sparkles size={40} className="text-amber-500 rotate-12" />
                  </div>
                )}

                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-2 tracking-widest truncate ${!sidebarOpen && 'md:hidden'}`}>Main Menu</p>
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/clients" icon={<Users size={20} />} label="Data Client" />
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/work-orders" icon={<ClipboardList size={20} />} label="Monthly Report" />
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/tracker" icon={<LineChart size={20} />} label="Weekly Report" />
                
                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest truncate ${!sidebarOpen && 'md:hidden'}`}>Analytics & Master</p>
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/vlan" icon={<Server size={20} />} label="VLAN Database" />
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/logs" icon={<History size={20} />} label="Activity Log" />
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/tools" icon={<Wrench size={20} />} label="Tools & Utilities" />
                
                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest truncate ${!sidebarOpen && 'md:hidden'}`}>Access Control</p>
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/broadcast" icon={<Megaphone size={20} />} label="Broadcast Message" show={hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS)} /> 
                <SidebarItem isRamadhan={isRamadhan} onClick={closeSidebarOnMobile} href="/manage-users" icon={<ShieldCheck size={20} className={isRamadhan ? 'text-amber-400 animate-pulse' : 'text-amber-400'} />} label="Team Management" show={hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS)} /> 
              </nav>

              {/* PROFILE SECTION */}
              <div className={`p-4 border-t border-slate-800 transition-colors duration-500 ${isRamadhan ? 'bg-emerald-950/30' : 'bg-slate-900/50'} relative overflow-hidden`}>
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <Link href="/profile" onClick={closeSidebarOnMobile} className="flex items-center gap-3 overflow-hidden group flex-1 p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr transition-all duration-700 ${isRamadhan ? 'from-emerald-600 to-amber-500 border-amber-500' : 'from-blue-600 to-blue-400 border-slate-700'} flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 shadow-sm`}>
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && (
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{userProfile.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isRamadhan ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${isRamadhan ? 'text-emerald-400' : 'text-slate-400'}`}>{userProfile.role || 'Checking...'}</p>
                        </div>
                      </div>
                    )}
                  </Link>
                  {sidebarOpen && (
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
                      <LogOut size={18} />
                    </button>
                  )}
                </div>
                {isRamadhan && sidebarOpen && (
                  <p className="text-[7px] text-amber-500/50 text-center mt-3 font-bold tracking-[0.4em] uppercase animate-pulse">
                     🌙 Berkah Ramadhan 🌙
                  </p>
                )}
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
              <div className="md:hidden absolute top-[18px] left-4 z-[50]">
                <button onClick={toggleSidebar} className="p-2 bg-white rounded-lg shadow-md text-slate-600 border border-slate-200">
                  <Menu size={20} />
                </button>
              </div>

              <Header />

              <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {/* DEKORASI BACKGROUND KANAN ATAS (Moon & Star) */}
                {isRamadhan && (
                   <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none rotate-12 transition-all">
                      <MoonStar size={300} className="text-emerald-900" />
                   </div>
                )}

                {/* DEKORASI KIRI BAWAH (Islamic Pattern) */}
                {isRamadhan && (
                   <div className="fixed bottom-0 left-0 p-4 opacity-5 pointer-events-none">
                      <Sparkles size={100} className="text-emerald-800" />
                   </div>
                )}
                
                {!loading && !canAccessPage() ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10 relative z-10">
                    <ShieldAlert size={64} className="text-rose-500 mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900">Akses Dibatasi</h1>
                    <p className="text-slate-500 max-w-md mt-2">Maaf, role <strong>{userProfile.role}</strong> tidak diizinkan mengakses area ini.</p>
                    <Link href="/" className={`mt-6 px-6 py-2 rounded-lg font-bold shadow-lg text-white transition-all ${isRamadhan ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-600'}`}>Kembali ke Dashboard</Link>
                  </div>
                ) : (
                  <div className="relative z-10 p-1 md:p-0">
                    {children}
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </body>
    </html>
  );
}