'use client';

import { useEffect, useState } from 'react';
import { Plus, Box, Calendar, ChevronRight, Search } from 'lucide-react';
import api from '@/lib/api';
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultFormData = { batchCode: '', description: '' };
  const [formData, setFormData] = useState(defaultFormData);
  const [initialFormData, setInitialFormData] = useState(defaultFormData);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchBatches = async () => {
    const startTime = Date.now();
    try {
      const response = await api.get('/batches');
      setBatches(response.data);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
      }
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleOpenModal = () => {
    setFormData(defaultFormData);
    setInitialFormData(defaultFormData);
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

    if (formData.batchCode.length < 3) {
      setErrors({ batchCode: 'Batch code must be at least 3 characters' });
      return;
    }

    try {
      await api.post('/batches', formData);
      setIsModalOpen(false);
      setFormData({ batchCode: '', description: '' });
      fetchBatches();
    } catch (err) { alert('Failed to create batch'); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500">Group assets for bulk management</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <EmptyState 
            icon={Box}
            title="No Batches Created"
            description="Group your assets into batches for easier management, reporting, and custom field assignment."
            action={{
              label: "Create First Batch",
              onClick: () => handleOpenModal()
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(batch => (
            <div key={batch.id} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Box className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {batch._count?.items || 0} Assets
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{batch.batchCode}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">{batch.description || 'No description provided.'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center text-xs text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date(batch.createdAt).toLocaleDateString()}
                </div>
                <button className="text-primary text-sm font-bold flex items-center hover:underline">
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Batch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Batch Code</label>
                 <input
                  type="text"
                  value={formData.batchCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                    setFormData({...formData, batchCode: val});
                    if (val.length < 3) {
                      setErrors(prev => ({...prev, batchCode: 'Min. 3 characters (A-Z, 0-9, -)'}));
                    } else {
                      setErrors(prev => ({...prev, batchCode: ''}));
                    }
                  }}
                  placeholder="e.g. BATCH-2024-001"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 outline-none focus:ring-1 transition-all ${
                    errors.batchCode 
                      ? 'border-red-300 focus:ring-red-100' 
                      : 'border-gray-200 focus:ring-primary'
                  }`}
                  required
                />
                {errors.batchCode && (
                  <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{errors.batchCode}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-50">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg">Create Batch</button>
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
    </div>
  );
}
