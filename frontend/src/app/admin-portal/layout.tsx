'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  LogOut, 
  LayoutDashboard, 
  Menu, 
  X, 
  Monitor,
  Settings,
  Bell
} from 'lucide-react';
import api from '@/lib/api';

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (!token) {
      router.push('/');
      return;
    }
    if (role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    setUser({ username, role });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    { name: 'System Analytics', href: '/admin-portal/analytics', icon: Activity },
    { name: 'User Management', href: '/admin-portal/users', icon: Users },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#1e293b] border-r border-slate-700/50 transition-all duration-300 flex flex-col fixed h-full z-50`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SYSTEM ADMIN
            </span>
          )}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'group-hover:scale-110 transition-transform'}`} />
                {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all group"
          >
            <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-medium text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-16 bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-8 sticky top-0 z-40">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">System Status: Optimal</span>
            </div>
            
            <div className="flex items-center gap-4 border-l border-slate-700/50 pl-6">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-200">{user.username}</p>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{user.role}</p>
               </div>
               <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 border border-white/10">
                  {user.username.charAt(0).toUpperCase()}
               </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
