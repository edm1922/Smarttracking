'use client';

import { useEffect, useState, use } from 'react';
import { 
  Lock, Unlock, ArrowLeft, Save, AlertCircle, Clock, 
  History, ChevronDown, ChevronUp, Image as ImageIcon, 
  ListPlus, LayoutGrid, Tags as TagsIcon, Box, ChevronRight
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

      if (localStorage.getItem('token')) {
        const logsRes = await api.get(`/logs/item/${itemRes.data.id}`);
        setLogs(logsRes.data);
      }
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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to submit this form? Once submitted, it will be locked and cannot be edited.')) return;
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        fieldValues: Object.entries(dynamicValues).map(([fieldId, value]) => ({
          fieldId,
          value,
        })),
      };
      await api.post(`/items/${slug}/submit-form`, payload);
      await fetchData();
      alert('Form submitted and locked successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = isLoggedIn && (!item?.locked || userRole === 'admin');
  const isPublicForm = !isLoggedIn && !item?.locked;

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
          Exit to Home
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-30">QR Digital Twin</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
              <h1 className="text-4xl font-mono font-black tracking-tighter uppercase">{item.slug}</h1>
              <p className="text-sm font-bold opacity-80 mt-1">{item.name || 'Untitled Form'}</p>
            </div>
            <div className="absolute top-6 right-6">
              <button 
                onClick={async () => {
                   if (!canEdit) return;
                   if (userRole !== 'admin') {
                     alert('Only admins can toggle lock status.');
                     return;
                   }
                   if (confirm(`Are you sure you want to ${item.locked ? 'unlock' : 'lock'} this item?`)) {
                     try {
                       await api.patch(`/items/${slug}/lock`);
                       await fetchData();
                     } catch(err) {
                       alert('Failed to toggle lock');
                     }
                   }
                }}
                className={`p-3 rounded-2xl shadow-lg backdrop-blur bg-white/90 transition-all ${item.locked ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} ${canEdit && userRole === 'admin' ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                disabled={!(canEdit && userRole === 'admin')}
              >
                {item.locked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
              </button>
            </div>
          </div>

          <div className="p-10">
            {isEditing || isPublicForm ? (
              <form onSubmit={isEditing ? handleUpdate : handleSubmitForm} className="space-y-8">
                <div className="space-y-6">
                  {(isEditing || (isPublicForm && !item.name)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Internal Reference Name {isPublicForm && <span className="text-red-500">*</span>}</label>
                        <input required={isPublicForm} type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" placeholder="Enter reference name..." />
                      </div>
                      {isEditing && (
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                          <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold">
                            <option value="Available">Available</option>
                            <option value="Used">Used</option>
                            <option value="Defective">Defective</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Fields (The actual Form) */}
                  <div className="grid grid-cols-1 gap-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                      <ListPlus className="mr-2 h-4 w-4" /> Form Input Fields
                    </h3>
                    {item.fieldValues?.map((fv: any) => (
                      <div key={fv.field.id}>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{fv.field.name} {fv.field.required && <span className="text-red-500">*</span>}</label>
                        {fv.field.fieldType === 'dropdown' ? (
                           <select 
                            required={fv.field.required}
                            value={dynamicValues[fv.field.id] || ''} 
                            onChange={(e) => setDynamicValues({...dynamicValues, [fv.field.id]: e.target.value})} 
                            className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                          >
                            <option value="">Select Option</option>
                            {fv.field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            required={fv.field.required}
                            type={fv.field.fieldType} 
                            value={dynamicValues[fv.field.id] || ''} 
                            onChange={(e) => setDynamicValues({...dynamicValues, [fv.field.id]: e.target.value})} 
                            className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" 
                          />
                        )}
                      </div>
                    ))}
                    {item.fieldValues?.length === 0 && <p className="text-sm text-gray-400 italic">No custom fields defined for this form.</p>}
                  </div>
                </div>

                <div className="flex space-x-4 pt-8">
                  {isEditing && (
                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-4 text-sm font-bold text-gray-400 hover:text-gray-900 bg-gray-50 rounded-2xl transition-all">Cancel</button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 px-6 py-4 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50">
                    {isSaving ? 'Processing...' : isEditing ? 'Save Changes' : 'Submit & Lock Form'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{item.name || 'Form Submission'}</h2>
                    {item.locked && (
                      <div className="mt-4 flex items-center bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-bold border border-red-100 w-fit">
                        <Lock className="h-3 w-3 mr-2" /> FORM LOCKED - SUBMISSION COMPLETE
                      </div>
                    )}
                  </div>
                </div>

                {item.fieldValues?.length > 0 && (
                  <div className="pt-8 border-t border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6 flex items-center">
                      <ListPlus className="mr-2 h-4 w-4" /> Submitted Data
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      {item.fieldValues.map((fv: any) => (
                        <div key={fv.id}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{fv.field.name}</p>
                          <p className="text-sm font-black text-gray-800">{fv.value || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div className="pt-8 border-t border-gray-100">
                    <button onClick={() => setIsEditing(true)} className="w-full py-5 text-sm font-black text-white bg-primary hover:bg-primary-dark rounded-[2rem] shadow-2xl shadow-primary/30 transition-all uppercase tracking-widest">
                      Admin Edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logs (Only for logged in users) */}
        {isLoggedIn && logs.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
             <button onClick={() => setShowLogs(!showLogs)} className="w-full flex items-center justify-between p-8 hover:bg-gray-50 transition-all">
              <div className="flex items-center text-gray-900">
                <History className="mr-4 h-6 w-6 text-primary" />
                <h3 className="text-xl font-black tracking-tight">Audit Log</h3>
              </div>
              {showLogs ? <ChevronUp className="h-6 w-6 text-gray-300" /> : <ChevronDown className="h-6 w-6 text-gray-300" />}
            </button>
            {showLogs && (
              <div className="px-10 pb-10 pt-4 border-t border-gray-50 max-h-[20rem] overflow-y-auto">
                <div className="space-y-6">
                  {logs.map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-primary pl-4 py-2">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-gray-900 uppercase">{log.action}</span>
                        <span className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-500">by {log.user.username}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
