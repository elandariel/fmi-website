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
  ShieldCheck, ShieldAlert, X 
} from 'lucide-react';

import GlobalBroadcast from '@/components/GlobalBroadcast';
import { Toaster } from 'sonner';

// --- KOMPONEN SIDEBAR ITEM (Update: Auto close on mobile click) ---
function SidebarItem({ href, icon, label, show = true, onClick }: { href: string, icon: any, label: string, show?: boolean, onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!show) return null;

  return (
    <Link href={href} onClick={onClick}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-1 ${
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default false untuk mobile
  const [userProfile, setUserProfile] = useState<{name: string, role: Role | null}>({ name: 'Loading...', role: null });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); 
  const isLoginPage = pathname === '/login';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Responsive logic: Close sidebar on mobile by default, open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize(); // Set awal
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={`${isLoginPage ? 'bg-slate-900' : 'bg-slate-50'} min-h-screen font-sans overflow-hidden`}>
        
        <Toaster richColors position="top-center" />
        <GlobalBroadcast />
        
        {isLoginPage ? (
          <main className="w-full h-full">{children}</main>
        ) : (
          <div className="flex h-screen overflow-hidden">
            
            {/* OVERLAY UNTUK MOBILE */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
                onClick={toggleSidebar}
              />
            )}

            {/* SIDEBAR */}
            <aside className={`
              fixed md:relative z-[70] h-full
              ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
              bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 border-r border-slate-800
            `}>
              
              {/* LOGO SECTION */}
              <div className="p-4 flex items-center justify-between border-b border-slate-800 h-[73px]">
                <div className="flex items-center gap-3">
                  <Image src="/logo-fmi.jpg" alt="Logo" width={40} height={40} className="rounded-full shrink-0" />
                  {sidebarOpen && (
                    <div className="animate-in fade-in">
                      <h1 className="font-black text-white leading-none">NOC <span className="text-blue-500">FMI</span></h1>
                    </div>
                  )}
                </div>
                {/* Close button for mobile */}
                <button onClick={toggleSidebar} className="md:hidden p-1 text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {/* NAVIGATION */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest ${!sidebarOpen && 'md:hidden'}`}>Main Menu</p>
                <SidebarItem onClick={closeSidebarOnMobile} href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                <SidebarItem onClick={closeSidebarOnMobile} href="/clients" icon={<Users size={20} />} label="Data Client" />
                <SidebarItem onClick={closeSidebarOnMobile} href="/work-orders" icon={<ClipboardList size={20} />} label="Monthly Report" />
                <SidebarItem onClick={closeSidebarOnMobile} href="/tracker" icon={<LineChart size={20} />} label="Weekly Report" />
                
                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest ${!sidebarOpen && 'md:hidden'}`}>Analytics</p>
                <SidebarItem onClick={closeSidebarOnMobile} href="/vlan" icon={<Server size={20} />} label="VLAN" />
                <SidebarItem onClick={closeSidebarOnMobile} href="/logs" icon={<History size={20} />} label="Logs" />
                
                <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 mt-6 tracking-widest ${!sidebarOpen && 'md:hidden'}`}>System</p>
                <SidebarItem onClick={closeSidebarOnMobile} href="/broadcast" icon={<Megaphone size={20} />} label="Broadcast" show={hasAccess(userProfile.role, PERMISSIONS.BROADCAST_ACCESS)} />
                <SidebarItem onClick={closeSidebarOnMobile} href="/manage-users" icon={<ShieldCheck size={20} />} label="Team" show={hasAccess(userProfile.role, PERMISSIONS.MANAGE_USERS)} />
              </nav>

              {/* PROFILE SECTION */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold border border-slate-700">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{userProfile.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black">{userProfile.role}</p>
                    </div>
                  )}
                  {sidebarOpen && (
                    <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors">
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative h-screen">
              {/* Header with hamburger for mobile */}
              <div className="md:hidden absolute top-4 left-4 z-[55]">
                <button onClick={toggleSidebar} className="p-2 bg-white rounded-lg shadow-md text-slate-600">
                  <Menu size={20} />
                </button>
              </div>
              
              <Header />
              
              <div className="flex-1 overflow-y-auto p-0 relative">
                {!loading && !canAccessPage() ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <ShieldAlert size={48} className="text-rose-500 mb-4" />
                    <h1 className="text-xl font-bold">Akses Dibatasi</h1>
                    <Link href="/" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg">Kembali</Link>
                  </div>
                ) : (
                  children
                )}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}