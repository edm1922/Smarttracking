'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Package, Box } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminNotifications() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchPending = async () => {
    try {
      const [pullOutRes, internalRes] = await Promise.all([
        api.get('/pull-out-requests/pending'),
        api.get('/internal-requests')
      ]);

      const pullOutData = pullOutRes.data?.data || pullOutRes.data || [];
      const pullOuts = (Array.isArray(pullOutData) ? pullOutData : []).map((r: any) => ({
        ...r,
        _type: 'pull-out',
        _date: new Date(r.createdAt).getTime()
      }));

      const internalData = internalRes.data?.data || internalRes.data || [];
      const internals = (Array.isArray(internalData) ? internalData : [])
        .filter((r: any) => r.status === 'PENDING')
        .map((r: any) => ({
          ...r,
          _type: 'internal',
          _date: new Date(r.date || r.createdAt).getTime()
        }));

      const combined = [...pullOuts, ...internals].sort((a, b) => b._date - a._date);
      setPendingRequests(combined);
    } catch (err: any) {
      if (err.message === 'Network Error') {
        console.warn('Backend unreachable for notifications polling. Retrying later...');
      } else {
        console.warn('Failed to fetch pending requests', err.message || err);
      }
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasNotifications = pendingRequests.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {hasNotifications && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[350px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] transform origin-top-left">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Pending Requests</h3>
            {hasNotifications && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black">{pendingRequests.length} New</span>
            )}
          </div>
          
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            {pendingRequests.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {pendingRequests.slice(0, 10).map((req) => (
                  <div 
                    key={req._type + req.id} 
                    className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer flex gap-3"
                    onClick={() => {
                      setIsOpen(false);
                      if (req._type === 'pull-out') {
                        router.push('/dashboard/unit-tracking?tab=requisition');
                      } else {
                        router.push('/dashboard/products/requests');
                      }
                    }}
                  >
                    <div className={`mt-1 p-2 rounded-full h-fit flex-shrink-0 ${req._type === 'pull-out' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {req._type === 'pull-out' ? <Package className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 mb-1">
                        {req._type === 'pull-out' ? req.user?.username : req.employeeName} requested <span className="text-primary">{req._type === 'pull-out' ? `${req.qty} ${req.unit}` : `${req.quantity} pcs`}</span>
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[220px]">
                        {req._type === 'pull-out' ? req.item?.name : req.product?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-[9px] font-bold text-gray-400">
                          {new Date(req._date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-500 uppercase tracking-tighter">
                          {req._type === 'pull-out' ? 'Unit' : 'Material'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">You're all caught up</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
