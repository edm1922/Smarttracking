import React from 'react';
import { 
  User, Plus, Search, X, CheckCircle, MapPin, 
  Clock, ClipboardList, Briefcase, ChevronRight, UserPlus, Trash2
} from 'lucide-react';
import { Employee, DraftEntry, Product, Location } from './RSQTypes';

interface RSQFormSectionProps {
  form: any;
  setForm: (form: any) => void;
  locations: Location[];
  employees: Employee[];
  existingEmployees: Employee[];
  employeeInput: string;
  setEmployeeInput: (val: string) => void;
  positionInput: string;
  setPositionInput: (val: string) => void;
  departmentInput: string;
  setDepartmentInput: (val: string) => void;
  showEmployeeDropdown: boolean;
  setShowEmployeeDropdown: (val: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: (idx: number) => void;
  activeEmployeeNames: string[];
  toggleEmployeeSelection: (name: string) => void;
  addEmployee: () => void;
  selectExistingEmployee: (emp: Employee) => void;
  removeEmployee: (name: string) => void;
  handleEditEmployee: (emp: Employee) => void;
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
  employeeInput,
  setEmployeeInput,
  positionInput,
  setPositionInput,
  departmentInput,
  setDepartmentInput,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  highlightedIndex,
  setHighlightedIndex,
  activeEmployeeNames,
  toggleEmployeeSelection,
  addEmployee,
  selectExistingEmployee,
  removeEmployee,
  handleEditEmployee,
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
  const filteredExistingEmployees = existingEmployees.filter(
    (emp) => emp.name.toLowerCase().includes(employeeInput.toLowerCase()) &&
             !employees.some(e => e.name === emp.name)
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all duration-500">
      <div className="bg-gradient-to-r from-primary to-blue-500 px-8 py-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <UserPlus className="mr-3 h-5 w-5" />
          Requisition Context
        </h2>
      </div>
      
      <div className="p-8 space-y-10">
        {/* Context Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Source Location</label>
            <div className="relative group">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
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
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Operational Shift</label>
            <div className="relative group">
              <Clock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="ENTER SHIFT..."
                list="shift-options"
                value={form.shift} 
                onChange={e => setForm({...form, shift: e.target.value.toUpperCase()})}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all uppercase placeholder:text-gray-400"
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
        </div>

        {/* Employee Entry */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider flex items-center">
              <User className="mr-2 h-4 w-4 text-primary" />
              Tag Employees
            </h3>
            <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide italic">Type to search existing staff</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  id="employee-name-input"
                  type="text" 
                  placeholder="NAME OF STAFF..." 
                  value={employeeInput} 
                  onChange={e => setEmployeeInput(e.target.value.toUpperCase())}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                />
              </div>
              {showEmployeeDropdown && filteredExistingEmployees.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 max-h-[300px] overflow-y-auto">
                  {filteredExistingEmployees.map((emp, idx) => (
                    <button
                      key={emp.name}
                      onClick={() => selectExistingEmployee(emp)}
                      className={`w-full text-left px-6 py-4 text-xs transition-all flex items-center justify-between group border-b border-gray-100 last:border-0 ${highlightedIndex === idx ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      <div>
                        <p className="font-bold text-gray-900 uppercase tracking-wide group-hover:text-primary">{emp.name}</p>
                        <p className="text-[9px] font-medium text-gray-500 uppercase mt-0.5">{emp.position} {emp.department ? `• ${emp.department}` : ''}</p>
                      </div>
                      <Plus className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <div className="relative group">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="POSITION..." 
                  value={positionInput} 
                  onChange={e => setPositionInput(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="DEPARTMENT..." 
                  list="department-options"
                  value={departmentInput} 
                  onChange={e => setDepartmentInput(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                />
                <datalist id="department-options">
                  <option value="MAIN OFFICE" />
                  <option value="LOGISTICS" />
                  <option value="OPERATIONS" />
                  <option value="HR" />
                  <option value="IT" />
                </datalist>
              </div>
            </div>
            <div className="md:col-span-1">
              <button 
                onClick={addEmployee}
                title="Tag Employee"
                className="w-full h-full py-3.5 bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl flex items-center justify-center hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-px active:scale-100 outline-none focus:ring-4 focus:ring-gray-900/30"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tag List */}
          {employees.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95">
              {employees.map(emp => {
                const isActive = activeEmployeeNames.includes(emp.name);
                return (
                  <div 
                    key={emp.name} 
                    onClick={() => toggleEmployeeSelection(emp.name)}
                    onDoubleClick={() => handleEditEmployee(emp)}
                    className={`group flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all duration-300 ease-out cursor-pointer select-none ${
                      isActive 
                      ? 'bg-gradient-to-r from-primary to-blue-500 text-white border-transparent shadow-lg shadow-primary/30 scale-[1.02] -translate-y-0.5' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30 hover:shadow-md hover:text-primary'
                    }`}
                  >
                    <div className="flex flex-col leading-tight">
                      <span>{emp.name}</span>
                      <span className={`text-[8px] font-bold opacity-60`}>{emp.position} {emp.department ? `• ${emp.department}` : ''}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeEmployee(emp.name); }} 
                      className={`p-1 rounded-lg transition-colors ${isActive ? 'hover:bg-white/10' : 'hover:bg-red-50 hover:text-red-500'}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
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
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Drafting Workflow</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Assigning materials to: <span className="text-primary">{draftEntry.name}</span></p>
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
                  id="draft-item-search"
                  type="text" 
                  placeholder="SEARCH ITEM TO ASSIGN..."
                  value={quickItemInput}
                  onChange={(e) => { setQuickItemInput(e.target.value.toUpperCase()); setShowItemDropdown(true); }}
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:border-primary transition-all placeholder:text-gray-200"
                />
                {showItemDropdown && filteredQuickProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredQuickProducts.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => { addProductToDraft(prod); setQuickItemInput(''); setShowItemDropdown(false); }}
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
                    
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Quantity</span>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateDraftItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                          className="w-16 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-bold text-center py-2 hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all duration-300"
                        />
                      </div>
                      <button 
                        onClick={() => removeProductFromDraft(item.productId)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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

      <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-6">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Overall Remarks</label>
            <textarea 
              placeholder="ENTER ANY ADDITIONAL NOTES OR SPECIAL INSTRUCTIONS..."
              value={form.remarks}
              onChange={e => setForm({...form, remarks: e.target.value})}
              className="w-full h-32 bg-gray-50/50 border border-gray-200 rounded-3xl p-6 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none placeholder:text-gray-400"
            />
      </div>
    </div>
  );
};
