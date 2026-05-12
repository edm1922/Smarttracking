'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Box, X, User, ClipboardList, Send, Clock, Trash2, MapPin, CheckCircle, Printer
} from 'lucide-react';
import api from '@/lib/api';
import { PageHeaderSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeletons';

interface ProductStock {
  locationId?: string;
  location?: { id: string; name: string };
  quantity: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  stocks: ProductStock[];
  totalStock?: number;
  unit?: string;
}

interface Location {
  id: string;
  name: string;
}

interface SelectedItem {
  productId: string;
  productName: string;
  sku: string;
  quantities: Record<string, number>;
  maxQuantity: number;
  description: string | null;
}

export default function StaffRequisitionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Left side state
  const [productSearch, setProductSearch] = useState('');
  
  // Form State
  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    departmentArea: '',
    shift: 'SHIFT 1',
    locationId: '',
    remarks: '',
    supervisorName: '',
  });
  
  // Multiple Employees state
  const [employeeInput, setEmployeeInput] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [employees, setEmployees] = useState<{ name: string; position: string }[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<{ name: string; position: string }[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeEmployeeNames, setActiveEmployeeNames] = useState<string[]>([]);
  
  // Quick Item Search state
  const [quickItemInput, setQuickItemInput] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);
  
  // Draft Entry state
  const [draftEntry, setDraftEntry] = useState<{ 
    name: string; 
    position: string; 
    items: { productId: string; name: string; sku: string; availableQty: number; description: string | null }[] 
  } | null>(null);
  
  // Cart state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [viewItem, setViewItem] = useState<Product | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [prodsRes, locsRes, empRes] = await Promise.all([
        api.get('/products', { params: { take: 1000 } }),
        api.get('/locations'),
        api.get('/internal-requests/employees')
      ]);
      
      const rawEmployees = empRes.data || [];
      setExistingEmployees(rawEmployees.map((e: any) => 
        typeof e === 'string' ? { name: e, position: 'Staff' } : e
      ));
      
      const locs = locsRes.data;
      setLocations(locs);
      
      if (locs.length > 0 && !form.locationId) {
        const mainOffice = locs.find((l: any) => l.name.toLowerCase() === 'main office');
        setForm(f => ({ ...f, locationId: mainOffice ? mainOffice.id : locs[0].id }));
      }
      
      setProducts(prodsRes.data.data || prodsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [employeeInput]);

  const addEmployee = () => {
    const trimmedName = employeeInput.trim();
    if (!trimmedName) return;
    const trimmedPos = positionInput.trim() || 'Staff';
    
    // Set as draft instead of adding directly
    setDraftEntry({
      name: trimmedName,
      position: trimmedPos,
      items: []
    });
    
    setEmployeeInput('');
    setPositionInput('');
    setShowEmployeeDropdown(false);
    setHighlightedIndex(-1);
  };

  const confirmDraftEntry = () => {
    if (!draftEntry) return;
    
    // 1. Add employee to main list if not exists
    if (!employees.some(e => e.name === draftEntry.name)) {
      setEmployees([...employees, { name: draftEntry.name, position: draftEntry.position }]);
    }
    
    // 2. Add draft items to the main cart
    draftEntry.items.forEach(item => {
      // Find the product in our main products list to get the full object
      const product = products.find(p => p.id === item.productId);
      if (product) {
        addItemToCart(product, item.availableQty, [draftEntry.name]);
      }
    });
    
    setDraftEntry(null);
    
    // Auto focus back to employee name to keep workflow fast
    setTimeout(() => {
      document.getElementById('employee-name-input')?.focus();
    }, 10);
  };

  const addProductToDraft = (product: Product) => {
    if (!draftEntry) return;
    if (draftEntry.items.some(i => i.productId === product.id)) return;
    
    const available = product.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
    
    setDraftEntry({
      ...draftEntry,
      items: [...draftEntry.items, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        availableQty: available,
        description: product.description
      }]
    });

    // Clear and focus back
    setQuickItemInput('');
    setShowItemDropdown(false);
    setTimeout(() => {
      document.getElementById('draft-item-search')?.focus();
    }, 10);
  };

  const removeProductFromDraft = (productId: string) => {
    if (!draftEntry) return;
    setDraftEntry({
      ...draftEntry,
      items: draftEntry.items.filter(i => i.productId !== productId)
    });
  };

  const pickEmployee = (emp: { name: string; position: string }) => {
    setEmployeeInput(emp.name);
    setPositionInput(emp.position);
    setShowEmployeeDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleEmployeeInputChange = (value: string) => {
    setEmployeeInput(value);
    setShowEmployeeDropdown(value.length > 0);
    
    // Autofill position if exact match found in existing employees
    const match = existingEmployees.find(e => e.name.toLowerCase() === value.toLowerCase());
    if (match) {
      setPositionInput(match.position);
    }
  };

  const handleEditEmployee = (emp: { name: string; position: string }) => {
    removeEmployee(emp.name);
    setEmployeeInput(emp.name);
    setPositionInput(emp.position);
    // Small delay to ensure state updates before focus
    setTimeout(() => {
      document.getElementById('employee-name-input')?.focus();
    }, 10);
  };

  const selectExistingEmployee = (emp: { name: string; position: string }) => {
    if (!employees.some(e => e.name === emp.name)) {
      setEmployees([...employees, emp]);
    }
    setEmployeeInput('');
    setPositionInput('');
    setShowEmployeeDropdown(false);
    setHighlightedIndex(-1);
  };

  const filteredExistingEmployees = existingEmployees.filter(
    (emp) => {
      const name = typeof emp === 'string' ? emp : (emp?.name || '');
      const search = (employeeInput || '').toLowerCase();
      return name.toLowerCase().includes(search) &&
             !employees.some(e => e.name === name);
    }
  );

  const filteredQuickProducts = products.filter(p => {
    const search = quickItemInput.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const available = p.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
    return (name.includes(search) || sku.includes(search));
  }).slice(0, 5); // Limit to 5 results for mini search

  const removeEmployee = (nameToRemove: string) => {
    setEmployees(employees.filter(e => e.name !== nameToRemove));
  };

  const toggleEmployeeSelection = (name: string) => {
    setActiveEmployeeNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addItemToCart = (product: Product, availableQty: number, targetEmployeeNames?: string[]) => {
    const targets = targetEmployeeNames && targetEmployeeNames.length > 0 ? targetEmployeeNames : employees.map(e => e.name);
    
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      
      if (existingIndex >= 0) {
        // Item already in cart, update quantities for the target employees
        return prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQuantities = { ...(item.quantities || {}) };
            targets.forEach(name => {
              newQuantities[name] = 1; // Add for these employees
            });
            return { ...item, quantities: newQuantities };
          }
          return item;
        });
      } else {
        // New item, add to cart
        const initialQuantities: Record<string, number> = {};
        employees.forEach(emp => {
          initialQuantities[emp.name] = targets.includes(emp.name) ? 1 : 0;
        });

        return [...prev, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantities: initialQuantities,
          maxQuantity: availableQty,
          description: product.description,
        }];
      }
    });
  };

  const updateCartItem = (productId: string, field: keyof SelectedItem, value: any) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.productId === productId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const updateCartItemQuantity = (productId: string, empName: string, qty: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.productId === productId) {
        return { 
          ...item, 
          quantities: { ...(item.quantities || {}), [empName]: qty } 
        };
      }
      return item;
    }));
  };

  const removeCartItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const handleOpenSubmitModal = () => {
    if (employees.length === 0) return alert('Please add at least one employee.');
    if (selectedItems.length === 0) return alert('Please add at least one item to request.');
    if (!form.locationId) return alert('Location is required.');
    if (!form.supervisorName.trim()) return alert('Supervisor Name is required.');
    setShowSubmitModal(true);
  };

  const handleFinalSubmit = async () => {
    if (!attachmentFile) return alert('Please upload the signed document first.');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      const uploadRes = await api.post('/internal-requests/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const attachmentUrl = uploadRes.data.url;

      // Handle additional images
      const additionalUrls: string[] = [];
      for (const file of additionalFiles) {
        const fData = new FormData();
        fData.append('file', file);
        const res = await api.post('/internal-requests/upload', fData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        additionalUrls.push(res.data.url);
      }

      const requestsData: any[] = [];
      
      employees.forEach(emp => {
        selectedItems.forEach(item => {
          const qty = item.quantities && item.quantities[emp.name] !== undefined ? item.quantities[emp.name] : 1;
          if (qty > 0) {
            requestsData.push({
              date: form.date,
              employeeName: emp.name,
              employeeRole: emp.position,
              supervisor: form.supervisorName,
              departmentArea: form.departmentArea,
              shift: form.shift,
              locationId: form.locationId,
              productId: item.productId,
              quantity: qty,
              remarks: form.remarks,
              attachmentUrl,
              additionalImages: additionalUrls
            });
          }
        });
      });

      await api.post('/internal-requests/bulk', { requests: requestsData });
      
      setSelectedItems([]);
      setEmployees([]);
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setAdditionalFiles([]);
      setAdditionalPreviews([]);
      setShowSubmitModal(false);
      setForm(prev => ({...prev, departmentArea: ''}));
      alert('Requisition submitted successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachmentFile(file);
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (additionalFiles.length >= 2) return alert('Maximum 2 additional images allowed.');
      
      setAdditionalFiles([...additionalFiles, file]);
      setAdditionalPreviews([...additionalPreviews, URL.createObjectURL(file)]);
    }
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(additionalFiles.filter((_, i) => i !== index));
    setAdditionalPreviews(additionalPreviews.filter((_, i) => i !== index));
  };

  // Process and filter products for the left column
  const displayProducts = products
    .map(p => {
      // Only sum stocks for the currently selected location source
      const availableInLocation = p.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
      return { ...p, totalStock: availableInLocation };
    })
    .filter(p => {
      const search = (productSearch || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(search) || sku.includes(search);
    })
    .sort((a, b) => b.totalStock! - a.totalStock!); // Sort highest quantity to lowest

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 p-10">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-6"><CardSkeleton className="h-[600px] rounded-2xl" /></div>
          <div className="lg:col-span-6"><CardSkeleton className="h-[600px] rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 print:hidden">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Requisition Portal</h1>
          <p className="text-sm text-gray-500 font-medium">Browse inventory and build your material request</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-primary hover:border-primary/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Print Blank Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Requisition Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="bg-primary px-6 py-5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                New Requisition Form
              </h2>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Employee & Context Info */}
              <div className="space-y-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b border-gray-100 pb-2">
                  <User className="mr-2 h-3 w-3" />
                  Request Details
                </h3>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Request Date</label>
                    <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50" />
                  </div>
                  
                  {/* MULTIPLE EMPLOYEES TAGGING */}
                  <div className="col-span-2 space-y-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Employee Names (Multiple)</label>
                    <div className="relative">
                      <input 
                        id="employee-name-input"
                        type="text" 
                        placeholder="Type employee name..." 
                        value={employeeInput} 
                        onChange={e => handleEmployeeInputChange(e.target.value)}
                        onFocus={() => employeeInput.length > 0 && setShowEmployeeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                        onKeyDown={e => {
                          if (showEmployeeDropdown && filteredExistingEmployees.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedIndex(prev => (prev + 1) % filteredExistingEmployees.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedIndex(prev => (prev - 1 + filteredExistingEmployees.length) % filteredExistingEmployees.length);
                            } else if (e.key === 'Enter') {
                              if (highlightedIndex >= 0) {
                                e.preventDefault();
                                pickEmployee(filteredExistingEmployees[highlightedIndex]);
                              } else {
                                e.preventDefault();
                                addEmployee();
                              }
                            } else if (e.key === 'Tab' && highlightedIndex === -1 && employeeInput.trim()) {
                              // If user hits tab and something is in the field but nothing is highlighted, 
                              // highlight the first suggestion
                              e.preventDefault();
                              setHighlightedIndex(0);
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            addEmployee();
                          }
                        }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                      {showEmployeeDropdown && filteredExistingEmployees.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {filteredExistingEmployees.map((emp, idx) => (
                            <button
                              key={emp.name}
                              type="button"
                              tabIndex={-1}
                              onClick={() => selectExistingEmployee(emp)}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors text-gray-900 flex justify-between outline-none ${highlightedIndex === idx ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
                            >
                              <span className="font-bold">{emp.name}</span>
                              <span className="text-[10px] text-gray-400 uppercase font-black">{emp.position}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Position (e.g. Staff)" 
                        value={positionInput} 
                        onChange={e => setPositionInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmployee())}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                      <button onClick={addEmployee} type="button" className="px-5 py-2.5 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary transition-all shadow-lg hover:shadow-primary/20">
                        Add
                      </button>
                    </div>

                    {/* DRAFT ENTRY AREA */}
                    {draftEntry && (
                      <div className="mt-4 p-5 bg-blue-50/50 rounded-2xl border-2 border-primary/20 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-0.5">Drafting Entry For</span>
                            <h4 className="text-sm font-black text-gray-900">{draftEntry.name} <span className="text-gray-400 font-bold ml-2">— {draftEntry.position}</span></h4>
                          </div>
                          <button onClick={() => setDraftEntry(null)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                            <Plus className="h-3 w-3 mr-1.5" />
                            Assign Items to {draftEntry.name.split(',')[0]}
                          </label>
                          <div className="relative">
                            <input 
                              id="draft-item-search"
                              type="text" 
                              placeholder="Search item to assign..."
                              value={quickItemInput}
                              onChange={(e) => { setQuickItemInput(e.target.value); setShowItemDropdown(true); }}
                              onFocus={() => quickItemInput.length > 0 && setShowItemDropdown(true)}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                            />
                            {showItemDropdown && filteredQuickProducts.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                {filteredQuickProducts.map((prod) => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => { addProductToDraft(prod); setQuickItemInput(''); setShowItemDropdown(false); }}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-primary/5 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-gray-900">{prod.name}</span>
                                      <span className="text-[10px] text-gray-400 line-clamp-1">{prod.description || prod.sku}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {draftEntry.items.map(item => (
                              <div key={item.productId} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold shadow-sm">
                                <span className="text-gray-900">{item.name}</span>
                                <button onClick={() => removeProductFromDraft(item.productId)} className="text-gray-400 hover:text-red-500">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={confirmDraftEntry}
                            className="w-full mt-2 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirm & Add to Requisition
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {employees.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {employees.map(emp => {
                          const isActive = activeEmployeeNames.includes(emp.name);
                          return (
                            <div 
                              key={emp.name} 
                              onClick={() => toggleEmployeeSelection(emp.name)}
                              onDoubleClick={() => handleEditEmployee(emp)}
                              title="Click to toggle selection | Double-click to edit"
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border animate-in zoom-in-95 cursor-pointer select-none transition-all ${
                                isActive 
                                ? 'bg-primary text-white border-primary shadow-md scale-105 z-10' 
                                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                              }`}
                            >
                              <div className="flex flex-col items-start leading-tight">
                                <span>{emp.name}</span>
                                <span className={`text-[9px] uppercase ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{emp.position}</span>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeEmployee(emp.name); }} 
                                className={`transition-colors ml-1 ${isActive ? 'hover:text-white' : 'hover:text-red-500'}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* QUICK ITEM SEARCH */}
                    {employees.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                            <Search className="h-3 w-3 mr-1.5" />
                            Quick Item Add {activeEmployeeNames.length > 0 ? `(Targeting ${activeEmployeeNames.length} selected)` : '(All Employees)'}
                          </label>
                          {activeEmployeeNames.length > 0 && (
                            <button onClick={() => setActiveEmployeeNames([])} className="text-[9px] font-bold text-primary hover:underline uppercase">Clear Selection</button>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            id="main-item-search"
                            type="text" 
                            placeholder={activeEmployeeNames.length > 0 ? `Search item for ${activeEmployeeNames.join(', ')}...` : "Search item for all employees..."}
                            value={quickItemInput}
                            onChange={(e) => { setQuickItemInput(e.target.value); setShowItemDropdown(true); }}
                            onFocus={() => quickItemInput.length > 0 && setShowItemDropdown(true)}
                            onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                            onKeyDown={(e) => {
                              if (showItemDropdown && filteredQuickProducts.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setHighlightedItemIndex(prev => (prev + 1) % filteredQuickProducts.length);
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setHighlightedItemIndex(prev => (prev - 1 + filteredQuickProducts.length) % filteredQuickProducts.length);
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const prod = highlightedItemIndex >= 0 ? filteredQuickProducts[highlightedItemIndex] : filteredQuickProducts[0];
                                  if (prod) {
                                    const available = prod.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
                                    addItemToCart(prod, available, activeEmployeeNames);
                                    setQuickItemInput('');
                                    setShowItemDropdown(false);
                                  }
                                }
                              }
                            }}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                          />
                          {showItemDropdown && filteredQuickProducts.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                              {filteredQuickProducts.map((prod, idx) => {
                                const available = prod.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
                                return (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => {
                                      addItemToCart(prod, available, activeEmployeeNames);
                                      setQuickItemInput('');
                                      setShowItemDropdown(false);
                                      setTimeout(() => {
                                        document.getElementById('main-item-search')?.focus();
                                      }, 10);
                                    }}
                                    onMouseEnter={() => setHighlightedItemIndex(idx)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between border-b border-gray-50 last:border-0 ${highlightedItemIndex === idx ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-gray-900">{prod.name}</span>
                                      <span className="text-[10px] text-gray-400 line-clamp-1">{prod.description || prod.sku}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${available > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {available} {(prod as any).unit || 'pcs'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Shift</label>
                    <input type="text" placeholder="e.g. SHIFT 1" value={form.shift} onChange={e => setForm({...form, shift: e.target.value.toUpperCase()})} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Dept/Area</label>
                    <input type="text" placeholder="e.g. Production" value={form.departmentArea} onChange={e => setForm({...form, departmentArea: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Supervisor Name</label>
                    <input type="text" placeholder="e.g. John Doe" value={form.supervisorName} onChange={e => setForm({...form, supervisorName: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>
              </div>

              {/* Items Cart List */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b border-gray-100 pb-2">
                  <Box className="mr-2 h-3 w-3" />
                  Selected Items ({selectedItems.length})
                </h3>
                
                <div className="space-y-3 min-h-[150px]">
                  {selectedItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <Box className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs font-medium">No items selected.</p>
                      <p className="text-[10px]">Add items from the Inventory Explorer on the right.</p>
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div key={item.productId} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-2 shadow-sm">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-gray-900">{item.productName}</p>
                            {item.description && <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.description}</p>}
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.sku} • Max Total: {item.maxQuantity}</p>
                          </div>
                          <button onClick={() => removeCartItem(item.productId)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          {employees.length === 0 ? (
                            <p className="text-[10px] text-yellow-600 font-medium">Please add employees above to set quantities.</p>
                          ) : (
                            <div className="space-y-2">
                              {employees.map(emp => {
                                const qty = item.quantities && item.quantities[emp.name] !== undefined ? item.quantities[emp.name] : 1;
                                return (
                                  <div key={emp.name} className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-gray-700">{emp.name}</span>
                                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{emp.position}</span>
                                    </div>
                                    <div className="w-20">
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={qty} 
                                        onChange={e => updateCartItemQuantity(item.productId, emp.name, parseInt(e.target.value) || 0)}
                                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-center outline-none focus:border-primary font-bold bg-white"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* General Remarks */}
              <div className="pt-2 pb-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">General Remarks</label>
                <textarea 
                  placeholder="Any additional instructions or notes for this requisition..."
                  value={form.remarks}
                  onChange={e => setForm({...form, remarks: e.target.value})}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={handleOpenSubmitModal}
                  disabled={isSubmitting || selectedItems.length === 0 || employees.length === 0}
                  className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <><Clock className="animate-spin mr-2 h-4 w-4" /> Processing...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Submit Requisition</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Inventory Explorer */}
        <div className="lg:col-span-6 flex flex-col space-y-4 h-[80vh]">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4 shrink-0">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center">
              <Box className="mr-2 h-4 w-4 text-primary" /> Inventory Explorer
            </h2>
            
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or SKU..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              
              <div className="w-1/3 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4">
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                <span className="text-sm font-black text-gray-800 uppercase tracking-wide">Main Office</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 flex-1 overflow-y-auto p-4 space-y-3">
            {displayProducts.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-10">No items found matching your criteria.</div>
            ) : (
              displayProducts.map(product => {
                const isSelected = selectedItems.some(item => item.productId === product.id);
                return (
                  <div 
                    key={product.id} 
                    onDoubleClick={() => setViewItem(product)}
                    className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all cursor-pointer ${isSelected ? 'border-primary shadow-primary/10 bg-primary/5' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-20 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden relative shrink-0">
                        {product.imageUrl || product.imageUrl2 ? (
                          <div className="flex w-full h-full">
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt="Slot 1" className={`h-full ${product.imageUrl2 ? 'w-1/2' : 'w-full'} object-cover border-r border-white/10`} />
                            )}
                            {product.imageUrl2 && (
                              <img src={product.imageUrl2} alt="Slot 2" className={`h-full ${product.imageUrl ? 'w-1/2' : 'w-full'} object-cover`} />
                            )}
                          </div>
                        ) : (
                          <Box className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{product.sku}</span>
                        <span className={`text-[10px] font-black uppercase ${product.totalStock! > 10 ? 'text-green-600' : 'text-orange-500'}`}>
                          {product.totalStock} Available
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                      onClick={() => isSelected ? removeCartItem(product.id) : addItemToCart(product, product.totalStock!)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center ${
                        isSelected 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'bg-gray-900 text-white hover:bg-primary shadow-lg hover:shadow-primary/20'
                      }`}
                    >
                      {isSelected ? (
                        <>Remove</>
                      ) : (
                        <><Plus className="mr-1 h-3 w-3" /> Add</>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Print & Upload Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Print & Upload Verification</h2>
                <p className="text-sm text-gray-500 font-medium">Please print, sign, and upload the form before submitting.</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Printable Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Document Preview</h3>
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('printable-area');
                      const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
                      if (windowPrint && printContent) {
                        windowPrint.document.write(`
                          <html>
                            <head>
                              <title>Print Requisition Form</title>
                              <style>
                                body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
                                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                                .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
                                table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
                                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                                .signatures { display: flex; justify-content: flex-end; margin-top: 60px; }
                                .sig-line { border-top: 1px solid #111; padding-top: 8px; text-align: center; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              ${printContent.innerHTML}
                            </body>
                          </html>
                        `);
                        windowPrint.document.close();
                        windowPrint.focus();
                        windowPrint.print();
                        windowPrint.close();
                      }
                    }}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-black rounded-lg shadow-md hover:bg-gray-800 transition-colors flex items-center"
                  >
                    <ClipboardList className="w-3 h-3 mr-2" /> Print Form
                  </button>
                </div>
                
                <div id="printable-area" className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm relative text-xs text-gray-900">
                  <div className="header text-center mb-6 border-b border-gray-200 pb-4">
                    <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }} className="font-black">REQUISITION FORM</h1>
                    <p style={{ color: '#666', margin: 0 }}>Date: {new Date(form.date).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="details grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p><strong>Employees:</strong> {employees.map(e => `${e.name} [${e.position}]`).join(', ')}</p>
                      <p><strong>Department:</strong> {form.departmentArea || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p><strong>Shift:</strong> {form.shift}</p>
                      <p><strong>Location:</strong> MAIN OFFICE</p>
                      <p><strong>Supervisor:</strong> {form.supervisorName}</p>
                    </div>
                  </div>
                  
                  {form.remarks && (
                    <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg text-[11px]">
                      <p><strong>General Remarks:</strong> {form.remarks}</p>
                    </div>
                  )}
                  
                  <table className="w-full text-left border-collapse mb-8 border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 border border-gray-200">Item</th>
                        <th className="p-2 border border-gray-200 w-1/3">Description</th>
                        <th className="p-2 border border-gray-200">Tracking No.</th>
                        <th className="p-2 border border-gray-200 text-center">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map(item => {
                        const totalQty = employees.reduce((sum, emp) => sum + (item.quantities && item.quantities[emp.name] !== undefined ? item.quantities[emp.name] : 1), 0);
                        
                        return (
                          <tr key={item.productId}>
                            <td className="p-2 border border-gray-200">{item.productName}</td>
                            <td className="p-2 border border-gray-200 text-[10px] text-gray-600 leading-snug">{item.description || '-'}</td>
                            <td className="p-2 border border-gray-200 font-mono">{item.sku}</td>
                            <td className="p-2 border border-gray-200 text-center font-bold">
                              {totalQty}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  <div className="signatures flex justify-end mt-12">
                    <div className="text-center w-64" style={{ width: '250px' }}>
                      <br/><br/><br/>
                      <div className="sig-line border-t border-black pt-2 font-bold">Approved By</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Upload */}
              <div className="space-y-6 flex flex-col">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Upload Signed Document</h3>
                  
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden group">
                    {attachmentPreview ? (
                      <div className="absolute inset-0 w-full h-full p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={attachmentPreview} className="w-full h-full object-contain rounded-xl" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl m-2">
                          <p className="text-white font-bold text-sm">Click to change file</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                          <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <p className="mb-2 text-sm text-gray-500 font-medium"><span className="font-bold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-400 font-medium">PNG, JPG, or PDF (MAX. 5MB)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                  </label>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex justify-between">
                    <span>Optional Photos (Need/Issue)</span>
                    <span className="text-[10px] text-gray-400 font-bold">{additionalFiles.length}/2</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {additionalPreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden group">
                        <img src={preview} className="w-full h-full object-cover" alt="Additional" />
                        <button 
                          onClick={() => removeAdditionalFile(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {additionalFiles.length < 2 && (
                      <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors bg-white group">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/10 transition-colors">
                          <Plus className="h-5 w-5 text-gray-400 group-hover:text-primary" />
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase mt-2 group-hover:text-primary">Add Photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAdditionalFileChange} />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto bg-blue-50 p-4 rounded-xl flex items-start border border-blue-100">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    To proceed, you must print the document, have your supervisor sign it, and upload the scanned copy or photo here. The Admin will review the attached signature for approval.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalSubmit}
                disabled={!attachmentFile || isSubmitting}
                className="px-8 py-3 bg-[#50C878] hover:bg-[#45b068] disabled:bg-[#50C878]/50 text-white font-black text-sm tracking-widest uppercase rounded-xl transition-all shadow-xl shadow-[#50C878]/30 flex items-center justify-center active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <><Clock className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit to Admin</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Item Details</h2>
              <button onClick={() => setViewItem(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {viewItem.imageUrl ? (
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative group">
                    <img src={viewItem.imageUrl} alt="Primary" className="w-full h-full object-contain" />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[8px] font-black uppercase rounded">Primary</div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-gray-300">
                    <Box className="h-8 w-8 mb-1 opacity-50" />
                    <p className="text-[8px] font-bold">No Primary</p>
                  </div>
                )}

                {viewItem.imageUrl2 ? (
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative group">
                    <img src={viewItem.imageUrl2} alt="Secondary" className="w-full h-full object-contain" />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[8px] font-black uppercase rounded">Secondary</div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-gray-300">
                    <Box className="h-8 w-8 mb-1 opacity-50" />
                    <p className="text-[8px] font-bold">No Secondary</p>
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{viewItem.name}</h3>
                    <p className="text-sm font-mono text-gray-500 mt-0.5">{viewItem.sku}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-black rounded-lg ${viewItem.totalStock! > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {viewItem.totalStock} Available
                  </span>
                </div>
                
                {viewItem.description ? (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 leading-relaxed">{viewItem.description}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-400 italic">No description provided for this item.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>

      {/* PRINT-ONLY BLANK FORM */}
      <div className="hidden print:block bg-white text-gray-900 p-8 min-h-screen">
        <style>{`
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
        `}</style>
        <div className="text-center mb-8 border-b-4 border-gray-900 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-1">Staff Material Requisition Form</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Internal Inventory Request Document</p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
          <div className="flex items-end gap-4">
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest w-24">Date:</span>
            <div className="border-b-2 border-gray-400 flex-1 h-6"></div>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest w-24">Shift:</span>
            <div className="border-b-2 border-gray-400 flex-1 h-6"></div>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest w-32">Dept/Area:</span>
            <div className="border-b-2 border-gray-400 flex-1 h-6"></div>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest w-32">Supervisor:</span>
            <div className="border-b-2 border-gray-400 flex-1 h-6"></div>
          </div>
        </div>



        <table className="w-full border-collapse border-2 border-gray-900 mb-8">
          <thead>
            <tr className="border-b-2 border-gray-900 bg-gray-100">
              <th className="py-3 px-4 border-r-2 border-gray-900 text-left text-[10px] font-black uppercase tracking-widest w-12 text-center">No.</th>
              <th className="py-3 px-4 border-r-2 border-gray-900 text-left text-[10px] font-black uppercase tracking-widest w-64">Employee Name</th>
              <th className="py-3 px-4 border-r-2 border-gray-900 text-left text-[10px] font-black uppercase tracking-widest">Item Description / SKU</th>
              <th className="py-3 px-4 border-r-2 border-gray-900 text-center text-[10px] font-black uppercase tracking-widest w-32">Quantity</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(15)].map((_, i) => (
              <tr key={i} className="border-b border-gray-400">
                <td className="py-3 px-4 border-r-2 border-gray-900 text-center text-xs font-black text-gray-400">{i + 1}</td>
                <td className="py-3 px-4 border-r-2 border-gray-900"></td>
                <td className="py-3 px-4 border-r-2 border-gray-900"></td>
                <td className="py-3 px-4 border-r-2 border-gray-900"></td>
                <td className="py-3 px-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-6">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">General Remarks:</span>
          <div className="border-2 border-gray-400 w-full h-16 rounded-lg"></div>
        </div>

        <div className="flex justify-end pt-6">
          <div className="space-y-8 w-64">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Approved By:</div>
            <div className="border-b-2 border-gray-900"></div>
            <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature - Date</div>
          </div>
        </div>
      </div>
    </>
  );
}
