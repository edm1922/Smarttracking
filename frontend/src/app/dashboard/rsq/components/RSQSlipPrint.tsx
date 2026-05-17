import React from 'react';

interface RSQSlipPrintProps {
  rsq: any;
}

export function RSQSlipPrint({ rsq }: RSQSlipPrintProps) {
  if (!rsq) return null;

  const tailorName = rsq.tailor?.name || 'TAILOR';
  // Standardized tailor nickname (e.g. MAUNLAD UNIFORM INC -> MAUNLAD)
  let tailorNickname = tailorName.replace(/tailoring|inc|cooperative|services/gi, '').trim().toUpperCase();
  if (!tailorNickname || tailorNickname === 'UNASSIGNED' || tailorNickname === 'UNASSIGNED TAILOR') {
    tailorNickname = 'MAUNLAD';
  }

  const formattedDate = rsq.orderDate ? new Date(rsq.orderDate).toLocaleDateString() : new Date().toLocaleDateString();

  // Helper to render a single copy of the slip
  const renderSlipCopy = (title: string, type: 'CUTTING' | 'TAILORING') => {
    const isCutting = type === 'CUTTING';
    const rawRemarks = rsq.remarks || '';
    const isImportedProduct = rawRemarks.toLowerCase().startsWith('imported product:');
    const displayParticulars = isImportedProduct
      ? rawRemarks.replace(/imported product:\s*/i, '').trim()
      : (rawRemarks || `${rsq.fabric?.name || 'N/A'} Style`);

    return (
      <div className="w-full bg-white text-black p-6 border-2 border-dashed border-gray-300 rounded-xl space-y-4 text-xs font-sans relative break-inside-avoid shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-black/10 pb-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Centro Services Cooperative</h2>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Purok Camachile, Brgy. Tambler, General Santos City</p>
            <p className="text-xs font-black uppercase tracking-widest text-primary mt-1">Uniform Request Slip</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="bg-gray-100 border border-black/20 text-gray-800 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest mb-1 shadow-sm">
              {title}
            </span>
            <p className="font-mono text-[10px] font-black text-gray-900">RQ NO: {rsq.rsqNo}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase">DATE: {formattedDate}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-center text-[10px]">
          <thead>
            {/* Main headers */}
            <tr className="bg-gray-50 border border-black">
              <th className="border border-black py-1 px-1 w-10">S. NO</th>
              <th className="border border-black py-1 px-2 text-left w-52">PARTICULARS</th>
              <th className="border border-black py-1 px-1" colSpan={2}>REQUEST</th>
              {isCutting ? (
                <th className="border border-black py-1 px-1" colSpan={3}>OUTPUT (CUTTING)</th>
              ) : (
                <>
                  <th className="border border-black py-1 px-1 w-16" rowSpan={2}>TOTAL CUTTING</th>
                  <th className="border border-black py-1 px-1" colSpan={3}>OUTPUT (TAILORING)</th>
                </>
              )}
            </tr>
            {/* Sub headers */}
            <tr className="border border-black bg-gray-50/50">
              {isCutting ? (
                <>
                  <th className="border border-black py-0.5 px-0.5"></th>
                  <th className="border border-black py-0.5 px-0.5"></th>
                  <th className="border border-black py-0.5 px-1 w-12">QTY</th>
                  <th className="border border-black py-0.5 px-1 w-12">UNIT</th>
                  <th className="border border-black py-0.5 px-1 w-12">QTY</th>
                  <th className="border border-black py-0.5 px-1 w-16">PRICE</th>
                  <th className="border border-black py-0.5 px-1 w-20">AMOUNT</th>
                </>
              ) : (
                <>
                  <th className="border border-black py-0.5 px-0.5"></th>
                  <th className="border border-black py-0.5 px-0.5"></th>
                  <th className="border border-black py-0.5 px-1 w-12">QTY</th>
                  <th className="border border-black py-0.5 px-1 w-12">UNIT</th>
                  <th className="border border-black py-0.5 px-1 w-12">QTY</th>
                  <th className="border border-black py-0.5 px-1 w-16">PRICE</th>
                  <th className="border border-black py-0.5 px-1 w-20">AMOUNT</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border border-black h-10 font-bold">
              <td className="border border-black py-1 px-1 text-center">1</td>
              <td className="border border-black py-1 px-2 text-left uppercase text-[9px] leading-tight">
                {displayParticulars}
              </td>
              <td className="border border-black py-1 px-1 text-center">{rsq.quantityOrdered}</td>
              <td className="border border-black py-1 px-1 text-center uppercase">{rsq.unit || 'pcs'}</td>
              {!isCutting && <td className="border border-black py-1 px-1 bg-gray-50/30 text-center">{rsq.quantityOrdered}</td>}
              <td className="border border-black py-1 px-1 text-center">{rsq.quantityReceived || ''}</td>
              <td className="border border-black py-1 px-1 text-center">₱{rsq.fabric?.unitPrice?.toLocaleString() || '0'}</td>
              <td className="border border-black py-1 px-1 text-center">
                {rsq.quantityReceived ? `₱${(rsq.quantityReceived * (rsq.fabric?.unitPrice || 0)).toLocaleString()}` : ''}
              </td>
            </tr>
            {/* Placeholder spacing rows */}
            {[2, 3].map(i => (
              <tr key={i} className="border border-black h-6">
                <td className="border border-black py-0.5 px-1 text-center text-gray-300">{i}</td>
                <td className="border border-black py-0.5 px-2"></td>
                <td className="border border-black py-0.5 px-1"></td>
                <td className="border border-black py-0.5 px-1"></td>
                {!isCutting && <td className="border border-black py-0.5 px-1 bg-gray-50/10"></td>}
                <td className="border border-black py-0.5 px-1"></td>
                <td className="border border-black py-0.5 px-1"></td>
                <td className="border border-black py-0.5 px-1"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Receivers */}
        <div className="flex justify-between items-center text-[9px] font-bold py-1 border-t border-black/5">
          <p>Received by: _______________________</p>
          <p>Received by: _______________________</p>
        </div>

        {/* Bottom Signatories */}
        <div className="grid grid-cols-3 gap-6 pt-3 text-center text-[8px] font-bold uppercase tracking-wider border-t border-black/10">
          <div>
            <p className="mb-4">Requested by:</p>
            <div className="border-b border-black w-2/3 mx-auto"></div>
          </div>
          <div>
            <p className="mb-4">Verified by:</p>
            <div className="border-b border-black w-2/3 mx-auto"></div>
          </div>
          <div>
            <p className="mb-4">Approved by:</p>
            <div className="border-b border-black w-2/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hidden print:flex flex-col gap-6 bg-white text-black p-4 w-full max-w-4xl mx-auto">
      {renderSlipCopy(`(${tailorNickname} COPY)`, 'CUTTING')}
      {renderSlipCopy('(TAILORING COPY)', 'TAILORING')}
      {renderSlipCopy(`${tailorNickname} -> MAIN OFFICE`, 'CUTTING')}
      {renderSlipCopy('TAILORING -> MAIN OFFICE', 'TAILORING')}

      {/* Printing Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: portrait;
            margin: 0.4in;
          }
        }
      `}</style>
    </div>
  );
}
