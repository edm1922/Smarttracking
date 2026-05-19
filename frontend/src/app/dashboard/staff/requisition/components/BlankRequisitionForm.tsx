import React from 'react';

const EMPTY_ROWS = 30;

const blankFields = [
  { label: 'Employee Name', width: 'w-48' },
  { label: 'Department / Role', width: 'w-40' },
  { label: 'Item Requested', width: 'w-52' },
  { label: 'Qty', width: 'w-14', align: 'text-center' },
  { label: 'Unit', width: 'w-14', align: 'text-center' },
  { label: 'Remarks', width: 'w-36' },
  { label: 'Recipient Signature', width: 'w-36', align: 'text-center' },
];

export const BlankRequisitionForm: React.FC = () => {
  return (
    <div className="bg-white p-8 text-gray-900 min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="border-2 border-gray-900 p-6">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 mb-1">
            MATERIAL REQUISITION SLIP
          </h1>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest">
            Centro Services Cooperative
          </p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">
            Purok Camachile, Brgy. Tambler, General Santos City
          </p>
        </div>

        {/* Info Fields */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <span className="text-[8px] font-bold text-gray-500 uppercase">Date:</span>
            <div className="border-b border-gray-400 mt-1 h-6"></div>
          </div>
          <div>
            <span className="text-[8px] font-bold text-gray-500 uppercase">Location:</span>
            <div className="border-b border-gray-400 mt-1 h-6"></div>
          </div>
          <div>
            <span className="text-[8px] font-bold text-gray-500 uppercase">Shift:</span>
            <div className="border-b border-gray-400 mt-1 h-6"></div>
          </div>
          <div>
            <span className="text-[8px] font-bold text-gray-500 uppercase">Dept / Area:</span>
            <div className="border-b border-gray-400 mt-1 h-6"></div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-gray-900">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-900 px-2 py-1.5 text-[8px] font-black uppercase tracking-wider w-8 text-center">No.</th>
              {blankFields.map(f => (
                <th key={f.label} className={`border border-gray-900 px-2 py-1.5 text-[8px] font-black uppercase tracking-wider ${f.width} ${f.align || 'text-left'}`}>
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: EMPTY_ROWS }, (_, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="border-r border-gray-900 px-2 py-2 text-[9px] font-bold text-center">{i + 1}</td>
                {blankFields.map(f => (
                  <td key={f.label} className={`border-r border-gray-900 px-2 py-2 ${f.align || 'text-left'}`}>
                    <div className="h-3"></div>
                  </td>
                ))}
              </tr>
            ))}
            {/* Continuation rows */}
            {Array.from({ length: 15 }, (_, i) => (
              <tr key={`cont-${i}`} className="border-b border-gray-300">
                <td className="border-r border-gray-900 px-2 py-1.5 text-[9px] font-bold text-center">{EMPTY_ROWS + i + 1}</td>
                {blankFields.map(f => (
                  <td key={f.label} className={`border-r border-gray-900 px-2 py-1.5 ${f.align || 'text-left'}`}>
                    <div className="h-2.5"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="flex justify-end mt-10 mb-6">
          <div className="w-72 text-center">
            <div className="h-10 border-b border-gray-900 mb-1"></div>
            <div className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Approved by</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-3 border-t border-gray-300">
          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider text-center">
            Fill out completely. Unused rows should be crossed out. Attach additional sheets if necessary.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-200 text-[7px] font-bold text-gray-400 uppercase text-center tracking-[0.2em]">
          Smarttracking Enterprise Requisition & Resource Queue System
        </div>
      </div>
    </div>
  );
};
