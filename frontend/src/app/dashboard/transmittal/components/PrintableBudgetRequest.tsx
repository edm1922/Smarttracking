import React from 'react';

interface PrintableBudgetRequestProps {
  headerInfo: any;
  bgtNo: string;
  items: any[];
  visibleSignatories: any;
}

export const PrintableBudgetRequest: React.FC<PrintableBudgetRequestProps> = ({
  headerInfo,
  bgtNo,
  items,
  visibleSignatories,
}) => {
  const categoryLabel = headerInfo.category === 'LABOR' ? 'Labor' : 'Service';

  return (
    <div className="hidden print:block bg-white p-0 text-gray-900 min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3 mb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-0.5">
            {categoryLabel} Budget Request
          </h1>
          <p className="text-xs font-bold text-gray-500">
            {headerInfo.customSubHeader || `${categoryLabel} Budget Requisition`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 text-center">BGT NO.</div>
          <div className="text-xl font-black font-mono border-2 border-gray-900 px-3 py-0.5 rounded-lg">
            {bgtNo}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="space-y-3">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Department:</div>
            <div className="text-sm font-bold border-b border-gray-200 pb-0.5">{headerInfo.department || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">End-User / Project:</div>
            <div className="text-sm font-bold border-b border-gray-200 pb-0.5">{headerInfo.endUser || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Category:</div>
            <div className="text-sm font-bold border-b border-gray-200 pb-0.5">{categoryLabel}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Date:</div>
            <div className="text-sm font-bold border-b border-gray-200 pb-0.5">
              {headerInfo.date ? new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '____________________'}
            </div>
          </div>
          {headerInfo.position && (
            <div>
              <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Position:</div>
              <div className="text-sm font-bold border-b border-gray-200 pb-0.5">{headerInfo.position}</div>
            </div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mb-4 border border-gray-900">
        <thead>
          <tr className="border-y-2 border-gray-900 bg-gray-50">
            <th className="py-1.5 px-3 text-left text-[9px] font-black uppercase w-10 border-r border-gray-900">No.</th>
            <th className="py-1.5 px-3 text-left text-[9px] font-black uppercase border-r border-gray-900">Description</th>
            <th className="py-1.5 px-3 text-left text-[9px] font-black uppercase w-28 border-r border-gray-900">Vendor/Contractor</th>
            <th className="py-1.5 px-3 text-center text-[9px] font-black uppercase w-16 border-r border-gray-900">Start</th>
            <th className="py-1.5 px-3 text-center text-[9px] font-black uppercase w-16 border-r border-gray-900">End</th>
            <th className="py-1.5 px-3 text-center text-[9px] font-black uppercase w-16 border-r border-gray-900">Duration</th>
            <th className="py-1.5 px-3 text-right text-[9px] font-black uppercase w-28">Est. Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {items.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-900">
              <td className="py-1.5 px-3 text-[10px] font-bold border-r border-gray-900 text-center">{idx + 1}</td>
              <td className="py-1.5 px-3 border-r border-gray-900">
                <div className="text-[10px] font-black uppercase">{item.description}</div>
                {item.remarks && <div className="text-[7px] font-medium text-gray-500 italic mt-0.5">{item.remarks}</div>}
              </td>
              <td className="py-1.5 px-3 text-[10px] border-r border-gray-900">{item.vendor || item.contractor || '-'}</td>
              <td className="py-1.5 px-3 text-[10px] text-center border-r border-gray-900">{item.startDate ? new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</td>
              <td className="py-1.5 px-3 text-[10px] text-center border-r border-gray-900">{item.endDate ? new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</td>
              <td className="py-1.5 px-3 text-[10px] text-center border-r border-gray-900">{item.duration || '-'}</td>
              <td className="py-1.5 px-3 text-right text-[10px] font-mono">₱{(item.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-900 bg-gray-50">
            <td colSpan={6} className="py-2 px-3 text-right text-[10px] font-black uppercase tracking-widest">
              Total Estimated Amount:
            </td>
            <td className="py-2 px-3 text-right text-base font-black text-blue-900">
              ₱{items.reduce((acc, i) => acc + (i.estimatedCost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {headerInfo.remarks && (
        <div className="mb-4 break-inside-avoid">
          <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Remarks / Special Instructions:</div>
          <div className="text-xs font-medium text-gray-700 whitespace-pre-wrap border border-gray-900 p-3 rounded-lg bg-gray-50/50 italic">
            {headerInfo.remarks}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-12 gap-y-4 pt-3 break-inside-avoid">
        {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(field => (visibleSignatories as any)[field]).map(field => (
          <div key={field} className="flex flex-col items-start pt-1 break-inside-avoid">
            <div className="w-full text-[9px] font-black text-gray-400 uppercase mb-2">{field.replace(/By$/, ' By')}:</div>
            <div className="w-full">
              <div className="text-[10px] font-black mb-0.5 uppercase text-center">{(headerInfo as any)[field] || '____________________'}</div>
              <div className="border-b border-gray-900 w-full mb-0.5"></div>
              <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature Over Printed Name / Date</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase text-center tracking-[0.3em]">
        Smarttracking Enterprise Budget & Procurement Module
      </div>
    </div>
  );
};
