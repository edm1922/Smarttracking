'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Box, X, User, ClipboardList, Send, Clock, Trash2, MapPin, CheckCircle
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
  stocks: ProductStock[];
  totalStock?: number;
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
  const [employees, setEmployees] = useState<string[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<string[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  
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
      
      setExistingEmployees(empRes.data || []);
      
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

  const addEmployee = () => {
    const trimmed = employeeInput.trim();
    if (trimmed && !employees.includes(trimmed)) {
      setEmployees([...employees, trimmed]);
      setEmployeeInput('');
      setShowEmployeeDropdown(false);
    }
  };

  const handleEmployeeInputChange = (value: string) => {
    setEmployeeInput(value);
    setShowEmployeeDropdown(value.length > 0);
  };

  const selectExistingEmployee = (name: string) => {
    if (!employees.includes(name)) {
      setEmployees([...employees, name]);
    }
    setEmployeeInput('');
    setShowEmployeeDropdown(false);
  };

  const filteredExistingEmployees = existingEmployees.filter(
    (name: string) =>
      name.toLowerCase().includes(employeeInput.toLowerCase()) &&
      !employees.includes(name)
  );

  const removeEmployee = (nameToRemove: string) => {
    setEmployees(employees.filter(name => name !== nameToRemove));
  };

  const addItemToCart = (product: Product, availableQty: number) => {
    if (selectedItems.some(item => item.productId === product.id)) {
      return; // Already in cart
    }
    
    const initialQuantities: Record<string, number> = {};
    employees.forEach(emp => initialQuantities[emp] = 1);
    
    setSelectedItems([...selectedItems, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantities: initialQuantities,
      maxQuantity: availableQty,
      description: product.description,
    }]);
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
      
      employees.forEach(empName => {
        selectedItems.forEach(item => {
          const qty = item.quantities && item.quantities[empName] !== undefined ? item.quantities[empName] : 1;
          if (qty > 0) {
            requestsData.push({
              date: form.date,
              employeeName: empName,
              employeeRole: 'Staff',
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
    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
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
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Requisition Portal</h1>
        <p className="text-sm text-gray-500 font-medium">Browse inventory and build your material request</p>
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
                        type="text" 
                        placeholder="Type employee name & press Add..." 
                        value={employeeInput} 
                        onChange={e => handleEmployeeInputChange(e.target.value)}
                        onFocus={() => employeeInput.length > 0 && setShowEmployeeDropdown(true)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmployee())}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                      {showEmployeeDropdown && filteredExistingEmployees.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {filteredExistingEmployees.map((name: string) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => selectExistingEmployee(name)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-900"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={addEmployee} type="button" className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">
                      Add
                    </button>
                    
                    {employees.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {employees.map(emp => (
                          <div key={emp} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20 animate-in zoom-in-95">
                            {emp}
                            <button onClick={() => removeEmployee(emp)} className="hover:text-red-500 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
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
                                const qty = item.quantities && item.quantities[emp] !== undefined ? item.quantities[emp] : 1;
                                return (
                                  <div key={emp} className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-700">{emp}</span>
                                    <div className="w-20">
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={qty} 
                                        onChange={e => updateCartItemQuantity(item.productId, emp, parseInt(e.target.value) || 0)}
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
                    title="Double click to view details"
                  >
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
                      <p><strong>Employees:</strong> {employees.join(', ')}</p>
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
                        const totalQty = employees.reduce((sum, emp) => sum + (item.quantities && item.quantities[emp] !== undefined ? item.quantities[emp] : 1), 0);
                        
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
              {viewItem.imageUrl ? (
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewItem.imageUrl} alt={viewItem.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                  <Box className="h-16 w-16 mb-2 opacity-50" />
                  <p className="text-sm font-bold">No Image Available</p>
                </div>
              )}
              
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
  );
}
