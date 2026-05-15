
import React from 'react';

interface RSQSlipPrintProps {
  rsq: any;
}

export function RSQSlipPrint({ rsq }: RSQSlipPrintProps) {
  if (!rsq) return null;

  return (
    <div className="hidden print:block bg-white text-black p-8 text-xs font-sans w-full max-w-4xl mx-auto border border-black">
      {/* Header section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black pb-1 inline-block">Maunlad Uniform Inc.</h1>
          <p className="font-bold mt-1 text-sm">FABRIC & TAILORING REQUEST SLIP</p>
        </div>
        <div className="text-right border border-black p-2 bg-gray-100">
          <p className="font-bold text-sm">RSQ NO: {rsq.rsqNo}</p>
          <p className="font-semibold">DATE: {new Date(rsq.orderDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Details section */}
      <div className="grid grid-cols-2 gap-4 mb-4 border border-black p-4">
        <div>
          <p className="mb-2"><span className="font-bold uppercase inline-block w-24">Tailor Name:</span> <span className="border-b border-black px-2 py-0.5 min-w-[200px] inline-block font-bold">{rsq.tailor?.name}</span></p>
          <p><span className="font-bold uppercase inline-block w-24">Item/Style:</span> <span className="border-b border-black px-2 py-0.5 min-w-[200px] inline-block font-bold">{rsq.product?.name || rsq.remarks || 'N/A'}</span></p>
        </div>
        <div>
          <p className="mb-2"><span className="font-bold uppercase inline-block w-24">Target Date:</span> <span className="border-b border-black px-2 py-0.5 min-w-[200px] inline-block font-bold">{rsq.targetDate ? new Date(rsq.targetDate).toLocaleDateString() : 'N/A'}</span></p>
          <p><span className="font-bold uppercase inline-block w-24">Status:</span> <span className="border-b border-black px-2 py-0.5 min-w-[200px] inline-block font-bold">{rsq.status}</span></p>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black mb-8 text-center text-sm">
        <thead>
          <tr className="bg-gray-100 border border-black">
            <th className="border border-black py-2 px-2 w-12">S. NO</th>
            <th className="border border-black py-2 px-2 text-left">PARTICULARS / FABRIC</th>
            <th className="border border-black py-2 px-2" colSpan={2}>REQUEST</th>
            <th className="border border-black py-2 px-2" colSpan={2}>OUTPUT (CUTTING)</th>
            <th className="border border-black py-2 px-2">OUTPUT (TAILOR)</th>
          </tr>
          <tr className="border border-black bg-gray-50 text-[10px]">
            <th className="border border-black py-1 px-1"></th>
            <th className="border border-black py-1 px-1"></th>
            <th className="border border-black py-1 px-1 w-20">QTY</th>
            <th className="border border-black py-1 px-1 w-20">UNIT</th>
            <th className="border border-black py-1 px-1 w-20">QTY</th>
            <th className="border border-black py-1 px-1 w-24">PRICE</th>
            <th className="border border-black py-1 px-1 w-24">TOTAL QTY</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border border-black h-12">
            <td className="border border-black py-2 px-2">1</td>
            <td className="border border-black py-2 px-2 text-left font-bold">{rsq.fabric?.name || 'N/A'}</td>
            <td className="border border-black py-2 px-2 font-bold">{rsq.quantityOrdered}</td>
            <td className="border border-black py-2 px-2 uppercase font-bold">{rsq.unit}</td>
            <td className="border border-black py-2 px-2 bg-gray-100/50"></td>
            <td className="border border-black py-2 px-2 bg-gray-100/50"></td>
            <td className="border border-black py-2 px-2 font-bold">{rsq.quantityReceived || 0}</td>
          </tr>
          {/* Empty rows for spacing to match physical slip */}
          {[2, 3, 4, 5].map(i => (
            <tr key={i} className="border border-black h-8">
              <td className="border border-black py-1 px-2">{i}</td>
              <td className="border border-black py-1 px-2"></td>
              <td className="border border-black py-1 px-2"></td>
              <td className="border border-black py-1 px-2"></td>
              <td className="border border-black py-1 px-2"></td>
              <td className="border border-black py-1 px-2"></td>
              <td className="border border-black py-1 px-2"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks Section */}
      <div className="border border-black p-2 mb-8 min-h-[60px]">
        <p className="font-bold uppercase text-[10px]">Remarks / Instructions:</p>
        <p className="italic">{rsq.remarks}</p>
      </div>

      {/* Signatories */}
      <div className="grid grid-cols-4 gap-4 pt-4 mt-8">
        <div className="text-center">
          <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
          <p className="font-bold text-[10px] uppercase">Prepared By</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
          <p className="font-bold text-[10px] uppercase">Checked By</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
          <p className="font-bold text-[10px] uppercase">Approved By</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
          <p className="font-bold text-[10px] uppercase">Received By (Tailor)</p>
        </div>
      </div>

      <div className="text-right mt-8 pt-4 border-t border-black/20 text-[9px] text-gray-500 font-mono">
        Smart Tracking System • RSQ Ref: {rsq.id} • Printed: {new Date().toLocaleString()}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5in; }
          body { background: white; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
