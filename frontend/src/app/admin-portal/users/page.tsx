'use client';

import { useEffect, useState } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  User, 
  Key, 
  Copy, 
  Check, 
  Search, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  CreditCard
} from 'lucide-react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

interface UserData {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    role: 'inventory' as 'admin' | 'inventory' | 'super_admin' | 'payroll_admin',
  });

  const [generatedUser, setGeneratedUser] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const [revealTarget, setRevealTarget] = useState<UserData | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

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

  const handleRevealRequest = (user: UserData) => {
    setRevealTarget(user);
    setAdminPassword('');
    setIsRevealModalOpen(true);
  };

  const handleRevealConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealTarget) return;

    setIsRevealing(true);
    try {
      const res = await api.post(`/users/reveal/${revealTarget.id}`, {
        adminPassword
      });
      setGeneratedUser(res.data);
      setIsRevealModalOpen(false);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification failed. Unauthorized access denied.');
    } finally {
      setIsRevealing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">System Control Panel</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Access Management</h1>
          <p className="text-slate-400 text-sm mt-1">Configure user roles, permissions, and generate system credentials.</p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setGeneratedUser(null);
          }}
          className="inline-flex items-center rounded-xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all active:scale-95 group"
        >
          <UserPlus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
          Provision New User
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
        <input
          type="text"
          placeholder="Search system users by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
        />
      </div>

      <div className="bg-[#1e293b] rounded-3xl border border-slate-700/50 shadow-2xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/30">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Identity</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Authorization</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Provisioned</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <TableSkeleton columns={4} rows={5} />
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-sm text-slate-500 italic">No system identities found matching your criteria.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onDoubleClick={() => handleRevealRequest(user)}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer select-none"
                    title="Double-click to reveal/reset credentials"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-200 font-bold border border-slate-600/50 shadow-inner group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:border-white/10 transition-all duration-300">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <span className="block text-sm font-bold text-slate-100 group-hover:text-white transition-colors">{user.username}</span>
                           <span className="text-[10px] text-slate-500 font-mono">{user.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
                        user.role === 'super_admin'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : user.role === 'payroll_admin'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : user.role === 'admin' 
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                              : 'bg-slate-700/30 text-slate-400 border-slate-600/50'
                      }`}>
                        {user.role === 'super_admin' ? <ShieldCheck className="h-3 w-3 mr-2" /> : user.role === 'payroll_admin' ? <CreditCard className="h-3 w-3 mr-2" /> : user.role === 'admin' ? <Shield className="h-3 w-3 mr-2" /> : <User className="h-3 w-3 mr-2" />}
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRevealModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-[2.5rem] bg-[#1e293b] border border-indigo-500/30 p-10 shadow-2xl shadow-indigo-500/10 animate-in zoom-in duration-300">
             <div className="flex flex-col items-center text-center mb-8">
                <div className="h-20 w-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6 rotate-12">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Elevated Clearance Required</h2>
                <p className="text-slate-400 text-sm font-medium px-4">
                  Confirm your Super Admin authority to decrypt or reset credentials for <span className="text-indigo-400 font-bold">@{revealTarget?.username}</span>.
                </p>
             </div>

             <form onSubmit={handleRevealConfirm} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Authorization Key</label>
                  <input
                    required
                    autoFocus
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter system master password..."
                    className="w-full rounded-2xl border border-slate-700/50 bg-slate-800/80 px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                   <button 
                    type="submit" 
                    disabled={isRevealing}
                    className="w-full py-4 text-sm font-black text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {isRevealing ? 'Verifying Clearance...' : 'Validate & Extract'}
                     <ChevronRight className="h-4 w-4" />
                   </button>
                   <button 
                    type="button" 
                    onClick={() => setIsRevealModalOpen(false)}
                    className="w-full py-4 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors"
                   >
                     Cancel Request
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-xl rounded-[2rem] bg-[#1e293b] border border-slate-700/50 p-10 shadow-2xl shadow-black/50 animate-in zoom-in duration-300">
            {!generatedUser ? (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <UserPlus className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Identity Provisioning</h2>
                    <p className="text-slate-400 text-sm font-medium">Initialize a new system user with dynamic credentials.</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Username Identifier</label>
                    <input
                      required
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full rounded-2xl border border-slate-700/50 bg-slate-800/50 px-6 py-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="Enter unique identifier..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Authorization Tier</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'inventory', name: 'Staff', icon: User, color: 'slate' },
                        { id: 'admin', name: 'Manager', icon: Shield, color: 'indigo' },
                        { id: 'payroll_admin', name: 'Payroll', icon: CreditCard, color: 'emerald' },
                        { id: 'super_admin', name: 'SysAdmin', icon: ShieldAlert, color: 'amber' }
                      ].map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setFormData({...formData, role: role.id as any})}
                          className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all group ${
                            formData.role === role.id 
                              ? `bg-${role.color}-500/10 border-${role.color}-500/50 text-${role.color}-400 shadow-lg shadow-${role.color}-500/10` 
                              : 'bg-slate-800/30 border-slate-700/50 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <role.icon className={`h-6 w-6 ${formData.role === role.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                          <span className="text-xs font-bold uppercase tracking-widest">{role.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 flex items-start">
                    <AlertCircle className="h-6 w-6 text-amber-400 mr-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-200/80 font-bold mb-1 uppercase tracking-wider">Security Protocol</p>
                      <p className="text-[11px] text-amber-200/60 leading-relaxed font-medium">
                        System will generate a cryptographically unique temporary password. This credential must be manually securely transmitted to the target user.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-6 pt-6 border-t border-slate-700/50">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Abort Mission
                    </button>
                    <button 
                      type="submit" 
                      className="px-10 py-4 text-sm font-black text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      Provision Access
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="h-24 w-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 animate-bounce">
                  <Check className="h-12 w-12 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Identity Validated</h2>
                <p className="text-slate-400 text-sm mb-10 font-medium">Transmission of temporary credentials ready for extraction.</p>
                
                <div className="space-y-4 mb-10 text-left">
                  <div className="p-6 bg-slate-800/80 rounded-3xl border border-slate-700/50 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-[0.2em]">Identifier</p>
                    <div className="flex items-center justify-between">
                       <p className="text-xl font-mono font-bold text-white tracking-wider">{generatedUser.username}</p>
                       <button 
                        onClick={() => copyToClipboard(generatedUser.username)}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 mb-2 tracking-[0.2em]">Secret Key</p>
                    <div className="flex items-center justify-between">
                       <p className="text-xl font-mono font-bold text-emerald-400 tracking-wider">{generatedUser.plainPassword}</p>
                       <button 
                        onClick={() => copyToClipboard(generatedUser.plainPassword)}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                      >
                        {copied ? <Check className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {copied && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold mb-6 animate-in fade-in slide-in-from-bottom-2">
                    <Check className="h-3 w-3" />
                    Credential Copied to Clipboard
                  </div>
                )}

                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full py-5 text-sm font-black text-white bg-slate-100 hover:bg-white text-slate-900 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Terminate Process
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
