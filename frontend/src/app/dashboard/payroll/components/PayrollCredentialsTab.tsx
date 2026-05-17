import React from 'react';
import { Search, Filter, Printer, Trash2, Box, Users, LayoutTemplate } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PayrollUser, Company } from './PayrollTypes';

interface PayrollCredentialsTabProps {
  users: PayrollUser[];
  loadingUsers: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedCredentialLabel: string;
  setSelectedCredentialLabel: (val: string) => void;
  companies: Company[];
  onDeleteEmployee: (id: string) => void;
  onBulkDelete: () => void;
  isStaff: boolean;
  isAdmin: boolean;
}

export const PayrollCredentialsTab: React.FC<PayrollCredentialsTabProps> = ({
  users,
  loadingUsers,
  searchTerm,
  setSearchTerm,
  selectedCredentialLabel,
  setSelectedCredentialLabel,
  companies,
  onDeleteEmployee,
  onBulkDelete,
  isStaff,
  isAdmin,
}) => {
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      user.fullName?.toLowerCase().includes(search) ||
      user.sys_id?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
    if (selectedCredentialLabel === 'all') return matchesSearch;
    return matchesSearch && user.company_label === selectedCredentialLabel;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Search & Bulk Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 no-print">
        <div className="flex-1 space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Users className="h-3 w-3" /> Personnel Search
          </label>
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME, ID, OR USERNAME..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-16 pr-8 py-5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-auto space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Affiliation</label>
          <select 
            value={selectedCredentialLabel}
            onChange={e => setSelectedCredentialLabel(e.target.value)}
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-8 py-5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all appearance-none uppercase"
          >
            <option value="all">Global Access</option>
            {companies.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 w-full md:w-auto no-print">
          <button 
            onClick={() => window.print()}
            className="h-[60px] px-8 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl shadow-gray-900/10"
          >
            <Printer className="h-4 w-4" /> Cards
          </button>
          {!isStaff && isAdmin && (
            <button 
              onClick={onBulkDelete}
              className="h-[60px] px-8 bg-white border-2 border-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-3 shadow-lg shadow-red-100/50"
            >
              <Trash2 className="h-4 w-4" /> Purge
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="print-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loadingUsers ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-100 h-80 rounded-[2.5rem] animate-pulse"></div>
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <div key={user.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/20 hover:-translate-y-2 transition-all duration-300">
              {!isStaff && (
                <button 
                  onClick={() => onDeleteEmployee(user.id)}
                  className="absolute top-6 left-6 p-3 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10 no-print"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors"></div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-lg mb-6 group-hover:scale-105 transition-transform duration-500">
                <QRCodeSVG 
                  value={`https://smarttracking-frontend.vercel.app/portal?uid=${user.username}`} 
                  size={120} 
                  level="H" 
                  className="text-gray-900" 
                />
              </div>

              <h3 className="font-black text-gray-900 text-base mb-1 uppercase tracking-tight line-clamp-1">{user.fullName}</h3>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 px-4 py-1.5 bg-primary/5 rounded-full inline-block">
                {user.company_label || 'Company'} • {user.sys_id}
              </p>

              <div className="w-full bg-gray-50/50 rounded-3xl p-6 text-left border border-gray-100/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">Portal ID</span>
                  <code className="text-xs font-black text-gray-900 uppercase tracking-tighter">{user.username}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">Passkey</span>
                  <code className="text-xs font-mono font-bold text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100">{user.sys_id?.replace(/-/g, '')}</code>
                </div>
              </div>

              <p className="text-[8px] font-black text-gray-300 mt-6 tracking-[0.2em] uppercase italic no-print">Smart Portal Access</p>
            </div>
          ))
        ) : (
          <div className="col-span-full py-40 text-center space-y-6">
            <div className="h-24 w-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-100">
              <Users className="h-10 w-10 text-gray-200" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching personnel found</p>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter mt-1 italic">Try adjusting your search criteria or filter</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .print-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 16px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-cards-grid > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 2px solid #f3f4f6 !important;
            box-shadow: none !important;
            transform: none !important;
          }
          /* Ensure QR Code background and pill backgrounds print */
          .bg-primary\\/5 { background-color: rgba(37, 99, 235, 0.05) !important; }
          .bg-gray-50\\/50 { background-color: rgba(249, 250, 251, 0.5) !important; }
        }
      `}</style>
    </div>
  );
};
