import React from 'react';

interface PrintablePRProps {
  headerInfo: any;
  prNo: string;
  prItems: any[];
  visibleSignatories: any;
}

export const PrintablePR: React.FC<PrintablePRProps> = ({
  headerInfo,
  prNo,
  prItems,
  visibleSignatories,
}) => {
  return (
    <div className="hidden print:block bg-white p-12 text-gray-900 min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">
            Purchase Requisition
          </h1>
          <p className="text-sm font-bold text-gray-500">
            {headerInfo.customSubHeader || headerInfo.subTitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-400 uppercase mb-1 text-center">PR NO.</div>
          <div className="text-2xl font-black font-mono border-2 border-gray-900 px-4 py-1 rounded-lg">
            {prNo}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-8">
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Department:</div>
            <div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.department || '____________________'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">End-User / Project:</div>
            <div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.endUser || '____________________'}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Date:</div>
            <div className="text-base font-bold border-b border-gray-200 pb-1">
              {headerInfo.date ? new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '____________________'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Source / Potential Supplier:</div>
            <div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.sourceSupplier || '____________________'}</div>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse mb-8 border border-gray-900">
        <thead>
          <tr className="border-y-2 border-gray-900 bg-gray-50">
            <th className="py-2 px-4 text-left text-[9px] font-black uppercase w-12 border-r border-gray-900">No.</th>
            <th className="py-2 px-4 text-left text-[9px] font-black uppercase border-r border-gray-900">Description / Specifications</th>
            <th className="py-2 px-4 text-center text-[9px] font-black uppercase w-20 border-r border-gray-900">Unit</th>
            <th className="py-2 px-4 text-center text-[9px] font-black uppercase w-20 border-r border-gray-900">Qty</th>
            <th className="py-2 px-4 text-right text-[9px] font-black uppercase w-32 border-r border-gray-900">Est. Cost</th>
            <th className="py-2 px-4 text-right text-[9px] font-black uppercase w-32">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {prItems.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-900">
              <td className="py-2 px-4 text-[10px] font-bold border-r border-gray-900 text-center">{idx + 1}</td>
              <td className="py-2 px-4 text-[10px] font-bold uppercase border-r border-gray-900">{item.name}</td>
              <td className="py-2 px-4 text-[10px] text-center uppercase border-r border-gray-900">{item.unit}</td>
              <td className="py-2 px-4 text-[10px] font-black text-center border-r border-gray-900">{item.quantity}</td>
              <td className="py-2 px-4 text-right text-[10px] font-mono border-r border-gray-900">₱{(item.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="py-2 px-4 text-right text-[10px] font-black">₱{(item.quantity * item.estimatedCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Fill remaining space */}
          {Array.from({ length: Math.max(0, 15 - prItems.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-gray-900 h-10">
              <td className="border-r border-gray-900"></td>
              <td className="border-r border-gray-900"></td>
              <td className="border-r border-gray-900"></td>
              <td className="border-r border-gray-900"></td>
              <td className="border-r border-gray-900"></td>
              <td></td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-900 bg-gray-50">
            <td colSpan={5} className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest">
              Total Estimated Amount:
            </td>
            <td className="py-3 px-4 text-right text-lg font-black text-blue-900">
              ₱{prItems.reduce((acc, i) => acc + (i.quantity * i.estimatedCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {headerInfo.remarks && (
        <div className="mb-12 break-inside-avoid">
          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">Remarks / Special Instructions:</div>
          <div className="text-sm font-medium text-gray-700 whitespace-pre-wrap border border-gray-900 p-4 rounded-lg bg-gray-50/50 italic">
            {headerInfo.remarks}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-16 gap-y-12 pt-8 break-inside-avoid">
        {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(field => (visibleSignatories as any)[field]).map(field => (
          <div key={field} className="flex flex-col items-start pt-2 break-inside-avoid">
            <div className="w-full text-[9px] font-black text-gray-400 uppercase mb-4">{field.replace(/By$/, ' By')}:</div>
            <div className="w-full">
              <div className="text-[11px] font-black mb-1 uppercase text-center">{(headerInfo as any)[field] || '____________________'}</div>
              <div className="border-b-2 border-gray-900 w-full mb-1"></div>
              <div className="text-center text-[9px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature Over Printed Name / Date</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 pt-8 border-t border-gray-100 text-[9px] font-bold text-gray-400 uppercase text-center tracking-[0.3em]">
        Smarttracking Enterprise Requisition & Procurement Module
      </div>
    </div>
  );
};
