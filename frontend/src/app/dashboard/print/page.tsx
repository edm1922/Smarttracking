'use client';

import { useEffect, useState } from 'react';
import { Printer as PrinterIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';

interface Item {
  id: string;
  slug: string;
  name: string | null;
}

export default function PrintPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await api.get('/items');
        setItems(response.data);
      } catch (err) {
        console.error('Failed to fetch items', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading labels...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Labels</h1>
          <p className="text-sm text-gray-500">A4 Grid layout for bulk QR generation</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
          >
            <PrinterIcon className="mr-2 h-4 w-4" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Grid Layout for A4 */}
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4 border border-dashed border-gray-300 rounded">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded bg-white"
              style={{ pageBreakInside: 'avoid' }}
            >
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/i/${item.slug}`}
                size={120}
                level="M"
              />
              <span className="mt-3 text-[10px] font-mono font-bold text-gray-900 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                {item.slug}
              </span>
              {item.name && (
                <span className="mt-1 text-[8px] text-gray-500 truncate w-full text-center uppercase">
                  {item.name}
                </span>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400">
              No items available to generate labels.
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .flex-1 { padding: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .max-w-7xl { max-width: none !important; width: 100% !important; }
          .bg-gray-50 { background-color: white !important; }
          .shadow-sm, .border { border: none !important; box-shadow: none !important; }
          .grid { gap: 1cm !important; }
          .flex-col { border: 1px solid #eee !important; }
        }
      `}</style>
    </div>
  );
}
