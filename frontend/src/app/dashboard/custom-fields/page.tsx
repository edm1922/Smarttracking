'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Settings, ListPlus, Eye, X, LayoutGrid, GripVertical } from 'lucide-react';
import api from '@/lib/api';

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  options: any;
  required: boolean;
  batchId?: string;
  batch?: {
    batchCode: string;
  };
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewBatchId, setPreviewBatchId] = useState<string>('GLOBAL');
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    fieldType: 'text',
    optionsString: '',
    required: false,
    batchCode: '',
  });

  const fetchFields = async () => {
    try {
      const [fieldsRes, batchesRes] = await Promise.all([
        api.get('/custom-fields'),
        api.get('/batches')
      ]);
      setFields(fieldsRes.data);
      setBatches(batchesRes.data);
    } catch (err) {
      console.error('Failed to fetch custom fields', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleOpenModal = (field: CustomField | null = null) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        fieldType: field.fieldType,
        optionsString: Array.isArray(field.options) ? field.options.join(', ') : '',
        required: field.required,
        batchCode: field.batch?.batchCode || '',
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        fieldType: 'text',
        optionsString: '',
        required: false,
        batchCode: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      fieldType: formData.fieldType,
      required: formData.required,
      batchCode: formData.batchCode.trim(),
      options: formData.optionsString ? formData.optionsString.split(',').map(o => o.trim()) : [],
    };
    try {
      if (editingField) {
        await api.patch(`/custom-fields/${editingField.id}`, data);
      } else {
        await api.post('/custom-fields', data);
      }
      setIsModalOpen(false);
      fetchFields();
    } catch (err) {
      alert('Failed to save field');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field? All associated data on items will be lost.')) return;
    try {
      await api.delete(`/custom-fields/${id}`);
      fetchFields();
    } catch (err) {
      alert('Failed to delete field');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedFieldId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedFieldId || draggedFieldId === id) return;

    const newFields = [...fields];
    const draggedIndex = newFields.findIndex(f => f.id === draggedFieldId);
    const targetIndex = newFields.findIndex(f => f.id === id);

    const [draggedItem] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, draggedItem);

    setFields(newFields);
  };

  const handleDragEnd = async () => {
    setDraggedFieldId(null);
    
    const updatePayload = fields.map((f, index) => ({
      id: f.id,
      orderIndex: index
    }));

    try {
      await api.patch('/custom-fields/reorder', updatePayload);
    } catch (err) {
      console.error('Failed to save field order', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-sm text-gray-500">Define global attributes for your items</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Eye className="mr-2 h-4 w-4 text-primary" />
            Preview Form
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Field
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="table-cell font-semibold">Field Name</th>
              <th className="table-cell font-semibold">Type</th>
              <th className="table-cell font-semibold">Assignment (Batch)</th>
              <th className="table-cell font-semibold">Required</th>
              <th className="table-cell font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="table-cell text-center py-10">Loading...</td></tr>
            ) : fields.length === 0 ? (
              <tr><td colSpan={5} className="table-cell text-center py-10">No custom fields defined.</td></tr>
            ) : (
              fields.map((field) => (
                <tr key={field.id} className="table-row">
                  <td className="table-cell font-medium">{field.name}</td>
                  <td className="table-cell capitalize">{field.fieldType}</td>
                  <td className="table-cell">
                    {field.batch ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                        Batch: {field.batch.batchCode}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-100 italic">
                        Global (All Items)
                      </span>
                    )}
                  </td>
                  <td className="table-cell">{field.required ? 'Yes' : 'No'}</td>
                  <td className="table-cell text-right">
                    <button onClick={() => handleOpenModal(field)} className="p-1 text-gray-400 hover:text-primary mr-2">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(field.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingField ? 'Edit Field' : 'Add New Field'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Field Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. Fabric Weight"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.fieldType}
                  onChange={(e) => setFormData({...formData, fieldType: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown (Select)</option>
                  <option value="date">Date</option>
                </select>
              </div>
              {formData.fieldType === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Options (comma separated)</label>
                  <input
                    type="text"
                    value={formData.optionsString}
                    onChange={(e) => setFormData({...formData, optionsString: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Cotton, Silk, Polyester"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign to Batch (Template Code)</label>
                <input
                  type="text"
                  list="batch-options"
                  value={formData.batchCode}
                  onChange={(e) => setFormData({...formData, batchCode: e.target.value.toUpperCase()})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. TELA"
                />
                <datalist id="batch-options">
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.batchCode} />
                  ))}
                </datalist>
                <p className="mt-1 text-[10px] text-gray-400 italic">Leave empty for "Global". Typing a new code will automatically create that template.</p>
              </div>
              <div className="flex items-center pt-2">
                <input
                  id="required"
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({...formData, required: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="required" className="ml-2 block text-sm text-gray-900">This field is required</label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-md">Save Field</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <LayoutGrid className="mr-2 h-5 w-5 text-primary" />
                Form Layout Preview
              </h2>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 bg-gray-50 flex-shrink-0 border-b border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-2">Preview Context</label>
              <select
                value={previewBatchId}
                onChange={(e) => setPreviewBatchId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="GLOBAL">Global Form (No Batch Assigned)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>Batch Form: {b.batchCode}</option>
                ))}
              </select>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-[#f1f5f9]">
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Form Submission Preview</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-1">
                    {previewBatchId === 'GLOBAL' ? 'Global Fields Only' : `Batch ${batches.find(b => b.id === previewBatchId)?.batchCode} + Global Fields`}
                  </p>
                </div>

                <div className="space-y-2">
                  {fields.filter(f => !f.batchId || f.batchId === previewBatchId).map(field => (
                    <div 
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field.id)}
                      onDragOver={(e) => handleDragOver(e, field.id)}
                      onDragEnd={handleDragEnd}
                      className={`relative group p-4 -mx-4 rounded-2xl transition-colors cursor-move ${draggedFieldId === field.id ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="pl-6">
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                          {field.name} {field.required && <span className="text-red-500 ml-1">*</span>}
                          {!field.batchId && previewBatchId !== 'GLOBAL' && (
                            <span className="ml-3 text-[9px] font-black uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">Global</span>
                          )}
                        </label>
                        {field.fieldType === 'dropdown' ? (
                          <select className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none bg-white pointer-events-none" disabled>
                            <option value="">Select Option</option>
                            {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.fieldType}
                            className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none bg-white pointer-events-none"
                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                            disabled
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {fields.filter(f => !f.batchId || f.batchId === previewBatchId).length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      No custom fields are active for this context.
                    </div>
                  )}

                  <button type="button" disabled className="w-full mt-6 px-6 py-4 text-sm font-bold text-white bg-primary opacity-50 rounded-2xl shadow-xl transition-all cursor-not-allowed">
                    Submit & Lock Form (Preview)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
