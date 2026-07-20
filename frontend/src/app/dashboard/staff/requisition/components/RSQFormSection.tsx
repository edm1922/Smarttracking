'use client';

import React from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ClipboardList,
  Clock,
  MapPin,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { Employee, DraftEntry, Product, Location, employeeKey, SelectedItem } from './RSQTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { RSQCartSection } from './RSQCartSection';

interface RSQFormSectionProps {
  form: any;
  setForm: (form: any) => void;
  locations: Location[];
  employees: Employee[];
  existingEmployees: Employee[];
  lastNameInput: string;
  setLastNameInput: (val: string) => void;
  firstNameInput: string;
  setFirstNameInput: (val: string) => void;
  positionInput: string;
  setPositionInput: (val: string) => void;
  departmentInput: string;
  setDepartmentInput: (val: string) => void;
  showEmployeeDropdown: boolean;
  setShowEmployeeDropdown: (val: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: (idx: number) => void;
  addEmployee: () => void;
  selectExistingEmployee: (emp: Employee) => void;
  removeEmployee: (name: string) => void;
  editAndDraftEmployee: (emp: Employee) => void;
  draftEntry: DraftEntry | null;
  setDraftEntry: (draft: DraftEntry | null) => void;
  quickItemInput: string;
  setQuickItemInput: (val: string) => void;
  showItemDropdown: boolean;
  setShowItemDropdown: (val: boolean) => void;
  filteredQuickProducts: Product[];
  addProductToDraft: (prod: Product) => void;
  updateDraftItemQuantity: (id: string, qty: number) => void;
  removeProductFromDraft: (id: string) => void;
  confirmDraftEntry: () => void;

  // Cart/Review Section parameters
  selectedItems: SelectedItem[];
  updateCartItemQuantity: (productId: string, empName: string, qty: number) => void;
  removeCartItem: (productId: string) => void;
  handleOpenSubmitModal: () => void;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  savedDrafts: string[];
  onLoadDraft: (name: string) => void;
  onDeleteDraft: (name: string) => void;
}

export const RSQFormSection: React.FC<RSQFormSectionProps> = ({
  form,
  setForm,
  locations,
  employees,
  existingEmployees,
  lastNameInput,
  setLastNameInput,
  firstNameInput,
  setFirstNameInput,
  positionInput,
  setPositionInput,
  departmentInput,
  setDepartmentInput,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  highlightedIndex,
  setHighlightedIndex,
  addEmployee,
  selectExistingEmployee,
  removeEmployee,
  editAndDraftEmployee,
  draftEntry,
  setDraftEntry,
  quickItemInput,
  setQuickItemInput,
  showItemDropdown,
  setShowItemDropdown,
  filteredQuickProducts,
  addProductToDraft,
  updateDraftItemQuantity,
  removeProductFromDraft,
  confirmDraftEntry,

  // Cart review props
  selectedItems,
  updateCartItemQuantity,
  removeCartItem,
  handleOpenSubmitModal,
  isSubmitting,
  onSaveDraft,
  savedDrafts,
  onLoadDraft,
  onDeleteDraft,
}) => {
  const itemSearchRef = React.useRef<HTMLInputElement>(null);
  const lastNameInputRef = React.useRef<HTMLInputElement>(null);
  const prevDraftEntryRef = React.useRef<DraftEntry | null>(null);

  React.useEffect(() => {
    if (prevDraftEntryRef.current && !draftEntry) {
      lastNameInputRef.current?.focus();
    } else if (!prevDraftEntryRef.current && draftEntry) {
      itemSearchRef.current?.focus();
    }
    prevDraftEntryRef.current = draftEntry;
  }, [draftEntry]);

  const handleSelectProduct = (prod: Product) => {
    addProductToDraft(prod);
    setQuickItemInput('');
    setShowItemDropdown(false);
    itemSearchRef.current?.focus();
  };

  const searchText = `${lastNameInput} ${firstNameInput}`.trim();
  const searchLast = lastNameInput.trim().toLowerCase();
  const filteredExistingEmployees = existingEmployees.filter((emp) => {
    const full = `${emp.lastName} ${emp.firstName}`;
    const empLast = emp.lastName.toLowerCase();
    const matchesFull = full.toLowerCase().includes(searchText.toLowerCase());
    const matchesLast = searchLast.length > 0 && empLast === searchLast;
    return (matchesFull || matchesLast) && !employees.some(e => employeeKey(e) === employeeKey(emp));
  });

  React.useEffect(() => {
    if (!showEmployeeDropdown || filteredExistingEmployees.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    if (highlightedIndex >= filteredExistingEmployees.length) {
      setHighlightedIndex(0);
    }
  }, [filteredExistingEmployees.length, highlightedIndex, setHighlightedIndex, showEmployeeDropdown]);

  const canTagEmployees = Boolean(form.shift?.trim() && form.supervisorName?.trim());

  const handleEmployeeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showEmployeeDropdown || filteredExistingEmployees.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(highlightedIndex < filteredExistingEmployees.length - 1 ? highlightedIndex + 1 : 0);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : filteredExistingEmployees.length - 1);
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      selectExistingEmployee(filteredExistingEmployees[highlightedIndex]);
    }

