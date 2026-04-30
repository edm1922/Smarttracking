'use client';

import { useEffect, useState, use } from 'react';
import { 
  Lock, Unlock, ArrowLeft, Save, AlertCircle, Clock, 
  History, ChevronDown, ChevronUp, Image as ImageIcon, 
  ListPlus, LayoutGrid, Tags as TagsIcon, Box, ChevronRight,
  Eye, LogIn, LogOut, Truck, CheckCircle2, ShieldCheck, User, Activity,
  Camera, Upload, X
} from 'lucide-react';
import api from '@/lib/api';

interface UnitTrackingData {
  useUnitQty: boolean;
  unit: string;
  qty: number;
  threshold: number;
}

export default function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [item, setItem] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingLock, setTogglingLock] = useState(false);
  const [error, setError] = useState('');
  
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
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [unitTracking, setUnitTracking] = useState<UnitTrackingData>({
    useUnitQty: false,
    unit: 'Pair',
    qty: 0,
    threshold: 5
  });
  
  const [fieldSuggestions, setFieldSuggestions] = useState<Record<string, string[]>>({});
  const [nameTemplates, setNameTemplates] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [username, setUsername] = useState('');
  const [pullOutQty, setPullOutQty] = useState<number>(0);
  const [pullOutRemarks, setPullOutRemarks] = useState('');
  const [pullOutImage, setPullOutImage] = useState<string | null>(null);
  const [pullOutSupervisor, setPullOutSupervisor] = useState('');
  const [bypassLogs, setBypassLogs] = useState(true);
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);

  const fetchData = async () => {
    try {
      const [itemRes, fieldsRes] = await Promise.all([
        api.get(`/items/${slug}`),
        api.get('/custom-fields'),
      ]);
      
      // Defer loading of suggestions to speed up initial form render
      api.get('/items/unit-inventory', { params: { take: 1000 } }).then(res => {
        setNameTemplates(res.data.data || []);
      }).catch(err => console.error('Failed to load suggestions', err));
      
      const itemData = itemRes.data;
      const allFields = fieldsRes.data;
      
      setItem(itemData);
      setFormData({
        name: itemData.name || '',
        description: itemData.description || '',
        status: itemData.status || '',
        categoryId: itemData.categoryId || '',
        batchId: itemData.batchId || '',
      });
      
      // Filter fields relevant to this item (Global or matching Batch)
      const relevantFields = allFields.filter((f: any) => !f.batchId || f.batchId === itemData.batchId);
      setAvailableFields(relevantFields);

      const values: Record<string, any> = {};
      let foundUnitData = false;
      
      // Initialize with existing values
      itemData.fieldValues?.forEach((fv: any) => {
        values[fv.fieldId] = fv.value;
        const val = fv.value;
        if (val && typeof val === 'object' && val.useUnitQty) {
          setUnitTracking({
            useUnitQty: true,
            unit: val.unit || 'Pair',
            qty: val.qty || 0,
            threshold: val.threshold || 5
          });
          setPullOutQty(val.qty || 0);
          foundUnitData = true;
        }
      });
      
      // Ensure all available fields are in dynamicValues even if they have no stored value yet
      relevantFields.forEach((f: any) => {
        if (values[f.id] === undefined) {
          values[f.id] = '';
        }
      });
      
      if (!foundUnitData) {
        setUnitTracking({ useUnitQty: false, unit: 'Pair', qty: 15, threshold: 5 });
        setPullOutQty(0);
      }
      
      setDynamicValues(values);

      // SMART AUTOFILL: Defer this so the main form renders immediately
      if (!itemData.name && (!itemData.fieldValues || itemData.fieldValues.length === 0)) {
        setTimeout(async () => {
          try {
            const categoryId = itemData.categoryId;
            const batchId = itemData.batchId;
            
            const similarRes = await api.get('/items', { 
              params: { categoryId, batchId, limit: 50 } 
            });
            
            const sourceItem = (similarRes.data || []).find((i: any) => 
              i.id !== itemData.id && (i.name || (i.fieldValues && i.fieldValues.length > 0))
            );

            if (sourceItem) {
              setFormData(prev => ({
                ...prev,
                name: sourceItem.name || prev.name,
                description: sourceItem.description || prev.description,
              }));

              const autoValues: Record<string, any> = { ...values };
              sourceItem.fieldValues?.forEach((fv: any) => {
                if (relevantFields.find((f: any) => f.id === fv.fieldId)) {
                  autoValues[fv.fieldId] = fv.value;
                }
              });
              setDynamicValues(autoValues);
            }

            const suggestionMap: Record<string, Set<string>> = {};
            (similarRes.data || []).forEach((i: any) => {
              i.fieldValues?.forEach((fv: any) => {
                const val = typeof fv.value === 'object' ? fv.value.main : fv.value;
                if (val) {
                  if (!suggestionMap[fv.fieldId]) suggestionMap[fv.fieldId] = new Set();
                  suggestionMap[fv.fieldId].add(String(val));
                }
              });
            });

            const finalSuggestions: Record<string, string[]> = {};
            Object.keys(suggestionMap).forEach(key => {
              finalSuggestions[key] = Array.from(suggestionMap[key]).slice(0, 10);
            });
            setFieldSuggestions(finalSuggestions);
          } catch (err) {
            console.error('Autofill failed', err);
          }
        }, 0);
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const logsRes = await api.get(`/logs/item/${itemRes.data.id}`);
          setLogs(logsRes.data);
        } catch (err: any) {
          if (err.response?.status === 401) {
            setIsLoggedIn(false);
            setUserRole('');
            setUsername('');
          }
          console.warn('Unauthorized to view logs, skipping...');
        }
      }

      if (!itemRes.data.locked) {
        setViewMode('form');
      } else if (token) {
        setViewMode('form');
      } else {
        setViewMode('choice');
      }

    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Item not found' : (err.response?.data?.message || 'Failed to load item details'));
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

  const prepareFieldValues = (baseValues: Record<string, any>, overrideUnitTracking?: any) => {
    // We must have at least one field to attach unit tracking to.
    // If no fields exist, we might have a problem with the current schema.
    // However, the fetchData now ensures availableFields are present in dynamicValues.
    
    const activeUnitTracking = overrideUnitTracking || unitTracking;
    const entries = Object.entries(baseValues);
    if (entries.length === 0) return [];

    return entries.map(([fieldId, value], index) => {
      // Find the field info to see if it's currently relevant
      const fieldInfo = availableFields.find(f => f.id === fieldId);
      if (!fieldInfo) return null;

      if (index === 0 && activeUnitTracking.useUnitQty) {
        const mainValue = typeof value === 'object' && value !== null ? value.main : value;
        return {
          fieldId,
          value: {
            main: mainValue,
            ...activeUnitTracking
          }
        };
      }
      return { fieldId, value };
    }).filter(Boolean);
  };

  const uploadItemImage = async (file: File) => {
    setIsUploading1(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/items/${slug}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchData();
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setIsUploading1(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      // Type validation
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Basic size check (2MB) - Vercel has a 4.5MB total limit for the entire request
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large. Please keep it under 2MB to ensure successful upload.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPullOutImage(reader.result as string);
        console.log('Image loaded to state');
      };
      reader.onerror = () => {
        console.error('FileReader error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmPullOut = async () => {
    if (pullOutQty <= 0) {
      alert('Please enter a valid quantity to pull out.');
      return;
    }

    if (pullOutQty > unitTracking.qty) {
      alert(`Insufficient quantity. Only ${unitTracking.qty} ${unitTracking.unit} available.`);
      return;
    }

    setIsSaving(true);
    try {
      console.log('Submitting pull-out request...', { slug, qty: pullOutQty });
      const payload = {
        itemSlug: slug,
        qty: pullOutQty,
        unit: unitTracking.unit,
        remarks: pullOutRemarks,
        imageUrl: pullOutImage,
        supervisor: pullOutSupervisor,
      };

      await api.post('/pull-out-requests', payload);
      
      alert(`Pull-out request for ${slug} has been submitted. Please go to the Unit Requisition Portal to review and finalize.`);
      
      // Reset state
      setPullOutRemarks('');
      setPullOutImage(null);
      setPullOutSupervisor('');
      setIsPullingOut(false);
    } catch (err) {
      alert('Failed to save to inbox. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        ...formData,
        fieldValues: prepareFieldValues(dynamicValues),
        skipLogs: bypassLogs
      };

      await api.patch(`/items/${slug}`, payload);
      await fetchData();
      setIsEditing(false);
      setIsPullingOut(false);
      alert('Item record updated successfully.');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setIsLoggedIn(false);
        setUserRole('');
        setUsername('');
        setViewMode('choice');
      }
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
        fieldValues: prepareFieldValues(dynamicValues),
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

  if (!error && (loading || viewMode === 'loading')) return (
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

  const isGuest = viewMode === 'guest';
  const canAdmin = userRole === 'admin';
  const canInventory = userRole === 'inventory';
  const isPublicForm = !isLoggedIn && !item?.locked;

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto pt-6 flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {isGuest && (
            <button onClick={() => setViewMode('choice')} className="flex items-center text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="mr-1 h-3 w-3" /> Exit Preview
            </button>
          )}
          {!isLoggedIn && !isGuest && (
            <div className="flex items-center text-[10px] font-black uppercase text-gray-400">
              <Eye className="mr-1.5 h-3 w-3" /> Public Guest View
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <div className="flex items-center">
                 <div className="h-6 w-6 bg-primary/10 rounded-md flex items-center justify-center mr-2">
                    {canAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                 </div>
                 <span className="text-[10px] font-black uppercase text-gray-500">{username} ({userRole})</span>
              </div>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500 flex items-center hover:opacity-70">
                Logout <LogOut className="ml-1 h-3 w-3" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setViewMode('login')} 
              className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase text-gray-500 hover:border-primary hover:text-primary transition-all shadow-sm"
            >
              <LogIn className="mr-1.5 h-3 w-3" /> Staff Sign In
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {item.status === 'Released' && (
          <div className="bg-purple-600 text-white p-4 rounded-3xl shadow-xl flex items-center justify-center space-x-3 animate-pulse">
            <Truck className="h-6 w-6" />
            <span className="text-sm font-black uppercase tracking-[0.2em]">ITEM RELEASED FROM INVENTORY</span>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="relative h-64 group flex overflow-hidden bg-gray-100">
            {item.imageUrl ? (
              <div className="w-full h-full transition-all duration-500">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
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
                  disabled={togglingLock}
                  onClick={async () => {
                    if (confirm(`Are you sure you want to ${item.locked ? 'unlock' : 'lock'} this item?`)) {
                      setTogglingLock(true);
                      try {
                        await api.patch(`/items/${slug}/lock`);
                        await fetchData();
                      } catch(err) {
                        alert('Failed to toggle lock');
                      } finally {
                        setTogglingLock(false);
                      }
                    }
                  }}
                  className={`p-3 rounded-2xl shadow-lg backdrop-blur bg-white/90 transition-all ${togglingLock ? 'opacity-50 cursor-wait' : item.locked ? 'text-red-600' : 'text-green-600'}`}
                >
                  {togglingLock ? (
                    <div className="h-6 w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    item.locked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="p-8">
            {(isEditing || isPublicForm) ? (
              <form onSubmit={isEditing ? handleUpdate : handleSubmitForm} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Reference Name {isPublicForm && <span className="text-red-500 ml-1">*</span>}</label>
                  <input 
                    required={isPublicForm} 
                    type="text" 
                    list="reference-names"
                    value={formData.name} 
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData({...formData, name: newName});
                      
                      // Attempt Autofill
                      const template = nameTemplates.find(t => t.name.toLowerCase() === newName.toLowerCase());
                      if (template && template.items.length > 0) {
                        const sourceItem = template.items[0]; // Take the first one as template
                        
                        // We need the full item to get its field values
                        // But wait, our unit-inventory now includes fieldValues in each item!
                        const autoValues = { ...dynamicValues };
                        sourceItem.fieldValues?.forEach((fv: any) => {
                          if (availableFields.find(f => f.id === fv.fieldId)) {
                             // Only autofill if current field is empty
                             if (!autoValues[fv.fieldId]) {
                               autoValues[fv.fieldId] = fv.value;
                             }
                          }
                        });
                        setDynamicValues(autoValues);
                        
                        // Also autofill unit tracking if enabled in template
                        const unitField = sourceItem.fieldValues?.find((fv: any) => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty);
                        if (unitField) {
                          setUnitTracking({
                            useUnitQty: true,
                            unit: unitField.value.unit || 'Pair',
                            qty: unitField.value.qty || 0,
                            threshold: unitField.value.threshold || 5
                          });
                        }
                      }
                    }} 
                    className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" 
                    placeholder="Enter reference name..." 
                  />
                  <datalist id="reference-names">
                    {nameTemplates.map(t => (
                      <option key={t.name} value={t.name} />
                    ))}
                  </datalist>
                </div>
                
                {isEditing && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                    <select value={formData.status || ''} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                      <option value="Available">Available</option>
                      <option value="Used">Used</option>
                      <option value="Defective">Defective</option>
                      <option value="Released">Released</option>
                    </select>
                  </div>
                )}

                {isEditing && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Documentation Photo</h3>
                    <div className="relative group aspect-video rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-primary/30 transition-all">
                      {item.imageUrl ? (
                        <>
                          <img src={item.imageUrl} alt="Asset" className="w-full h-full object-cover" />
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload className="h-6 w-6 text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadItemImage(e.target.files[0])} />
                          </label>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                          {isUploading1 ? (
                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Camera className="h-6 w-6 text-gray-300 mb-1" />
                              <span className="text-[8px] font-black text-gray-400 uppercase">Add Reference Photo</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadItemImage(e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] pt-4">Custom Attributes</h3>
                  {availableFields.map((field: any) => {
                    const fieldOptions = Array.isArray(field.options) ? field.options : (field.options?.dropdownOptions || []);
                    const val = dynamicValues[field.id];
                    const displayValue = typeof val === 'object' && val !== null ? (val.main || '') : (val || '');
                    
                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">{field.name} {field.required && <span className="text-red-500 ml-1">*</span>}</label>
                        {field.fieldType === 'dropdown' ? (
                          <select 
                            required={field.required}
                            value={displayValue} 
                            onChange={(e) => {
                              const newVal = e.target.value;
                              if (typeof val === 'object' && val !== null) {
                                setDynamicValues({...dynamicValues, [field.id]: { ...val, main: newVal }});
                              } else {
                                setDynamicValues({...dynamicValues, [field.id]: newVal});
                              }
                            }} 
                            className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                          >
                            <option value="">Select Option</option>
                            {fieldOptions.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            required={field.required}
                            type={field.fieldType} 
                            value={displayValue} 
                            list={`suggestions-${field.id}`}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              if (typeof val === 'object' && val !== null) {
                                setDynamicValues({...dynamicValues, [field.id]: { ...val, main: newVal }});
                              } else {
                                setDynamicValues({...dynamicValues, [field.id]: newVal});
                              }
                            }} 
                            className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all" 
                          />
                        )}
                        <datalist id={`suggestions-${field.id}`}>
                          {fieldSuggestions[field.id]?.map(s => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                    );
                  })}
                </div>

                {/* Global Unit Tracking Section - Only visible to Staff/Admin */}
                {isLoggedIn && (
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 space-y-4 mt-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Enable Unit Tracking?</label>
                          <p className="text-[10px] text-blue-400 font-bold italic">Link this asset to sub-inventory tracking</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={unitTracking.useUnitQty}
                        onChange={(e) => setUnitTracking({ ...unitTracking, useUnitQty: e.target.checked })}
                        className="h-6 w-6 rounded-lg border-blue-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                      />
                    </div>

                    {unitTracking.useUnitQty && (
                      <div className="grid grid-cols-1 gap-4 pt-4 border-t border-blue-100/30 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Tracking Parameters {(canAdmin || canInventory) ? '(Editable)' : '(Pre-defined)'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase">Unit Name</label>
                            <input 
                              type="text" 
                              disabled={!canAdmin && !canInventory}
                              placeholder="e.g. Pair"
                              value={unitTracking.unit} 
                              onChange={(e) => setUnitTracking({ ...unitTracking, unit: e.target.value })} 
                              className="w-full rounded-2xl bg-white border border-blue-100 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase">Quantity</label>
                            <input 
                              type="number" 
                              disabled={!canAdmin && !canInventory}
                              placeholder="15"
                              value={unitTracking.qty} 
                              onChange={(e) => setUnitTracking({ ...unitTracking, qty: parseInt(e.target.value) || 0 })} 
                              className="w-full rounded-2xl bg-white border border-blue-100 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase">Restock Alert Threshold</label>
                          <input 
                            type="number" 
                            disabled={!canAdmin && !canInventory}
                            placeholder="Low stock alert number..."
                            value={unitTracking.threshold} 
                            onChange={(e) => setUnitTracking({ ...unitTracking, threshold: parseInt(e.target.value) || 0 })} 
                            className="w-full rounded-2xl bg-white border border-blue-100 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-red-500/10 transition-all disabled:opacity-50" 
                          />
                          <p className="text-[9px] text-gray-400 font-bold italic">Item will pulse red in dashboard when quantity is ≤ this number</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                


                {(canAdmin || canInventory) && (
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div className="px-6 pb-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={bypassLogs}
                            onChange={(e) => setBypassLogs(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">Bypass Stock Logs</span>
                          <span className="text-[9px] text-gray-400 font-bold italic">Admin: Update silently without audit trail</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

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

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                   {availableFields.map((field: any) => {
                     const val = dynamicValues[field.id];
                     let displayValue = '—';
                      
                     if (typeof val === 'object' && val !== null) {
                        if (val.useUnitQty) {
                          displayValue = String(val.main ?? val.qty ?? 0);
                        } else {
                          displayValue = val.main || '—';
                        }
                     } else if (val) {
                       displayValue = String(val);
                     }

                     return (
                      <div key={field.id}>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{field.name}</p>
                        <p className="text-sm font-bold text-gray-700">{displayValue}</p>
                      </div>
                     );
                   })}
                   
                   {unitTracking.useUnitQty && (
                      <div className="col-span-2 mt-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 grid grid-cols-2 gap-6">
                         <div className="absolute -mt-10 left-6">
                            <span className="bg-white border border-gray-100 px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase tracking-widest flex items-center">
                               <Activity className="h-3 w-3 mr-1.5" /> Unit Tracking Enabled
                            </span>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unit Type</p>
                            <p className="text-sm font-black text-gray-900">{unitTracking.unit}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Stock</p>
                            <p className="text-sm font-black text-gray-900">{unitTracking.qty}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alert Threshold</p>
                            <p className="text-sm font-black text-gray-900">≤ {unitTracking.threshold}</p>
                         </div>
                      </div>
                   )}
                </div>

                {!isGuest && isLoggedIn && (
                   <div className="pt-8 space-y-3">
                     <button 
                        onClick={() => {
                          setFormData({...formData, status: 'Released'});
                          setIsPullingOut(true);
                        }}
                        className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
                      >
                        <Truck className="mr-2 h-5 w-5" /> Request Pull Out
                      </button>
                      
                      {(canAdmin || canInventory) && (
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

        {isPullingOut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[95vh]">
            <div className="p-8 pb-4 border-b border-gray-50 bg-gray-50/50 rounded-t-[2.5rem]">
               <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                 <Truck className="h-8 w-8 text-orange-600" />
               </div>
               <h2 className="text-2xl font-black text-gray-900 mb-2">Request Pull Out</h2>
               <p className="text-sm text-gray-500 font-medium">Submit a request to release this asset from inventory.</p>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
               <div className="space-y-4 mb-2">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Status</label>
                    <select value={formData.status || ''} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-gray-100 px-5 py-4 text-sm font-bold">
                      <option value="Released">Released</option>
                      <option value="Used">Used</option>
                      <option value="Deployed">Deployed</option>
                    </select>
                 </div>

                 {unitTracking.useUnitQty && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                      <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Quantity to Pull Out ({unitTracking.unit})</label>
                      <div className="relative">
                         <input 
                           type="number" 
                           min={1} 
                           max={unitTracking.qty}
                           value={pullOutQty}
                           onChange={(e) => {
                             const val = parseInt(e.target.value) || 0;
                             setPullOutQty(Math.min(unitTracking.qty, Math.max(1, val)));
                           }}
                           className="w-full rounded-2xl bg-orange-50 border-orange-100 px-5 py-4 text-sm font-bold text-orange-700 outline-none focus:ring-4 focus:ring-orange-500/10"
                         />
                         <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-300 uppercase">
                           / {unitTracking.qty} Total
                         </div>
                      </div>
                      <p className="mt-2 text-[10px] text-gray-400 font-bold italic">
                         {pullOutQty === unitTracking.qty 
                           ? "Full pull-out: Item will be marked as Released." 
                           : `Partial pull-out: ${unitTracking.qty - pullOutQty} ${unitTracking.unit} will remain.`}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks (Optional)</label>
                      <textarea 
                        value={pullOutRemarks}
                        onChange={(e) => setPullOutRemarks(e.target.value)}
                        placeholder="e.g. For project site release..."
                        className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-medium h-24 resize-none outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Supervisor Name</label>
                      <input 
                        type="text"
                        value={pullOutSupervisor}
                        onChange={(e) => setPullOutSupervisor(e.target.value)}
                        placeholder="Enter supervisor name..."
                        className="w-full rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reference Image (Proof)</label>
                      
                      {pullOutImage ? (
                        <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 bg-gray-50">
                          <img src={pullOutImage} alt="Reference" className="w-full h-40 object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setPullOutImage(null)}
                              className="bg-white/90 p-2 rounded-xl text-red-500 hover:bg-white transition-all shadow-lg"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <label 
                            htmlFor="capture-input"
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-100 hover:border-primary/30 transition-all cursor-pointer group"
                          >
                            <Camera className="h-6 w-6 text-gray-400 group-hover:text-primary mb-2" />
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-gray-600 uppercase tracking-widest">Capture</span>
                            <input id="capture-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                          </label>
                          <label 
                            htmlFor="upload-input"
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-100 hover:border-primary/30 transition-all cursor-pointer group"
                          >
                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-primary mb-2" />
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-gray-600 uppercase tracking-widest">Upload</span>
                            <input id="upload-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-8 pt-4 border-t border-gray-50 flex flex-col gap-3 bg-gray-50/30 rounded-b-[2.5rem]">
              <button 
                onClick={handleConfirmPullOut}
                disabled={isSaving}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-gray-900/20 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isSaving ? 'Submitting...' : 'Confirm Request'}
              </button>
              <button 
                onClick={() => setIsPullingOut(false)}
                className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
          </div>
        )}

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
