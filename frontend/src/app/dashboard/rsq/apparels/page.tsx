'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, Trash2, X, ArrowLeft, Database, Pencil } from 'lucide-react';

export default function ApparelsPage() {
  const router = useRouter();
  const [apparels, setApparels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formFabricId, setFormFabricId] = useState('');
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchApparels = async () => {
    try {
      const res = await api.get('/rsq/apparels');
      setApparels(res.data);
    } catch (e) {
      console.error('Error fetching apparels:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFabrics = async () => {
    try {
      const res = await api.get('/rsq/fabrics');
      setFabrics(res.data);
    } catch (e) {
      console.error('Error fetching fabrics:', e);
    }
  };

  useEffect(() => {
    fetchApparels();
    fetchFabrics();
  }, []);

  const handleSeed = async () => {
    if (!confirm('This will create any missing apparels from the hardcoded map. Continue?')) return;
    setSeeding(true);
    try {
      const res = await api.post('/rsq/apparels/seed');
      alert(`Seeded ${res.data.seeded} apparels (${res.data.total} total).`);
      fetchApparels();
    } catch (e) {
      console.error('Seed error:', e);
      alert('Failed to seed apparels.');
    } finally {
      setSeeding(false);
    }
  };

  const openAddForm = () => {
    setEditId(null);
    setFormName('');
    setFormFabricId('');
    setShowForm(true);
  };

  const openEditForm = (apparel: any) => {
    setEditId(apparel.id);
    setFormName(apparel.name);
    setFormFabricId(apparel.fabricId || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return alert('Name is required.');
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/rsq/apparels/${editId}`, {
          name: formName.toUpperCase().trim(),
          fabricId: formFabricId || null,
        });
      } else {
        await api.post('/rsq/apparels', {
          name: formName.toUpperCase().trim(),
          fabricId: formFabricId || undefined,
        });
      }
      setShowForm(false);
      fetchApparels();
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save apparel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/rsq/apparels/${id}`);
      fetchApparels();
    } catch (e) {
      console.error('Delete error:', e);
      alert('Failed to delete apparel.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/rsq')}
              className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Apparel Management</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage apparel names and their fabric mappings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <Database className="h-4 w-4" />
              {seeding ? 'Seeding...' : 'Seed from Map'}
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Add Apparel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
              <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading apparels...</p>
            </div>
          ) : (
            <div className="p-8">
              <div className="overflow-x-auto rounded-3xl border border-gray-200 shadow-sm">
                <table className="w-full text-[11px] font-sans border-collapse">
                  <thead className="bg-gray-50 shadow-sm text-center">
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-widest text-[9px] font-black">
                      <th className="px-4 py-3 text-left">Apparel Name</th>
                      <th className="px-4 py-3 text-left">Mapped Fabric</th>
                      <th className="px-4 py-3 text-left">Fabric Group</th>
                      <th className="px-4 py-3 text-center w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {apparels.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-gray-400 font-bold uppercase tracking-wider text-xs">
                          No apparels found. Click &quot;Seed from Map&quot; or &quot;Add Apparel&quot; to get started.
                        </td>
                      </tr>
                    ) : (
                      apparels.map((a: any) => (
                        <tr key={a.id} className="hover:bg-primary/5 transition-colors font-semibold text-gray-700">
                          <td className="px-4 py-3 font-black text-gray-900 uppercase">{a.name}</td>
                          <td className="px-4 py-3">{a.fabric?.name || <span className="text-gray-300 italic">Not mapped</span>}</td>
                          <td className="px-4 py-3 uppercase text-[10px] text-gray-500">{a.fabric?.type || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditForm(a)}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors active:scale-95"
                                title="Edit apparel"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(a.id, a.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                                title="Delete apparel"
                              >
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
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  {editId ? 'Edit Apparel' : 'Add New Apparel'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  {editId ? 'Update apparel name and fabric mapping' : 'Register a new apparel type'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Apparel Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. BULLCAP- YELLOW (KATRINA)"
                  className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Mapped Fabric
                </label>
                <select
                  value={formFabricId}
                  onChange={e => setFormFabricId(e.target.value)}
                  className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
                >
                  <option value="">-- No Fabric --</option>
                  {fabrics.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : null}
                {editId ? 'Save Changes' : 'Create Apparel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
