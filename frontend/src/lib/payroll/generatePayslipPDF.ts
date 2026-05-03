import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateStr: any) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
};

const formatAmount = (amount: any) => {
  return (amount || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const generatePayslipPDF = (slip: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- Header ---
  doc.setFillColor(33, 150, 243);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTTRACKING PAYROLL', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL PAYROLL SLIP - GAISANO MALL OF GENSAN', pageWidth / 2, 28, { align: 'center' });

  // --- Employee & Period Info Section ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  // Left Side Info
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE NAME:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(slip.raw_data?.full_name || 'N/A', 50, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE ID:', 14, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(slip.sys_id || 'N/A', 50, 62);

  // Right Side Info
  doc.setFont('helvetica', 'bold');
  doc.text('PAYROLL PERIOD:', 110, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(slip.payroll_runs?.period_start)} - ${formatDate(slip.payroll_runs?.period_end)}`, 145, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('RELEASE DATE:', 110, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(slip.payroll_runs?.payroll_date), 145, 62);

  // --- Earnings & Deductions Tables ---
  
  // Earnings Table
  autoTable(doc, {
    startY: 75,
    margin: { left: 14, right: 110 },
    head: [['EARNINGS', 'AMOUNT']],
    body: [
      ['Basic Pay', `P${formatAmount(slip.basic_pay)}`],
      ['Overtime Pay', `P${formatAmount(slip.overtime_pay)}`],
      ['Allowances', `P${formatAmount(slip.allowance)}`],
      [{ content: 'TOTAL GROSS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `P${formatAmount(slip.gross_pay)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
    ],
    theme: 'plain',
    headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } }
  });

  const tableBottom = (doc as any).lastAutoTable.finalY;

  // Deductions Table
  autoTable(doc, {
    startY: 75,
    margin: { left: 110, right: 14 },
    head: [['DEDUCTIONS', 'AMOUNT']],
    body: [
      ['SSS Premium', `P${formatAmount(slip.sss)}`],
      ['PhilHealth', `P${formatAmount(slip.phic)}`],
      ['Pag-IBIG / HDMF', `P${formatAmount(slip.hdmf)}`],
      ['Loans & Others', `P${formatAmount(slip.loans)}`],
      [{ content: 'TOTAL DEDUCTIONS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `P${formatAmount(slip.total_deductions)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
    ],
    theme: 'plain',
    headStyles: { fillColor: [244, 67, 54], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } }
  });

  const finalY = Math.max(tableBottom, (doc as any).lastAutoTable.finalY) + 20;

  // --- Net Pay Summary Box ---
  doc.setFillColor(33, 150, 243, 0.05);
  doc.roundedRect(14, finalY, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('NET TAKE HOME PAY:', 24, finalY + 16);
  
  doc.setFontSize(20);
  doc.setTextColor(33, 150, 243);
  doc.text(`P${formatAmount(slip.net_pay)}`, pageWidth - 24, finalY + 16, { align: 'right' });

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text('This is an electronically generated document. No signature required.', pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

  // --- Border ---
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, doc.internal.pageSize.height - 10, 'S');

  doc.save(`Payslip_${slip.sys_id}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};
