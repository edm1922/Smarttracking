import React from 'react';
import { Package, LayoutGrid, QrCode, AlertTriangle } from 'lucide-react';

interface UnitTrackingStatsProps {
  totalProducts: number;
  totalQRs: number;
  totalStock: number;
  lowStockCount: number;
}

export const UnitTrackingStats: React.FC<UnitTrackingStatsProps> = ({
  totalProducts,
  totalQRs,
  totalStock,
  lowStockCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6 group hover:-translate-y-1 transition-all">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <Package className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Classes</p>
          <p className="text-3xl font-black text-gray-900">{totalProducts}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6 group hover:-translate-y-1 transition-all">
        <div className="h-16 w-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <QrCode className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unique Assets</p>
          <p className="text-3xl font-black text-gray-900">{totalQRs}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6 group hover:-translate-y-1 transition-all">
        <div className="h-16 w-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <LayoutGrid className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Global Stock</p>
          <p className="text-3xl font-black text-gray-900">{totalStock.toLocaleString()}</p>
        </div>
      </div>

      <div className={`p-8 rounded-[2rem] border shadow-xl flex items-center gap-6 group hover:-translate-y-1 transition-all ${
        lowStockCount > 0 
        ? 'bg-red-50 border-red-100 shadow-red-200/50' 
        : 'bg-white border-gray-100 shadow-gray-200/50'
      }`}>
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
          lowStockCount > 0 ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-50 text-gray-400'
        }`}>
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${lowStockCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Low Stock Alerts</p>
          <p className={`text-3xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</p>
        </div>
      </div>
    </div>
  );
};
