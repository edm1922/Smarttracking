'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Shield, User, Key, Copy, Check, Search, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface UserData {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    role: 'inventory' as 'admin' | 'inventory',
  });

  const [generatedUser, setGeneratedUser] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/users', formData);
      setGeneratedUser(res.data);
      setFormData({ username: '', role: 'inventory' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? They will lose all access immediately.')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500">Manage access levels and generate staff credentials</p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setGeneratedUser(null);
          }}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition-all active:scale-95"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Generate New User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Access Level</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">Loading accounts...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">No users found.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="ml-3 text-sm font-semibold text-gray-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            {!generatedUser ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Generate New Account</h2>
                <p className="text-sm text-gray-500 mb-6">Create a new staff account with auto-generated credentials.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Username</label>
                    <input
                      required
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="e.g. jdoe_warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'inventory'})}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                          formData.role === 'inventory' 
                            ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        Inventory User
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'admin'})}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                          formData.role === 'admin' 
                            ? 'bg-purple-50 border-purple-600 text-purple-600 shadow-sm' 
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl flex items-start mt-4">
                    <AlertCircle className="h-5 w-5 text-blue-600 mr-3 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                      Password will be automatically generated and shown once. You will need to share it with the user manually.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-8 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      Generate Access
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Access Generated!</h2>
                <p className="text-sm text-gray-500 mb-8">Copy these credentials and give them to the user.</p>
                
                <div className="space-y-3 mb-8">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left group relative">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Username</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{generatedUser.username}</p>
                    <button 
                      onClick={() => copyToClipboard(generatedUser.username)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-left group relative">
                    <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Temporary Password</p>
                    <p className="text-lg font-mono font-bold text-primary">{generatedUser.plainPassword}</p>
                    <button 
                      onClick={() => copyToClipboard(generatedUser.plainPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      {copied ? <Check className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {copied && (
                  <p className="text-xs font-bold text-green-600 mb-4 animate-bounce">Copied to clipboard!</p>
                )}

                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full py-4 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  Close & Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
