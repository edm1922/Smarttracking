import React from 'react';
import { Boxes, Activity, Truck, FileSpreadsheet } from 'lucide-react';

interface UnitTrackingHeaderProps {
  activeTab: 'inventory' | 'insights' | 'requisition';
  setActiveTab: (tab: 'inventory' | 'insights' | 'requisition') => void;
  totalStock: number;
}

export const UnitTrackingHeader: React.FC<UnitTrackingHeaderProps> = ({ activeTab, setActiveTab, totalStock }) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Unit Tracking System</h1>
        </div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
          Sub-Inventory Lifecycle & Asset Management
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-primary">{totalStock.toLocaleString()} Units Tracked</span>
        </p>
      </div>

      <div className="flex bg-gray-100 p-1.5 rounded-[2rem] shadow-inner no-print">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'inventory' 
            ? 'bg-white text-primary shadow-xl shadow-gray-200' 
            : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'insights' 
            ? 'bg-white text-primary shadow-xl shadow-gray-200' 
            : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Activity className="h-4 w-4" />
          Insights
        </button>
        <button
          onClick={() => setActiveTab('requisition')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'requisition' 
            ? 'bg-white text-primary shadow-xl shadow-gray-200' 
            : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Truck className="h-4 w-4" />
          Requisitions
        </button>
      </div>
    </div>
  );
};
