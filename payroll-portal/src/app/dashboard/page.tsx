'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Download, 
  FileText, 
  Calendar, 
  Wallet, 
  LogOut, 
  ChevronRight,
  TrendingUp,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: entries, error } = await supabase
          .from('payroll_entries')
          .select(`
            id,
            net_pay,
            created_at,
            payroll_runs (
              period_start,
              period_end,
              payroll_date
            )
          `)
          .order('created_at', { ascending: false });

        if (entries) setSlips(entries);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none">Employee Portal</h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Records</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-black text-white">{user?.user_metadata?.full_name || 'Employee'}</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">{user?.user_metadata?.sys_id}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 group"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile & Summary */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative z-10">
                 <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Current Earnings</p>
                 <h3 className="text-4xl font-black text-white mb-1">
                   ₱{slips[0]?.net_pay?.toLocaleString() || '0.00'}
                 </h3>
                 <p className="text-indigo-200/60 text-xs font-medium">Last payout: {slips[0]?.payroll_runs?.payroll_date || 'N/A'}</p>
                 
                 <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white">YTD Earnings Tracked</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/50" />
                 </div>
               </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem]">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-indigo-400" />
                Employment Info
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Department', value: user?.user_metadata?.department || 'N/A' },
                  { label: 'Employee ID', value: user?.user_metadata?.sys_id },
                  { label: 'Portal Status', value: 'Verified', color: 'emerald' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <span className="text-xs font-bold text-slate-500">{item.label}</span>
                    <span className={`text-xs font-black text-${item.color ? item.color + '-400' : 'white'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Payslip List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                <FileText className="h-6 w-6 text-indigo-400" />
                Payslip Archive
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                Live Sync
              </div>
            </div>

            <div className="space-y-4">
              {slips.length > 0 ? slips.map((slip, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={slip.id}
                  className="bg-slate-900/30 border border-white/5 p-6 rounded-3xl hover:bg-slate-900/80 hover:border-indigo-500/30 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 flex flex-col items-center justify-center group-hover:bg-indigo-500 transition-colors">
                      <Calendar className="h-6 w-6 text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white mb-1">
                        Payroll Period: {slip.payroll_runs?.period_start} to {slip.payroll_runs?.period_end}
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Pay: <span className="text-emerald-400 font-black">₱{slip.net_pay.toLocaleString()}</span></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Released: {slip.payroll_runs?.payroll_date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/10">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </button>
                </motion.div>
              )) : (
                <div className="py-20 text-center glass rounded-[2.5rem] border-dashed">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No payroll records found yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
