'use client';

import { useEffect, useState } from 'react';
import { Plus, Box, Calendar, ChevronRight, Search } from 'lucide-react';
import api from '@/lib/api';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ batchCode: '', description: '' });

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches');
      setBatches(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/batches', formData);
      setIsModalOpen(false);
      setFormData({ batchCode: '', description: '' });
      fetchBatches();
    } catch (err) { alert('Failed to create batch'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500">Group assets for bulk management</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Batch
        </button>
      </div>

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
                  onChange={(e) => setFormData({...formData, batchCode: e.target.value})}
                  placeholder="e.g. BATCH-2024-001"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-primary"
                  required
                />
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg">Create Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
