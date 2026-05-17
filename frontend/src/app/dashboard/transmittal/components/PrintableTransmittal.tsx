import React from 'react';
import { TransmittalHeaderInfo, TransmittalItem } from '../types';

interface PrintableTransmittalProps {
  headerInfo: TransmittalHeaderInfo;
  transmittalType: 'MATERIAL' | 'EMPLOYEE';
  selectedItems: TransmittalItem[];
}

export const PrintableTransmittal: React.FC<PrintableTransmittalProps> = ({
  headerInfo,
  transmittalType,
  selectedItems,
}) => {
  return (
    <div className="hidden print:block bg-white p-12 text-gray-900 min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">
            {headerInfo.subject || 'Material Transmittal'}
          </h1>
          <p className="text-sm font-bold text-gray-500">
            {headerInfo.customSubHeader || headerInfo.subTitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Transmittal No.</div>
          <div className="text-xl font-black font-mono">{headerInfo.transmittalNo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-3">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Department:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">{headerInfo.department || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">End-User / Recipient:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">{headerInfo.endUser || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Position:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">{headerInfo.position || '____________________'}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Date:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">
              {headerInfo.date ? new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '____________________'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Source / Supplier:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">{headerInfo.sourceSupplier || '____________________'}</div>
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Subject:</div>
            <div className="text-sm font-bold border-b border-gray-100 pb-0.5">{headerInfo.subject}</div>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse mb-8 border border-gray-900">
        <thead>
          <tr className="border-b-2 border-gray-900 bg-gray-50">
            {transmittalType === 'EMPLOYEE' ? (
              <>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest w-8 border-r border-gray-900">No.</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Requested by</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Item requested</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Date requested</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest w-20">Qty</th>
              </>
            ) : (
              <>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest w-8 border-r border-gray-900">No.</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Description</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest w-20 border-r border-gray-900">Qty</th>
                <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest">Part No. / SKU</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {selectedItems.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-900">
              {transmittalType === 'EMPLOYEE' ? (
                <>
                  <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 text-center">{idx + 1}</td>
                  <td className="py-2 px-3 text-[10px] font-black border-r border-gray-900 uppercase">{item.requestedBy || '-'}</td>
                  <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 uppercase">{item.name}</td>
                  <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900">{item.dateRequested || '-'}</td>
                  <td className="py-2 px-3 text-[10px] font-black text-center">{item.quantity} {item.unit || 'PCS'}</td>
                </>
              ) : (
                <>
                  <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 text-center">{idx + 1}</td>
                  <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 uppercase">{item.name}</td>
                  <td className="py-2 px-3 text-[10px] font-black border-r border-gray-900 text-center">{item.quantity} {item.unit || 'PCS'}</td>
                  <td className="py-2 px-3 text-[10px] font-mono">{item.sku || '-'}</td>
                </>
              )}
            </tr>
          ))}
          {/* Fill remaining space to keep layout consistent if few items */}
          {Array.from({ length: Math.max(0, 10 - selectedItems.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-gray-900 h-8">
              {Array.from({ length: transmittalType === 'EMPLOYEE' ? 5 : 4 }).map((_, j) => (
                <td key={`empty-cell-${j}`} className={`py-2 px-3 border-r border-gray-900 last:border-r-0`}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-8">
        {(['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'] as const).filter(field => {
          const showField = field === 'preparedBy' ? 'showPrepared' : 
                          field === 'checkedBy' ? 'showChecked' :
                          field === 'receivedBy' ? 'showReceived' : 'showApproved';
          return headerInfo[showField];
        }).map(field => (
          <div key={field} className="flex flex-col items-start pt-1">
            <div className="w-full text-[9px] font-black text-gray-400 uppercase mb-4">
              {field.replace(/By$/, ' By')}:
            </div>
            <div className="w-full">
              <div className="text-[10px] font-black mb-1 uppercase text-center">
                {headerInfo[field] || '____________________'}
              </div>
              <div className="border-b-2 border-gray-900 w-full mb-1"></div>
              <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">
                Signature Over Printed Name / Date
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase text-center tracking-[0.2em]">
        Smarttracking Enterprise Logistics & Supply Chain System
      </div>
    </div>
  );
};
