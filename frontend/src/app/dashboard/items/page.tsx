'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Lock, Unlock, Edit2, Trash2, QrCode, 
  X, ImageIcon, ListPlus, LayoutGrid, Tags as TagsIcon, Box,
  Truck
} from 'lucide-react';
import api from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUrlFilters } from '@/hooks/useUrlFilters';

interface Item {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  status: string;
  locked: boolean;
  imageUrl: string | null;
  createdAt: string;
  fieldValues?: any[];
  category?: { name: string };
  tags?: { tag: { name: string } }[];
  batchId: string | null;
  batch?: { id: string; batchCode: string } | null;
}

export default function QRItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  
  const { getFilter, setFilter } = useUrlFilters();
  const [loading, setLoading] = useState(true);
  const [togglingLock, setTogglingLock] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(getFilter('search'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const defaultFormData = {
    name: '',
    description: '',
    status: 'Available',
    categoryId: '',
    batchId: '',
    tagIds: [] as string[],
    copies: 1,
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [initialFormData, setInitialFormData] = useState(defaultFormData);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const [abortRequested, setAbortRequested] = useState(false);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') : '';

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes, tagsRes, batchesRes, fieldsRes] = await Promise.all([
        api.get('/items'),
        api.get('/categories'),
        api.get('/tags'),
        api.get('/batches'),
        api.get('/custom-fields')
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setTags(tagsRes.data);
      setBatches(batchesRes.data);
      setCustomFields(fieldsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item: Item | null = null) => {
    if (item) {
      setEditingItem(item);
      const data = {
        name: item.name || '',
        description: item.description || '',
        status: item.status,
        categoryId: (item as any).categoryId || '',
        batchId: (item as any).batchId || '',
        tagIds: item.tags?.map(t => (t as any).tagId) || [],
        copies: 1,
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      setEditingItem(null);
      setFormData(defaultFormData);
      setInitialFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (JSON.stringify(formData) !== JSON.stringify(initialFormData)) {
      setIsConfirmOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.patch(`/items/${editingItem.slug}`, formData);
        setIsModalOpen(false);
        fetchData();
      } else {
        const copies = formData.copies;
        setIsModalOpen(false); // Close the input modal
        setIsGenerating(true);
        setAbortRequested(false);
        setCurrentProgress(0);
        setTotalToGenerate(copies);

        for (let i = 0; i < copies; i++) {
          // Use a local variable check or a state check that we can break out of
          if ((window as any).confirmAbort) {
            console.log('Aborting generation...');
            break;
          }
          await api.post('/items', { ...formData, copies: 1 });
          setCurrentProgress(i + 1);
        }
        
        delete (window as any).confirmAbort;
        setIsGenerating(false);
        fetchData();
      }
    } catch (err: any) {
      setIsGenerating(false);
      alert(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleToggleLock = async (slug: string) => {
    setTogglingLock(prev => [...prev, slug]);
    try {
      await api.patch(`/items/${slug}/lock`);
      await fetchData();
    } catch (err) {
      alert('Only admins can unlock forms.');
    } finally {
      setTogglingLock(prev => prev.filter(s => s !== slug));
    }
  };

  const handleDelete = (item: Item) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/items/${itemToDelete.slug}`);
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const [filterStatus, setFilterStatus] = useState(getFilter('status', 'all'));
  const [selectedBatchId, setSelectedBatchId] = useState(getFilter('batch', 'all'));

  useEffect(() => {
    setFilter('search', searchTerm || null);
    setFilter('status', filterStatus !== 'all' ? filterStatus : null);
    setFilter('batch', selectedBatchId !== 'all' ? selectedBatchId : null);
  }, [searchTerm, filterStatus, selectedBatchId]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'released' && item.status === 'Released') ||
      (filterStatus === 'active' && !item.locked) ||
      (filterStatus === 'locked' && item.locked);

    const matchesBatch = selectedBatchId === 'all' || 
                         (selectedBatchId === 'global' ? !item.batchId : item.batchId === selectedBatchId);

    return matchesSearch && matchesFilter && matchesBatch;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Generator</h1>
          <p className="text-sm text-gray-500">Generate unique QR codes for dynamic data capture</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate New QR
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search QR codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 rounded-md border border-gray-300 bg-white text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
        >
          <option value="all">All Status</option>
          <option value="active">Active Forms</option>
          <option value="locked">Locked Forms</option>
          <option value="released">Released Items</option>
        </select>
        <select 
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="px-4 py-3 rounded-md border border-gray-300 bg-white text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
        >
          <option value="all">All Batches</option>
          <option value="global">Global (No Batch)</option>
          {batches.map(batch => (
            <option key={batch.id} value={batch.id}>{batch.batchCode}</option>
          ))}
        </select>
      </div>

      <div className="table-container bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">QR Code / Slug</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Form Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Generated</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState 
                    icon={QrCode}
                    title={searchTerm ? "No matches found" : "No QR Codes Generated"}
                    description={searchTerm ? `We couldn't find any QR codes matching "${searchTerm}". Try a different term.` : "Start by generating your first unique QR code to track assets or capture data."}
                    action={searchTerm ? undefined : {
                      label: "Generate New QR",
                      onClick: () => handleOpenModal()
                    }}
                  />
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.status === 'Released' ? 'bg-purple-50/30' : ''}`}>
                  <td className="px-6 py-4 relative">
                    {/* Batch Group Identifier */}
                    {item.batch && (
                      <div 
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-60" 
                        style={{ backgroundColor: `hsl(${parseInt(item.batch.id.slice(-4), 16) % 360}, 70%, 50%)` }}
                        title={`Batch: ${item.batch.batchCode}`}
                      />
                    )}
                    <div className="flex items-center">
                      <QrCode className="h-5 w-5 text-primary mr-3" />
                      <div>
                        <div className="text-sm font-mono font-bold text-primary uppercase">{item.slug}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {item.batch?.batchCode || item.name || 'Untitled Form'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'Released' 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {item.status === 'Released' && <Truck className="h-3 w-3 mr-1" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      item.locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.locked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                      {item.locked ? 'Locked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleToggleLock(item.slug)} 
                        disabled={togglingLock.includes(item.slug)}
                        title={item.locked ? 'Unlock (Admin Only)' : 'Lock Form'}
                        className={`p-1.5 rounded-md transition-all ${
                          togglingLock.includes(item.slug) ? 'opacity-50 cursor-wait' :
                          item.locked ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {togglingLock.includes(item.slug) ? (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          item.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />
                        )}
                      </button>
                      <a 
                        href={`/i/${item.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 text-primary hover:bg-primary/5 rounded-md"
                      >
                        <Edit2 className="h-4 w-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(item)} 
                        title="Delete QR"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Generate Unique QR Code</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of QR Codes to Generate</label>
                  <input required type="number" min="1" max="100" value={formData.copies} onChange={(e) => setFormData({...formData, copies: parseInt(e.target.value) || 1})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
              )}
              {editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Reference Name</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Site Visit Form - Area A" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch (Template)</label>
                <select 
                  value={formData.batchId} 
                  onChange={(e) => setFormData({...formData, batchId: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none text-primary font-bold"
                >
                  <option value="">No Batch (Global Fields)</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batchCode}</option>)}
                </select>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  {formData.batchId 
                    ? `This QR code is assigned to Batch ${batches.find(b => b.id === formData.batchId)?.batchCode}. It will display fields assigned to this batch.`
                    : 'This will generate a unique URL and QR code. When scanned, it will display a form containing all global Custom Fields.'
                  }
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-900">Cancel</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-md transition-all active:scale-95">Generate QR</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary h-20 w-20 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/40 rotate-12 animate-pulse">
                <QrCode className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Generating QR Codes</h2>
              <p className="text-sm text-gray-500 font-medium mt-2">Please wait while we secure your unique identifiers</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-primary">
                <span>Progress</span>
                <span>{currentProgress} / {totalToGenerate}</span>
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  style={{ width: `${(currentProgress / totalToGenerate) * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                DO NOT CLOSE THIS TAB UNTIL FINISHED
              </p>
            </div>

            <button 
              onClick={() => {
                if (confirm('Are you sure you want to abort the generation process? Some items may have already been created.')) {
                  (window as any).confirmAbort = true;
                  setAbortRequested(true);
                }
              }}
              disabled={abortRequested}
              className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              {abortRequested ? 'Aborting...' : 'Abort Generation'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved information in this form. Are you sure you want to discard it?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        onConfirm={() => {
          setIsConfirmOpen(false);
          setIsModalOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Delete QR Code"
        message={`Are you sure you want to delete QR code ${itemToDelete?.slug}? This will permanently remove all associated data capture history.`}
        confirmText="Delete QR Data"
        cancelText="Keep Item"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        isDestructive={true}
        requireConfirmationText="DELETE"
      />
    </div>
  );
}

function Info(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  );
}
