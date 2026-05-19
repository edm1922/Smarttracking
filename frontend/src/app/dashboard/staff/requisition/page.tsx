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
import { Product, Location, Employee, SelectedItem, DraftEntry } from './components/RSQTypes';

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
  const [employeeInput, setEmployeeInput] = useState('');
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
        typeof e === 'string' ? { name: e, position: 'Staff', department: '' } : { ...e, department: e.department || '' }
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
    // Load from local storage
    try {
      const savedEmployees = localStorage.getItem('requisition_employees');
      const savedItems = localStorage.getItem('requisition_items');
      const savedForm = localStorage.getItem('requisition_form');
      if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
      if (savedItems) setSelectedItems(JSON.parse(savedItems));
      if (savedForm) {
        const parsedForm = JSON.parse(savedForm);
        setForm(prev => ({ ...prev, ...parsedForm }));
      }
    } catch (e) {
      console.error('Failed to load saved requisition', e);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('requisition_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('requisition_items', JSON.stringify(selectedItems));
  }, [selectedItems]);

  useEffect(() => {
    const { departmentArea, shift, supervisorName, remarks } = form;
    localStorage.setItem('requisition_form', JSON.stringify({ departmentArea, shift, supervisorName, remarks }));
  }, [form.departmentArea, form.shift, form.supervisorName, form.remarks]);

  const clearForm = () => {
    if (confirm('Are you sure you want to clear all entries and start a new requisition?')) {
      setEmployees([]);
      setSelectedItems([]);
      setForm({
        date: new Date().toISOString().split('T')[0],
        locationId: locations[0]?.id || '',
        departmentArea: '',
        shift: 'SHIFT 1',
        supervisorName: '',
        remarks: ''
      });
      localStorage.removeItem('requisition_employees');
      localStorage.removeItem('requisition_items');
      localStorage.removeItem('requisition_form');
      toast.info('Portal reset successful');
    }
  };

  const addEmployee = () => {
    const trimmedName = employeeInput.trim().toUpperCase();
    if (!trimmedName) return;
    const trimmedPos = positionInput.trim().toUpperCase() || 'STAFF';
    const trimmedDept = departmentInput.trim().toUpperCase() || '';
    setDraftEntry({ name: trimmedName, position: trimmedPos, department: trimmedDept, items: [] });
    setEmployeeInput('');
    setPositionInput('');
    setDepartmentInput('');
    setShowEmployeeDropdown(false);
  };

  const selectExistingEmployee = (emp: Employee) => {
    setDraftEntry({ name: emp.name.toUpperCase(), position: emp.position.toUpperCase(), department: emp.department?.toUpperCase() || '', items: [] });
    setEmployeeInput('');
    setPositionInput('');
    setDepartmentInput('');
    setShowEmployeeDropdown(false);
  };

  const removeEmployee = (name: string) => {
    setEmployees(employees.filter(e => e.name !== name));
  };

  const handleEditEmployee = (emp: Employee) => {
    removeEmployee(emp.name);
    setEmployeeInput(emp.name);
    setPositionInput(emp.position);
    setDepartmentInput(emp.department);
  };

  const toggleEmployeeSelection = (name: string) => {
    setActiveEmployeeNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
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
    if (!employees.some(e => e.name === draftEntry.name)) {
      setEmployees([...employees, { name: draftEntry.name, position: draftEntry.position, department: draftEntry.department }]);
    }
    draftEntry.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        addItemToCart(product, item.availableQty, [draftEntry.name], item.quantity);
      }
    });
    setDraftEntry(null);
    toast.success('Entry confirmed');
  };

  const addItemToCart = (product: Product, availableQty: number, targetEmployeeNames?: string[], quantity: number = 1) => {
    let targets = targetEmployeeNames;
    if (!targets || targets.length === 0) {
      targets = activeEmployeeNames.length > 0 ? activeEmployeeNames : employees.map(e => e.name);
    }
    if (targets.length === 0) return toast.warning('Tag employees first');

    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      if (existingIndex >= 0) {
        return prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQuantities = { ...(item.quantities || {}) };
            targets!.forEach(name => { newQuantities[name] = (newQuantities[name] || 0) + quantity; });
            return { ...item, quantities: newQuantities };
          }
          return item;
        });
      } else {
        const initialQuantities: Record<string, number> = {};
        employees.forEach(emp => { initialQuantities[emp.name] = targets!.includes(emp.name) ? quantity : 0; });
        targets!.forEach(name => { if (initialQuantities[name] === undefined) initialQuantities[name] = quantity; });
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
        selectedItems.forEach(item => {
          const qty = item.quantities && item.quantities[emp.name] !== undefined ? item.quantities[emp.name] : 0;
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
    .sort((a, b) => b.totalStock! - a.totalStock!);

  const quickDisplayProducts = products
    .map(p => ({ ...p, totalStock: p.stocks.find(s => s.location?.id === form.locationId)?.quantity || 0 }))
    .filter(p => p.name.toLowerCase().includes(quickItemInput.toLowerCase()) || p.sku.toLowerCase().includes(quickItemInput.toLowerCase()))
    .sort((a, b) => b.totalStock! - a.totalStock!);

  if (loading) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <RSQHeader onClear={clearForm} onPrintBlank={() => window.print()} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-10">
          <RSQFormSection 
            form={form} setForm={setForm} locations={locations}
            employees={employees} existingEmployees={existingEmployees}
            employeeInput={employeeInput} setEmployeeInput={setEmployeeInput}
            positionInput={positionInput} setPositionInput={setPositionInput}
            departmentInput={departmentInput} setDepartmentInput={setDepartmentInput}
            showEmployeeDropdown={showEmployeeDropdown} setShowEmployeeDropdown={setShowEmployeeDropdown}
            highlightedIndex={highlightedIndex} setHighlightedIndex={setHighlightedIndex}
            activeEmployeeNames={activeEmployeeNames} toggleEmployeeSelection={toggleEmployeeSelection}
            addEmployee={addEmployee} selectExistingEmployee={selectExistingEmployee}
            removeEmployee={removeEmployee} handleEditEmployee={handleEditEmployee}
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
          />
        </div>

        <div className="lg:col-span-5">
          <RSQItemExplorer 
            productSearch={productSearch} setProductSearch={setProductSearch}
            displayProducts={displayProducts} addItemToCart={addItemToCart}
            setViewItem={setViewItem}
          />
        </div>
      </div>

      <RSQSubmitModal 
        isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)}
        form={form} setForm={setForm}
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

      <PrintableRequisition 
        form={form} 
        employees={employees} 
        selectedItems={selectedItems} 
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
