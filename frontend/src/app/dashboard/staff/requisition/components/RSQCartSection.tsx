'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FolderOpen,
  LayoutList,
  Save,
  Send,
  ShoppingBag,
  Table as TableIcon,
  Trash2,
  X,
  User,
} from 'lucide-react';
import { SelectedItem, Employee, employeeKey } from './RSQTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';

interface RSQCartSectionProps {
  selectedItems: SelectedItem[];
  employees: Employee[];
  updateCartItemQuantity: (productId: string, empName: string, qty: number) => void;
  removeCartItem: (productId: string) => void;
  handleOpenSubmitModal: () => void;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  savedDrafts: string[];
  onLoadDraft: (name: string) => void;
  onDeleteDraft: (name: string) => void;
}

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

export const RSQCartSection: React.FC<RSQCartSectionProps> = ({
  selectedItems,
  employees,
  updateCartItemQuantity,
  removeCartItem,
  handleOpenSubmitModal,
  isSubmitting,
  onSaveDraft,
  savedDrafts,
  onLoadDraft,
  onDeleteDraft,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  useEffect(() => {
    if (employees.length > 0 && !expandedEmployee) {
      setExpandedEmployee(employeeKey(employees[0]));
    }
  }, [employees, expandedEmployee]);

  const totalQuantity = selectedItems.reduce((sum, item) => {
    return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
  }, 0);

  const overStockCount = selectedItems.filter((item) => {
    const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
    return rowTotal > item.maxQuantity;
  }).length;

  const getEmployeeStats = (emp: Employee) => {
    const empKey = employeeKey(emp);
    let itemsCount = 0;
    let qtyCount = 0;
    selectedItems.forEach(item => {
      const q = item.quantities[empKey] || 0;
      if (q > 0) {
        itemsCount++;
        qtyCount += q;
      }
    });
    return { itemsCount, qtyCount };
  };

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground">Review Assigned Materials</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Configure item quantities per employee.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${
                viewMode === 'table' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="h-3 w-3" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('accordion')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-all ${
                viewMode === 'accordion' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="h-3 w-3" />
              Cards
            </button>
          </div>
          <Badge variant="outline" className="text-[9px] py-0 h-4 px-1">{selectedItems.length} products</Badge>
          <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1 tabular-nums">{totalQuantity} total qty</Badge>
        </div>
      </div>

      {overStockCount > 0 && (
        <Alert className="mb-3 py-1.5 px-3 border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 inline-block align-middle mr-1.5" />
          <AlertDescription className="text-[10px] inline-block align-middle p-0">
            Stock limits exceeded for {overStockCount} item(s). Please check highlighted warnings.
          </AlertDescription>
        </Alert>
      )}

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-card">
          <ShoppingBag className="h-5 w-5 text-muted-foreground/30" aria-hidden="true" />
          <h4 className="mt-2 text-xs font-semibold text-foreground">No Employees Tagged</h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[200px]">
            Add employees above to review material allocations.
          </p>
        </div>
      ) : selectedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-card">
          <ShoppingBag className="h-5 w-5 text-muted-foreground/30" aria-hidden="true" />
          <h4 className="mt-2 text-xs font-semibold text-foreground">No Materials Selected</h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[200px]">
            Search and add materials from the right panel.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="sticky left-0 z-10 min-w-56 bg-muted/50 py-1.5 text-xs">Product</TableHead>
                    {employees.map(emp => (
                      <TableHead key={employeeKey(emp)} className="min-w-32 text-center py-1.5">
                        <span className="block truncate text-xs font-semibold text-foreground">{emp.lastName}, {emp.firstName}</span>
                        <span className="block truncate text-[9px] font-normal text-muted-foreground">{emp.position}</span>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-20 text-right py-1.5 text-xs">Row Total</TableHead>
                    <TableHead className="min-w-14 text-right py-1.5 text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => {
                    const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
                    const exceedsStock = rowTotal > item.maxQuantity;
                    return (
                      <TableRow key={item.productId} className={exceedsStock ? 'bg-amber-50/50 hover:bg-amber-50' : ''}>
                        <TableCell className={`sticky left-0 z-10 py-1.5 ${exceedsStock ? 'bg-amber-50/50' : 'bg-card'}`}>
                          <span className="block max-w-52 break-words text-xs font-semibold text-foreground">{item.productName}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant={exceedsStock ? 'destructive' : 'outline'} className="text-[8px] py-0 h-3.5 px-1">
                              Stock: {item.maxQuantity} {item.unit || 'PCS'}
                            </Badge>
                          </div>
                        </TableCell>
                        {employees.map(emp => {
                          const key = employeeKey(emp);
                          const inputId = `tbl-qty-${safeId(item.productId)}-${safeId(key)}`;
                          return (
                            <TableCell key={key} className="text-center py-1.5">
                              <label htmlFor={inputId} className="sr-only">Quantity for {item.productName} assigned to {emp.lastName}, {emp.firstName}</label>
                              <Input
                                id={inputId}
                                name={inputId}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={item.quantities[key] || 0}
                                onChange={(e) => updateCartItemQuantity(item.productId, key, Math.max(0, parseInt(e.target.value) || 0))}
                                className={`mx-auto w-14 h-7 px-1 text-center text-xs font-semibold tabular-nums ${
                                  (item.quantities[key] || 0) > 0
                                    ? 'border-primary/30 bg-primary/5 text-primary'
                                    : ''
                                }`}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right py-1.5">
                          <span className={`text-xs font-semibold tabular-nums ${exceedsStock ? 'text-amber-700' : 'text-foreground'}`}>{rowTotal}</span>
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeCartItem(item.productId)}
                            aria-label={`Remove ${item.productName}`}
                            className="text-muted-foreground hover:text-destructive h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="sticky left-0 z-10 bg-muted/50 text-[11px] font-bold">Total per Employee</TableCell>
                    {employees.map(emp => {
                      const key = employeeKey(emp);
                      const total = selectedItems.reduce((sum, item) => sum + (item.quantities[key] || 0), 0);
                      return (
                        <TableCell key={key} className="text-center text-xs font-bold tabular-nums text-primary">
                          {total}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-bold tabular-nums">{totalQuantity}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ) : (
        <div className="space-y-1.5">
          {employees.map((emp) => {
            const empKey = employeeKey(emp);
            const isExpanded = expandedEmployee === empKey;
            const { itemsCount, qtyCount } = getEmployeeStats(emp);

            return (
              <div
                key={empKey}
                className={`rounded-lg border transition-all ${
                  isExpanded ? 'border-primary/20 bg-muted/10' : 'border-border bg-card'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedEmployee(isExpanded ? null : empKey)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {emp.lastName}, {emp.firstName}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">
                        {emp.position}{emp.department ? ` - ${emp.department}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5 font-normal">
                        {itemsCount} items
                      </Badge>
                      <Badge variant={qtyCount > 0 ? 'secondary' : 'outline'} className="text-[9px] py-0 h-4 px-1.5 font-bold">
                        Qty: {qtyCount}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t border-border/50 bg-card/50"
                    >
                      <div className="p-2 space-y-1.5">
                        {selectedItems.map((item) => {
                          const qty = item.quantities[empKey] || 0;
                          const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
                          const exceedsStock = rowTotal > item.maxQuantity;
                          const inputId = `accordion-qty-${safeId(item.productId)}-${safeId(empKey)}`;

                          return (
                            <div
                              key={item.productId}
                              className={`flex items-center justify-between gap-3 p-2 rounded-md border ${
                                exceedsStock ? 'border-amber-200 bg-amber-50/20' : 'border-border bg-card'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-foreground truncate">{item.productName}</p>
                                  {exceedsStock && (
                                    <Badge variant="destructive" className="text-[8px] h-3.5 py-0 px-0.5">
                                      Over Stock
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground leading-none">
                                  <span>SKU: {item.sku || '-'}</span>
                                  <span>•</span>
                                  <span>Stock: {item.maxQuantity} {item.unit || 'PCS'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center border rounded-md bg-muted/20">
                                  <button
                                    type="button"
                                    onClick={() => updateCartItemQuantity(item.productId, empKey, Math.max(0, qty - 1))}
                                    className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                                  >
                                    -
                                  </button>
                                  <label htmlFor={inputId} className="sr-only">Quantity for {item.productName}</label>
                                  <Input
                                    id={inputId}
                                    name={inputId}
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={qty}
                                    onChange={(e) => updateCartItemQuantity(item.productId, empKey, Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-9 h-6 border-0 bg-transparent text-center text-xs font-bold p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateCartItemQuantity(item.productId, empKey, qty + 1)}
                                    className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center gap-0.5">
                                  {qty > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => updateCartItemQuantity(item.productId, empKey, 0)}
                                      className="text-muted-foreground hover:text-destructive h-6 w-6"
                                      title="Reset item for this employee"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => removeCartItem(item.productId)}
                                    className="text-muted-foreground hover:text-destructive h-6 w-6"
                                    title="Delete product from all employees"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <CardFooter className="py-2.5 px-3 flex-col gap-2.5 sm:flex-row sm:justify-between border-t mt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-primary ring-1 ring-border">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-foreground leading-none">Ready for Review?</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">Save draft or submit.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center w-full sm:w-auto">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 w-full sm:w-auto">
                  <FolderOpen className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Drafts
                  <ChevronDown className="h-3 w-3 ml-1" aria-hidden="true" />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-52 p-1">
              {savedDrafts.length > 0 ? (
                savedDrafts.map(name => (
                  <div key={name} className="flex items-center gap-1 border-b border-border p-1 last:border-0">
                    <button
                      type="button"
                      onClick={() => onLoadDraft(name)}
                      className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <span className="block truncate">{name}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDeleteDraft(name)}
                      aria-label={`Delete draft ${name}`}
                      className="text-muted-foreground hover:text-destructive h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground">No saved drafts</div>
              )}
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={selectedItems.length === 0 || isSubmitting}
            className="h-8 text-xs px-2.5 w-full sm:w-auto"
          >
            <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={handleOpenSubmitModal}
            disabled={selectedItems.length === 0 || employees.length === 0 || isSubmitting}
            className="h-8 text-xs px-3 w-full sm:w-auto"
          >
            <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Submit
          </Button>
        </div>
      </CardFooter>
    </div>
  );
};
