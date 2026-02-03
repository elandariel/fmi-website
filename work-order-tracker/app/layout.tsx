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
  ShieldCheck, ShieldAlert 
} from 'lucide-react';

// --- 1. IMPORT GLOBAL BROADCAST ---
import GlobalBroadcast from '@/components/GlobalBroadcast';

// --- 2. IMPORT TOASTER (SONNER) ---
import { Toaster } from 'sonner';

// --- KOMPONEN SIDEBAR ITEM ---
function SidebarItem({ href, icon, label, show = true }: { href: string, icon: any, label: string, show?: boolean }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!show) return null;

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm mb-1 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}>
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
    if (loading) return true;
    if (isLoginPage) return true;
    if (pathname.startsWith('/broadcast')) {
      return hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS);
    }
    if (pathname.startsWith('/manage-users')) {
      return hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS);
    }
    return true;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); 
    router.refresh(); 
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={`${isLoginPage ? 'bg-slate-900' : 'bg-slate-50'} min-h-screen font-sans ${isLoginPage ? '' : 'flex overflow-hidden'}`}>
        
        <Toaster richColors position="top-center" />
        <GlobalBroadcast />
        
        {isLoginPage ? (
          <main className="w-full h-full">{children}</main>
        ) : (
          <>
            {/* SIDEBAR */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 h-screen overflow-y-auto border-r border-slate-800 relative z-50`}>
              
              {/* HEADER SIDEBAR */}
              <div className="p-6 flex items-center gap-3 border-b border-slate-800 h-[73px]">
                  <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Image 
                      src="/logo-fmi.jpg"
                      alt="Logo FMI"
                      width={50} 
                      height={50}
                      className="rounded-full object-cover"
                    />
                    
                    {sidebarOpen && (
                      <div className="animate-in fade-in duration-200">
                        <h1 className="font-black text-lg tracking-tight whitespace-nowrap leading-none text-white">
                          NOC <span className="text-blue-500">FMI</span>
                        </h1>
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                          Together We Achieve More
                        </p>
                      </div>
                    )}
                  </Link>
                </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-2 tracking-widest truncate">Main Menu</p>
                <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                <SidebarItem href="/clients" icon={<Users size={20} />} label="Data Client" />
                <SidebarItem href="/work-orders" icon={<ClipboardList size={20} />} label="Monthly Report" />
                <SidebarItem href="/tracker" icon={<LineChart size={20} />} label="Weekly Report" />
                
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest truncate">Analytics & Master</p>
                <SidebarItem href="/vlan" icon={<Server size={20} />} label="VLAN Database" />
                <SidebarItem href="/logs" icon={<History size={20} />} label="Activity Log" />
                <SidebarItem href="/tools" icon={<Wrench size={20} />} label="Tools & Utilities" />
                
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest truncate">Access Control</p>
                <SidebarItem 
                  href="/broadcast" 
                  icon={<Megaphone size={20} />} 
                  label="Broadcast Message" 
                  show={hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS)}
                /> 
                <SidebarItem 
                  href="/manage-users" 
                  icon={<ShieldCheck size={20} className="text-amber-400" />} 
                  label="Team Management" 
                  show={hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS)}
                /> 
              </nav>

              {/* PROFILE SECTION */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between gap-2">
                  <Link href="/profile" className="flex items-center gap-3 overflow-hidden group flex-1 p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-slate-700 shadow-sm">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && (
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{userProfile.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{userProfile.role || 'Checking...'}</p>
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
              </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
              <Header />
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {!loading && !canAccessPage() ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10">
                    <ShieldAlert size={64} className="text-rose-500 mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900">Akses Dibatasi</h1>
                    <p className="text-slate-500 max-w-md mt-2">Maaf, role <strong>{userProfile.role}</strong> tidak diizinkan mengakses area ini.</p>
                    <Link href="/" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg">Kembali ke Dashboard</Link>
                  </div>
                ) : (
                  children
                )}
              </div>
            </main>
          </>
        )}
      </body>
    </html>
  );
}