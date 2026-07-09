'use client';

import Link from 'next/link';
import { Package, FileText, DollarSign, ClipboardList } from 'lucide-react';

const portals = [
  {
    href: '/dashboard/transmittal/product',
    title: 'Stock Transmittal',
    description: 'Material and employee stock release transmittal',
    icon: Package,
    color: 'bg-blue-600',
    shadow: 'shadow-blue-200',
    hover: 'hover:bg-blue-700',
  },
  {
    href: '/dashboard/transmittal/purchase-request',
    title: 'Purchase Request',
    description: 'Procurement and purchase requisition documents',
    icon: FileText,
    color: 'bg-emerald-600',
    shadow: 'shadow-emerald-200',
    hover: 'hover:bg-emerald-700',
  },
  {
    href: '/dashboard/transmittal/budget-request',
    title: 'Budget Request',
    description: 'Service and labor budget requisition',
    icon: DollarSign,
    color: 'bg-purple-600',
    shadow: 'shadow-purple-200',
    hover: 'hover:bg-purple-700',
  },
  {
    href: '/dashboard/transmittal/unit-tracking-log',
    title: 'Unit Tracking Log',
    description: 'Unit tracking inventory transmittal log',
    icon: ClipboardList,
    color: 'bg-amber-600',
    shadow: 'shadow-amber-200',
    hover: 'hover:bg-amber-700',
  },
];

export default function TransmittalPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Transmittal Portal</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-4">Select a transmittal type to begin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portals.map(portal => {
          const Icon = portal.icon;
          return (
            <Link
              key={portal.href}
              href={portal.href}
              className="group bg-white rounded-[2rem] border border-gray-200 shadow-xl shadow-gray-100/50 p-8 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`h-16 w-16 ${portal.color} text-white rounded-2xl flex items-center justify-center shadow-lg ${portal.shadow} mb-6 group-hover:scale-105 transition-transform`}>
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2 group-hover:text-primary transition-colors">
                {portal.title}
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {portal.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
