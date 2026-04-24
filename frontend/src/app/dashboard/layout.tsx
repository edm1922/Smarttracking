'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Package, Printer, User, Box, Settings, MapPin, FileText, QrCode, ClipboardList, Database, Activity } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    setUsername(localStorage.getItem('username') || 'User');
    setRole(localStorage.getItem('role') || 'viewer');
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    router.push('/');
  };

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

  const staffItems = [
    { name: 'My Inventory', href: '/dashboard/staff/inventory', icon: Database },
    { name: 'Pull Requests', href: '/dashboard/products/requests', icon: ClipboardList },
  ];

  /* const settingsItems = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]; */

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white no-print">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-primary">Smart Tracking</span>
        </div>
        <nav className="space-y-6 p-4">
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Inventory System</p>
            <div className="space-y-1">
              {inventoryItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                const isSubItemActive = (href: string) => pathname === href;

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
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Staff Workspace</p>
            <div className="space-y-1">
              {staffItems.map((item: any) => {
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
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4">
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
    </div>
  );
}
