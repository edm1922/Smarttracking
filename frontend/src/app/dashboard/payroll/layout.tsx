'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Database } from 'lucide-react';

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('User');
  const [role, setRole] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem('username') || 'User');
    setRole(localStorage.getItem('role') || '');
  }, []);

  const isAdmin = role === 'payroll_admin' || role === 'admin';
  const isPayslipsPath = pathname === '/dashboard/payroll/my-payslips';
  const isStripsPath = pathname === '/dashboard/payroll/strips';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    sessionStorage.removeItem('devNoticeShown');
    router.push('/');
  };

  if (isStripsPath) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#e2e8f0]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary text-white rounded-xl flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <h1 className="text-base font-black text-gray-900 tracking-tight uppercase">Payslip Management System</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <span className="text-sm font-bold text-gray-900">{username}</span>
            {role === 'payroll_staff' && (
              <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-200">STAFF</span>
            )}
            {role === 'payroll_admin' && (
              <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-200">ADMIN</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8 flex no-print">
        <button
          onClick={() => router.push('/dashboard/payroll')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
            !isPayslipsPath ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-600'
          }`}
        >
          Payroll Hub
        </button>
        <button
          onClick={() => router.push('/dashboard/payroll/my-payslips')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
            isPayslipsPath ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {isAdmin ? 'Manage Payslips' : 'My Payslips'}
        </button>
      </div>

      {/* Page Content */}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}
