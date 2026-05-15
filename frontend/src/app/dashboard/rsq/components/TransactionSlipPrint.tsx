
import React from 'react';

interface TransactionSlipPrintProps {
  transaction: any;
}

export function TransactionSlipPrint({ transaction }: TransactionSlipPrintProps) {
  if (!transaction) return null;

  const isWithdrawal = transaction.type === 'WITHDRAWAL';

  return (
    <div className="hidden print:block bg-white text-black p-8 text-xs font-sans w-full max-w-4xl mx-auto border border-black">
      {/* Header section */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900">Maunlad Uniform Inc.</h1>
          <p className="font-bold mt-1 text-sm text-gray-600">MATERIAL TRANSMITTAL REPORT</p>
        </div>
        <div className="text-right">
          <p className="font-black text-lg">TRN NO: {transaction.transactionNo}</p>
          <p className="font-bold">DATE: {new Date(transaction.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-6 p-4 border border-black bg-gray-50">
        <h2 className="font-black uppercase tracking-widest mb-2 border-b border-black pb-1">Transaction Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1"><span className="font-bold w-24 inline-block">Movement:</span> <span className="uppercase font-black bg-white px-2 py-0.5 border border-black">{transaction.type.replace('_', ' ')}</span></p>
            <p><span className="font-bold w-24 inline-block">Location:</span> <span className="uppercase">{transaction.location || 'BODEGA'}</span></p>
          </div>
          <div>
            <p className="mb-1"><span className="font-bold w-24 inline-block">Time:</span> <span>{new Date(transaction.createdAt).toLocaleTimeString()}</span></p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black mb-8 text-left text-sm">
        <thead>
          <tr className="bg-gray-100 border border-black">
            <th className="border border-black py-2 px-3 w-16">Item No.</th>
            <th className="border border-black py-2 px-3">Fabric / Description</th>
            <th className="border border-black py-2 px-3 w-32 text-center">Quantity</th>
            <th className="border border-black py-2 px-3 w-32 text-center">Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border border-black h-16">
            <td className="border border-black py-2 px-3 text-center font-bold">1</td>
            <td className="border border-black py-2 px-3 font-black uppercase text-lg">{transaction.fabric?.name}</td>
            <td className="border border-black py-2 px-3 text-center font-black text-lg">{transaction.quantity}</td>
            <td className="border border-black py-2 px-3 text-center font-bold uppercase">{transaction.unit}</td>
          </tr>
        </tbody>
      </table>

      {/* Remarks Section */}
      <div className="border border-black p-4 mb-12 min-h-[80px]">
        <p className="font-bold uppercase text-xs mb-1">Remarks / Notes:</p>
        <p className="italic text-sm">{transaction.remarks || 'None'}</p>
      </div>

      {/* Signatories */}
      <div className="grid grid-cols-3 gap-8 pt-8 mt-12">
        <div className="text-center">
          <div className="border-b border-black w-full mb-1"></div>
          <p className="font-bold text-xs uppercase">Prepared By</p>
          <p className="text-[10px] text-gray-500 mt-1">Signature over printed name</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-full mb-1"></div>
          <p className="font-bold text-xs uppercase">{isWithdrawal ? 'Issued By' : 'Checked By'}</p>
          <p className="text-[10px] text-gray-500 mt-1">Signature over printed name</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-full mb-1"></div>
          <p className="font-bold text-xs uppercase">Received By</p>
          <p className="text-[10px] text-gray-500 mt-1">Signature over printed name</p>
        </div>
      </div>

      <div className="text-right mt-12 pt-4 border-t border-black/20 text-[10px] text-gray-500 font-mono">
        Smart Tracking System • TRN Ref: {transaction.id} • Printed: {new Date().toLocaleString()}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 0.5in; }
          body { background: white; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
