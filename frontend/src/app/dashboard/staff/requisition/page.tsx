'use client';

import { useEffect, useState, Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { RSQHeader } from './components/RSQHeader';
import { RSQFormSection } from './components/RSQFormSection';
import { RSQItemExplorer } from './components/RSQItemExplorer';
import { RSQSubmitModal } from './components/RSQSubmitModal';
import { PrintableRequisition } from './components/PrintableRequisition';
import { BlankRequisitionForm } from './components/BlankRequisitionForm';
import { FolderOpen } from 'lucide-react';
import { Product, Location, Employee, SelectedItem, DraftEntry, parseEmpName, employeeKey, formatEmpName } from './components/RSQTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MostRequested {
  productId: string;
  productName: string;
  requestCount: number;
}

export default function StaffRequisitionPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <RSQContent />
    </Suspense>
  );
}

function RSQContent() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'picker'>('form');
  const [loading, setLoading] = useState(true);

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

  const [quickItemInput, setQuickItemInput] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null);
  const [quickProducts, setQuickProducts] = useState<Product[]>([]);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [mostRequestedList, setMostRequestedList] = useState<MostRequested[]>([]);
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  const totalQuantity = selectedItems.reduce((sum, item) => {
    return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
  }, 0);

  const handlePrintBlank = () => {
    setPrintMode('blank');
    setTimeout(() => {
      window.print();
      window.onafterprint = () => setPrintMode('filled');
    }, 100);
  };

  const fetchData = async () => {
    try {
      const [locsRes, empRes, mostReqRes] = await Promise.all([
        api.get('/locations'),
        api.get('/internal-requests/employees'),
        api.get('/internal-requests/most-requested', { params: { take: 50 } })
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

      const mostReqList: MostRequested[] = (mostReqRes.data || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName || item.product?.name || 'Unknown',
        requestCount: item.requestCount
      }));
      setMostRequestedList(mostReqList);
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
    if (!quickItemInput.trim()) {
      setQuickProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/products', {
          params: { search: quickItemInput, take: 8 }
        });
        setQuickProducts(res.data.data || res.data || []);
      } catch { }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickItemInput]);

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

  const getProductStock = (product: Product) => {
    return product.stocks?.find(s => s.location?.id === form.locationId)?.quantity || 0;
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
        description: product.description,
        unit: product.unit
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
      addItemToCart({
        id: item.productId,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        description: item.description
      }, item.availableQty, [empKey], item.quantity);
    });
    setDraftEntry(null);
    toast.success('Employee entry added to request');
  };

  const addItemToCart = (
    product: { id: string; name: string; sku: string; unit?: string; description: string | null },
    availableQty: number,
    targetEmployeeKeys?: string[],
    quantity: number = 1
  ) => {
    let targets = targetEmployeeKeys;
    if (!targets || targets.length === 0) {
      targets = employees.map(e => employeeKey(e));
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

  if (loading) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-3 pb-20 sm:px-5 lg:px-6">
      <div className="no-print">
        <RSQHeader
          onPrintBlank={handlePrintBlank}
          employeeCount={employees.length}
          productCount={selectedItems.length}
          totalQuantity={totalQuantity}
        />

        <div className="flex rounded-lg bg-muted/60 p-1 xl:hidden mb-4 border">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${activeTab === 'form' ? 'bg-background text-foreground shadow-xs border border-border/10' : 'text-muted-foreground'}`}
          >
            Requisition Form & Review ({selectedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('picker')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${activeTab === 'picker' ? 'bg-background text-foreground shadow-xs border border-border/10' : 'text-muted-foreground'}`}
          >
            Materials
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`space-y-4 ${activeTab === 'form' ? 'block' : 'hidden xl:block'}`}>
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
              filteredQuickProducts={quickProducts}
              addProductToDraft={addProductToDraft} updateDraftItemQuantity={updateDraftItemQuantity}
              removeProductFromDraft={removeProductFromDraft} confirmDraftEntry={confirmDraftEntry}

              // Merged review section props
              selectedItems={selectedItems}
              updateCartItemQuantity={updateCartItemQuantity}
              removeCartItem={removeCartItem}
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

          <div className={`${activeTab === 'picker' ? 'block' : 'hidden xl:block'}`}>
            <RSQItemExplorer
              locationId={form.locationId}
              onAddProduct={(product) => addItemToCart(product, getProductStock(product))}
              canAddProducts={employees.length > 0}
              mostRequested={mostRequestedList}
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

        <Dialog open={showDraftModal} onOpenChange={(open) => { if (!open) { setShowDraftModal(false); setDraftNameInput(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <FolderOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <DialogTitle>Save Draft</DialogTitle>
                  <DialogDescription className="mt-1 text-xs">
                    Name this requisition so it can be restored later.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="draft-name">Draft Name</Label>
                <Input
                  id="draft-name"
                  name="draftName"
                  autoComplete="off"
                  placeholder="Example: SHIFT 1 MAIN OFFICE"
                  value={draftNameInput}
                  onChange={e => setDraftNameInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDraft(); }}
                  className="mt-1.5"
                />
                {savedDrafts.includes(draftNameInput.trim().toUpperCase()) && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    A draft with this name already exists. Saving will overwrite it.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setShowDraftModal(false); setDraftNameInput(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={!draftNameInput.trim()}
              >
                Save Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
