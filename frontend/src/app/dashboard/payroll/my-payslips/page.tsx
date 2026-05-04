'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/payroll/supabase';
import { 
  Download, 
  FileText, 
  Calendar, 
  Wallet, 
  ChevronRight,
  TrendingUp,
  Clock,
  User as UserIcon,
  ShieldCheck,
  Search,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function IntegratedEmployeePayslips() {
  const [user, setUser] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [isAdminView, setIsAdminView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [showPayrollBreakdown, setShowPayrollBreakdown] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const storedRole = localStorage.getItem('role');
      const isAdmin = storedRole === 'payroll_admin' || storedRole === 'admin';
      setIsAdminView(isAdmin);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError && !isAdmin) {
        console.error('Auth Error:', authError.message);
        setLoading(false);
        return;
      }
      
      const authUser = authData?.user;
      setUser(authUser);

      if (isAdmin || authUser) {
        // 1. Fetch Runs for the filter
        const { data: runsData, error: runsError } = await supabase
          .from('payroll_runs')
          .select('id, period_start, period_end, payroll_date, label')
          .order('created_at', { ascending: false });
        
        if (runsError) {
          console.error('Runs Fetch Error:', runsError.message || runsError);
        }

        if (runsData && runsData.length > 0) {
          setRuns(runsData);
          setSelectedRunId(runsData[0].id.toString());
        }

        // 2. Fetch Entries
        let query = supabase
          .from('payroll_entries')
          .select(`
            id,
            payroll_run_id,
            sys_id,
            basic_pay,
            gross_pay,
            allowance,
            overtime_pay,
            sss,
            phic,
            hdmf,
            loans,
            total_deductions,
            net_pay,
            created_at,
            raw_data,
            payroll_runs (
              id,
              period_start,
              period_end,
              payroll_date,
              label
            )
          `);

        if (!isAdmin && authUser) {
          const sysId = authUser.user_metadata?.sys_id;
          if (sysId) query = query.eq('sys_id', sysId);
          else {
             setSlips([]);
             setLoading(false);
             return;
          }
        }

        const { data: entries, error } = await query.order('created_at', { ascending: false });
        if (entries) setSlips(entries);
        if (error) {
          console.error('Payslips Fetch Error:', error.message || 'Unknown Error', error);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredSlips = slips.filter(slip => {
    // Filter by Run (Date Period)
    if (selectedRunId !== 'all' && slip.payroll_run_id?.toString() !== selectedRunId) return false;

    // Filter by Label
    if (selectedLabel !== 'all' && (slip.payroll_runs?.label || 'General') !== selectedLabel) return false;

    // Filter by Search
    const nameFromRaw = slip.raw_data?.full_name?.toLowerCase() || '';
    const sysId = slip.sys_id?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return nameFromRaw.includes(search) || sysId.includes(search);
  });

  const uniqueLabels = Array.from(new Set(runs.map(r => r.label || 'General')));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{isAdminView ? 'Payroll Management' : 'Employee Benefits'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isAdminView ? 'Payroll Master Records' : 'My Payslips'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdminView ? 'Review and verify all generated employee payslips for accuracy.' : 'View and download your itemized earnings and deductions history.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Label Filter */}
          <div className="relative group">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none min-w-[180px]"
            >
              <option value="all">All Labels</option>
              {uniqueLabels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date Period Filter */}
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none min-w-[200px]"
            >
              <option value="all">All Periods</option>
              {runs.map(run => (
                <option key={run.id} value={run.id.toString()}>
                  {run.period_start} - {run.period_end}
                </option>
              ))}
            </select>
          </div>

          {isAdminView && (
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Search Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all w-full md:w-64"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Summary Info */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            onDoubleClick={() => isAdminView && setShowPayrollBreakdown(true)}
            className={`bg-primary rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group transition-all ${isAdminView ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
            title={isAdminView ? "Double-click to view run breakdown" : ""}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-4 opacity-70">
              {isAdminView ? 'Total Payroll (Run)' : (selectedRunId === 'all' ? 'Latest Payout' : 'Period Payout')}
            </p>
            <h3 className="text-2xl font-black mb-1 leading-none tracking-tight">
              ₱{isAdminView 
                ? filteredSlips.reduce((acc, curr) => acc + (curr.net_pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : (filteredSlips[0]?.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-blue-100/60 text-xs font-medium">
              {isAdminView ? `${filteredSlips.length} Records found` : `Released: ${filteredSlips[0]?.payroll_runs?.payroll_date || 'N/A'}`}
            </p>
            {isAdminView && (
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-200">Double-Click for breakdown</span>
                <ChevronRight className="h-3 w-3 text-blue-300" />
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Payslip List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredSlips.length > 0 ? filteredSlips.map((slip) => (
                <div key={slip.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        {isAdminView ? <UserIcon className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="flex flex-col">
                          <h4 className="text-sm font-black text-gray-900">
                            {isAdminView 
                              ? (slip.raw_data?.full_name || slip.sys_id) 
                              : `${slip.payroll_runs?.period_start} — ${slip.payroll_runs?.period_end}`}
                          </h4>
                          <div className="flex items-center gap-2">
                            {isAdminView && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{slip.sys_id}</span>}
                            {isAdminView && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{slip.payroll_runs?.period_start}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                           <span className="text-xs font-bold text-primary">₱{slip.net_pay.toLocaleString()}</span>
                           <span className="text-[10px] text-gray-400 font-medium border-l border-gray-200 pl-4 uppercase tracking-widest">
                             {isAdminView ? 'Verify Figures' : `Released: ${slip.payroll_runs?.payroll_date}`}
                           </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedSlip(selectedSlip?.id === slip.id ? null : slip)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-black/5 ${
                        selectedSlip?.id === slip.id ? 'bg-primary text-white' : 'bg-gray-900 text-white hover:bg-black'
                      }`}
                    >
                      {selectedSlip?.id === slip.id ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      {selectedSlip?.id === slip.id ? 'Close' : 'Verify Details'}
                    </button>
                  </div>

                  {/* Expanded Detail (Verification View) */}
                  {selectedSlip?.id === slip.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Earnings Breakdown</h5>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">Basic Pay</span><span className="font-black text-gray-900">₱{slip.basic_pay?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">Overtime Pay</span><span className="font-black text-gray-900">₱{slip.overtime_pay?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">Allowances</span><span className="font-black text-gray-900">₱{slip.allowance?.toLocaleString()}</span></div>
                          {(slip.raw_data?.adjustments?.allowance > 0 || slip.raw_data?.adjustments?.payroll > 0) && (
                            <div className="flex justify-between text-indigo-600 font-bold">
                              <span className="uppercase tracking-tighter">Adjustments</span>
                              <span>₱{((slip.raw_data?.adjustments?.allowance || 0) + (slip.raw_data?.adjustments?.payroll || 0)).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-3 border-t border-gray-100 font-black text-gray-900 text-sm"><span>Total Gross</span><span>₱{slip.gross_pay?.toLocaleString()}</span></div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Deductions Breakdown</h5>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">SSS</span><span className="font-black text-gray-900">₱{slip.sss?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">PhilHealth</span><span className="font-black text-gray-900">₱{slip.phic?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">Pag-IBIG</span><span className="font-black text-gray-900">₱{slip.hdmf?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase tracking-tighter">Loans & Others</span><span className="font-black text-gray-900">₱{slip.loans?.toLocaleString()}</span></div>
                          <div className="flex justify-between pt-3 border-t border-gray-100 font-black text-red-600 text-sm"><span>Total Deductions</span><span>-₱{slip.total_deductions?.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )) : (
                <div className="py-20 text-center">
                  <FileText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {searchTerm ? `No records found for "${searchTerm}"` : 'No payroll records available yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Payroll Breakdown Modal */}
      {showPayrollBreakdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="bg-gray-900 p-8 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Payroll Run Breakdown</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Aggregated Totals for Current Filter</p>
              </div>
              <button 
                onClick={() => setShowPayrollBreakdown(false)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-10 grid grid-cols-2 gap-10 bg-gray-50/30">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-blue-100 pb-2">Earnings Summary</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Basic Pay', value: filteredSlips.reduce((a, c) => a + (c.basic_pay || 0), 0) },
                    { label: 'Overtime', value: filteredSlips.reduce((a, c) => a + (c.overtime_pay || 0), 0) },
                    { label: 'Allowances', value: filteredSlips.reduce((a, c) => a + (c.allowance || 0), 0) },
                    { label: 'Gross Pay', value: filteredSlips.reduce((a, c) => a + (c.gross_pay || 0), 0), highlight: true },
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between items-center ${item.highlight ? 'pt-4 border-t border-gray-200 mt-4' : ''}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${item.highlight ? 'text-gray-900 font-black' : 'text-gray-400'}`}>{item.label}</span>
                      <span className={`text-sm font-black ${item.highlight ? 'text-primary' : 'text-gray-700'}`}>₱{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest border-b border-red-100 pb-2">Deductions Summary</h3>
                <div className="space-y-4">
                  {[
                    { label: 'SSS', value: filteredSlips.reduce((a, c) => a + (c.sss || 0), 0) },
                    { label: 'PhilHealth', value: filteredSlips.reduce((a, c) => a + (c.phic || 0), 0) },
                    { label: 'Pag-IBIG', value: filteredSlips.reduce((a, c) => a + (c.hdmf || 0), 0) },
                    { label: 'Loans/Others', value: filteredSlips.reduce((a, c) => a + (c.loans || 0), 0) },
                    { label: 'Total Deductions', value: filteredSlips.reduce((a, c) => a + (c.total_deductions || 0), 0), highlight: true },
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between items-center ${item.highlight ? 'pt-4 border-t border-gray-200 mt-4' : ''}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${item.highlight ? 'text-gray-900 font-black' : 'text-gray-400'}`}>{item.label}</span>
                      <span className={`text-sm font-black ${item.highlight ? 'text-red-600' : 'text-gray-700'}`}>₱{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-900 text-center">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Final Net Disbursement</p>
              <h4 className="text-3xl font-black text-white leading-none tracking-tight">
                ₱{filteredSlips.reduce((a, c) => a + (c.net_pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-gray-600 text-[9px] font-bold uppercase mt-4 italic tracking-widest">
                Calculated across {filteredSlips.length} employee records
              </p>
            </div>
          </motion.div>
        </div>
    </div>
  );
}
