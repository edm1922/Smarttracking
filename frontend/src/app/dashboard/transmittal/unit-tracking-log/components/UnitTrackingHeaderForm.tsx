import React from 'react';
import { FileText } from 'lucide-react';

interface UnitTrackingHeaderFormProps {
  headerInfo: any;
  setHeaderInfo: (info: any) => void;
}

export const UnitTrackingHeaderForm: React.FC<UnitTrackingHeaderFormProps> = ({
  headerInfo,
  setHeaderInfo,
}) => {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-6 h-fit">
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center">
        <FileText className="mr-2 h-4 w-4 text-primary" />
        Header Configuration
      </h3>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Date</label>
          <input 
            type="date" 
            value={headerInfo.date} 
            onChange={e => setHeaderInfo({ ...headerInfo, date: e.target.value })} 
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Department</label>
          <input 
            type="text" 
            value={headerInfo.department} 
            onChange={e => setHeaderInfo({ ...headerInfo, department: e.target.value.toUpperCase() })} 
            placeholder="E.G. OPERATIONS"
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End-User / Recipient</label>
          <input 
            type="text" 
            value={headerInfo.endUser} 
            onChange={e => setHeaderInfo({ ...headerInfo, endUser: e.target.value.toUpperCase() })} 
            placeholder="RECIPIENT FULL NAME"
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Position / Role</label>
          <input 
            type="text" 
            value={headerInfo.position} 
            onChange={e => setHeaderInfo({ ...headerInfo, position: e.target.value.toUpperCase() })} 
            placeholder="JOB TITLE"
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Subject</label>
          <input 
            type="text" 
            value={headerInfo.subject} 
            onChange={e => setHeaderInfo({ ...headerInfo, subject: e.target.value.toUpperCase() })} 
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all" 
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 space-y-4">
        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Official Signatories</h4>
        {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => {
          const showField = field === 'preparedBy' ? 'showPrepared' : 
                          field === 'checkedBy' ? 'showChecked' :
                          field === 'receivedBy' ? 'showReceived' : 'showApproved';
          return (
            <div key={field} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{field.replace(/By$/, ' By')}</label>
                <input 
                  type="checkbox" 
                  checked={(headerInfo as any)[showField]} 
                  onChange={e => setHeaderInfo({ ...headerInfo, [showField]: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                />
              </div>
              <input 
                type="text" 
                disabled={!(headerInfo as any)[showField]}
                value={(headerInfo as any)[field] || ''} 
                onChange={e => setHeaderInfo({ ...headerInfo, [field]: e.target.value.toUpperCase() })} 
                className={`w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200 ${!(headerInfo as any)[showField] ? 'opacity-30 cursor-not-allowed' : ''}`} 
                placeholder="NAME..." 
              />
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Additional Remarks</label>
        <textarea 
          value={headerInfo.remarks} 
          onChange={e => setHeaderInfo({ ...headerInfo, remarks: e.target.value })} 
          placeholder="ADDITIONAL NOTES..."
          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-[10px] font-bold text-gray-900 outline-none focus:bg-white focus:border-primary transition-all h-24 resize-none placeholder:text-gray-200"
        />
      </div>
    </div>
  );
};
