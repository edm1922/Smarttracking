'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/payroll/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmployeeLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const lowercaseEmail = email.toLowerCase();
      const finalEmail = lowercaseEmail.includes('@') ? lowercaseEmail : `${lowercaseEmail}@gaisano.com`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (authError) throw authError;
      router.push('/portal/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Payroll Portal</h1>
          <p className="text-gray-500 text-sm">Secure access to your monthly payslips.</p>
        </div>

        <div className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50">
          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-3 border border-red-100"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Username / ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maguale_ed"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-11 pr-4 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Portal Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-11 pr-4 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Sign In to Portal</span><ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>
        </div>

      </motion.div>
    </main>
  );
}
