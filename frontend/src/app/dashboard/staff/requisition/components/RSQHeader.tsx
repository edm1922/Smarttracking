'use client';

import React from 'react';
import { ClipboardList, Printer, Users, Package, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface RSQHeaderProps {
  onPrintBlank: () => void;
  employeeCount: number;
  productCount: number;
  totalQuantity: number;
}

export const RSQHeader: React.FC<RSQHeaderProps> = ({
  onPrintBlank,
  employeeCount,
  productCount,
  totalQuantity,
}) => {
  const stats = [
    { label: 'Employees', value: employeeCount, icon: Users, color: 'text-blue-600' },
    { label: 'Products', value: productCount, icon: Package, color: 'text-emerald-600' },
    { label: 'Qty', value: totalQuantity, icon: Hash, color: 'text-violet-600' },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="no-print mb-4"
    >
      <Card>
        <CardContent className="py-2.5 px-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardList className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">
                  Requisition Workspace
                </h1>
                <Badge variant="secondary" className="text-[9px] font-semibold px-1 py-0 h-4 uppercase tracking-wider">
                  Staff Request
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Build signed material requests: set details, tag staff, assign materials, and submit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5 px-1.5 py-0.5">
                  <stat.icon className={`h-3 w-3 ${stat.color}`} aria-hidden="true" />
                  <div className="text-left">
                    <p className="text-xs font-bold tabular-nums text-foreground leading-none">{stat.value}</p>
                    <p className="text-[8px] font-medium text-muted-foreground leading-none mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={onPrintBlank} size="sm" className="h-8 text-xs font-semibold px-3">
              <Printer className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Blank Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.header>
  );
};

