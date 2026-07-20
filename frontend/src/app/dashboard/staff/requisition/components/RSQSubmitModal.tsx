'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileImage,
  ImageIcon,
  MapPin,
  Plus,
  Printer,
  Send,
  ShoppingBag,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { SelectedItem, Employee, employeeKey } from './RSQTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface RSQSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: any;
  employees: Employee[];
  selectedItems: SelectedItem[];
  attachmentFile: File | null;
  attachmentPreview: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  additionalFiles: File[];
  additionalPreviews: string[];
  handleAdditionalFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAdditionalFile: (index: number) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const RSQSubmitModal: React.FC<RSQSubmitModalProps> = ({
  isOpen,
  onClose,
  form,
  employees,
  selectedItems,
  attachmentFile,
  attachmentPreview,
  handleFileChange,
  additionalFiles,
  additionalPreviews,
  handleAdditionalFileChange,
  removeAdditionalFile,
  isSubmitting,
  onSubmit,
}) => {
  const totalItems = selectedItems.reduce((sum, item) => {
    return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
  }, 0);

  const missingFields = [
    !form.supervisorName?.trim() ? 'Supervisor name' : null,
    !attachmentFile ? 'Signed requisition form' : null,
  ].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <Badge variant="secondary" className="mb-0.5 text-[10px] uppercase tracking-wider">
                Final Step
              </Badge>
              <DialogTitle className="text-lg">Review & Submit Requisition</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Print the form, upload the signed copy, then submit the official request.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-12rem)] px-6 py-4">
          <div className="space-y-4">
            {missingFields.length > 0 && (
              <Alert variant="destructive" className="py-2.5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Required before submit: {missingFields.join(', ')}.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Request Context
                  </div>
                  <dl className="grid gap-2.5 text-xs">
                    <div>
                      <dt className="font-semibold text-muted-foreground uppercase text-[10px]">Supervisor</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">{form.supervisorName || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground uppercase text-[10px]">Department / Area</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">{form.departmentArea || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="font-semibold text-muted-foreground uppercase text-[10px]">Shift</dt>
                        <dd className="mt-0.5 font-semibold text-foreground">{form.shift || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-muted-foreground uppercase text-[10px]">Date</dt>
                        <dd className="mt-0.5 font-semibold text-foreground">{form.date || '-'}</dd>
                      </div>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Submission Summary
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                      <p className="text-lg font-semibold tabular-nums text-foreground">{employees.length}</p>
                      <p className="text-[10px] text-muted-foreground">Employees</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                      <p className="text-lg font-semibold tabular-nums text-foreground">{selectedItems.length}</p>
                      <p className="text-[10px] text-muted-foreground">Products</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
                      <p className="text-lg font-semibold tabular-nums text-foreground">{totalItems}</p>
                      <p className="text-[10px] text-muted-foreground">Total Qty</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="border-b px-4 py-2 bg-muted/20">
                  <h4 className="text-xs font-semibold text-foreground">Employee Breakdown</h4>
                </div>
                <ScrollArea className="h-32">
                  <div className="divide-y divide-border px-4">
                    {employees.map(emp => {
                      const key = employeeKey(emp);
                      const empItems = selectedItems.filter(item => (item.quantities[key] || 0) > 0);
                      const empTotal = empItems.reduce((s, i) => s + (i.quantities[key] || 0), 0);
                      return (
                        <div key={key} className="flex items-center justify-between gap-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{emp.lastName}, {emp.firstName}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold tabular-nums text-foreground">{empTotal} qty</p>
                            <p className="text-[10px] text-muted-foreground">{empItems.length} products</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Printer className="h-4 w-4" aria-hidden="true" />
              </div>
              <h4 className="mt-2.5 text-sm font-semibold text-foreground">Print & Sign</h4>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Print the populated requisition slip, obtain the supervisor's signature, and upload the signed copy below.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Print Requisition
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="signed-requisition-upload" className="mb-1.5 block text-xs font-semibold text-foreground">
                  Signed Requisition Form <span className="text-destructive">*</span>
                </label>
                <input
                  id="signed-requisition-upload"
                  name="signedRequisition"
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="signed-requisition-upload"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center transition-colors ${attachmentFile ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/5'}`}
                >
                  {attachmentPreview ? (
                    <img src={attachmentPreview} className="h-20 w-20 rounded-md border bg-card object-cover shadow-sm" alt="Signed requisition preview" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
                  )}
                  <span className="mt-2 block max-w-full truncate text-xs font-semibold text-foreground">
                    {attachmentFile ? attachmentFile.name : 'Upload signed document'}
                  </span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">Image or PDF accepted.</span>
                </label>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="supporting-image-upload" className="block text-xs font-semibold text-foreground">Supporting Images</label>
                  <span className="text-[10px] text-muted-foreground">Optional, max 2</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {additionalPreviews.map((preview, idx) => (
                    <div key={preview} className="relative rounded-lg border border-border bg-card p-1.5 shadow-sm">
                      <img src={preview} className="aspect-square w-full rounded-md object-cover" alt={`Supporting upload ${idx + 1}`} />
                      <Button
                        variant="destructive"
                        size="xs"
                        className="mt-1.5 w-full"
                        onClick={() => removeAdditionalFile(idx)}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  ))}
                  {additionalFiles.length < 2 && (
                    <label className="flex h-[135px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <input
                        id="supporting-image-upload"
                        name="supportingImage"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAdditionalFileChange}
                      />
                      <Plus className="h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
                      <span className="mt-1 text-xs font-semibold text-foreground">Add Photo</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-4 bg-muted/20">
          <div className="w-full">
            <Button
              className="w-full"
              size="lg"
              onClick={onSubmit}
              disabled={isSubmitting || !attachmentFile || !form.supervisorName}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" aria-hidden="true" />
                  Processing Submission...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit Official Requisition
                </>
              )}
            </Button>
            {!attachmentFile && (
              <p className="mt-2.5 text-center text-xs font-medium text-destructive">
                Upload the signed document to submit.
              </p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
