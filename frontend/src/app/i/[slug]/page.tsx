'use client';

import { useEffect, useState, use } from 'react';
import { 
  Lock, Unlock, ArrowLeft, Save, AlertCircle, Clock, 
  History, ChevronDown, ChevronUp, Image as ImageIcon, 
  ListPlus, LayoutGrid, Tags as TagsIcon, Box, ChevronRight,
  Eye, LogIn, LogOut, Truck, CheckCircle2, ShieldCheck, User
} from 'lucide-react';
import api from '@/lib/api';

export default function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [item, setItem] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // View Modes: 'loading' | 'choice' | 'guest' | 'login' | 'form'
  const [viewMode, setViewMode] = useState<'loading' | 'choice' | 'guest' | 'login' | 'form'>('loading');
  
  const [isEditing, setIsEditing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isPullingOut, setIsPullingOut] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    status: '',
    categoryId: '',
    batchId: '',
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [username, setUsername] = useState('');

  interface UnitFieldInfo {
    fieldId: string;
    unit: string;
    currentQty: number;
    label: string;
  }

  const [pullOutQty, setPullOutQty] = useState<number>(0);
  const [unitFieldInfo, setUnitFieldInfo] = useState<UnitFieldInfo | null>(null);

  const fetchData = async () => {
    try {
      const itemRes = await api.get(`/items/${slug}`);
      const itemData = itemRes.data;
      setItem(itemData);
      setFormData({
        name: itemData.name || '',
        description: itemData.description || '',
        status: itemData.status,
        categoryId: itemData.categoryId || '',
        batchId: itemData.batchId || '',
      });
      
      const values: Record<string, any> = {};
      let unitInfo = null;
      itemData.fieldValues?.forEach((fv: any) => {
        values[fv.fieldId] = fv.value;
        if (fv.field.options?.hasUnitQuantity && fv.value?.useUnitQty) {
          unitInfo = {
            fieldId: fv.fieldId,
            unit: fv.value.unit,
            currentQty: fv.value.qty,
            label: fv.field.options.qtyLabel || 'Quantity'
          };
        }
      });
      setDynamicValues(values);
      setUnitFieldInfo(unitInfo);
      if (unitInfo) setPullOutQty(unitInfo.currentQty);

      const token = localStorage.getItem('token');
      if (token) {
        const logsRes = await api.get(`/logs/item/${itemRes.data.id}`);
        setLogs(logsRes.data);
      }

      // Determine initial view mode
      if (!itemRes.data.locked) {
        setViewMode('form');
      } else if (token) {
        setViewMode('form'); // Already logged in, show the data
      } else {
        setViewMode('choice'); // Locked and not logged in
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
    setUsername(localStorage.getItem('username') || '');
    fetchData();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await api.post('/auth/login', loginData);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('username', res.data.username);
      
      setIsLoggedIn(true);
      setUserRole(res.data.role);
      setUsername(res.data.username);
      setViewMode('form');
      fetchData();
    } catch (err: any) {
      alert('Login failed. Please check credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUserRole('');
    setUsername('');
    setViewMode('choice');
  };

  const handleConfirmPullOut = async () => {
    setIsSaving(true);
    try {
      let finalStatus = formData.status;
      const updatedDynamicValues = { ...dynamicValues };

      if (unitFieldInfo) {
        const remaining = unitFieldInfo.currentQty - pullOutQty;
        if (remaining > 0) {
          // Partial Pull Out - keep Available but update Qty
          finalStatus = 'Available';
          updatedDynamicValues[unitFieldInfo.fieldId] = {
            ...dynamicValues[unitFieldInfo.fieldId],
            qty: remaining
          };
          alert(`Partially pulled out ${pullOutQty} ${unitFieldInfo.unit}. ${remaining} remaining.`);
        } else {
          // Full Pull Out
          finalStatus = 'Released';
          updatedDynamicValues[unitFieldInfo.fieldId] = {
            ...dynamicValues[unitFieldInfo.fieldId],
            qty: 0
          };
        }
      }

      const payload = {
        status: finalStatus,
        fieldValues: Object.entries(updatedDynamicValues).map(([fieldId, value]) => ({
          fieldId,
          value,
        })),
        logAction: unitFieldInfo ? `PULL_OUT_${pullOutQty}_${unitFieldInfo.unit.toUpperCase()}` : 'PULL_OUT'
      };

      await api.patch(`/items/${slug}`, payload);
      await fetchData();
      setIsPullingOut(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to pull out item');
    } finally {
      setIsSaving(false);
    }
  };

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
      setIsPullingOut(false);
      alert('Item record updated successfully.');
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

  if (loading || viewMode === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Syncing Record...</p>
      </div>
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

  // --- VIEW: Access Choice ---
  if (viewMode === 'choice') return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white">
          <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">RECORD LOCKED</h1>
          <p className="text-sm font-medium text-gray-500 mb-10 leading-relaxed">
            Scan detected for <span className="font-mono font-bold text-primary">{slug}</span>. This item has been formally submitted. Choose how to proceed:
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => setViewMode('guest')}
              className="w-full group flex items-center justify-between p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-left"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">View as Guest</p>
                <p className="text-xs text-gray-400">Read-only access to item data</p>
              </div>
              <Eye className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            
            <button 
              onClick={() => setViewMode('login')}
              className="w-full group flex items-center justify-between p-6 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-left"
            >
              <div>
                <p className="text-sm font-bold">Staff Login</p>
                <p className="text-xs text-white/60">Pull out or edit item record</p>
              </div>
              <LogIn className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Smart Tracking Enterprise v1.0</p>
      </div>
    </div>
  );

  // --- VIEW: Login Form ---
  if (viewMode === 'login') return (
    <div className="min-h-screen bg-white p-8 flex flex-col">
      <button onClick={() => setViewMode('choice')} className="mb-12 flex items-center text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to choices
      </button>
      
      <div className="max-w-sm mx-auto w-full pt-12">
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Staff Login</h2>
        <p className="text-gray-400 mb-10 font-medium">Enter your assigned credentials to manage <span className="text-primary font-bold">{slug}</span></p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            required
            type="text" 
            placeholder="Username" 
            value={loginData.username}
            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" 
          />
          <input 
            required
            type="password" 
            placeholder="Password" 
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" 
          />
          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? 'Verifying...' : 'Sign In & Access'}
          </button>
        </form>
      </div>
    </div>
  );

  // --- VIEW: Main Record (Guest or Staff) ---
  const isGuest = viewMode === 'guest';
  const canAdmin = userRole === 'admin';
  const canInventory = userRole === 'inventory';
  const isPublicForm = !isLoggedIn && !item?.locked;

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12 px-4 sm:px-6">
      {/* Mobile Top Bar */}
      <div className="max-w-3xl mx-auto pt-6 flex items-center justify-between mb-4">
        {isGuest ? (
          <button onClick={() => setViewMode('choice')} className="flex items-center text-[10px] font-black uppercase text-gray-400">
            <ArrowLeft className="mr-1 h-3 w-3" /> Exit Preview
          </button>
        ) : (
          <div className="flex items-center">
             <div className="h-6 w-6 bg-primary/10 rounded-md flex items-center justify-center mr-2">
                {canAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
             </div>
             <span className="text-[10px] font-black uppercase text-gray-500">{username} ({userRole})</span>
          </div>
        )}
        
        {isLoggedIn && (
          <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500 flex items-center">
            Logout <LogOut className="ml-1 h-3 w-3" />
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {item.status === 'Released' && (
          <div className="bg-purple-600 text-white p-4 rounded-3xl shadow-xl flex items-center justify-center space-x-3 animate-pulse">
            <Truck className="h-6 w-6" />
            <span className="text-sm font-black uppercase tracking-[0.2em]">ITEM RELEASED FROM INVENTORY</span>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          {/* Hero Section */}
          <div className="relative h-64 group">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-300">
                <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Scan Success</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-8">
              <p className="text-primary font-black text-[10px] uppercase tracking-widest mb-1">Asset ID</p>
              <h1 className="text-4xl font-mono font-black text-white tracking-tighter uppercase leading-none">{item.slug}</h1>
            </div>
            
            {canAdmin && (
              <div className="absolute top-6 right-6">
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to ${item.locked ? 'unlock' : 'lock'} this item?`)) {
                      try {
                        await api.patch(`/items/${slug}/lock`);
                        await fetchData();
                      } catch(err) {
                        alert('Failed to toggle lock');
                      }
                    }
                  }}
                  className={`p-3 rounded-2xl shadow-lg backdrop-blur bg-white/90 transition-all ${item.locked ? 'text-red-600' : 'text-green-600'}`}
                >
                  {item.locked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                </button>
              </div>
            )}
          </div>

          <div className="p-8">
            {(isEditing || isPublicForm) ? (
              <form onSubmit={isEditing ? handleUpdate : handleSubmitForm} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Reference Name {isPublicForm && <span className="text-red-500 ml-1">*</span>}</label>
                  <input required={isPublicForm} type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Enter reference name..." />
                </div>
                
                {isEditing && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                      <option value="Available">Available</option>
                      <option value="Used">Used</option>
                      <option value="Defective">Defective</option>
                      <option value="Released">Released</option>
                    </select>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] pt-4">Custom Attributes</h3>
                  {item.fieldValues?.map((fv: any) => {
                    const opts = fv.field.options || {};
                    const hasUnitQty = opts.hasUnitQuantity;
                    const fieldOptions = Array.isArray(opts) ? opts : (opts.dropdownOptions || []);
                    
                    return (
                      <div key={fv.field.id} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5">{fv.field.name} {fv.field.required && <span className="text-red-500 ml-1">*</span>}</label>
                          {fv.field.fieldType === 'dropdown' ? (
                            <select 
                              required={fv.field.required}
                              value={dynamicValues[fv.field.id]?.main || dynamicValues[fv.field.id] || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (hasUnitQty) {
                                  setDynamicValues({...dynamicValues, [fv.field.id]: { ...(dynamicValues[fv.field.id] || {}), main: val }});
                                } else {
                                  setDynamicValues({...dynamicValues, [fv.field.id]: val});
                                }
                              }} 
                              className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                              <option value="">Select Option</option>
                              {fieldOptions.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input 
                              required={fv.field.required}
                              type={fv.field.fieldType} 
                              value={hasUnitQty ? (dynamicValues[fv.field.id]?.main || '') : (dynamicValues[fv.field.id] || '')} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (hasUnitQty) {
                                  setDynamicValues({...dynamicValues, [fv.field.id]: { ...(dynamicValues[fv.field.id] || {}), main: val }});
                                } else {
                                  setDynamicValues({...dynamicValues, [fv.field.id]: val});
                                }
                              }} 
                              className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all" 
                            />
                          )}
                        </div>

                        {hasUnitQty && (
                          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Enable Unit Tracking?</label>
                                <p className="text-[10px] text-blue-400 font-bold">Default: <span className="text-blue-600">{opts.qtyLabel} {opts.unitLabel}</span></p>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={!!dynamicValues[fv.field.id]?.useUnitQty}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setDynamicValues({
                                    ...dynamicValues, 
                                    [fv.field.id]: { 
                                      ...(dynamicValues[fv.field.id] || {}), 
                                      useUnitQty: isChecked,
                                      unit: isChecked ? (dynamicValues[fv.field.id]?.unit || opts.unitLabel) : '',
                                      qty: isChecked ? (dynamicValues[fv.field.id]?.qty || parseInt(opts.qtyLabel)) : 0
                                    }
                                  });
                                }}
                                className="h-6 w-6 rounded-lg border-blue-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                              />
                            </div>

                            {dynamicValues[fv.field.id]?.useUnitQty && (canAdmin || canInventory) && (
                              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-blue-100/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Override Values (Staff Only)</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <input 
                                    type="text" 
                                    placeholder={opts.unitLabel}
                                    value={dynamicValues[fv.field.id]?.unit || ''} 
                                    onChange={(e) => setDynamicValues({
                                      ...dynamicValues, 
                                      [fv.field.id]: { ...(dynamicValues[fv.field.id] || {}), unit: e.target.value }
                                    })} 
                                    className="w-full rounded-2xl bg-white border-blue-100 px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                                  />
                                  <input 
                                    type="number" 
                                    placeholder={opts.qtyLabel}
                                    value={dynamicValues[fv.field.id]?.qty || ''} 
                                    onChange={(e) => setDynamicValues({
                                      ...dynamicValues, 
                                      [fv.field.id]: { ...(dynamicValues[fv.field.id] || {}), qty: parseInt(e.target.value) || 0 }
                                    })} 
                                    className="w-full rounded-2xl bg-white border-blue-100 px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-6">
                  {isEditing && (
                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl flex-1">Cancel</button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 text-sm font-bold text-white bg-primary rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-95">
                    {isSaving ? 'Saving...' : isEditing ? 'Update Record' : 'Complete Submission'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">{item.name || 'Submitted Item'}</h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        item.status === 'Released' 
                          ? 'bg-purple-600 text-white' 
                          : item.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.status === 'Released' && <Truck className="h-3 w-3 mr-1" />}
                        {item.status}
                      </span>
                      {item.locked && (
                         <span className="inline-flex items-center bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                            <Lock className="h-3 w-3 mr-1" /> Locked
                         </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                   {item.fieldValues?.map((fv: any) => {
                     const opts = fv.field.options || {};
                     const val = fv.value;
                     const hasUnitData = typeof val === 'object' && val !== null && val.useUnitQty;

                     return (
                      <div key={fv.id} className={hasUnitData ? 'col-span-2 space-y-4' : ''}>
                        <div>
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{fv.field.name}</p>
                          <p className="text-sm font-bold text-gray-700">
                            {typeof val === 'object' && val !== null ? (val.main || '—') : (val || '—')}
                          </p>
                        </div>
                        
                        {hasUnitData && (
                          <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                             <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{opts.unitLabel || 'Unit'}</p>
                                <p className="text-sm font-black text-gray-900">{val.unit || '—'}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{opts.qtyLabel || 'Quantity'}</p>
                                <p className="text-sm font-black text-gray-900">{val.qty || 0}</p>
                             </div>
                          </div>
                        )}
                      </div>
                     );
                   })}
                </div>

                {/* Staff Actions */}
                {!isGuest && isLoggedIn && (
                   <div className="pt-8 space-y-3">
                     <button 
                        onClick={() => {
                          setFormData({...formData, status: 'Released'});
                          setIsPullingOut(true);
                        }}
                        className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
                      >
                        <Truck className="mr-2 h-5 w-5" /> Pull Out Item
                      </button>
                      
                      {canAdmin && (
                         <button 
                            onClick={() => setIsEditing(true)}
                            className="w-full py-4 border-2 border-gray-100 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:border-primary hover:text-primary transition-all"
                          >
                            Edit Record
                          </button>
                      )}
                   </div>
                )}

                {isGuest && (
                  <div className="pt-8">
                     <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-center">
                        <CheckCircle2 className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                        <p className="text-sm font-bold text-blue-900 mb-1">Guest Mode Active</p>
                        <p className="text-xs text-blue-600/70 font-medium leading-relaxed">You are viewing this record in read-only mode. No changes can be made.</p>
                     </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pull Out Modal (Status Update) */}
        {isPullingOut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
               <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                 <Truck className="h-8 w-8 text-orange-600" />
               </div>
               <h2 className="text-2xl font-black text-gray-900 mb-2">Pull Out Item</h2>
               <p className="text-sm text-gray-500 mb-8 font-medium">Record this asset as released from inventory.</p>
               
               <div className="space-y-4 mb-8">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold">
                      <option value="Released">Released</option>
                      <option value="Used">Used</option>
                      <option value="Deployed">Deployed</option>
                    </select>
                 </div>

                 {unitFieldInfo && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                     <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Quantity to Pull Out ({unitFieldInfo.unit})</label>
                     <div className="relative">
                        <input 
                          type="number" 
                          min={1} 
                          max={unitFieldInfo.currentQty}
                          value={pullOutQty}
                          onChange={(e) => setPullOutQty(Math.min(unitFieldInfo.currentQty, Math.max(1, parseInt(e.target.value) || 0)))}
                          className="w-full rounded-2xl bg-orange-50 border-orange-100 px-5 py-4 text-sm font-bold text-orange-700 outline-none focus:ring-4 focus:ring-orange-500/10"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-300 uppercase">
                          / {unitFieldInfo.currentQty} Total
                        </div>
                     </div>
                     <p className="mt-2 text-[10px] text-gray-400 font-bold italic">
                        {pullOutQty === unitFieldInfo.currentQty 
                          ? "Full pull-out: Item will be marked as Released." 
                          : `Partial pull-out: ${unitFieldInfo.currentQty - pullOutQty} ${unitFieldInfo.unit} will remain.`}
                     </p>
                   </div>
                 )}
               </div>

               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleConfirmPullOut}
                    disabled={isSaving}
                    className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? 'Recording...' : 'Confirm Pull Out'}
                  </button>
                  <button 
                    onClick={() => setIsPullingOut(false)}
                    className="w-full py-4 text-sm font-bold text-gray-400"
                  >
                    Cancel
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Logs */}
        {isLoggedIn && logs.length > 0 && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
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
