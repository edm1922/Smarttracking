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
      <div className="w-full h-full bg-white text-black p-6 border border-black rounded-2xl flex flex-col justify-between space-y-4 text-xs font-sans relative shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-black/15 pb-2 shrink-0">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-gray-900">Centro Services Cooperative</h2>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Purok Camachile, Brgy. Tambler, General Santos City</p>
            <p className="text-xs font-black uppercase tracking-widest text-primary mt-1">Uniform Request Slip</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="bg-gray-100 border border-black/20 text-gray-800 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest mb-1 shadow-sm">
              {title}
            </span>
            <p className="font-mono text-[10px] font-bold text-gray-600 uppercase mb-1">
              RQ No.: <span className="text-red-600 text-sm font-black bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300 inline-block align-middle">{rsq.rsqNo}</span>
            </p>
            <p className="text-[9px] font-bold text-gray-500 uppercase">DATE: {formattedDate}</p>
          </div>
        </div>

        {/* Table - takes up remaining vertical space dynamically */}
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          <table className="w-full border-collapse border border-black text-center text-[11px]">
            <thead>
              {/* Main headers */}
              <tr className="bg-gray-50 border border-black">
                <th className="border border-black py-1.5 px-1 w-10">S. NO</th>
                <th className="border border-black py-1.5 px-2 text-left w-52">PARTICULARS</th>
                <th className="border border-black py-1.5 px-1" colSpan={2}>REQUEST</th>
                {isCutting ? (
                  <th className="border border-black py-1.5 px-1" colSpan={3}>OUTPUT (CUTTING)</th>
                ) : (
                  <>
                    <th className="border border-black py-1.5 px-1 w-16" rowSpan={2}>TOTAL CUTTING</th>
                    <th className="border border-black py-1.5 px-1" colSpan={3}>OUTPUT (TAILORING)</th>
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
              <tr className="border border-black h-16 font-black text-xs">
                <td className="border border-black py-1 px-1 text-center text-sm">1</td>
                <td className="border border-black py-1 px-3 text-left uppercase text-[11px] leading-snug font-bold">
                  {displayParticulars}
                </td>
                <td className="border border-black py-1 px-1 text-center text-sm">{rsq.quantityOrdered}</td>
                <td className="border border-black py-1 px-1 text-center uppercase text-sm">{rsq.unit || 'pcs'}</td>
                {!isCutting && <td className="border border-black py-1 px-1 bg-gray-50/30 text-center text-sm">{rsq.quantityOrdered}</td>}
                <td className="border border-black py-1 px-1 text-center text-sm">{rsq.quantityReceived || ''}</td>
                <td className="border border-black py-1 px-1 text-center text-sm">₱{rsq.fabric?.unitPrice?.toLocaleString() || '0'}</td>
                <td className="border border-black py-1 px-1 text-center text-sm font-black">
                  {rsq.quantityReceived ? `₱${(rsq.quantityReceived * (rsq.fabric?.unitPrice || 0)).toLocaleString()}` : ''}
                </td>
              </tr>
              {/* Placeholder spacing rows */}
              {[2, 3].map(i => (
                <tr key={i} className="border border-black h-10">
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
        </div>

        {/* Receivers */}
        <div className="text-[10px] font-bold py-1.5 border-t border-black/5 shrink-0">
          <p>Received by: _______________________</p>
        </div>

        {/* Bottom Signatories */}
        <div className="grid grid-cols-3 gap-8 pt-3 text-center text-[9px] font-bold uppercase tracking-wider border-t border-black/10 shrink-0">
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
    <div className="hidden print:block bg-white text-black w-full">
      <div className="print-page">
        {renderSlipCopy(`(${tailorNickname} COPY)`, 'CUTTING')}
      </div>
      <div className="print-page">
        {renderSlipCopy('(TAILORING COPY)', 'TAILORING')}
      </div>
      <div className="print-page">
        {renderSlipCopy(`${tailorNickname} -> MAIN OFFICE`, 'CUTTING')}
      </div>
      <div className="print-page">
        {renderSlipCopy('TAILORING -> MAIN OFFICE', 'TAILORING')}
      </div>

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
            size: landscape;
            margin: 0 !important;
          }
          .print-page {
            width: 100%;
            height: 100vh;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            padding: 0.25in 0.35in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: white !important;
          }
          .print-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}
