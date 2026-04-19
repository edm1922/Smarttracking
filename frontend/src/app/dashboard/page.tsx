'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Lock, Unlock, Edit2, Trash2, QrCode, 
  Upload, X, Image as ImageIcon, ListPlus, LayoutGrid, 
  Tags as TagsIcon, Box, BarChart3, Activity 
} from 'lucide-react';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';

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
  batch?: { batchCode: string };
}

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  options: any;
  required: boolean;
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Available',
    categoryId: '',
    batchId: '',
    tagIds: [] as string[],
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') : '';

  const fetchData = async () => {
    try {
      const [itemsRes, fieldsRes, catsRes, tagsRes, batchesRes, statsRes] = await Promise.all([
        api.get('/items'),
        api.get('/custom-fields'),
        api.get('/categories'),
        api.get('/tags'),
        api.get('/batches'),
        api.get('/reports/summary')
      ]);
      setItems(itemsRes.data);
      setCustomFields(fieldsRes.data);
      setCategories(catsRes.data);
      setTags(tagsRes.data);
      setBatches(batchesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
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
      setFormData({
        name: item.name || '',
        description: item.description || '',
        status: item.status,
        categoryId: (item as any).categoryId || '',
        batchId: (item as any).batchId || '',
        tagIds: item.tags?.map(t => (t as any).tagId) || [],
      });
      const values: Record<string, any> = {};
      item.fieldValues?.forEach(fv => {
        values[fv.fieldId] = fv.value;
      });
      setDynamicValues(values);
      setImagePreview(item.imageUrl);
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', status: 'Available', categoryId: '', batchId: '', tagIds: [] });
      setDynamicValues({});
      setImagePreview(null);
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        fieldValues: Object.entries(dynamicValues).map(([fieldId, value]) => ({
          fieldId,
          value,
        })),
      };

      let resultItem;
      if (editingItem) {
        const res = await api.patch(`/items/${editingItem.slug}`, payload);
        resultItem = res.data;
      } else {
        const res = await api.post('/items', payload);
        resultItem = res.data;
      }

      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('image', selectedFile);
        await api.post(`/items/${resultItem.slug}/image`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleToggleLock = async (slug: string) => {
    try {
      await api.patch(`/items/${slug}/lock`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle lock');
    }
  };

  const filteredItems = items.filter(item => 
    item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time inventory overview and management</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </button>
      </div>

      {/* Analytics Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Items</span>
              <Box className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalItems}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Breakdown</span>
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex space-x-2">
              {stats.itemsByStatus.map((s: any) => (
                <div key={s.status} className="text-[10px] font-bold">
                  <span className="text-gray-500">{s.status}:</span> {s._count}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categories</span>
              <LayoutGrid className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Batches</span>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search inventory by ID, name, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="table-cell font-semibold">Asset</th>
              <th className="table-cell font-semibold">Category</th>
              <th className="table-cell font-semibold">Batch</th>
              <th className="table-cell font-semibold">Tags</th>
              <th className="table-cell font-semibold">Status</th>
              <th className="table-cell font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="table-cell text-center py-10">Syncing with database...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center py-10">No matching assets found.</td></tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover border border-gray-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200">
                            <ImageIcon className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-mono font-bold text-primary">{item.slug}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name || 'Unnamed'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {item.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs font-mono text-blue-600">
                      {item.batch?.batchCode || '-'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {item.tags?.map(t => (
                        <span key={t.tag.name} className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 rounded">
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                      item.status === 'Available' ? 'bg-green-100 text-green-800' :
                      item.status === 'Used' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleToggleLock(item.slug)} disabled={userRole !== 'admin'} className={`p-1.5 rounded-md ${item.locked ? 'text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {item.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleOpenModal(item)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <a href={`/i/${item.slug}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                        <QrCode className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Improved Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">{editingItem ? 'Edit Asset Record' : 'Create New Asset'}</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Media & Core */}
                <div className="space-y-6">
                  <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    {imagePreview ? (
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-inner">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => {setImagePreview(null); setSelectedFile(null);}} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <ImageIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <label className="cursor-pointer text-sm font-bold text-primary hover:text-primary-dark">
                          Add Material Photo
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Material Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>

                {/* Right Column: Organization */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                      <select value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">None</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Batch Group</label>
                      <select value={formData.batchId} onChange={(e) => setFormData({...formData, batchId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">None</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.batchCode}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 font-bold outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="Available">Available</option>
                        <option value="Used">Used</option>
                        <option value="Defective">Defective</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const newTags = formData.tagIds.includes(tag.id) 
                                ? formData.tagIds.filter(id => id !== tag.id) 
                                : [...formData.tagIds, tag.id];
                              setFormData({...formData, tagIds: newTags});
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              formData.tagIds.includes(tag.id) 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields Section */}
              {customFields.length > 0 && (
                <div className="pt-8 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                    <ListPlus className="mr-2 h-4 w-4" />
                    Material Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {customFields.map(field => (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{field.name}</label>
                        {field.fieldType === 'dropdown' ? (
                          <select value={dynamicValues[field.id] || ''} onChange={(e) => setDynamicValues({...dynamicValues, [field.id]: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2">
                            <option value="">Select...</option>
                            {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type={field.fieldType} value={dynamicValues[field.id] || ''} onChange={(e) => setDynamicValues({...dynamicValues, [field.id]: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Discard</button>
                <button type="submit" className="px-10 py-3 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95">
                  {editingItem ? 'Update Asset' : 'Generate Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
