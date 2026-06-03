import React from 'react';
import { 
  User, Plus, Search, X, CheckCircle, MapPin, 
  Clock, ClipboardList, Briefcase, UserPlus, Trash2
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

  const handleSelectProduct = (prod: any) => {
    addProductToDraft(prod);
    setQuickItemInput('');
    setShowItemDropdown(false);
    itemSearchRef.current?.focus();
  };

  const searchText = `${lastNameInput} ${firstNameInput}`.trim();
  const filteredExistingEmployees = existingEmployees.filter(
    (emp) => {
      const full = `${emp.lastName} ${emp.firstName}`;
      return full.toLowerCase().includes(searchText.toLowerCase()) &&
               !employees.some(e => employeeKey(e) === employeeKey(emp));
    }
  );

  const canTagEmployees = form.shift?.trim() && form.supervisorName?.trim();
  const shiftEmpty = !form.shift?.trim();
  const supervisorEmpty = !form.supervisorName?.trim();

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col transition-all duration-500">
      <div className="bg-gradient-to-r from-primary to-blue-500 px-8 py-6 overflow-hidden rounded-t-3xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <UserPlus className="mr-3 h-5 w-5" />
          Requisition Context
        </h2>
      </div>
      
      <div className="p-8 space-y-10">
        {/* Context Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Source Location</label>
            <div className="relative group">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={form.locationId} 
                onChange={e => setForm({...form, locationId: e.target.value})}
                disabled
                className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-semibold text-gray-500 outline-none appearance-none uppercase cursor-not-allowed opacity-80"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
              Operational Shift
              {shiftEmpty && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[7px] font-black">REQUIRED</span>}
            </label>
            <div className="relative group">
              <Clock className={`absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${shiftEmpty ? 'text-red-400 group-focus-within:text-red-500' : 'text-gray-400 group-focus-within:text-primary'}`} />
              <input 
                type="text"
                placeholder="ENTER SHIFT..."
                list="shift-options"
                value={form.shift} 
                onChange={e => setForm({...form, shift: e.target.value.toUpperCase()})}
                className={`w-full border rounded-2xl pl-12 pr-6 py-3.5 text-xs font-semibold text-gray-900 outline-none transition-all uppercase placeholder:text-gray-400 ${
                  shiftEmpty
                    ? 'bg-red-50/50 border-red-300 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 animate-pulse'
                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10'
                }`}
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

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
              Supervisor Name
              {!shiftEmpty && supervisorEmpty && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[7px] font-black">REQUIRED</span>}
            </label>
            <div className="relative group">
              <User className={`absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${!shiftEmpty && supervisorEmpty ? 'text-red-400 group-focus-within:text-red-500' : 'text-gray-400 group-focus-within:text-primary'}`} />
              <input 
                type="text"
                placeholder="ENTER SUPERVISOR..."
                value={form.supervisorName || ''} 
                onChange={e => setForm({...form, supervisorName: e.target.value.toUpperCase()})}
                className={`w-full border rounded-2xl pl-12 pr-6 py-3.5 text-xs font-semibold text-gray-900 outline-none transition-all uppercase placeholder:text-gray-400 ${
                  !shiftEmpty && supervisorEmpty
                    ? 'bg-red-50/50 border-red-300 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 animate-pulse'
                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10'
                }`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Department / Area</label>
            <div className="relative group">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="ENTER DEPARTMENT..."
                list="dept-options"
                value={form.departmentArea || ''}
                onChange={e => setForm({...form, departmentArea: e.target.value.toUpperCase()})}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all uppercase placeholder:text-gray-400"
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

        {/* Employee Entry */}
        <div className={`space-y-6 transition-all duration-500 ${!canTagEmployees ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider flex items-center">
              <User className="mr-2 h-4 w-4 text-primary" />
              Tag Employees
            </h3>
            {!canTagEmployees && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[8px] font-bold uppercase tracking-wider">
                Complete shift &amp; supervisor first
              </span>
            )}
            {canTagEmployees && (
              <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide italic">Type to search existing staff</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 relative">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  ref={lastNameInputRef}
                  id="employee-lastname-input"
                  type="text" 
                  placeholder="LAST NAME..." 
                  value={lastNameInput} 
                  onChange={e => setLastNameInput(e.target.value.toUpperCase())}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                />
              </div>
              {showEmployeeDropdown && filteredExistingEmployees.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 max-h-[300px] overflow-y-auto">
                  {filteredExistingEmployees.map((emp, idx) => (
                    <button
                      key={employeeKey(emp)}
                      onClick={() => selectExistingEmployee(emp)}
                      className={`w-full text-left px-6 py-4 text-xs transition-all flex items-center justify-between group border-b border-gray-100 last:border-0 ${highlightedIndex === idx ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      <div>
                        <p className="font-bold text-gray-900 uppercase tracking-wide group-hover:text-primary">{emp.lastName}, {emp.firstName}</p>
                        <p className="text-[9px] font-medium text-gray-500 uppercase mt-0.5">{emp.position} {emp.department ? `• ${emp.department}` : ''}</p>
                      </div>
                      <Plus className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <input 
                id="employee-firstname-input"
                type="text" 
                placeholder="FIRST NAME..." 
                value={firstNameInput} 
                onChange={e => setFirstNameInput(e.target.value.toUpperCase())}
                onFocus={() => setShowEmployeeDropdown(true)}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="md:col-span-5">
              <div className="flex gap-4">
                <div className="flex-1 relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="POSITION..." 
                    value={positionInput} 
                    onChange={e => setPositionInput(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                  />
                </div>
                <button 
                  onClick={addEmployee}
                  title="Tag Employee"
                  className="px-6 py-3.5 bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-px active:scale-100 outline-none focus:ring-4 focus:ring-gray-900/30 shrink-0"
                >
                  ADD
                </button>
              </div>
            </div>
          </div>

          {/* Tagged Employees Panel */}
          {employees.length > 0 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <User className="mr-2 h-4 w-4 text-primary" />
                Tagged Employees
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[8px] font-black">{employees.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employees.map(emp => {
                  const key = employeeKey(emp);
                  return (
                    <div 
                      key={key}
                      onClick={() => editAndDraftEmployee(emp)}
                      className="group flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-widest truncate">
                          {emp.lastName}, {emp.firstName}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase truncate">
                          {emp.position} {emp.department ? `• ${emp.department}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeEmployee(key); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drafting Workflow */}
        {draftEntry && (
          <div className="p-8 bg-primary/[0.02] rounded-[2rem] border-2 border-dashed border-primary/20 animate-in slide-in-from-top-4 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">{draftEntry.lastName}, {draftEntry.firstName}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Assigning materials</p>
                </div>
              </div>
              <button onClick={() => setDraftEntry(null)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                <input 
                  ref={itemSearchRef}
                  id="draft-item-search"
                  type="text" 
                  placeholder="SEARCH ITEM TO ASSIGN..."
                  value={quickItemInput}
                  onChange={(e) => { setQuickItemInput(e.target.value.toUpperCase()); setShowItemDropdown(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { confirmDraftEntry(); } }}
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:border-primary transition-all placeholder:text-gray-200"
                />
                {showItemDropdown && filteredQuickProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredQuickProducts.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-all flex items-center justify-between border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">{prod.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5 truncate">{prod.description || 'NO DESCRIPTION'}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {draftEntry.items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-in zoom-in-95 group hover:border-primary/20 transition-all">
                    <div className="flex flex-col flex-1 min-w-0 mr-4">
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{item.name}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase truncate">{item.description || 'NO DESCRIPTION'}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Qty</span>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateDraftItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                          className="w-20 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-bold text-center py-2.5 hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all duration-300"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{item.availableQty} avail</span>
                      <button 
                        onClick={() => removeProductFromDraft(item.productId)}
                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={confirmDraftEntry}
                disabled={draftEntry.items.length === 0}
                className="w-full py-5 bg-gradient-to-r from-primary to-blue-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all duration-300 ease-out shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.01] active:translate-y-px active:scale-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-primary/30"
              >
                <CheckCircle className="h-5 w-5" />
                Commit Assignment
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
