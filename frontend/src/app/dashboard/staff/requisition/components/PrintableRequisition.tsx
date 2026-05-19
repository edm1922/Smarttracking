import React from 'react';
import { SelectedItem, Employee } from './RSQTypes';

interface PrintableRequisitionProps {
  form: any;
  employees: Employee[];
  selectedItems: SelectedItem[];
}

export const PrintableRequisition: React.FC<PrintableRequisitionProps> = ({
  form,
  employees,
  selectedItems,
}) => {
  // Flatten items per employee so we can print a clean signable table
  const flatRows: any[] = [];
  employees.forEach(emp => {
    selectedItems.forEach(item => {
      const qty = item.quantities && item.quantities[emp.name] !== undefined ? item.quantities[emp.name] : 0;
      if (qty > 0) {
        flatRows.push({
          employeeName: emp.name,
          employeeRole: emp.position,
          employeeDept: emp.department,
          productName: item.productName,
          sku: item.sku,
          description: item.description,
          quantity: qty,
          unit: item.unit || 'pcs'
        });
      }
    });
  });

  return (
    <div className="hidden print-only bg-white p-12 text-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-1">
            MATERIAL REQUISITION SLIP
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Centro Services Cooperative
          </p>
          <p className="text-[9px] text-gray-400 uppercase mt-0.5">
            Purok Camachile, Brgy. Tambler, General Santos City
          </p>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Date:</div>
          <div className="text-sm font-bold">
            {form.date ? new Date(form.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '____________________'}
          </div>
        </div>
      </div>

      {/* Context Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8 border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
        <div>
          <div className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Source Location:</div>
          <div className="text-xs font-bold uppercase">MAIN OFFICE</div>
        </div>
        <div>
          <div className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Operational Shift:</div>
          <div className="text-xs font-bold uppercase">{form.shift || 'SHIFT 1'}</div>
        </div>
        <div>
          <div className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Dept / Area:</div>
          <div className="text-xs font-bold uppercase">{form.departmentArea || '____________________'}</div>
        </div>
      </div>

      {/* Requisition Table */}
      <table className="w-full border-collapse mb-8 border border-gray-900">
        <thead>
          <tr className="border-b-2 border-gray-900 bg-gray-50">
            <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest w-8 border-r border-gray-900">No.</th>
            <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Employee Name</th>
            <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Department / Role</th>
            <th className="py-2 px-3 text-left text-[8px] font-black uppercase tracking-widest border-r border-gray-900">Item Requested</th>
            <th className="py-2 px-3 text-center text-[8px] font-black uppercase tracking-widest w-20 border-r border-gray-900">Qty</th>
            <th className="py-2 px-3 text-center text-[8px] font-black uppercase tracking-widest w-20 border-r border-gray-900">Unit</th>
            <th className="py-2 px-3 text-center text-[8px] font-black uppercase tracking-widest w-32">Recipient Signature</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {flatRows.length > 0 ? (
            flatRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-900">
                <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 text-center">{idx + 1}</td>
                <td className="py-2 px-3 text-[10px] font-black border-r border-gray-900 uppercase">{row.employeeName}</td>
                <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 uppercase">
                  {row.employeeRole} {row.employeeDept ? `• ${row.employeeDept}` : ''}
                </td>
                <td className="py-2 px-3 text-[10px] font-bold border-r border-gray-900 uppercase">
                  {row.productName}
                  {row.description ? ` (${row.description})` : ''}
                </td>
                <td className="py-2 px-3 text-[10px] font-black border-r border-gray-900 text-center">{row.quantity}</td>
                <td className="py-2 px-3 text-[10px] font-black border-r border-gray-900 text-center uppercase">{row.unit}</td>
                <td className="py-2 px-3 text-[10px] font-mono border-gray-900 text-center h-10"></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="py-8 text-center text-xs font-bold text-gray-400 uppercase italic">
                No items requested
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signature Block */}
      <div className="grid grid-cols-3 gap-12 pt-8">
        <div className="flex flex-col items-start pt-1">
          <div className="w-full text-[8px] font-black text-gray-400 uppercase mb-6">Requested by:</div>
          <div className="w-full">
            <div className="text-[10px] font-black mb-1 uppercase text-center h-4"></div>
            <div className="border-b-2 border-gray-900 w-full mb-1"></div>
            <div className="text-center text-[7px] font-bold text-gray-400 uppercase italic tracking-tighter">
              Requisitioner / Preparation Officer
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start pt-1">
          <div className="w-full text-[8px] font-black text-gray-400 uppercase mb-6">Verified by:</div>
          <div className="w-full">
            <div className="text-[10px] font-black mb-1 uppercase text-center">
              {form.supervisorName || '____________________'}
            </div>
            <div className="border-b-2 border-gray-900 w-full mb-1"></div>
            <div className="text-center text-[7px] font-bold text-gray-400 uppercase italic tracking-tighter">
              Direct Supervisor / Sign-Off
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start pt-1">
          <div className="w-full text-[8px] font-black text-gray-400 uppercase mb-6">Approved by:</div>
          <div className="w-full">
            <div className="text-[10px] font-black mb-1 uppercase text-center h-4"></div>
            <div className="border-b-2 border-gray-900 w-full mb-1"></div>
            <div className="text-center text-[7px] font-bold text-gray-400 uppercase italic tracking-tighter">
              Warehouse Checker / Logistics Officer
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase text-center tracking-[0.2em]">
        Smarttracking Enterprise Requisition & Resource Queue System
      </div>
    </div>
  );
};
