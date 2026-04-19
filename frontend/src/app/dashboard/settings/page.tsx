'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, LayoutGrid, Tags as TagsIcon, GitBranch, Settings } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('categories');

  const fetchData = async () => {
    const [cats, tgs, sts] = await Promise.all([
      api.get('/categories'),
      api.get('/tags'),
      api.get('/workflow/statuses'),
    ]);
    setCategories(cats.data);
    setTags(tgs.data);
    setStatuses(sts.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (type: string, name: string) => {
    if (!name) return;
    try {
      await api.post(`/${type}`, { name });
      fetchData();
    } catch (err) { alert('Failed to add'); }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/${type}/${id}`);
      fetchData();
    } catch (err) { alert('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-gray-400 mb-6">
        <Settings className="h-5 w-5" />
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
      </div>

      <div className="flex space-x-4 border-b border-gray-100">
        {[
          { id: 'categories', name: 'Categories', icon: LayoutGrid },
          { id: 'tags', name: 'Tags', icon: TagsIcon },
          { id: 'workflow', name: 'Workflow Status', icon: GitBranch },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex space-x-2">
              <input id="newCat" type="text" placeholder="Category name..." className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => handleAdd('categories', (document.getElementById('newCat') as HTMLInputElement).value)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                  <button onClick={() => handleDelete('categories', c.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="flex space-x-2">
              <input id="newTag" type="text" placeholder="Tag name..." className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => handleAdd('tags', (document.getElementById('newTag') as HTMLInputElement).value)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <div key={t.id} className="flex items-center space-x-2 bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-full text-xs font-bold">
                  <span>{t.name}</span>
                  <button onClick={() => handleDelete('tags', t.id)} className="hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-6">
            <div className="flex space-x-2">
              <input id="newStat" type="text" placeholder="Status name..." className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => handleAdd('workflow/statuses', (document.getElementById('newStat') as HTMLInputElement).value)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
            </div>
            <div className="space-y-3">
              {statuses.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-4">
                    <span className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">{idx + 1}</span>
                    <span className="font-bold text-gray-700">{s.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Transitions Defined</span>
                    <button onClick={() => handleDelete('workflow/statuses', s.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              💡 Statuses define the life-cycle of your assets. Admins can bypass workflow rules.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
