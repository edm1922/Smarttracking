import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Scissors, User, Lock } from 'lucide-react';
import StripsControls from './StripsControls';

export const revalidate = 0;

export default async function CredentialStripsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  let users: any[] = [];
  try {
    const res = await fetch(`${apiUrl}/payroll/users`, { cache: 'no-store' });
    if (res.ok) {
      users = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch users for strips', err);
  }

  const stripsData = users.map(u => ({
    sys_id: u.sys_id,
    name: u.fullName || 'Unknown Employee',
    username: u.username,
    password: u.sys_id?.replace(/-/g, '')
  }));

  return (
    <div className="bg-white min-h-screen text-black p-8 print:p-0">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-8 print:hidden bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Credential Distribution Sheet</h1>
            <p className="text-gray-500 text-sm mt-1">Print this document for physical distribution. Ensure accounts are synced before printing.</p>
          </div>
          <StripsControls />
        </div>

        <div className="print:block space-y-0">
          {stripsData.length === 0 ? (
            <div className="text-center py-20 text-gray-500 font-medium">
              No active accounts found for this payroll run. Please sync accounts in the dashboard first.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0">
              {stripsData.map((emp) => (
                <div key={emp.sys_id} className="relative py-8 border-b-2 border-dashed border-gray-300 print:break-inside-avoid">
                  
                  <div className="absolute left-0 -top-[14px] text-gray-300 bg-white px-2">
                    <Scissors className="h-6 w-6" />
                  </div>

                  <div className="flex items-center justify-between px-4">
                    <div className="w-1/3 pr-6 border-r border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-xs">
                          PP
                        </div>
                        <h2 className="text-lg font-black tracking-tight">Payroll Portal</h2>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        This strip contains your portal login credentials. Please log in to view your payslips and benefits.
                      </p>
                    </div>

                    <div className="w-1/3 px-8">
                      <div className="mb-4">
                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Employee Name</label>
                        <div className="text-sm font-bold text-gray-900 truncate">{emp.name}</div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Username</label>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                          <User className="h-3 w-3 text-gray-400" />
                          {emp.username}
                        </div>
                      </div>
                    </div>

                    <div className="w-1/3 pl-8">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Portal Password</label>
                      <div className="flex items-center gap-3 text-sm font-mono font-bold text-black bg-gray-100 px-4 py-3 rounded-xl border border-gray-200 shadow-inner">
                        <Lock className="h-4 w-4 text-gray-400" />
                        {emp.password}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
