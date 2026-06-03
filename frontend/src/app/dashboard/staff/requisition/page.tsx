'use client';

import { useEffect, useState, Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeaderSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeletons';
import { RSQHeader } from './components/RSQHeader';
import { RSQFormSection } from './components/RSQFormSection';
import { RSQItemExplorer } from './components/RSQItemExplorer';
import { RSQCartSection } from './components/RSQCartSection';
import { RSQSubmitModal } from './components/RSQSubmitModal';
import { PrintableRequisition } from './components/PrintableRequisition';
import { BlankRequisitionForm } from './components/BlankRequisitionForm';
import { X, FolderOpen } from 'lucide-react';
import { Product, Location, Employee, SelectedItem, DraftEntry, parseEmpName, employeeKey, formatEmpName } from './components/RSQTypes';

export default function StaffRequisitionPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <RSQContent />
    </Suspense>
  );
}

function RSQContent() {
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
  const [lastNameInput, setLastNameInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeEmployeeNames, setActiveEmployeeNames] = useState<string[]>([]);
  
  // Quick Item Search state
  const [quickItemInput, setQuickItemInput] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  
  // Draft Entry state
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null);
  
  // Cart state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [viewItem, setViewItem] = useState<Product | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [requestCountMap, setRequestCountMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

  const handlePrintBlank = () => {
    setPrintMode('blank');
    setTimeout(() => {
      window.print();
      window.onafterprint = () => setPrintMode('filled');
    }, 100);
  };
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
      const parsedEmpMap = new Map<string, any>();
      rawEmployees.forEach((e: any) => {
        const rawName = typeof e === 'string' ? e : (e.name || e.employeeName || '');
        const parsed = parseEmpName(rawName);
        const emp = { lastName: parsed.lastName, firstName: parsed.firstName, position: typeof e === 'string' ? 'Staff' : (e.position || e.employeeRole || 'Staff'), department: typeof e === 'string' ? '' : (e.department || e.departmentArea || '') };
        const key = employeeKey(emp);
        if (!parsedEmpMap.has(key)) {
          parsedEmpMap.set(key, emp);
        }
      });
      setExistingEmployees(Array.from(parsedEmpMap.values()));
      
      const locs = locsRes.data;
      setLocations(locs);
      
      if (locs.length > 0 && !form.locationId) {
        const mainOffice = locs.find((l: any) => l.name.toLowerCase() === 'main office');
        setForm(f => ({ ...f, locationId: mainOffice ? mainOffice.id : locs[0].id }));
      }
      
      setProducts(prodsRes.data.data || prodsRes.data || []);

      const mostReqRes = await api.get('/internal-requests/most-requested', { params: { take: 50 } });
      const mostReqMap: Record<string, number> = {};
      (mostReqRes.data || []).forEach((item: any) => {
        mostReqMap[item.productId] = item.requestCount;
      });
      setRequestCountMap(mostReqMap);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Load from local storage
    try {
      const savedEmployees = localStorage.getItem('requisition_employees');
      const savedItems = localStorage.getItem('requisition_items');
      const savedForm = localStorage.getItem('requisition_form');
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees);
        setEmployees(parsed.map((e: any) =>
          e.lastName ? e : { ...parseEmpName(e.name), position: e.position || 'Staff', department: e.department || '' }
        ));
      }
      if (savedItems) setSelectedItems(JSON.parse(savedItems));
      if (savedForm) {
        const parsedForm = JSON.parse(savedForm);
        setForm(prev => ({ ...prev, ...parsedForm }));
      }
    } catch (e) {
      console.error('Failed to load saved requisition', e);
    }
    // Load saved drafts list
    try {
      const drafts = localStorage.getItem('requisition_drafts_list');
      if (drafts) setSavedDrafts(JSON.parse(drafts));
    } catch (e) {
      console.error('Failed to load drafts list', e);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('requisition_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('requisition_items', JSON.stringify(selectedItems));
  }, [selectedItems]);

  const refreshDraftsList = () => {
    try {
      const drafts = localStorage.getItem('requisition_drafts_list');
      const list = drafts ? JSON.parse(drafts) : [];
      setSavedDrafts(list);
    } catch {}
  };

  const handleSaveDraft = () => {
    const name = draftNameInput.trim().toUpperCase();
    if (!name) return toast.warning('Enter a draft name');
    try {
      const allDrafts = JSON.parse(localStorage.getItem('requisition_drafts') || '{}');
      allDrafts[name] = {
        employees,
        selectedItems,
        form: { departmentArea: form.departmentArea, shift: form.shift, supervisorName: form.supervisorName, remarks: form.remarks },
        activeEmployeeNames,
      };
      localStorage.setItem('requisition_drafts', JSON.stringify(allDrafts));
      const list = Object.keys(allDrafts);
      localStorage.setItem('requisition_drafts_list', JSON.stringify(list));
      setSavedDrafts(list);
      setShowDraftModal(false);
      setDraftNameInput('');
      toast.success(`Draft "${name}" saved`);
    } catch { toast.error('Failed to save draft'); }
  };

  const handleLoadDraft = (name: string) => {
    try {
      const allDrafts = JSON.parse(localStorage.getItem('requisition_drafts') || '{}');
      const draft = allDrafts[name];
      if (!draft) return toast.error('Draft not found');
      setEmployees((draft.employees || []).map((e: any) =>
        e.lastName ? e : { ...parseEmpName(e.name), position: e.position || 'Staff', department: e.department || '' }
      ));
      setSelectedItems(draft.selectedItems || []);
      if (draft.form) setForm(prev => ({ ...prev, ...draft.form }));
      if (draft.activeEmployeeNames) setActiveEmployeeNames(draft.activeEmployeeNames);
      toast.success(`Draft "${name}" loaded`);
    } catch { toast.error('Failed to load draft'); }
  };

  const handleDeleteDraft = (name: string) => {
    try {
      const allDrafts = JSON.parse(localStorage.getItem('requisition_drafts') || '{}');
      delete allDrafts[name];
      localStorage.setItem('requisition_drafts', JSON.stringify(allDrafts));
      const list = Object.keys(allDrafts);
      localStorage.setItem('requisition_drafts_list', JSON.stringify(list));
      setSavedDrafts(list);
      toast.success(`Draft "${name}" deleted`);
    } catch { toast.error('Failed to delete draft'); }
  };

  useEffect(() => {
    const { departmentArea, shift, supervisorName, remarks } = form;
    localStorage.setItem('requisition_form', JSON.stringify({ departmentArea, shift, supervisorName, remarks }));
  }, [form.departmentArea, form.shift, form.supervisorName, form.remarks]);

  const addEmployee = () => {
    const trimmedLast = lastNameInput.trim().toUpperCase();
    const trimmedFirst = firstNameInput.trim().toUpperCase();
    if (!trimmedLast && !trimmedFirst) return;
    const trimmedPos = positionInput.trim().toUpperCase() || 'STAFF';
    const trimmedDept = departmentInput.trim().toUpperCase() || '';
    setDraftEntry({ lastName: trimmedLast || '—', firstName: trimmedFirst || '—', position: trimmedPos, department: trimmedDept, items: [] });
    setLastNameInput('');
    setFirstNameInput('');
    setPositionInput('');
    setDepartmentInput('');
    setShowEmployeeDropdown(false);
  };

  const selectExistingEmployee = (emp: Employee) => {
    setLastNameInput(emp.lastName.toUpperCase());
    setFirstNameInput(emp.firstName.toUpperCase());
    setPositionInput(emp.position.toUpperCase());
    setDepartmentInput((emp.department || '').toUpperCase());
    setShowEmployeeDropdown(false);
  };

  const removeEmployee = (key: string) => {
    setEmployees(employees.filter(e => employeeKey(e) !== key));
  };

  const editAndDraftEmployee = (emp: Employee) => {
    removeEmployee(employeeKey(emp));
    setLastNameInput(emp.lastName);
    setFirstNameInput(emp.firstName);
    setPositionInput(emp.position);
    setDepartmentInput(emp.department);
    setDraftEntry({ lastName: emp.lastName, firstName: emp.firstName, position: emp.position, department: emp.department, items: [] });
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
        quantity: 1,
        description: product.description
      }]
    });
  };

  const updateDraftItemQuantity = (productId: string, qty: number) => {
    if (!draftEntry) return;
    setDraftEntry({
      ...draftEntry,
      items: draftEntry.items.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
    });
  };

  const removeProductFromDraft = (productId: string) => {
    if (!draftEntry) return;
    setDraftEntry({
      ...draftEntry,
      items: draftEntry.items.filter(i => i.productId !== productId)
    });
  };

  const confirmDraftEntry = () => {
    if (!draftEntry) return;
    const empKey = employeeKey(draftEntry);
    if (!employees.some(e => employeeKey(e) === empKey)) {
      setEmployees([...employees, { lastName: draftEntry.lastName, firstName: draftEntry.firstName, position: draftEntry.position, department: draftEntry.department }]);
    }
    draftEntry.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        addItemToCart(product, item.availableQty, [empKey], item.quantity);
      }
    });
    setDraftEntry(null);
    toast.success('Entry confirmed');
  };

  const addItemToCart = (product: Product, availableQty: number, targetEmployeeKeys?: string[], quantity: number = 1) => {
    let targets = targetEmployeeKeys;
    if (!targets || targets.length === 0) {
      targets = activeEmployeeNames.length > 0 ? activeEmployeeNames : employees.map(e => employeeKey(e));
    }
    if (targets.length === 0) return toast.warning('Tag employees first');

    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      if (existingIndex >= 0) {
        return prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQuantities = { ...(item.quantities || {}) };
            targets!.forEach(key => { newQuantities[key] = (newQuantities[key] || 0) + quantity; });
            return { ...item, quantities: newQuantities };
          }
          return item;
        });
      } else {
        const initialQuantities: Record<string, number> = {};
        employees.forEach(emp => { const key = employeeKey(emp); initialQuantities[key] = targets!.includes(key) ? quantity : 0; });
        targets!.forEach(key => { if (initialQuantities[key] === undefined) initialQuantities[key] = quantity; });
        return [...prev, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantities: initialQuantities,
          maxQuantity: availableQty,
          description: product.description,
        }];
      }
    });
    toast.success(`${product.name} added to list`);
  };

  const updateCartItemQuantity = (productId: string, empName: string, qty: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantities: { ...(item.quantities || {}), [empName]: qty } };
      }
      return item;
    }));
  };

  const removeCartItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const handleFinalSubmit = async () => {
    if (!attachmentFile) return toast.warning('Upload signed document');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      const uploadRes = await api.post('/internal-requests/upload', formData);
      const attachmentUrl = uploadRes.data.url;

      const additionalUrls: string[] = [];
      for (const file of additionalFiles) {
        const fData = new FormData();
        fData.append('file', file);
        const res = await api.post('/internal-requests/upload', fData);
        additionalUrls.push(res.data.url);
      }

      const requestsData: any[] = [];
      employees.forEach(emp => {
        const empKey = employeeKey(emp);
        selectedItems.forEach(item => {
          const qty = item.quantities && item.quantities[empKey] !== undefined ? item.quantities[empKey] : 0;
          if (qty > 0) {
            requestsData.push({
              date: form.date,
              employeeName: formatEmpName(emp.lastName, emp.firstName),
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
      toast.success('Requisition submitted successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayProducts = products
    .map(p => ({ ...p, totalStock: p.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0 }))
    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'stock-high': return (b.totalStock || 0) - (a.totalStock || 0);
        case 'stock-low': return (a.totalStock || 0) - (b.totalStock || 0);
        default: return a.name.localeCompare(b.name);
      }
    });

  const quickDisplayProducts = products
    .map(p => ({ ...p, totalStock: p.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0 }))
    .filter(p => p.name.toLowerCase().includes(quickItemInput.toLowerCase()) || p.sku.toLowerCase().includes(quickItemInput.toLowerCase()))
    .sort((a, b) => b.totalStock! - a.totalStock!);

  if (loading) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="no-print">
        <RSQHeader onPrintBlank={handlePrintBlank} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-10">
            <RSQFormSection 
              form={form} setForm={setForm} locations={locations}
              employees={employees} existingEmployees={existingEmployees}
              lastNameInput={lastNameInput} setLastNameInput={setLastNameInput}
              firstNameInput={firstNameInput} setFirstNameInput={setFirstNameInput}
              positionInput={positionInput} setPositionInput={setPositionInput}
              departmentInput={departmentInput} setDepartmentInput={setDepartmentInput}
              showEmployeeDropdown={showEmployeeDropdown} setShowEmployeeDropdown={setShowEmployeeDropdown}
              highlightedIndex={highlightedIndex} setHighlightedIndex={setHighlightedIndex}
              addEmployee={addEmployee} selectExistingEmployee={selectExistingEmployee}
              removeEmployee={removeEmployee} editAndDraftEmployee={editAndDraftEmployee}
              draftEntry={draftEntry} setDraftEntry={setDraftEntry}
              quickItemInput={quickItemInput} setQuickItemInput={setQuickItemInput}
              showItemDropdown={showItemDropdown} setShowItemDropdown={setShowItemDropdown}
              filteredQuickProducts={quickDisplayProducts.slice(0, 5)}
              addProductToDraft={addProductToDraft} updateDraftItemQuantity={updateDraftItemQuantity}
              removeProductFromDraft={removeProductFromDraft} confirmDraftEntry={confirmDraftEntry}
            />

            <RSQCartSection 
              selectedItems={selectedItems} employees={employees}
              updateCartItemQuantity={updateCartItemQuantity} removeCartItem={removeCartItem}
              handleOpenSubmitModal={() => {
                if (employees.length === 0) return toast.warning('Add employees first');
                if (selectedItems.length === 0) return toast.warning('Select materials first');
                if (!form.supervisorName.trim()) return toast.warning('Supervisor required');
                setShowSubmitModal(true);
              }}
              isSubmitting={isSubmitting}
              onSaveDraft={() => setShowDraftModal(true)}
              savedDrafts={savedDrafts}
              onLoadDraft={handleLoadDraft}
              onDeleteDraft={handleDeleteDraft}
            />
          </div>

          <div className="lg:col-span-5">
            <RSQItemExplorer 
              productSearch={productSearch} setProductSearch={setProductSearch}
              displayProducts={displayProducts}
              setViewItem={setViewItem}
              sortBy={sortBy} setSortBy={setSortBy}
            />
          </div>
        </div>

        <RSQSubmitModal 
          isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)}
          form={form}
          employees={employees}
          selectedItems={selectedItems}
          attachmentFile={attachmentFile} attachmentPreview={attachmentPreview}
          handleFileChange={e => {
            if (e.target.files?.[0]) {
              setAttachmentFile(e.target.files[0]);
              setAttachmentPreview(URL.createObjectURL(e.target.files[0]));
            }
          }}
          additionalFiles={additionalFiles} additionalPreviews={additionalPreviews}
          handleAdditionalFileChange={e => {
            if (e.target.files?.[0] && additionalFiles.length < 2) {
              setAdditionalFiles([...additionalFiles, e.target.files[0]]);
              setAdditionalPreviews([...additionalPreviews, URL.createObjectURL(e.target.files[0])]);
            }
          }}
          removeAdditionalFile={idx => {
            setAdditionalFiles(additionalFiles.filter((_, i) => i !== idx));
            setAdditionalPreviews(additionalPreviews.filter((_, i) => i !== idx));
          }}
          isSubmitting={isSubmitting} onSubmit={handleFinalSubmit}
        />

        {showDraftModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save as Draft</h3>
                    <p className="text-[9px] font-medium text-white/60 uppercase tracking-widest mt-0.5">Name your draft for quick recall</p>
                  </div>
                </div>
                <button onClick={() => { setShowDraftModal(false); setDraftNameInput(''); }} className="p-1.5 text-white/60 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <input
                  type="text"
                  placeholder="DRAFT NAME..."
                  value={draftNameInput}
                  onChange={e => setDraftNameInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDraft(); }}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-gray-400 uppercase"
                  autoFocus
                />
                {savedDrafts.includes(draftNameInput.trim().toUpperCase()) && (
                  <p className="text-[10px] font-bold text-amber-600 flex items-center gap-2">
                    A draft with this name already exists — saving will overwrite it.
                  </p>
                )}
              </div>
              <div className="p-8 pt-0 flex gap-3">
                <button onClick={() => { setShowDraftModal(false); setDraftNameInput(''); }} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={!draftNameInput.trim()}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all hover:shadow-xl hover:shadow-amber-600/30 hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={printMode === 'blank' ? { display: 'none' } : undefined}>
        <PrintableRequisition 
          form={form} 
          employees={employees} 
          selectedItems={selectedItems} 
        />
      </div>

      {printMode === 'blank' && (
        <div className="print-only">
          <BlankRequisitionForm />
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
