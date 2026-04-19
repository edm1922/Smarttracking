'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, Unlock, ArrowLeft, Save, AlertCircle, Clock, 
  History, ChevronDown, ChevronUp, Image as ImageIcon, 
  ListPlus, LayoutGrid, Tags as TagsIcon, Box 
} from 'lucide-react';
import api from '@/lib/api';

export default function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [item, setItem] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    status: '',
    categoryId: '',
    batchId: '',
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');

  const fetchData = async () => {
    try {
      const itemRes = await api.get(`/items/${slug}`);
      setItem(itemRes.data);
      setFormData({
        name: itemRes.data.name || '',
        description: itemRes.data.description || '',
        status: itemRes.data.status,
        categoryId: itemRes.data.categoryId || '',
        batchId: itemRes.data.batchId || '',
      });
      const values: Record<string, any> = {};
      itemRes.data.fieldValues?.forEach((fv: any) => {
        values[fv.fieldId] = fv.value;
      });
      setDynamicValues(values);

      const logsRes = await api.get(`/logs/item/${itemRes.data.id}`);
      setLogs(logsRes.data);
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Item not found' : 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    setUserRole(localStorage.getItem('role') || '');
    fetchData();
  }, [slug]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        fieldValues: Object.entries(dynamicValues).map(([fieldId, value]) => ({
          fieldId,
          value,
        })),
      };
      await api.patch(`/items/${slug}`, payload);
      await fetchData();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = isLoggedIn && (!item?.locked || userRole === 'admin');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-gray-500 font-medium tracking-tighter uppercase text-xs">Accessing record...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-red-50 text-center">
        <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
        <p className="text-gray-500 mb-8">This digital twin or asset record cannot be found.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all">
          Exit to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
          {/* Hero Section */}
          <div className="relative h-72 group">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                <ImageIcon className="h-20 w-20 mb-4 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-30">Visual assets not available</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {item.category?.name || 'Uncategorized'}
                </div>
                {item.batch && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {item.batch.batchCode}
                  </div>
                )}
              </div>
              <h1 className="text-4xl font-mono font-black tracking-tighter">{item.slug}</h1>
            </div>
            <div className="absolute top-6 right-6">
              <div className={`p-3 rounded-2xl shadow-lg backdrop-blur bg-white/90 ${item.locked ? 'text-red-600' : 'text-green-600'}`}>
                {item.locked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
              </div>
            </div>
          </div>

          <div className="p-10">
            {isEditing ? (
              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Material Name</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm text-gray-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Update Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all">
                        <option value="Available">Available</option>
                        <option value="Used">Used</option>
                        <option value="Defective">Defective</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Core Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm text-gray-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
                  </div>

                  {/* Dynamic Fields */}
                  {item.fieldValues?.length > 0 && (
                    <div className="pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <h3 className="col-span-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Specifications</h3>
                      {item.fieldValues.map((fv: any) => (
                        <div key={fv.field.id}>
                          <label className="block text-xs font-bold text-gray-500 mb-1">{fv.field.name}</label>
                          <input type={fv.field.fieldType} value={dynamicValues[fv.field.id] || ''} onChange={(e) => setDynamicValues({...dynamicValues, [fv.field.id]: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-8">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:text-gray-900 bg-gray-50 rounded-2xl transition-all">Cancel changes</button>
                  <button type="submit" disabled={isSaving} className="flex-1 px-6 py-4 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50">
                    {isSaving ? 'Processing...' : 'Sync update'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{item.name || 'Digital Asset Record'}</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        item.status === 'Available' ? 'bg-green-100 text-green-800' :
                        item.status === 'Used' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                      {item.tags?.map((t: any) => (
                        <span key={t.tag.name} className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest border border-gray-200">
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Material Profile</h3>
                      <p className="text-lg text-gray-600 leading-relaxed font-medium">
                        {item.description || 'This asset has no detailed material profile recorded.'}
                      </p>
                    </div>

                    {item.fieldValues?.length > 0 && (
                      <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6 flex items-center">
                          <ListPlus className="mr-2 h-4 w-4" /> Technical Specifications
                        </h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                          {item.fieldValues.map((fv: any) => (
                            <div key={fv.id}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{fv.field.name}</p>
                              <p className="text-sm font-black text-gray-800">{fv.value || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Inventory Data</h3>
                      <div className="space-y-6">
                        <div className="flex items-center">
                          <LayoutGrid className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Category</p>
                            <p className="text-sm font-bold text-gray-700">{item.category?.name || 'Unassigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Box className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Batch</p>
                            <p className="text-sm font-bold text-gray-700">{item.batch?.batchCode || 'Individual'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4">
                      {canEdit ? (
                        <button onClick={() => setIsEditing(true)} className="w-full py-5 text-sm font-black text-white bg-primary hover:bg-primary-dark rounded-[2rem] shadow-2xl shadow-primary/30 transition-all active:scale-95 uppercase tracking-widest">
                          Edit Profile
                        </button>
                      ) : (
                        <div className="text-center p-6 rounded-[2rem] bg-gray-50 border border-gray-100 border-dashed">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Read Only Mode</p>
                          <p className="text-xs text-gray-500 mt-1 italic">Permissions restricted by Administrator.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail Section */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <button onClick={() => setShowLogs(!showLogs)} className="w-full flex items-center justify-between p-8 hover:bg-gray-50 transition-all">
            <div className="flex items-center text-gray-900">
              <History className="mr-4 h-6 w-6 text-primary" />
              <h3 className="text-xl font-black tracking-tight">Immutable Audit Log</h3>
              <div className="ml-4 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">{logs.length} Operations</div>
            </div>
            {showLogs ? <ChevronUp className="h-6 w-6 text-gray-300" /> : <ChevronDown className="h-6 w-6 text-gray-300" />}
          </button>
          
          {showLogs && (
            <div className="px-10 pb-10 pt-4 border-t border-gray-50 max-h-[30rem] overflow-y-auto scrollbar-hide">
              <div className="space-y-10 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
                {logs.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400 font-medium">No system activity logs found.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="relative pl-10 group">
                      <div className="absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm group-hover:scale-125 transition-transform">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                          {log.action.replace('_', ' ')}
                          <span className="ml-2 font-bold text-gray-400 lowercase italic">by {log.user.username}</span>
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono font-bold uppercase mt-1 sm:mt-0">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {log.changes && (
                        <div className="text-[11px] bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mt-3 grid grid-cols-1 gap-2">
                          {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center space-x-3">
                              <span className="font-black text-gray-400 uppercase min-w-[60px]">{key}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-red-400 line-through opacity-60">{String(value.old || 'none')}</span>
                                <ChevronRight className="h-3 w-3 text-gray-300" />
                                <span className="text-primary font-bold">{String(value.new)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-8 text-center flex flex-col items-center justify-center space-y-2 text-gray-300">
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.3em]">
            <span>Genesis {new Date(item.createdAt).toLocaleDateString()}</span>
            <span className="opacity-30">|</span>
            <span>Revision {new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
          <p className="text-[9px] opacity-40 font-mono">HASH_{item.id.substring(0, 16).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
