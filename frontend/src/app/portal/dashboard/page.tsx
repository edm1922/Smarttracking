'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/payroll/supabase';
import { 
  Download, 
  FileText, 
  Calendar, 
  Wallet, 
  LogOut, 
  ChevronRight,
  TrendingUp,
  Clock,
  User as UserIcon,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generatePayslipPDF } from '@/lib/payroll/generatePayslipPDF';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const storedUser = localStorage.getItem('portalUser');
        if (!storedUser) {
          window.location.href = '/portal';
          return;
        }

        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/payroll/my-payslips/${currentUser.sys_id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch payslips');
        }

        const entries = await response.json();
        setSlips(entries || []);
      } catch (err: any) {
        console.error('Portal Fetch Data Error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('portalUser');
    window.location.href = '/portal';
  };

  const handleDownloadPDF = (slip: any) => {
    try {
      generatePayslipPDF(slip);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-2 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end space-y-2">
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-2 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-10 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8">
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm h-64"></div>
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm h-48"></div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
              <div className="bg-white border border-gray-100 p-6 rounded-3xl h-24"></div>
              <div className="bg-white border border-gray-100 p-6 rounded-3xl h-24"></div>
              <div className="bg-white border border-gray-100 p-6 rounded-3xl h-24"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Employee Portal</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Records</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user?.fullName || 'Employee'}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{user?.sys_id}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border border-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="space-y-8">
             <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative z-10">
                 <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Total Documents</p>
                 <h3 className="text-4xl font-black text-gray-900 mb-1">
                   {slips.length}
                 </h3>
                 <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Latest:</span>
                    <span className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                      {slips.length > 0 
                        ? formatDate(slips.reduce((latest, slip) => {
                            const current = new Date(slip.batch?.release_date || slip.created_at);
                            const prev = new Date(latest);
                            return current > prev ? current.toISOString() : latest;
                          }, slips[0].batch?.release_date || slips[0].created_at))
                        : 'N/A'
                      }
                    </span>
                 </div>
                 
                 <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                         <TrendingUp className="h-5 w-5 text-emerald-500" />
                       </div>
                       <span className="text-xs font-bold text-gray-600">Files Synced</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                 </div>
               </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Staff Information
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Employee ID', value: user?.sys_id },
                  { label: 'Full Name', value: user?.fullName },
                  { label: 'Portal Access', value: 'Verified', color: 'emerald' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-bold text-gray-400">{item.label}</span>
                    <span className={`text-xs font-bold ${item.color ? 'text-emerald-500' : 'text-gray-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                Payslip Archive
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                Updated Today
              </div>
            </div>

            <div className="space-y-4">
              {slips.length > 0 ? slips.map((slip, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={slip.id}
                  className="bg-white border border-gray-100 p-6 rounded-3xl hover:border-primary/30 transition-all group flex items-center justify-between shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center group-hover:bg-primary transition-colors">
                      <Calendar className="h-6 w-6 text-gray-400 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 mb-1">
                        {formatDate(slip.batch?.period_start)} TO {formatDate(slip.batch?.period_end)}
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type: <span className="text-indigo-500 font-black">{slip.file_type}</span></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Released: <span className="text-gray-900 font-black">{formatDate(slip.batch?.release_date || slip.created_at)}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  <a 
                    href={slip.storage_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-primary/20"
                  >
                     <Download className="h-4 w-4" />
                     <span className="hidden sm:inline">View PDF</span>
                   </a>
                </motion.div>
              )) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No payroll records found yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
