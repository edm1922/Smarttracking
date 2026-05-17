'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Edit2, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

interface Location {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const defaultFormData = { name: '', description: '' };
  const [formData, setFormData] = useState(defaultFormData);
  const [initialFormData, setInitialFormData] = useState(defaultFormData);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenModal = (location: Location | null = null) => {
    if (location) {
      setEditingLocation(location);
      const data = { name: location.name, description: location.description || '' };
      setFormData(data);
      setInitialFormData(data);
    } else {
      setEditingLocation(null);
      setFormData(defaultFormData);
      setInitialFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (JSON.stringify(formData) !== JSON.stringify(initialFormData)) {
      setIsConfirmOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name.length < 2) {
      setErrors({ name: 'Location name must be at least 2 characters' });
      return;
    }

    try {
      if (editingLocation) {
        await api.patch(`/locations/${editingLocation.id}`, formData);
      } else {
        await api.post('/locations', formData);
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save location');
    }
  };

  const handleDelete = (location: Location) => {
    setLocationToDelete(location);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    try {
      await api.delete(`/locations/${locationToDelete.id}`);
      setIsDeleteConfirmOpen(false);
      setLocationToDelete(null);
      fetchLocations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete location');
    }
  };

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500">Manage stock fulfillment areas and warehouses</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </button>
      </div>

      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <TableSkeleton columns={3} rows={8} />
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-0">
                  <EmptyState 
                    icon={MapPin}
                    title={searchTerm ? "No matches found" : "No Locations Defined"}
                    description={searchTerm ? `No locations match your search for "${searchTerm}".` : "Add physical locations like 'Warehouse A' or 'Main Office' to organize your stocks."}
                    action={searchTerm ? undefined : {
                      label: "Add New Location",
                      onClick: () => handleOpenModal()
                    }}
                  />
                </td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary/5 rounded-lg mr-4">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{location.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-medium">Created {new Date(location.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {location.description || <span className="text-gray-300 italic">No description</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleOpenModal(location)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(location)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingLocation ? 'Edit Location' : 'Add New Location'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({...formData, name: val});
                    if (val.length < 2) {
                      setErrors(prev => ({...prev, name: 'Min. 2 characters required'}));
                    } else {
                      setErrors(prev => ({...prev, name: ''}));
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-all ${
                    errors.name 
                      ? 'border-red-300 focus:ring-1 focus:ring-red-100' 
                      : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                  placeholder="e.g. Area A, Warehouse 1"
                />
                {errors.name && (
                  <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" rows={3} placeholder="Describe the area..." />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md shadow-sm">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved information in this form. Are you sure you want to discard it?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        onConfirm={() => {
          setIsConfirmOpen(false);
          setIsModalOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Delete Location"
        message={`Are you sure you want to delete "${locationToDelete?.name}"? All associated stock records will lose this location reference.`}
        confirmText="Confirm Deletion"
        cancelText="Keep Location"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setLocationToDelete(null);
        }}
        isDestructive={true}
        requireConfirmationText="DELETE"
      />
    </div>
  );
}
