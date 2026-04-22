import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import axios from 'axios';
import { Response } from 'express';

@Injectable()
export class ExcelGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generateUniformStocksReport(res: Response, headerConfig: any, filters: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Uniform Stocks Report');

    // 1. Fetch Data
    const products = await this.prisma.product.findMany({
      where: filters.category ? { categoryId: filters.category } : {},
      include: {
        stocks: filters.location ? { where: { locationId: filters.location } } : true,
        transactions: true,
      },
    });

    // 2. Render Header
    await this.renderHeader(workbook, worksheet, headerConfig);

    // 3. Render Table
    this.renderTable(worksheet, products);

    // 4. Stream Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'Uniform_Stocks_Report.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  private async renderHeader(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, config: any) {
    let currentRow = 1;

    // Logo Support
    if (config.logo_url) {
      try {
        const response = await axios.get(config.logo_url, { responseType: 'arraybuffer' });
        const imageId = workbook.addImage({
          buffer: Buffer.from(response.data),
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: 0.2, row: 0.2 },
          ext: { width: 80, height: 80 },
        });
        currentRow = 6; // Push text down if logo exists
      } catch (e) {
        console.error('Failed to load logo', e);
      }
    }

    // Company Info
    const companyCell = worksheet.getCell(`C${currentRow}`);
    companyCell.value = config.company_name;
    companyCell.font = { size: 20, bold: true };
    currentRow++;

    const addressCell = worksheet.getCell(`C${currentRow}`);
    addressCell.value = config.address;
    addressCell.font = { size: 10 };
    currentRow++;

    const contactCell = worksheet.getCell(`C${currentRow}`);
    contactCell.value = config.contact;
    contactCell.font = { size: 10 };
    currentRow += 2;

    // Report Title
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = config.report_title;
    titleCell.font = { size: 16, bold: true };
    worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
    titleCell.alignment = { horizontal: 'center' };
    currentRow += 2;

    // Metadata Section
    if (config.metadata) {
      config.metadata.forEach((item: any) => {
        const row = worksheet.addRow([item.label, '', item.value === 'Auto-generated timestamp' ? new Date().toLocaleString() : item.value]);
        row.getCell(1).font = { bold: true };
        worksheet.mergeCells(`A${row.number}:B${row.number}`);
        currentRow = row.number + 1;
      });
    }

    worksheet.addRow([]); // Gap before table
  }

  private renderTable(worksheet: ExcelJS.Worksheet, products: any[]) {
    const startRow = worksheet.rowCount + 1;

    // --- ROW 1: Grouped Headers ---
    const row1 = worksheet.getRow(startRow);
    row1.values = [
      'NO.', 'BARCODE', 'PRODUCT', 'PRICE', 
      'STOCK IN', '', 
      'STOCK OUT', '', 
      'ENDING INVENTORY', ''
    ];

    // Merges
    worksheet.mergeCells(startRow, 5, startRow, 6); // Stock In
    worksheet.mergeCells(startRow, 7, startRow, 8); // Stock Out
    worksheet.mergeCells(startRow, 9, startRow, 10); // Ending

    // Styling Row 1
    const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    const redFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    const blueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

    [1, 2, 3, 4].forEach(c => {
      row1.getCell(c).fill = grayFill;
      row1.getCell(c).font = { bold: true };
      row1.getCell(c).alignment = { horizontal: 'center' };
    });
    [5, 6].forEach(c => { row1.getCell(c).fill = greenFill; row1.getCell(c).font = { bold: true, color: { argb: 'FF065F46' } }; });
    [7, 8].forEach(c => { row1.getCell(c).fill = redFill; row1.getCell(c).font = { bold: true, color: { argb: 'FF991B1B' } }; });
    [9, 10].forEach(c => { row1.getCell(c).fill = blueFill; row1.getCell(c).font = { bold: true, color: { argb: 'FF1E40AF' } }; });

    // --- ROW 2: Sub-headers ---
    const row2 = worksheet.getRow(startRow + 1);
    row2.values = [
      '', '', '', '', 
      'QUANTITY', 'AMOUNT', 
      'QUANTITY', 'AMOUNT', 
      'QUANTITY', 'AMOUNT'
    ];
    [5, 6, 7, 8, 9, 10].forEach(c => {
      row2.getCell(c).font = { size: 9, bold: true };
      row2.getCell(c).alignment = { horizontal: 'center' };
      row2.getCell(c).border = { bottom: { style: 'thin' } };
    });

    // --- DATA ROWS ---
    products.forEach((p, idx) => {
      const stockInQty = p.transactions.filter((t: any) => t.type === 'IN').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const stockOutQty = p.transactions.filter((t: any) => t.type === 'OUT').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const endingQty = stockInQty - stockOutQty;

      const dataRow = worksheet.addRow([
        idx + 1,
        p.sku,
        p.name,
        p.price || 0,
        stockInQty,
        stockInQty * (p.price || 0),
        stockOutQty,
        stockOutQty * (p.price || 0),
        endingQty,
        endingQty * (p.price || 0)
      ]);

      // Styling Data Row
      dataRow.getCell(4).numFmt = '#,##0.00';
      [6, 8, 10].forEach(c => dataRow.getCell(c).numFmt = '#,##0.00');
      
      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNumber >= 4) {
          cell.alignment = { horizontal: 'right' };
        } else {
          cell.alignment = { horizontal: 'left' };
        }
      });
    });

    // Column Widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 40;
    worksheet.getColumn(4).width = 12;
    [5, 6, 7, 8, 9, 10].forEach(c => worksheet.getColumn(c).width = 12);
  }
}
