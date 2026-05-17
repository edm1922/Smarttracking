import React from 'react';
import { FileText } from 'lucide-react';

interface PRHeaderFormProps {
  headerInfo: any;
  setHeaderInfo: (info: any) => void;
  prNo: string;
  fetchNextPrNo: (date: string) => void;
  visibleSignatories: any;
  setVisibleSignatories: (config: any) => void;
}

export const PRHeaderForm: React.FC<PRHeaderFormProps> = ({
  headerInfo,
  setHeaderInfo,
  prNo,
  fetchNextPrNo,
  visibleSignatories,
  setVisibleSignatories,
}) => {
  const handleChange = (field: string, value: any) => {
    setHeaderInfo({ ...headerInfo, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
        <FileText className="mr-2 h-4 w-4" />
        PR Header Details
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
          <input 
            type="date" 
            value={headerInfo.date || ''} 
            onChange={e => {
              handleChange('date', e.target.value);
              fetchNextPrNo(e.target.value);
            }} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">PR Number</label>
          <input 
            readOnly 
            type="text" 
            value={prNo || ''} 
            className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-bold text-blue-600 outline-none cursor-not-allowed" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
          <input 
            type="text" 
            value={headerInfo.department || ''} 
            onChange={e => handleChange('department', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">End-User</label>
          <input 
            type="text" 
            value={headerInfo.endUser || ''} 
            onChange={e => handleChange('endUser', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Source / Supplier</label>
          <input 
            type="text" 
            value={headerInfo.sourceSupplier || ''} 
            onChange={e => handleChange('sourceSupplier', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Custom Sub-Header</label>
          <input 
            type="text" 
            value={headerInfo.customSubHeader || ''} 
            onChange={e => handleChange('customSubHeader', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500" 
            placeholder="Override subtitle..." 
          />
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requisitioners</h4>
          {(['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'] as const).map(field => (
            <div key={field} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{field.replace(/By$/, ' By')}</label>
                <input 
                  type="checkbox" 
                  checked={visibleSignatories[field]} 
                  onChange={e => setVisibleSignatories({ ...visibleSignatories, [field]: e.target.checked })}
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <input 
                type="text" 
                disabled={!visibleSignatories[field]}
                value={headerInfo[field] || ''} 
                onChange={e => handleChange(field, e.target.value)} 
                className={`w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 ${!visibleSignatories[field] ? 'bg-gray-50 text-gray-400' : ''}`} 
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Remarks</label>
          <textarea 
            value={headerInfo.remarks || ''} 
            onChange={e => handleChange('remarks', e.target.value)} 
            placeholder="Additional notes or instructions..."
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 h-20 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
