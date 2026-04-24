'use client';

import { useEffect, useState } from 'react';
import { 
  Box, MapPin, Package, History, ArrowDownToLine, ArrowUpFromLine, 
  Search, AlertCircle, Clock, CheckCircle2, User, LayoutDashboard,
  QrCode
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface ProductStock {
  productId: string;
  locationId: string;
  quantity: number;
  product: {
    name: string;
    sku: string;
    unit: string;
    imageUrl?: string;
  };
}

interface Location {
  id: string;
  name: string;
  description: string | null;
  stocks: ProductStock[];
}

export default function StaffInventoryPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPersonalInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/locations/personal');
      setLocation(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch personal inventory', err);
      setError(err.response?.status === 404 
        ? "Personal inventory location not found. Please contact an admin to set up your custody account." 
        : "Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalInventory();
  }, []);

  const filteredStocks = location?.stocks.filter(s => 
    s.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Clock className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Synchronizing your personal vault...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-600 mb-6">{error}</p>
        <button 
          onClick={fetchPersonalInventory}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Personal Custody Portal</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{location?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link 
              href="/dashboard/products/requests" 
              className="flex items-center px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Request Stock from Main
            </Link>
            <button className="flex items-center px-5 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              Issue to Employee
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items in Custody</p>
            <p className="text-2xl font-black text-gray-900">{location?.stocks.length || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Qty</p>
            <p className="text-2xl font-black text-gray-900">
              {location?.stocks.reduce((acc, s) => acc + s.quantity, 0) || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <History className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Pulls</p>
            <p className="text-2xl font-black text-gray-900">--</p>
          </div>
        </div>
      </div>

      {/* Inventory Table Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            My Allocated Stock
          </h3>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter my items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-100 pl-10 pr-4 py-2 text-sm focus:ring-1 ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Information</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Allocated Qty</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <Box className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                      <p className="text-sm text-gray-400 font-medium">No stock allocated to your custody yet.</p>
                      <Link href="/dashboard/products/requests" className="mt-4 inline-block text-xs font-bold text-primary hover:underline">
                        Create your first Pull Request &rarr;
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => (
                  <tr key={stock.productId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
                          {stock.product.imageUrl ? (
                            <img src={stock.product.imageUrl} alt={stock.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <QrCode className="h-6 w-6 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {stock.product.name}
                          </p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tight">{stock.product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-gray-900">{stock.quantity}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{stock.product.unit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        stock.quantity > 5 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse'
                      }`}>
                        {stock.quantity > 5 ? 'Stable' : 'Low Stock'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="px-3 py-1.5 text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-widest border border-gray-100 rounded-lg hover:border-primary/20 transition-all">
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
