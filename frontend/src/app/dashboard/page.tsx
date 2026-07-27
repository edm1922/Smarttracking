"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Box,
  Users,
  TrendingUp,
  Activity,
  Filter,
  Calendar,
  MapPin,
  Package,
  ClipboardList,
  ShoppingCart,
  RefreshCw,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import {
  PageHeaderSkeleton,
  CardSkeleton,
} from "@/components/ui/LoadingSkeletons";
import { StockHealthWidget } from "./components/StockHealthWidget";

const COLORS = ["#2563eb", "#f43f5e", "#10b981", "#f59e0b"];

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "12px",
    padding: "12px",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
  itemStyle: { color: "#fff", fontSize: "11px", fontWeight: 900 },
  labelStyle: {
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 900,
    marginBottom: "4px",
    textTransform: "uppercase",
  },
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return {
    value: `${y}-${m}`,
    label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
});

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("");
  const [role, setRole] = useState("");
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    if (!val) {
      setStartDate("");
      setEndDate("");
    } else {
      const [y, m] = val.split("-");
      setStartDate(`${val}-01`);
      setEndDate(new Date(+y, +m, 0).toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "";
    setRole(storedRole);
    if (storedRole === "inventory") {
      router.push("/dashboard/staff/requisition");
    }
  }, [router]);

  const fetchData = async (isRetry = false) => {
    if (!isRetry && isRefreshing) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!isRetry) setIsRefreshing(true);
    setError(null);
    const startTime = Date.now();
    try {
      let url =
        selectedLocation === "all"
          ? "/reports/analytics?"
          : `/reports/analytics?locationId=${selectedLocation}&`;

      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const [locRes, res] = await Promise.all([
        api.get("/locations", { signal: controller.signal }),
        api.get(url, { signal: controller.signal }),
      ]);
      if (!mountedRef.current) return;
      setLocations(locRes.data);
      setData(res.data);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
      if (!mountedRef.current) return;
      const msg =
        err?.response?.status === 401
          ? "Session expired. Please log in again."
          : err?.response?.status === 403
            ? "You do not have permission to view this data."
            : err?.response?.status === 429
              ? "Too many requests. Please wait a moment."
              : err?.message?.includes("Network Error")
                ? "Network connection lost. Check your connection."
                : `Failed to load dashboard data. ${err?.response?.status ? `(Error ${err.response.status})` : ""}`;
      setError(msg);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [selectedLocation, startDate, endDate]);

  if (loading || !data) {
    if (error) {
      return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300 relative min-h-[600px] flex flex-col items-center justify-center">
          <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm text-center max-w-md">
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-2">
              Failed to Load
            </p>
            <p className="text-xs text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => fetchData(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-800 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300 relative min-h-[600px]">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton className="h-[400px]" />
          <div className="lg:col-span-2">
            <CardSkeleton className="h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Top Header Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
            System Intelligence
            {isRefreshing && (
              <RefreshCw className="ml-4 h-6 w-6 text-primary animate-spin" />
            )}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Real-time reports and organizational requisition trends
          </p>
        </div>
      </div>

      {/* STOCK HEALTH OVERVIEW */}
      <StockHealthWidget
        totalItems={data?.summary?.totalItems ?? 0}
        pendingRequests={data?.summary?.pendingRequests ?? 0}
        role={role}
      />

      {/* SECTION 1: PRODUCT REPORTS */}
      <section className="space-y-6 relative">
        {isRefreshing && (
          <div className="absolute inset-0 z-10 bg-white/20 flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
            <div className="bg-white/80 p-3 rounded-2xl flex items-center gap-3">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Syncing Records...
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">
            <Box className="mr-2 h-4 w-4 text-primary/60" /> STOCK & INVENTORY
            INTELLIGENCE
          </h2>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                aria-label="Select reporting month"
                className="text-[10px] font-bold bg-transparent border-none outline-none pr-8 cursor-pointer uppercase text-gray-600"
              >
                <option value="">All Time</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                aria-label="Select location filter"
                className="text-[10px] font-bold bg-transparent border-none outline-none pr-8 cursor-pointer uppercase text-gray-600"
              >
                <option value="all">Global View (All Areas)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Issuance Log */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-gray-800">
              Monthly Fulfillment Volume
            </h3>
            <span className="text-[10px] font-bold text-primary uppercase">
              Last 6 Months
            </span>
          </div>
          <div className="w-full" style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data?.monthlyTrends ?? []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f5f5f5"
                />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  fontSize={10}
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} {...CHART_TOOLTIP} />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  barSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Org Insights Controls */}
        <div className="flex items-center justify-between pt-8 pb-2">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">
            <Users className="mr-2 h-4 w-4 text-primary/60" /> ORGANIZATIONAL &
            EMPLOYEE INSIGHTS
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedLocation("all")}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-primary/30 transition-all text-[10px] font-bold text-gray-600 uppercase"
            >
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <span>All Depts</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Requested Items */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">
                High-Demand Stocks
              </h3>
              <TrendingUp className="h-4 w-4 text-primary/60" />
            </div>
            <div className="space-y-6">
              {(data?.topProducts ?? []).length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-500 italic">
                  No issuance data available.
                </p>
              ) : (
                (data?.topProducts ?? []).map((p: any, idx: number) => (
                  <div key={p.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${idx === 0 ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-500"}`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-gray-700 group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-gray-900">
                        {p.count} PCS
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-50/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${(p.count / ((data?.topProducts?.[0]?.count ?? 1) || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-full flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">
                Requests by Department
              </h3>
              <Activity className="h-4 w-4 text-primary/60" />
            </div>
            <div className="w-full" style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={(data?.topDepartments ?? [])
                      .filter((e: any) => e.name && e.name.toLowerCase() !== "satellite office")}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={95}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="requests"
                    nameKey="name"
                  >
                    {(data?.topDepartments ?? []).filter((e: any) => e.name && e.name.toLowerCase() !== "satellite office").length > 0 ? (
                      (data?.topDepartments ?? [])
                        .filter((e: any) => e.name && e.name.toLowerCase() !== "satellite office")
                        .map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))
                    ) : (
                      <Cell key="empty" fill="#f1f5f9" />
                    )}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      paddingTop: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6 pt-12">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            SYSTEM ACTIVITY & STOCK LOGS
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Consumed Admin Stock */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">
                Top Consumed Stock
              </h3>
              <Package className="h-4 w-4 text-primary/60" />
            </div>
            <div className="space-y-6">
              {(data?.topConsumedStock ?? []).length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-500 italic">
                  No admin stock out data.
                </p>
              ) : (
                (data?.topConsumedStock ?? []).map((p: any, idx: number) => (
                  <div key={`${p.name}-${idx}`} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${idx === 0 ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-500"}`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-bold text-gray-700 group-hover:text-primary transition-colors">
                            {p.name}
                          </span>
                          {p.description && (
                            <span className="truncate text-[9px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-gray-900">
                        {p.count} PCS
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-50/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${(p.count / ((data?.topConsumedStock?.[0]?.count ?? 1) || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Frequent Items */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">
                Top Frequent Items
              </h3>
              <Package className="h-4 w-4 text-primary/60" />
            </div>
            <div className="space-y-6">
              {(data?.topFrequentItems ?? []).length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-500 italic">
                  No request data available.
                </p>
              ) : (
                (data?.topFrequentItems ?? []).map((item: any, idx: number) => (
                  <div key={item.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${idx === 0 ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-500"}`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-gray-700 group-hover:text-primary transition-colors uppercase tracking-tight">
                          {item.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-gray-900">
                        {item.frequencyPerWeek}/WK
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-50/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.frequencyPerWeek / ((data?.topFrequentItems?.[0]?.frequencyPerWeek ?? 1) || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unified Activity Log */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Activity className="mr-2 h-4 w-4 text-primary" /> System-Wide
              Activity Log
            </h3>
            <div className="flex items-center space-x-2">
              <span className="h-1 w-1 rounded-full bg-green-400/60" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Live Updates
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
            {(data?.activityLog ?? []).length === 0 ? (
              <div className="px-8 py-20 text-center text-sm text-gray-500 italic">
                No recent activity detected.
              </div>
            ) : (
              (data?.activityLog ?? []).map((log: any, idx: number) => (
                <div
                  key={`${log.id}-${log.type}-${idx}`}
                  className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex items-center space-x-5">
                    <div className="p-2.5 rounded-2xl shadow-sm bg-primary/10 text-primary">
                      {log.type === "STOCK" ? (
                        <Package className="h-4.5 w-4.5" />
                      ) : log.type === "REQUEST" ? (
                        <ClipboardList className="h-4.5 w-4.5" />
                      ) : (
                        <ShoppingCart className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {log.title}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        {log.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">
                      {new Date(log.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 mt-0.5">
                      {new Date(log.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
