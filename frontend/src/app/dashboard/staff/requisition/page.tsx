'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { RSQHeader } from './components/RSQHeader';
import { RSQFormSection } from './components/RSQFormSection';
import { RSQItemExplorer } from './components/RSQItemExplorer';
import { RSQCartSection } from './components/RSQCartSection';
import { RSQSubmitModal } from './components/RSQSubmitModal';
import { PrintableRequisition } from './components/PrintableRequisition';
import { BlankRequisitionForm } from './components/BlankRequisitionForm';
import { FolderOpen, X } from 'lucide-react';
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

  const [productSearch, setProductSearch] = useState('');

  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    departmentArea: '',
    shift: 'SHIFT 1',
    locationId: '',
    remarks: '',
    supervisorName: '',
  });

  const [lastNameInput, setLastNameInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeEmployeeNames, setActiveEmployeeNames] = useState<string[]>([]);

  const [quickItemInput, setQuickItemInput] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [requestCountMap, setRequestCountMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  const totalQuantity = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
    }, 0);
  }, [selectedItems]);

  const getProductStock = (product: Product) => {
    return product.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0;
  };

  const handlePrintBlank = () => {
    setPrintMode('blank');
    setTimeout(() => {
      window.print();
      window.onafterprint = () => setPrintMode('filled');
    }, 100);
  };

  const fetchData = async () => {
    try {
      const [prodsRes, locsRes, empRes] = await Promise.all([
        api.get('/products', { params: { take: 1000 } }),
        api.get('/locations'),
        api.get('/internal-requests/employees')
      ]);

      const rawEmployees = empRes.data || [];
      const parsedEmpMap = new Map<string, Employee>();
      rawEmployees.forEach((e: any) => {
        const rawName = typeof e === 'string' ? e : (e.name || e.employeeName || '');
        const parsed = parseEmpName(rawName);
        const emp = {
          lastName: parsed.lastName,
          firstName: parsed.firstName,
          position: typeof e === 'string' ? 'Staff' : (e.position || e.employeeRole || 'Staff'),
          department: typeof e === 'string' ? '' : (e.department || e.departmentArea || '')
        };
        const key = employeeKey(emp);
        if (!parsedEmpMap.has(key)) {
          parsedEmpMap.set(key, emp);
        }
      });
      setExistingEmployees(Array.from(parsedEmpMap.values()));

      const locs = locsRes.data;
      setLocations(locs);

      if (locs.length > 0 && !form.locationId) {
        const mainOffice = locs.find((l: Location) => l.name.toLowerCase() === 'main office');
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
      toast.error('Failed to load requisition data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    try {
      const drafts = localStorage.getItem('requisition_drafts_list');
      if (drafts) setSavedDrafts(JSON.parse(drafts));
    } catch (e) {
      console.error('Failed to load drafts list', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('requisition_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('requisition_items', JSON.stringify(selectedItems));
  }, [selectedItems]);

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
    } catch {
      toast.error('Failed to save draft');
    }
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
    } catch {
      toast.error('Failed to load draft');
    }
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
    } catch {
      toast.error('Failed to delete draft');
    }
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
    setDraftEntry({ lastName: trimmedLast || '-', firstName: trimmedFirst || '-', position: trimmedPos, department: trimmedDept, items: [] });
    setLastNameInput('');
    setFirstNameInput('');
    setPositionInput('');
    setDepartmentInput('');
    setShowEmployeeDropdown(false);
  };

  const selectExistingEmployee = (emp: Employee) => {
    setLastNameInput(emp.lastName.toUpperCase());
    const typedFirst = firstNameInput.trim().toUpperCase();
    setFirstNameInput(emp.firstName ? emp.firstName.toUpperCase() : typedFirst || '');
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
    const available = getProductStock(product);
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
    toast.success('Employee entry added to request');
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
      }

      const initialQuantities: Record<string, number> = {};
      employees.forEach(emp => {
        const key = employeeKey(emp);
        initialQuantities[key] = targets!.includes(key) ? quantity : 0;
      });
      targets!.forEach(key => {
        if (initialQuantities[key] === undefined) initialQuantities[key] = quantity;
      });
      return [...prev, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantities: initialQuantities,
        maxQuantity: availableQty,
        description: product.description,
      }];
    });
    toast.success(`${product.name} added to request`);
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

      if (requestsData.length === 0) {
        toast.warning('Set at least one quantity before submitting');
        return;
      }

      await api.post('/internal-requests/bulk', { requests: requestsData });
      setSelectedItems([]);
      setEmployees([]);
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setAdditionalFiles([]);
      setAdditionalPreviews([]);
      setShowSubmitModal(false);
      setForm(prev => ({ ...prev, departmentArea: '' }));
      toast.success('Requisition submitted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayProducts = useMemo(() => {
    return products
      .map(p => ({ ...p, totalStock: getProductStock(p) }))
      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
      .sort((a, b) => {
        switch (sortBy) {
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'stock-high': return (b.totalStock || 0) - (a.totalStock || 0);
          case 'stock-low': return (a.totalStock || 0) - (b.totalStock || 0);
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [form.locationId, productSearch, products, sortBy]);

  const quickDisplayProducts = useMemo(() => {
    return products
      .map(p => ({ ...p, totalStock: getProductStock(p) }))
      .filter(p => p.name.toLowerCase().includes(quickItemInput.toLowerCase()) || p.sku.toLowerCase().includes(quickItemInput.toLowerCase()))
      .sort((a, b) => b.totalStock! - a.totalStock!);
  }, [form.locationId, products, quickItemInput]);

  if (loading) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-3 pb-20 sm:px-5 lg:px-6">
      <div className="no-print">
        <RSQHeader
          onPrintBlank={handlePrintBlank}
          employeeCount={employees.length}
          productCount={selectedItems.length}
          totalQuantity={totalQuantity}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
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
              filteredQuickProducts={quickDisplayProducts.slice(0, 8)}
              addProductToDraft={addProductToDraft} updateDraftItemQuantity={updateDraftItemQuantity}
              removeProductFromDraft={removeProductFromDraft} confirmDraftEntry={confirmDraftEntry}
            />

            <RSQCartSection
              selectedItems={selectedItems} employees={employees}
              updateCartItemQuantity={updateCartItemQuantity} removeCartItem={removeCartItem}
              handleOpenSubmitModal={() => {
                if (employees.length === 0) return toast.warning('Add employees first');
                if (selectedItems.length === 0) return toast.warning('Select materials first');
                if (totalQuantity === 0) return toast.warning('Set at least one material quantity');
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

          <RSQItemExplorer
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            displayProducts={displayProducts}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onAddProduct={(product) => addItemToCart(product, product.totalStock ?? getProductStock(product))}
            canAddProducts={employees.length > 0}
            requestCountMap={requestCountMap}
          />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="save-draft-title">
            <div className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <FolderOpen className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 id="save-draft-title" className="text-lg font-semibold text-slate-950">Save Draft</h3>
                      <p className="mt-1 text-sm text-slate-500">Name this requisition so it can be restored later.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowDraftModal(false); setDraftNameInput(''); }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    aria-label="Close save draft dialog"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label htmlFor="draft-name" className="mb-1.5 block text-sm font-semibold text-slate-800">Draft Name</label>
                  <input
                    id="draft-name"
                    name="draftName"
                    type="text"
                    autoComplete="off"
                    placeholder="Example: SHIFT 1 MAIN OFFICE"
                    value={draftNameInput}
                    onChange={e => setDraftNameInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveDraft(); }}
                    className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                  />
                  {savedDrafts.includes(draftNameInput.trim().toUpperCase()) && (
                    <p className="mt-2 text-sm font-medium text-amber-700">
                      A draft with this name already exists. Saving will overwrite it.
                    </p>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowDraftModal(false); setDraftNameInput(''); }}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={!draftNameInput.trim()}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Save Draft
                  </button>
                </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
