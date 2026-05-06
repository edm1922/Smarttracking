'use client';

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Users, 
  Package, 
  BarChart3, 
  MousePointer2, 
  Globe, 
  Clock, 
  ArrowUpRight,
  RefreshCcw,
  Zap,
  Server,
  ShieldCheck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const [trafficData, setTrafficData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [trafficRes, usageRes] = await Promise.all([
        api.get('/system-analytics/traffic'),
        api.get('/system-analytics/usage'),
      ]);
      setTrafficData(trafficRes.data);
      setUsageData(usageRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCcw className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse">Synchronizing System Data...</p>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Live Telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time insights into infrastructure traffic, user behavior, and resource utilization.</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-bold">Refresh Intel</span>
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { name: 'Total Requests', value: trafficData?.totalRequests || 0, icon: Globe, color: 'indigo', label: 'HTTP Traffic' },
          { name: 'Active Users', value: usageData?.totalUsers || 0, icon: Users, color: 'purple', label: 'Registered Identities' },
          { name: 'Audit Events', value: usageData?.totalActivityLogs || 0, icon: ShieldCheck, color: 'emerald', label: 'Security Log' },
          { name: 'Uptime Record', value: usageData?.uptimeDays || 0, icon: Server, color: 'amber', label: 'System Health', suffix: ' Days' },
        ].map((stat) => {
          const colors = colorClasses[stat.color];
          return (
            <div key={stat.name} className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
              <div className={`absolute -right-4 -top-4 h-24 w-24 ${colors.bg} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${colors.bg} ${colors.text} border ${colors.border}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-white mb-1">
                  {stat.value.toLocaleString()}
                  {stat.suffix && <span className="text-sm font-bold text-slate-500 ml-1">{stat.suffix}</span>}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">{stat.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Traffic Chart */}
        <div className="lg:col-span-2 bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative overflow-hidden">
           <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-white">Traffic Velocity</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black tracking-widest uppercase">
              <ArrowUpRight className="h-3 w-3" />
              Live Stream
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData?.dailyTraffic || []}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTraffic)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Paths */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-white">Top Endpoints</h3>
          </div>

          <div className="space-y-4">
            {trafficData?.topPaths?.map((path: any, index: number) => (
              <div key={path.path} className="group cursor-default">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-indigo-400 transition-colors truncate max-w-[180px]">
                    {path.path}
                  </span>
                  <span className="text-[11px] font-black text-slate-500 group-hover:text-white transition-colors">
                    {path.count} <span className="text-[8px] opacity-50">REQ</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out group-hover:from-indigo-400 group-hover:to-purple-400"
                    style={{ width: `${(path.count / (trafficData.topPaths[0].count || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Recent System Activity */}
         <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-white">Security Audit Stream</h3>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {usageData?.recentActivity?.map((log: any) => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 flex items-start gap-4 hover:bg-slate-800/50 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-200 uppercase">
                    {log.user.username.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-white">{log.user.username}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Executed action <span className="text-indigo-400 font-bold uppercase tracking-tighter">{log.action}</span> 
                      {log.changes ? ' with data modifications.' : '.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
         </div>

         {/* Security & Access Summary */}
         <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/20 p-8 rounded-[2.5rem] border border-indigo-500/10 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-white">System Integrity</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-8">
               <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl font-black">
                    {usageData?.totalUsers}
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-widest">Provisioned Accounts</h4>
                    <p className="text-slate-400 text-xs mt-1">Total user identities currently authenticated and managed within the system core.</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">DB HEALTH</p>
                    <p className="text-xl font-black text-emerald-400">{trafficData?.healthScore || 100}%</p>
                    <div className="h-1 w-full bg-slate-700 rounded-full mt-3">
                      <div 
                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000"
                        style={{ width: `${trafficData?.healthScore || 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">API LATENCY</p>
                    <p className="text-xl font-black text-indigo-400">{trafficData?.avgLatency || 0}ms</p>
                    <div className="h-1 w-full bg-slate-700 rounded-full mt-3">
                      <div 
                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000"
                        style={{ width: `${Math.min(100, (trafficData?.avgLatency || 0) / 2)}%` }}
                      ></div>
                    </div>
                  </div>
               </div>

                <div className="bg-indigo-500/5 rounded-3xl border border-indigo-500/10 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Uptime Record</span>
                  </div>
                  <p className="text-2xl font-black text-white italic">
                    {usageData?.uptimeDays || 0} <span className="text-sm font-normal text-slate-500 not-italic">Days Online</span>
                  </p>
               </div>
            </div>
         </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
