import React from 'react';
import { FileText, Box } from 'lucide-react';
import { TransmittalHeaderInfo } from '../types';

interface TransmittalHeaderFormProps {
  headerInfo: TransmittalHeaderInfo;
  setHeaderInfo: (info: TransmittalHeaderInfo) => void;
  savePreset: () => void;
}

export const TransmittalHeaderForm: React.FC<TransmittalHeaderFormProps> = ({
  headerInfo,
  setHeaderInfo,
  savePreset,
}) => {
  const handleChange = (field: keyof TransmittalHeaderInfo, value: any) => {
    setHeaderInfo({ ...headerInfo, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 h-full">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
        <FileText className="mr-2 h-4 w-4" />
        Header Details
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
          <input 
            type="date" 
            value={headerInfo.date || ''} 
            onChange={e => handleChange('date', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
          <input 
            type="text" 
            value={headerInfo.department || ''} 
            onChange={e => handleChange('department', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
            placeholder="e.g. INVENTORY" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">End-User / Recipient</label>
          <input 
            type="text" 
            value={headerInfo.endUser || ''} 
            onChange={e => handleChange('endUser', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
            placeholder="Name" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Position</label>
          <input 
            type="text" 
            value={headerInfo.position || ''} 
            onChange={e => handleChange('position', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
            placeholder="Job Title" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Source / Supplier</label>
          <input 
            type="text" 
            value={headerInfo.sourceSupplier || ''} 
            onChange={e => handleChange('sourceSupplier', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
            placeholder="Vendor" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
          <input 
            type="text" 
            value={headerInfo.subject || ''} 
            onChange={e => handleChange('subject', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Custom Sub-Header</label>
          <input 
            type="text" 
            value={headerInfo.customSubHeader || ''} 
            onChange={e => handleChange('customSubHeader', e.target.value)} 
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary" 
            placeholder="Override subtitle..." 
          />
        </div>

        <div className="pt-2">
          <button 
            onClick={savePreset}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all text-[10px] font-black uppercase"
          >
            <Box className="h-3 w-3" />
            <span>Save Header Preset</span>
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Signatories</h4>
          <div className="space-y-4">
            {(['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'] as const).map(field => {
              const showField = field === 'preparedBy' ? 'showPrepared' : 
                              field === 'checkedBy' ? 'showChecked' :
                              field === 'receivedBy' ? 'showReceived' : 'showApproved';
              return (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{field.replace(/By$/, ' By')}</label>
                    <input 
                      type="checkbox" 
                      checked={headerInfo[showField]} 
                      onChange={e => handleChange(showField, e.target.checked)}
                      className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  <input 
                    type="text" 
                    disabled={!headerInfo[showField]}
                    value={headerInfo[field] || ''} 
                    onChange={e => handleChange(field, e.target.value)} 
                    className={`w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary ${!headerInfo[showField] ? 'bg-gray-50 text-gray-400' : ''}`} 
                    placeholder="Name" 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
