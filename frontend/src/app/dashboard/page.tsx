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
  User,
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
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Printer, Eye, X as CloseIcon } from "lucide-react";
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

function ReportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<
    "product" | "employee" | "activity"
  >("product");
  const [reportType, setReportType] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  const productReports = [
    { id: "stock-summary", name: "Stock Summary" },
    { id: "need-restock", name: "Need Restock" },
    {
      id: "inventory-distribution",
      name: "Inventory Distribution (by Location)",
    },
    { id: "custom-item-report", name: "Custom Item Report" },
    { id: "item-pricing", name: "Item Pricing" },
  ];

  const employeeReports = [
    { id: "supply-demand", name: "Pending Supply Demand" },
    { id: "pending-requests", name: "Pending Requests (Past Due/Today)" },
    {
      id: "consumption-analysis",
      name: "Consumption Analysis (Employee Behavior)",
    },
    { id: "filter-item", name: "Filter by Specific Item" },
  ];

  const activityReports = [
    { id: "top-consumed-stock", name: "Top Consumed Stock" },
    { id: "top-requesters", name: "Top Requesters" },
    { id: "frequency", name: "Frequency" },
  ];

  const reports =
    activeSection === "product"
      ? productReports
      : activeSection === "employee"
        ? employeeReports
        : activityReports;

  const switchSection = (s: "product" | "employee" | "activity") => {
    setActiveSection(s);
    setReportType("");
    setSelectedProductIds([]);
    setReportStartDate("");
    setReportEndDate("");
  };

  useEffect(() => {
    if (
      (reportType === "custom-item-report" || reportType === "item-pricing") &&
      productsList.length === 0
    ) {
      api
        .get("/products", { params: { take: 1000 } })
        .then((res) => setProductsList(res.data.data ?? []))
        .catch(() => {});
    }
  }, [reportType, productsList.length]);

  const handleGenerate = async () => {
    if (!reportType) return toast.warning("Please select a report type");
    if (
      (reportType === "custom-item-report" || reportType === "item-pricing") &&
      selectedProductIds.length === 0
    )
      return toast.warning("Please select at least one item");
    setLoading(true);
    try {
      let url = `/reports/report-data?type=${reportType}`;
      if (selectedProductIds.length > 0)
        url += `&productIds=${selectedProductIds.join(",")}`;
      if (reportStartDate) url += `&startDate=${reportStartDate}`;
      if (reportEndDate) url += `&endDate=${reportEndDate}`;
      const res = await api.get(url);
      setPreviewData(res.data);
      setIsPreviewOpen(true);
    } catch (err: any) {
      const msg =
        err?.response?.status === 401
          ? "Session expired. Please log in again."
          : err?.response?.status === 403
            ? "Permission denied."
            : err?.response?.status === 429
              ? "Too many requests. Please wait."
              : err?.message?.includes("Network Error")
                ? "Network connection lost."
                : "Failed to generate report";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatDataForPreview = (data: any[], type: string) => {
    switch (type) {
      case "stock-summary":
        return data.map((p) => ({
          SKU: p.sku,
          Name: p.name,
          Unit: p.unit,
          Threshold: p.threshold,
          "Total Stock": p.stocks.reduce(
            (sum: number, s: any) => sum + s.quantity,
            0,
          ),
        }));
      case "need-restock":
        return data.map((p) => ({
          SKU: p.sku,
          Name: p.name,
          "Current Stock": p.stocks.reduce(
            (sum: number, s: any) => sum + s.quantity,
            0,
          ),
          Threshold: p.threshold,
        }));
      case "inventory-distribution":
        const rows: any[] = [];
        data.forEach((l) => {
          l.stocks.forEach((s: any) => {
            rows.push({
              Location: l.name,
              SKU: s.product.sku,
              Product: s.product.name,
              Quantity: s.quantity,
            });
          });
        });
        return rows;
      case "supply-demand":
        return data.map((p) => ({
          SKU: p.sku,
          Product: p.name,
          "On Hand": p.onHand,
          "Pending Req": p.pending,
          "Fulfilled Total": p.fulfilled,
        }));
      case "pending-requests":
        return data.map((r) => ({
          "Date Req": new Date(r.date).toLocaleDateString(),
          "Request No": r.requestNo,
          Employee: r.employeeName,
          Dept: r.departmentArea,
          Product: r.product.name,
          Qty: r.quantity,
          Location: r.location.name,
        }));
      case "consumption-analysis":
        return data.map((a) => ({
          Employee: a.employee,
          Department: a.dept,
          "Total Items Issued": a.totalItems,
          Breakdown: Object.entries(a.items)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", "),
        }));
      case "top-consumed-stock":
        return data.map((t, idx) => ({
          Rank: `#${idx + 1}`,
          "Stock Name": t.name,
          Description: t.description,
          "Total Consumed": `${t.count} PCS`,
        }));
      case "top-requesters":
        return data.map((u, idx) => ({
          Rank: `#${idx + 1}`,
          "Requester Name": u.name,
          "Total Requested": `${u.count} ITEMS REQUESTED`,
        }));
      case "frequency":
        return data.map((item: any, idx: number) => ({
          Rank: `#${idx + 1}`,
          "Item Name": item.productName,
          SKU: item.sku,
          "Total Requests": item.totalCount,
          Frequency: `${item.frequencyPerWeek} times/week`,
        }));
      case "custom-item-report":
        return data.map((p) => ({
          Description: p.description,
          Name: p.name,
          Unit: p.unit,
          Beginning: p.beginningStock ?? 0,
          "Stock In": p.stockIn ?? 0,
          "Stock Out": p.stockOut ?? 0,
          Ending: p.endingStock ?? 0,
        }));
      case "item-pricing":
        return data.map((p) => ({
          SKU: p.sku,
          Name: p.name,
          Supplier: p.supplier || "—",
          "Cost Price": `Php ${p.price.toFixed(2)}`,
          "Purchase Unit": p.purchaseUnit || "—",
        }));
      default:
        return data;
    }
  };

  const handlePrintPDF = async () => {
    const { default: jsPDFModule } = await import("jspdf");
    const { applyPlugin: applyAutoTable } = await import("jspdf-autotable");
    applyAutoTable(jsPDFModule);
    const doc = new jsPDFModule("landscape", "mm", "letter");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ml = 15;
    const mr = 28;
    const usableWidth = pageWidth - ml - mr;

    let currentPage = 1;
    const drawFooter = () => {
      const footerY = pageHeight - 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const dateStr = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.text(`${dateStr}, ${timeStr}`, ml, footerY);
      doc.text(
        `Inventory Intelligence Report - ${reportType.replace(/-/g, " ")}`,
        pageWidth / 2,
        footerY,
        { align: "center" },
      );
      doc.text(
        `${currentPage}/${doc.getNumberOfPages()}`,
        pageWidth - mr,
        footerY,
        { align: "right" },
      );
    };

    const rows = formatDataForPreview(previewData, reportType);
    const columns = Object.keys(rows[0] || {});

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("INVENTORY INTELLIGENCE REPORT", pageWidth / 2, 22, {
      align: "center",
    });

    doc.setFontSize(16);
    doc.text(reportType.replace(/-/g, " ").toUpperCase(), pageWidth / 2, 32, {
      align: "center",
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(ml, 36, pageWidth - mr, 36);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const dateRangeStr =
      reportStartDate || reportEndDate
        ? `Period: ${reportStartDate || "Earliest"} — ${reportEndDate || "Present"}`
        : "";
    const leftMeta = [
      `Report Type: ${reportType.replace(/-/g, " ")}`,
      dateRangeStr,
      `Generated by: ${typeof window !== "undefined" ? localStorage.getItem("username")?.toUpperCase() || "N/A" : "N/A"}`,
    ].filter(Boolean);
    const rightMeta = [
      `Date: ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase()}`,
      `Time: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
    ];

    const metaStartY = 42;
    leftMeta.forEach((line, i) => doc.text(line, ml, metaStartY + i * 6));
    rightMeta.forEach((line, i) =>
      doc.text(line, pageWidth - mr, metaStartY + i * 6, { align: "right" }),
    );

    const tableStartY = metaStartY + leftMeta.length * 6 + 8;
    const dataRows = rows.map((row) =>
      columns.map((col) => String(row[col] ?? "")),
    );

    if (dataRows.length > 0) {
      (doc as any).autoTable({
        startY: tableStartY,
        head: [columns],
        body: dataRows,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 6.5,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        columnStyles: columns.reduce((acc: any, _, i) => {
          acc[i] = {
            cellWidth: i === 0 || i === columns.length - 1 ? "auto" : 30,
            halign: i === 0 ? "left" : "center",
          };
          return acc;
        }, {}),
        margin: { left: ml, right: mr },
        pageBreak: "auto",
        didDrawPage: () => {
          currentPage = doc.getNumberOfPages();
          drawFooter();
        },
      });
    }

    let totalY =
      dataRows.length > 0
        ? (doc as any).lastAutoTable.finalY + 8
        : tableStartY + 10;

    if (dataRows.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(
        "No data available for the selected report.",
        pageWidth / 2,
        totalY,
        { align: "center" },
      );
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`TOTAL ITEMS RECORDED: ${dataRows.length}`, ml, totalY);
    }

    const signSectionH = 35;
    if (totalY + signSectionH > pageHeight - 15) {
      doc.addPage();
      totalY = 30;
    }

    const signY = totalY + 14;
    const signColWidth = usableWidth / 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Prepared by:", ml, signY);
    doc.line(ml, signY + 9, ml + signColWidth - 5, signY + 9);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text("Signature Over Printed Name", ml, signY + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Verified by:", ml + signColWidth, signY);
    doc.line(
      ml + signColWidth,
      signY + 9,
      ml + 2 * signColWidth - 5,
      signY + 9,
    );
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text("Signature Over Printed Name", ml + signColWidth, signY + 13);

    currentPage = doc.getNumberOfPages();
    drawFooter();

    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {!isPreviewOpen ? (
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Report Generator
              </h2>
              <button
                onClick={onClose}
                aria-label="Close report modal"
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <CloseIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5 w-fit">
              {(["product", "employee", "activity"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => switchSection(s)}
                  className={`px-4 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeSection === s
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {s === "product"
                    ? "Stock"
                    : s === "employee"
                      ? "Employee"
                      : "Activity"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto max-h-[55vh]">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Select Report Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReportType(r.id)}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
                      reportType === r.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-100 hover:border-gray-200 text-gray-600"
                    }`}
                  >
                    <span className="text-sm font-bold">{r.name}</span>
                    {reportType === r.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {(reportType === "custom-item-report" ||
              reportType === "item-pricing") && (
              <div className="space-y-3">
                {reportType === "custom-item-report" && (
                  <div className="flex items-center gap-3 pb-1">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="text-[10px] font-black bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors uppercase text-gray-600"
                    />
                    <span className="text-[10px] font-black text-gray-300">
                      —
                    </span>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="text-[10px] font-black bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors uppercase text-gray-600"
                    />
                    {(reportStartDate || reportEndDate) && (
                      <button
                        onClick={() => {
                          setReportStartDate("");
                          setReportEndDate("");
                        }}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <CloseIcon className="h-3 w-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                )}
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Select Items{" "}
                  <span className="text-primary">
                    ({selectedProductIds.length} selected)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 text-sm font-bold focus:border-primary focus:outline-none transition-colors"
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {productsList
                      .filter(
                        (p) =>
                          p.name
                            .toLowerCase()
                            .includes(productSearch.toLowerCase()) ||
                          (p.description || "")
                            .toLowerCase()
                            .includes(productSearch.toLowerCase()),
                      )
                      .map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-primary/5 ${
                            selectedProductIds.includes(p.id)
                              ? "bg-primary/5 text-primary"
                              : "text-gray-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => {
                              setSelectedProductIds((prev) =>
                                prev.includes(p.id)
                                  ? prev.filter((pid) => pid !== p.id)
                                  : [...prev, p.id],
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="flex-1">{p.name}</span>
                          {p.description && (
                            <span className="text-[10px] text-gray-500 font-medium">
                              {p.description}
                            </span>
                          )}
                        </label>
                      ))}
                    {productsList.filter(
                      (p) =>
                        p.name
                          .toLowerCase()
                          .includes(productSearch.toLowerCase()) ||
                        (p.description || "")
                          .toLowerCase()
                          .includes(productSearch.toLowerCase()),
                    ).length === 0 && (
                      <p className="px-4 py-3 text-xs text-gray-500 italic">
                        No products found
                      </p>
                    )}
                  </div>
                  {selectedProductIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedProductIds.map((id) => {
                        const p = productsList.find((x) => x.id === id);
                        return p ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20"
                          >
                            {p.name}
                            {p.description ? ` - ${p.description}` : ""}
                            <button
                              onClick={() =>
                                setSelectedProductIds((prev) =>
                                  prev.filter((pid) => pid !== id),
                                )
                              }
                              className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <CloseIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-white px-10 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  View Report
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in slide-in-from-bottom-10 duration-200">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Report Preview
              </h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                {reportType.replace(/-/g, " ")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800 transition-all"
              >
                <Printer className="h-4 w-4" /> Print PDF
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                aria-label="Close preview"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <CloseIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 no-scrollbar">
            <div className="print-area">
              <div className="mb-10 text-center border-b-2 border-gray-900 pb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">
                  Inventory Intelligence Report
                </h1>
                <p className="text-sm font-bold text-gray-500 mt-2">
                  Generated on {new Date().toLocaleString()}
                </p>
                {(reportStartDate || reportEndDate) && (
                  <p className="text-xs font-bold text-gray-400 mt-0.5">
                    Period: {reportStartDate || "Earliest"} —{" "}
                    {reportEndDate || "Present"}
                  </p>
                )}
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {Object.keys(
                      formatDataForPreview(previewData, reportType)[0] || {},
                    ).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest border border-gray-800"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formatDataForPreview(previewData, reportType).map(
                    (row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {Object.values(row).map((val: any, vIdx) => (
                          <td
                            key={vIdx}
                            className="px-4 py-3 text-xs font-bold border border-gray-100 text-gray-900"
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              <div className="mt-20 flex justify-between px-10">
                <div className="text-center">
                  <div className="w-48 border-b border-gray-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Prepared By
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-gray-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Verified By
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: relative;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

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

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
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
    const role = localStorage.getItem("role");
    if (role === "inventory") {
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
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-gray-700 transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Report
            </button>
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
                    data={(data?.topDepartments ?? []).map((e: any) => ({
                      ...e,
                      name: e.name || "Satellite Office",
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={95}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="requests"
                    nameKey="name"
                  >
                    {(data?.topDepartments ?? []).length > 0 ? (
                      data.topDepartments.map((entry: any, index: number) => (
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

          {/* Top Issuing Users */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">
                Top Requesters
              </h3>
              <User className="h-4 w-4 text-primary/60" />
            </div>
            <div className="space-y-6">
              {(data?.topStockUsers ?? []).length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-500 italic">
                  No user activity data.
                </p>
              ) : (
                (data?.topStockUsers ?? []).map((u: any, idx: number) => (
                  <div key={u.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${idx === 0 ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-500"}`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-gray-700 group-hover:text-primary transition-colors uppercase tracking-tight">
                          {u.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-gray-900">
                        {u.count} ITEMS REQUESTED
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-50/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${(u.count / ((data?.topStockUsers?.[0]?.count ?? 1) || 1)) * 100}%`,
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

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
