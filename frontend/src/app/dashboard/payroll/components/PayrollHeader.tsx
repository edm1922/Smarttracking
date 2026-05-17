import React from 'react';
import { Database, Users, RefreshCw, LayoutTemplate } from 'lucide-react';

interface PayrollHeaderProps {
  activeTab: 'storage' | 'credentials' | 'sync';
  setActiveTab: (tab: 'storage' | 'credentials' | 'sync') => void;
  isAdmin: boolean;
}

export const PayrollHeader: React.FC<PayrollHeaderProps> = ({ activeTab, setActiveTab, isAdmin }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 no-print">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Database className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Payroll Command Center</h1>
        </div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
          Secure Disbursement & Access Provisioning
        </p>
      </div>

      <div className="flex bg-gray-100 p-1.5 rounded-[2rem] shadow-inner no-print">
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'storage' 
            ? 'bg-white text-primary shadow-xl shadow-gray-200' 
            : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Database className="h-4 w-4" />
          Vault
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'credentials' 
            ? 'bg-white text-primary shadow-xl shadow-gray-200' 
            : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users className="h-4 w-4" />
          Access
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'sync' 
              ? 'bg-white text-primary shadow-xl shadow-gray-200' 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            Sync
          </button>
        )}
      </div>
    </div>
  );
};
