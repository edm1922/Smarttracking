'use client';

import { useEffect, useState } from 'react';
import { 
  Database, Folder, ChevronRight, Search, Download, 
  Filter, Calendar, ArrowLeft, FileSpreadsheet, ListFilter,
  Eye, QrCode, Clock
} from 'lucide-react';
import api from '@/lib/api';

interface Batch {
  id: string;
  batchCode: string;
  description: string | null;
  createdAt: string;
  _count?: {
    items: number;
  };
}

interface CustomField {
  id: string;
  name: string;
  batchId: string | null;
}

interface Item {
  id: string;
  slug: string;
  name: string | null;
  createdAt: string;
  locked: boolean;
  fieldValues: {
    fieldId: string;
    value: any;
  }[];
}

export default function StoragePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'details'>('grid');

  const fetchData = async () => {
    try {
      const [batchesRes, fieldsRes] = await Promise.all([
        api.get('/batches'),
        api.get('/custom-fields')
      ]);
      setBatches(batchesRes.data);
      setFields(fieldsRes.data);
    } catch (err) {
      console.error('Failed to fetch storage data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectBatch = async (batch: Batch) => {
    setLoading(true);
    setSelectedBatch(batch);
    setViewMode('details');
    try {
      const itemsRes = await api.get(`/items?batchId=${batch.id}`);
      setItems(itemsRes.data);
    } catch (err) {
      console.error('Failed to fetch batch items', err);
    } finally {
      setLoading(false);
    }
  };

  const getRelevantFields = () => {
    if (!selectedBatch) return fields.filter(f => !f.batchId);
    return fields.filter(f => f.batchId === selectedBatch.id || !f.batchId);
  };

  const getFieldValue = (item: Item, fieldId: string) => {
    const fv = item.fieldValues?.find(v => v.fieldId === fieldId);
    return fv ? String(fv.value) : '-';
  };

  const filteredBatches = batches.filter(b => 
    b.batchCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewMode === 'details' && selectedBatch) {
    const batchFields = getRelevantFields();
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setViewMode('grid')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
                <Folder className="mr-3 h-7 w-7 text-primary fill-primary/10" />
                Batch: {selectedBatch.batchCode}
              </h1>
              <p className="text-sm text-gray-500 font-medium">Viewing all form submissions in this template</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 border border-green-100 hover:bg-green-100 transition-all">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">QR Code</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                  {batchFields.map(field => (
                    <th key={field.id} className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100">
                      {field.name}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100">Submitted</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={batchFields.length + 4} className="px-6 py-12 text-center text-sm text-gray-400 animate-pulse">Fetching submissions...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={batchFields.length + 4} className="px-6 py-12 text-center text-sm text-gray-400 italic">No submissions found for this batch yet.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <QrCode className="h-4 w-4 text-primary mr-2" />
                          <span className="font-mono text-xs font-black text-primary">{item.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">
                        {item.name || 'Untitled'}
                      </td>
                      {batchFields.map(field => (
                        <td key={field.id} className="px-6 py-4 text-sm text-gray-600 border-l border-gray-50">
                          {getFieldValue(item, field.id)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-xs text-gray-400 border-l border-gray-50">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a 
                          href={`/i/${item.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 hover:bg-primary/5 rounded-lg inline-block transition-all group"
                        >
                          <Eye className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <Database className="mr-3 h-8 w-8 text-primary" />
            Submission Storage
          </h1>
          <p className="text-sm text-gray-500 font-medium">Access and analyze all data captured through QR forms</p>
        </div>
        <div className="flex items-center space-x-2 bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setViewMode('details')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'details' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ListFilter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by batch name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-2xl border-none bg-white py-4 pl-12 pr-4 text-sm text-gray-900 shadow-xl shadow-gray-200/50 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Global Storage */}
        <div 
          onClick={() => fetchData()} // Just refresh for now
          className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer"
        >
          <div className="absolute top-6 right-8 opacity-5 group-hover:opacity-20 transition-opacity">
            <Folder className="h-16 w-16" />
          </div>
          <div className="bg-gray-50 h-16 w-16 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Database className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-1">Global Storage</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Miscellaneous Data</p>
          <div className="mt-8 flex items-center text-xs font-bold text-primary group-hover:translate-x-2 transition-transform">
            OPEN FOLDER <ChevronRight className="ml-1 h-3 w-3" />
          </div>
        </div>

        {filteredBatches.map((batch) => (
          <div 
            key={batch.id}
            onClick={() => handleSelectBatch(batch)}
            className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer"
          >
            <div className="absolute top-6 right-8 opacity-5 group-hover:opacity-20 transition-opacity">
              <Folder className="h-16 w-16" />
            </div>
            <div className="bg-primary/5 h-16 w-16 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-500">
              <Folder className="h-8 w-8 text-primary fill-primary/10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">{batch.batchCode}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{batch._count?.items || 0} Submissions</p>
            <div className="mt-8 flex items-center text-xs font-bold text-primary group-hover:translate-x-2 transition-transform">
              EXPLORE DATA <ChevronRight className="ml-1 h-3 w-3" />
            </div>
          </div>
        ))}

        {filteredBatches.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="bg-gray-50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Folder className="h-10 w-10 text-gray-200" />
            </div>
            <p className="text-gray-400 font-medium">No storage folders found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutGrid(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
  );
}
