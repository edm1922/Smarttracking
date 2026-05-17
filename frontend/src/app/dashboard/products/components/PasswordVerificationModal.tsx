'use client';

import { Info } from 'lucide-react';

interface PasswordVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
  passwordInput: string;
  setPasswordInput: (input: string) => void;
  isVerifying: boolean;
}

export function PasswordVerificationModal({
  isOpen,
  onClose,
  onVerify,
  passwordInput,
  setPasswordInput,
  isVerifying
}: PasswordVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 border border-gray-100">
         <div className="text-center space-y-3">
           <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
              <Info className="h-10 w-10" />
           </div>
           <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none">Security Protocol</h3>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Authorized Super Admin Access Required</p>
         </div>
         
         <div className="space-y-4">
            <div className="relative">
              <input 
                type="password" 
                placeholder="Enter Super Admin Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onVerify()}
                autoFocus
                className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-center font-black tracking-[0.5em] outline-none focus:bg-white focus:border-red-500 transition-all text-xl"
              />
            </div>
            <button 
              onClick={onVerify}
              disabled={isVerifying || !passwordInput}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Bypass Security'}
            </button>
         </div>
         
         <button 
           onClick={onClose}
           className="w-full text-[9px] font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
         >
           Abort Protocol
         </button>
      </div>
    </div>
  );
}
