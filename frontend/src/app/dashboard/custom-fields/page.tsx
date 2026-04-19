'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Settings, ListPlus } from 'lucide-react';
import api from '@/lib/api';

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  options: any;
  required: boolean;
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    fieldType: 'text',
    optionsString: '',
    required: false,
  });

  const fetchFields = async () => {
    try {
      const response = await api.get('/custom-fields');
      setFields(response.data);
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
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        fieldType: 'text',
        optionsString: '',
        required: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-sm text-gray-500">Define global attributes for your items</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Field
        </button>
      </div>

      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th className="table-cell font-semibold">Field Name</th>
              <th className="table-cell font-semibold">Type</th>
              <th className="table-cell font-semibold">Required</th>
              <th className="table-cell font-semibold">Options</th>
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
                  <td className="table-cell">{field.required ? 'Yes' : 'No'}</td>
                  <td className="table-cell text-gray-500 italic">
                    {Array.isArray(field.options) && field.options.length > 0 ? field.options.join(', ') : '-'}
                  </td>
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
              <div className="flex items-center">
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
    </div>
  );
}
