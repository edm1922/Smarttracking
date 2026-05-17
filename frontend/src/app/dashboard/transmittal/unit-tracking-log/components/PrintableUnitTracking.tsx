import React from 'react';

interface PrintableUnitTrackingProps {
  headerInfo: any;
  selectedItems: any[];
}

export const PrintableUnitTracking: React.FC<PrintableUnitTrackingProps> = ({
  headerInfo,
  selectedItems,
}) => {
  return (
    <div className="hidden print:block bg-white p-12 text-gray-900 min-h-screen">
      <div className="flex justify-between items-start border-b-[3px] border-gray-900 pb-8 mb-10">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-gray-900 mb-2 leading-none">{headerInfo.subject}</h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">{headerInfo.customSubHeader || headerInfo.subTitle}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="bg-gray-900 text-white px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg mb-3">Unit Tracking Ref</div>
          <div className="text-2xl font-black font-mono tracking-tighter text-gray-900">{headerInfo.transmittalNo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mb-12">
        <div className="space-y-6">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span> Department / Unit
            </div>
            <div className="text-lg font-black uppercase tracking-tight border-b border-gray-100 pb-2">{headerInfo.department || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span> End-User / Recipient
            </div>
            <div className="text-lg font-black uppercase tracking-tight border-b border-gray-100 pb-2">{headerInfo.endUser || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span> Designation
            </div>
            <div className="text-lg font-black uppercase tracking-tight border-b border-gray-100 pb-2">{headerInfo.position || '____________________'}</div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Issue Date</div>
              <div className="text-sm font-black uppercase tracking-tight">{new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
            </div>
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ref Subject</div>
              <div className="text-sm font-black uppercase tracking-tight">{headerInfo.subject}</div>
            </div>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse mb-12">
        <thead>
          <tr className="border-y-[3px] border-gray-900 bg-gray-50/50">
            <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest w-16">Item</th>
            <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest">Asset ID & Full Description</th>
            <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest w-32">Allocated Qty</th>
            <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest">Status / Remark</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-gray-100">
          {selectedItems.map((item, idx) => (
            <tr key={item.id}>
              <td className="py-5 px-6 text-[11px] font-black text-gray-400">{String(idx + 1).padStart(2, '0')}</td>
              <td className="py-5 px-6">
                <div className="text-[12px] font-black uppercase tracking-tight">{item.assetId}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">{item.name}</div>
              </td>
              <td className="py-5 px-6 text-[12px] font-black text-center">{item.quantity} <span className="text-[10px] text-gray-400 ml-1">{item.unit}</span></td>
              <td className="py-5 px-6 text-[10px] font-black uppercase tracking-tighter text-gray-400 italic">Authorized System Release</td>
            </tr>
          ))}
          {/* Fill remaining space with empty rows for formal look if needed, but not required for digital logs */}
        </tbody>
      </table>

      {headerInfo.remarks && (
        <div className="mb-16 p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 relative">
          <div className="absolute -top-3 left-8 bg-white px-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Additional Memoranda</div>
          <div className="text-xs font-bold text-gray-700 leading-relaxed uppercase tracking-tight">
            {headerInfo.remarks}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-16 pt-16 mt-auto">
        {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(field => {
          const showField = field === 'preparedBy' ? 'showPrepared' : 
                          field === 'checkedBy' ? 'showChecked' :
                          field === 'receivedBy' ? 'showReceived' : 'showApproved';
          return (headerInfo as any)[showField];
        }).map(field => (
          <div key={field} className="flex flex-col">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">{field.replace(/By$/, ' By')}</div>
            <div className="space-y-2">
              <div className="text-sm font-black uppercase tracking-tight border-b-2 border-gray-900 pb-2 text-center">
                {(headerInfo as any)[field] || '____________________'}
              </div>
              <div className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Authorized Signature / Date</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-24 pt-12 border-t border-dashed border-gray-200 text-center">
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Smart Tracking Enterprise • Unit Lifecycle Log Ref: {headerInfo.transmittalNo}</p>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};
