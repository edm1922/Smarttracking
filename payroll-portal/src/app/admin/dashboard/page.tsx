'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Database, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus(null);

    // MOCK: In a real app, you would send this to a Next.js API Route
    // that uses the excel_parser.ts logic and updates Supabase.
    setTimeout(() => {
      setUploading(false);
      setStatus({ 
        type: 'success', 
        message: 'Payroll data parsed and synchronized successfully. 142 records updated.' 
      });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
       <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl h-20 flex items-center px-8 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Payroll Admin</h1>
          </div>
       </nav>

       <main className="max-w-5xl mx-auto py-16 px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Upload Payroll Run</h2>
            <p className="text-slate-400">Process the monthly spreadsheet to distribute payslips instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload Card */}
            <div className="glass p-10 rounded-[3rem] border-dashed border-2 border-indigo-500/20 flex flex-col items-center justify-center min-h-[350px] group transition-all hover:border-indigo-500/50">
              <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="h-10 w-10 text-indigo-400" />
              </div>
              <label className="cursor-pointer">
                <span className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                  {uploading ? 'Processing...' : 'Choose Excel File'}
                </span>
                <input type="file" className="hidden" accept=".xlsx,.xlsb" onChange={handleFileUpload} disabled={uploading} />
              </label>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-6">Supports .XLSX and .XLSB binaries</p>
            </div>

            {/* Credential Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
              <div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Users className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black mb-2">Employee Accounts</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Generate and print the login credential strips for your supervisors to distribute to staff.</p>
              </div>
              
              <button 
                onClick={() => window.open('http://localhost:3000/dashboard/payroll/strips', '_blank')}
                className="w-full mt-8 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Printer className="h-5 w-5" />
                Download Distribution Sheet
              </button>
            </div>
          </div>

          <AnimatePresence>
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-12 p-6 rounded-3xl border flex items-start gap-4 ${
                  status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {status.type === 'success' ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertCircle className="h-6 w-6 shrink-0" />}
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest mb-1">System Status</h4>
                  <p className="text-xs font-medium leading-relaxed">{status.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </main>
    </div>
  );
}
