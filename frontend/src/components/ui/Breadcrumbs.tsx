'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeMap: Record<string, string> = {
  'dashboard': 'Home',
  'products': 'Inventory',
  'items': 'QR System',
  'users': 'Accounts',
  'locations': 'Warehouses',
  'custom-fields': 'Fields',
  'batches': 'Batch Management',
  'rsq': 'Fabric & Tailoring',
  'staff': 'Staff Portal',
  'requisition': 'Requisition',
  'unit-requisition': 'Unit QR',
  'storage': 'Storage History',
  'print': 'Print Labels',
  'unit-tracking': 'Unit Tracking',
  'payroll': 'Payroll Hub',
  'my-payslips': 'Payslips',
  'transmittal': 'Transmittal',
  'product': 'Stocks',
  'purchase-request': 'PR'
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = routeMap[segment] || (segment.length > 20 ? 'Details' : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '));
    const isLast = index === pathSegments.length - 1;

    return { href, label, isLast, segment };
  }).filter(crumb => crumb.segment !== 'dashboard'); // Hide the redundant /dashboard crumb

  if (breadcrumbs.length === 0 && pathname === '/dashboard') return null;

  // Determine portal home
  const homeHref = pathname.startsWith('/dashboard/payroll') 
    ? '/dashboard/payroll' 
    : pathname.startsWith('/dashboard/staff') 
      ? '/dashboard/staff' 
      : '/dashboard';

  return (
    <nav className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 no-print animate-in fade-in slide-in-from-left-2 duration-500">
      <Link 
        href={homeHref} 
        className="flex items-center hover:text-primary transition-colors"
      >
        <Home className="h-3 w-3 mr-1" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          {crumb.isLast ? (
            <span className="text-gray-900 px-2 py-0.5 bg-white rounded-md border border-gray-100 shadow-sm">
              {crumb.label}
            </span>
          ) : (
            <Link 
              href={crumb.href}
              className="hover:text-primary transition-colors px-1"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
