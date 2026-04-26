'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Package, Printer, User, Box, Settings, MapPin, FileText, QrCode, ClipboardList, Database, Activity, Users, Info, X } from 'lucide-react';
import AdminNotifications from './AdminNotifications';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [showDevNotice, setShowDevNotice] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    const storedRole = localStorage.getItem('role') || 'viewer';
    setUsername(localStorage.getItem('username') || 'User');
    setRole(storedRole);

    // Show dev notice for staff members once per session
    const isStaffUser = storedRole === 'inventory' || storedRole !== 'admin';
    if (isStaffUser && !sessionStorage.getItem('devNoticeShown')) {
      setShowDevNotice(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    sessionStorage.removeItem('devNoticeShown');
    router.push('/');
  };

  const closeDevNotice = () => {
    setShowDevNotice(false);
    sessionStorage.setItem('devNoticeShown', 'true');
  };

  const isStaff = role === 'inventory' || role !== 'admin';

  const staffItems = [
    { 
      name: 'Staff Requisition', 
      href: '/dashboard/staff/requisition', 
      icon: ClipboardList,
      subItems: [
        { name: 'New Requisition', href: '/dashboard/staff/requisition' },
        { name: 'Pending Status', href: '/dashboard/staff/requisition/pending' }
      ]
    },
    { 
      name: 'Unit Requisition (QR)', 
      href: '/dashboard/staff/unit-requisition', 
      icon: QrCode,
      subItems: [
        { name: 'Create Request', href: '/dashboard/staff/unit-requisition?tab=create' },
        { name: 'Pending Status', href: '/dashboard/staff/unit-requisition?tab=history' },
        { name: 'My Inventory', href: '/dashboard/staff/unit-requisition?tab=inventory' },
        { name: 'Employee Releasing', href: '/dashboard/staff/unit-requisition?tab=releasing' }
      ]
    },
  ];

  const inventoryItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Stocks', 
      href: '/dashboard/products', 
      icon: Box,
      subItems: [
        { name: 'Inventory', href: '/dashboard/products' },
        { name: 'Issuance Requests', href: '/dashboard/products/requests' },
        { name: 'Unit Tracking', href: '/dashboard/unit-tracking' },
      ]
    },
    { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
    { 
      name: 'Transmittal', 
      href: '/dashboard/transmittal', 
      icon: FileText,
      subItems: [
        { name: 'Stock Transmittal', href: '/dashboard/transmittal/product' },
        { name: 'PR Transmittal', href: '/dashboard/transmittal/purchase-request' },
        { name: 'Unit Tracking Log', href: '/dashboard/transmittal/unit-tracking-log' },
      ]
    },
  ];

  const qrSystemItems = [
    { name: 'Generate QR', href: '/dashboard/items', icon: QrCode },
    { name: 'Storage', href: '/dashboard/storage', icon: Database },
    { name: 'Custom Fields', href: '/dashboard/custom-fields', icon: Package },
    { name: 'Print Labels', href: '/dashboard/print', icon: Printer },
    { name: 'Accounts', href: '/dashboard/users', icon: User, adminOnly: true },
  ];

  const staffAreaItems = [
    { 
      name: 'Staff Inventory', 
      href: '/dashboard/staff-area', 
      icon: Users,
      subItems: [
        { name: 'Inventory Summary', href: '/dashboard/staff-area?tab=summary' },
        { name: 'Staff Activities', href: '/dashboard/staff-area?tab=activities' },
      ]
    },
  ];

  /* const settingsItems = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]; */

  return (
    <div className="flex min-h-screen bg-[#e2e8f0]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white no-print flex flex-col z-[40]">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 shrink-0 justify-between">
          <span className="text-xl font-bold text-primary">Smart Tracking</span>
          {!isStaff && <AdminNotifications />}
        </div>
        <nav className="flex-1 space-y-6 p-4 overflow-y-auto custom-scrollbar">
          {!isStaff ? (
            <>
              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Inventory System</p>
                <div className="space-y-1">
                  {inventoryItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard' || (item.href === '/dashboard' && pathname === '/dashboard');
                    const isSubItemActive = (href: string) => {
                      if (href.includes('?')) {
                        const [path, query] = href.split('?');
                        const tabValue = new URLSearchParams(query).get('tab');
                        return pathname === path && currentTab === tabValue;
                      }
                      return pathname === href;
                    };

                    return (
                      <div key={item.name} className="space-y-1">
                        <Link
                          href={item.href}
                          className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                        {item.subItems && isActive && (
                          <div className="ml-8 space-y-1 mt-1">
                            {item.subItems.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                  isSubItemActive(subItem.href)
                                    ? 'text-primary bg-primary/5'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">QR Form System</p>
                <div className="space-y-1">
                  {qrSystemItems.map((item: any) => {
                    if (item.adminOnly && role !== 'admin') return null;
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Staff Area</p>
                <div className="space-y-1">
                  {staffAreaItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    const isSubItemActive = (href: string) => {
                      if (href.includes('?')) {
                        const [path, query] = href.split('?');
                        const tabValue = new URLSearchParams(query).get('tab');
                        return pathname === path && currentTab === tabValue;
                      }
                      return pathname === href;
                    };

                    return (
                      <div key={item.name} className="space-y-1">
                        <Link
                          href={item.href}
                          className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                        {item.subItems && isActive && (
                          <div className="ml-8 space-y-1 mt-1">
                            {item.subItems.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                  isSubItemActive(subItem.href)
                                    ? 'text-primary bg-primary/5'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Staff Workspace</p>
              <div className="space-y-1">
                {staffItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  const isSubItemActive = (href: string) => {
                    if (href.includes('?')) {
                      const [path, query] = href.split('?');
                      const tabValue = new URLSearchParams(query).get('tab');
                      return pathname === path && currentTab === tabValue;
                    }
                    return pathname === href;
                  };
                  return (
                    <div key={item.name} className="space-y-1">
                      <Link
                        href={item.href}
                        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive && !item.subItems
                            ? 'bg-primary text-white'
                            : isActive && item.subItems
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                      {item.subItems && isActive && (
                        <div className="ml-8 space-y-1 mt-1">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                isSubItemActive(subItem.href)
                                  ? 'text-primary bg-primary/5'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* <div>
            <div className="space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div> */}
        </nav>
        <div className="shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{username}</p>
              <p className="text-xs text-gray-500 capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>

      {/* Dev Notice Modal */}
      {showDevNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-8 border border-blue-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Info className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">System Notice</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Important Information</p>
                </div>
              </div>
              <button 
                onClick={closeDevNotice}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-600 leading-relaxed text-sm font-medium">
                Welcome to your Staff Portal! Please note that the <strong>Smart Tracking System</strong> is currently <span className="text-blue-600 font-black">under active development</span>.
              </p>
              <p className="text-gray-500 leading-relaxed text-xs">
                Some features may be incomplete, and you might experience occasional changes to the interface. If you encounter any bugs or have suggestions, please reach out to the administrator.
              </p>
            </div>
            
            <button 
              onClick={closeDevNotice}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg shadow-primary/20"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading application...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