    if (event.key === 'Escape') {
      setShowEmployeeDropdown(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-2.5 border-b">
        <div>
          <CardTitle className="text-sm font-bold">Request Details & Employees</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3.5 pb-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <Label htmlFor="rsq-location" className="text-xs">Source Location</Label>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <select
                id="rsq-location"
                name="sourceLocation"
                value={form.locationId}
                onChange={e => setForm({ ...form, locationId: e.target.value })}
                disabled
                className="h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pl-8 pr-2.5 text-xs transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                aria-describedby="rsq-location-help"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <p id="rsq-location-help" className="mt-0.5 text-[9px] text-muted-foreground">Fixed by inventory source.</p>
          </div>

          <div>
            <Label htmlFor="rsq-shift" className="text-xs">Operational Shift <span className="text-destructive">*</span></Label>
            <div className="relative mt-1">
              <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="rsq-shift"
                name="shift"
                list="shift-options"
                autoComplete="off"
                placeholder="Example: SHIFT 1"
                value={form.shift}
                onChange={e => setForm({ ...form, shift: e.target.value.toUpperCase() })}
                className="pl-8 h-8 text-xs"
              />
              <datalist id="shift-options">
                <option value="SHIFT 1" />
                <option value="SHIFT 2" />
                <option value="SHIFT 3" />
                <option value="MORNING" />
                <option value="NIGHT" />
              </datalist>
            </div>
          </div>

          <div>
            <Label htmlFor="rsq-supervisor" className="text-xs">Supervisor Name <span className="text-destructive">*</span></Label>
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="rsq-supervisor"
                name="supervisorName"
                autoComplete="off"
                placeholder="Supervisor name"
                value={form.supervisorName || ''}
                onChange={e => setForm({ ...form, supervisorName: e.target.value.toUpperCase() })}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rsq-department" className="text-xs">Department / Area</Label>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="rsq-department"
                name="departmentArea"
                list="dept-options"
                autoComplete="off"
                placeholder="Example: Operations"
                value={form.departmentArea || ''}
                onChange={e => setForm({ ...form, departmentArea: e.target.value.toUpperCase() })}
                className="pl-8 h-8 text-xs"
              />
              <datalist id="dept-options">
                <option value="MAIN OFFICE" />
                <option value="LOGISTICS" />
                <option value="OPERATIONS" />
                <option value="HR" />
                <option value="IT" />
              </datalist>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-bold text-foreground">Tag Employees</h3>
            {!canTagEmployees ? (
              <Alert className="w-auto py-1 px-2.5 border-amber-200 bg-amber-50">
                <AlertCircle className="h-3 w-3 text-amber-600 mr-1 inline-block align-middle" />
                <AlertDescription className="text-[10px] text-amber-900 inline-block align-middle p-0">
                  Complete shift & supervisor.
                </AlertDescription>
              </Alert>
            ) : (
              <span className="text-[10px] text-muted-foreground">Search staff or enter manually.</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="relative">
              <Label htmlFor="employee-lastname-input" className="text-xs">Last Name</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  ref={lastNameInputRef}
                  id="employee-lastname-input"
                  name="employeeLastName"
                  autoComplete="off"
                  placeholder="Last name"
                  value={lastNameInput}
                  onChange={e => {
                    setLastNameInput(e.target.value.toUpperCase());
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  onKeyDown={handleEmployeeKeyDown}
                  disabled={!canTagEmployees}
                  className="pl-8 h-8 text-xs"
                  aria-expanded={showEmployeeDropdown}
                  aria-controls="employee-search-results"
                />
              </div>
              {showEmployeeDropdown && filteredExistingEmployees.length > 0 && canTagEmployees && (
                <div
                  id="employee-search-results"
                  className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg ring-1 ring-foreground/5"
                  role="listbox"
                >
                  {filteredExistingEmployees.map((emp, idx) => (
                    <button
                      key={employeeKey(emp)}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => selectExistingEmployee(emp)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${highlightedIndex === idx ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted/50'}`}
                      role="option"
                      aria-selected={highlightedIndex === idx}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{emp.lastName}, {emp.firstName}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</span>
                      </span>
                      <Plus className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="employee-firstname-input" className="text-xs">First Name</Label>
              <Input
                id="employee-firstname-input"
                name="employeeFirstName"
                autoComplete="off"
                placeholder="First name"
                value={firstNameInput}
                onChange={e => setFirstNameInput(e.target.value.toUpperCase())}
                onFocus={() => setShowEmployeeDropdown(true)}
                onKeyDown={handleEmployeeKeyDown}
                disabled={!canTagEmployees}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="employee-position-input" className="text-xs">Position</Label>
              <div className="relative mt-1">
                <Briefcase className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="employee-position-input"
                  name="employeePosition"
                  autoComplete="off"
                  placeholder="Position"
                  value={positionInput}
                  onChange={e => setPositionInput(e.target.value.toUpperCase())}
                  disabled={!canTagEmployees}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="employee-department-input" className="text-xs">Department</Label>
              <Input
                id="employee-department-input"
                name="employeeDepartment"
                autoComplete="off"
                placeholder="Department"
                value={departmentInput}
                onChange={e => setDepartmentInput(e.target.value.toUpperCase())}
                disabled={!canTagEmployees}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 mt-1">
              <Button
                onClick={addEmployee}
                disabled={!canTagEmployees || (!lastNameInput.trim() && !firstNameInput.trim())}
                className="w-full h-8 text-xs font-semibold"
                size="sm"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add Employee
              </Button>
            </div>
          </div>

          {employees.length > 0 ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-foreground">Tagged Employees</h4>
                <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1">{employees.length} tagged</Badge>
              </div>
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {employees.map(emp => {
                    const key = employeeKey(emp);
                    return (
                      <motion.div
                        key={key}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1"
                      >
                        <button
                          type="button"
                          onClick={() => editAndDraftEmployee(emp)}
                          className="min-w-0 flex-1 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="block truncate text-xs font-semibold text-foreground">{emp.lastName}, {emp.firstName}</span>
                          <span className="block truncate text-[9px] text-muted-foreground">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeEmployee(key)}
                          aria-label={`Remove ${emp.lastName}, ${emp.firstName}`}
                          className="text-muted-foreground hover:text-destructive h-6 w-6"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-card px-3 py-4 text-center text-[11px] text-muted-foreground">
              No employees tagged. Tag staff to start adding materials.
            </div>
          )}
        </div>

        <AnimatePresence>
          {draftEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Assign Materials for {draftEntry.lastName}, {draftEntry.firstName}</h4>
                      <p className="text-[10px] text-muted-foreground leading-tight">Search items, set quantities, then confirm.</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDraftEntry(null)}
                    aria-label="Cancel material assignment"
                    className="h-6 w-6 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="relative">
                  <Label htmlFor="draft-item-search" className="text-xs">Material Search</Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      ref={itemSearchRef}
                      id="draft-item-search"
                      name="draftMaterialSearch"
                      autoComplete="off"
                      placeholder="Search item or SKU..."
                      value={quickItemInput}
                      onChange={(e) => {
                        setQuickItemInput(e.target.value.toUpperCase());
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowItemDropdown(false);
                      }}
                      className="pl-8 h-8 text-xs"
                      aria-expanded={showItemDropdown}
                      aria-controls="draft-item-results"
                    />
                  </div>
                  {showItemDropdown && filteredQuickProducts.length > 0 && (
                    <div id="draft-item-results" className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg ring-1 ring-foreground/5">
                      {filteredQuickProducts.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">{prod.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{prod.description || 'No description'} - Stock: {prod.totalStock ?? 0} {prod.unit || 'PCS'}</span>
                          </span>
                          <PackagePlus className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {draftEntry.items.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5">
                    {draftEntry.items.map(item => (
                      <div key={item.productId} className="grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{item.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{item.description || 'No description'} - {item.availableQty} available</p>
                        </div>
                        <div className="w-full md:w-20">
                          <Input
                            id={`draft-qty-${item.productId}`}
                            name={`draftQty-${item.productId}`}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateDraftItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="text-center font-semibold tabular-nums h-8 text-xs py-1"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => removeProductFromDraft(item.productId)}
                          className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-primary/20 bg-card px-3 py-4 text-center text-[11px] text-muted-foreground">
                    Search and add materials for this employee.
                  </div>
                )}

                <Button
                  onClick={confirmDraftEntry}
                  disabled={draftEntry.items.length === 0}
                  className="mt-2.5 w-full h-8 text-xs font-semibold"
                  size="sm"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Add Employee Request Row
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <RSQCartSection
          selectedItems={selectedItems}
          employees={employees}
          updateCartItemQuantity={updateCartItemQuantity}
          removeCartItem={removeCartItem}
          handleOpenSubmitModal={handleOpenSubmitModal}
          isSubmitting={isSubmitting}
          onSaveDraft={onSaveDraft}
          savedDrafts={savedDrafts}
          onLoadDraft={onLoadDraft}
          onDeleteDraft={onDeleteDraft}
        />
      </CardContent>
    </Card>
  );
};
