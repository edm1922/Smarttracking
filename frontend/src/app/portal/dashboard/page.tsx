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
  CreditCard,
  Lock,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generatePayslipPDF } from '@/lib/payroll/generatePayslipPDF';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/portal-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Something went wrong');
    } finally {
      setPasswordLoading(false);
    }
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
              onClick={() => { setPasswordSuccess(false); setPasswordError(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowPasswordModal(true); }}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all active:scale-95 border border-gray-100"
              title="Change Password"
            >
              <Lock className="h-5 w-5" />
            </button>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative"
          >
            <button
              onClick={() => { setShowPasswordModal(false); setPasswordError(null); setPasswordSuccess(false); }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update your portal password</p>
              </div>
            </div>

            {passwordSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-emerald-600">Password updated successfully</p>
              </motion.div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2 border border-red-100"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {passwordError}
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-4 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-4 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-4 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
                >
                  {passwordLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>Update Password</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
