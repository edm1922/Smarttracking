import React from 'react';
import { Clock, ClipboardList, Package, Truck, History } from 'lucide-react';

interface UnitReqHeaderProps {
  activeTab: 'create' | 'history' | 'inventory' | 'releasing';
  setActiveTab: (tab: 'create' | 'history' | 'inventory' | 'releasing') => void;
  pendingCount: number;
}

export const UnitReqHeader: React.FC<UnitReqHeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
}) => {
  const tabs = [
    { id: 'create', label: 'Create Request', icon: ClipboardList },
    { id: 'history', label: 'Request History', icon: History },
    { id: 'inventory', label: 'My Inventory', icon: Package },
    { id: 'releasing', label: 'Releasing', icon: Truck },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Unit Requisition Portal</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">
          Manage staff requests, inventory, and equipment issuance
        </p>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 w-fit no-print">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === 'history' && pendingCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${
                activeTab === id ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
