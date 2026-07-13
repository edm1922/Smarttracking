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
import { Employee, DraftEntry, Product, Location, employeeKey } from './RSQTypes';

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
}

const inputClass =
  'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

const iconInputClass =
  'min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </label>
  );
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
  const shiftReady = Boolean(form.shift?.trim());
  const supervisorReady = Boolean(form.supervisorName?.trim());

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
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">Step 1</p>
            <h2 className="text-lg font-semibold text-slate-950">Request Details & Employees</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className={`rounded-full px-3 py-1 ${shiftReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              Shift {shiftReady ? 'Ready' : 'Needed'}
            </span>
            <span className={`rounded-full px-3 py-1 ${supervisorReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              Supervisor {supervisorReady ? 'Ready' : 'Needed'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <FieldLabel htmlFor="rsq-location">Source Location</FieldLabel>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select
                id="rsq-location"
                name="sourceLocation"
                value={form.locationId}
                onChange={e => setForm({ ...form, locationId: e.target.value })}
                disabled
                className={`${iconInputClass} appearance-none`}
                aria-describedby="rsq-location-help"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <p id="rsq-location-help" className="mt-1.5 text-xs text-slate-500">Fixed by inventory source.</p>
          </div>

          <div>
            <FieldLabel htmlFor="rsq-shift" required>Operational Shift</FieldLabel>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="rsq-shift"
                name="shift"
                type="text"
                list="shift-options"
                autoComplete="off"
                placeholder="Example: SHIFT 1"
                value={form.shift}
                onChange={e => setForm({ ...form, shift: e.target.value.toUpperCase() })}
                className={iconInputClass}
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
            <FieldLabel htmlFor="rsq-supervisor" required>Supervisor Name</FieldLabel>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="rsq-supervisor"
                name="supervisorName"
                type="text"
                autoComplete="off"
                placeholder="Supervisor name"
                value={form.supervisorName || ''}
                onChange={e => setForm({ ...form, supervisorName: e.target.value.toUpperCase() })}
                className={iconInputClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="rsq-department">Department / Area</FieldLabel>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="rsq-department"
                name="departmentArea"
                type="text"
                list="dept-options"
                autoComplete="off"
                placeholder="Example: Operations"
                value={form.departmentArea || ''}
                onChange={e => setForm({ ...form, departmentArea: e.target.value.toUpperCase() })}
                className={iconInputClass}
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

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">Step 2</p>
              <h3 className="text-base font-semibold text-slate-950">Employees</h3>
            </div>
            {!canTagEmployees ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Complete shift and supervisor before tagging employees.</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">Search existing staff or add a manual entry.</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="relative lg:col-span-3">
              <FieldLabel htmlFor="employee-lastname-input">Last Name</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  ref={lastNameInputRef}
                  id="employee-lastname-input"
                  name="employeeLastName"
                  type="text"
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
                  className={iconInputClass}
                  aria-expanded={showEmployeeDropdown}
                  aria-controls="employee-search-results"
                />
              </div>
              {showEmployeeDropdown && filteredExistingEmployees.length > 0 && canTagEmployees && (
                <div
                  id="employee-search-results"
                  className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl"
                  role="listbox"
                >
                  {filteredExistingEmployees.map((emp, idx) => (
                    <button
                      key={employeeKey(emp)}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => selectExistingEmployee(emp)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${highlightedIndex === idx ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}
                      role="option"
                      aria-selected={highlightedIndex === idx}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{emp.lastName}, {emp.firstName}</span>
                        <span className="block truncate text-xs text-slate-500">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              <FieldLabel htmlFor="employee-firstname-input">First Name</FieldLabel>
              <input
                id="employee-firstname-input"
                name="employeeFirstName"
                type="text"
                autoComplete="off"
                placeholder="First name"
                value={firstNameInput}
                onChange={e => setFirstNameInput(e.target.value.toUpperCase())}
                onFocus={() => setShowEmployeeDropdown(true)}
                onKeyDown={handleEmployeeKeyDown}
                disabled={!canTagEmployees}
                className={inputClass}
              />
            </div>

            <div className="lg:col-span-2">
              <FieldLabel htmlFor="employee-position-input">Position</FieldLabel>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="employee-position-input"
                  name="employeePosition"
                  type="text"
                  autoComplete="off"
                  placeholder="Position"
                  value={positionInput}
                  onChange={e => setPositionInput(e.target.value.toUpperCase())}
                  disabled={!canTagEmployees}
                  className={iconInputClass}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <FieldLabel htmlFor="employee-department-input">Department</FieldLabel>
              <input
                id="employee-department-input"
                name="employeeDepartment"
                type="text"
                autoComplete="off"
                placeholder="Department"
                value={departmentInput}
                onChange={e => setDepartmentInput(e.target.value.toUpperCase())}
                disabled={!canTagEmployees}
                className={inputClass}
              />
            </div>

            <div className="flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={addEmployee}
                disabled={!canTagEmployees || (!lastNameInput.trim() && !firstNameInput.trim())}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </div>

          {employees.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Tagged Employees</h4>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{employees.length} tagged</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {employees.map(emp => {
                  const key = employeeKey(emp);
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
                      <button
                        type="button"
                        onClick={() => editAndDraftEmployee(emp)}
                        className="min-w-0 flex-1 rounded px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-950">{emp.lastName}, {emp.firstName}</span>
                        <span className="block truncate text-xs text-slate-500">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEmployee(key)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Remove ${emp.lastName}, ${emp.firstName}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              No employees tagged yet. Add at least one employee before assigning materials.
            </div>
          )}
        </div>

        {draftEntry && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-700">Step 3</p>
                  <h4 className="text-base font-semibold text-slate-950">Assign Materials for {draftEntry.lastName}, {draftEntry.firstName}</h4>
                  <p className="text-sm text-slate-600">Search items, set quantities, then add this employee entry to the request.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDraftEntry(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Cancel material assignment"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative">
              <FieldLabel htmlFor="draft-item-search">Material Search</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  ref={itemSearchRef}
                  id="draft-item-search"
                  name="draftMaterialSearch"
                  type="text"
                  autoComplete="off"
                  placeholder="Search item or SKU"
                  value={quickItemInput}
                  onChange={(e) => {
                    setQuickItemInput(e.target.value.toUpperCase());
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowItemDropdown(false);
                  }}
                  className={iconInputClass}
                  aria-expanded={showItemDropdown}
                  aria-controls="draft-item-results"
                />
              </div>
              {showItemDropdown && filteredQuickProducts.length > 0 && (
                <div id="draft-item-results" className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                  {filteredQuickProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProduct(prod)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-950">{prod.name}</span>
                        <span className="block truncate text-xs text-slate-500">{prod.description || 'No description'} - Stock: {prod.totalStock ?? 0} {prod.unit || 'PCS'}</span>
                      </span>
                      <PackagePlus className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {draftEntry.items.length > 0 ? (
              <div className="mt-4 space-y-3">
                {draftEntry.items.map(item => (
                  <div key={item.productId} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{item.name}</p>
                      <p className="truncate text-xs text-slate-500">{item.description || 'No description'} - {item.availableQty} available</p>
                    </div>
                    <div className="w-full md:w-28">
                      <label htmlFor={`draft-qty-${item.productId}`} className="mb-1 block text-xs font-semibold text-slate-600">Qty</label>
                      <input
                        id={`draft-qty-${item.productId}`}
                        name={`draftQty-${item.productId}`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateDraftItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold tabular-nums text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProductFromDraft(item.productId)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-blue-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Search and add at least one material for this employee.
              </div>
            )}

            <button
              type="button"
              onClick={confirmDraftEntry}
              disabled={draftEntry.items.length === 0}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Add Employee to Request
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
