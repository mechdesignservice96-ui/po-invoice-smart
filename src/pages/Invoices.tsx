import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { InvoiceStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const getStatusBadge = (status: InvoiceStatus) => {
  const variants: Record<InvoiceStatus, { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }> = {
    Paid: { variant: 'success', label: '✓ Paid' },
    Partial: { variant: 'warning', label: '◐ Partial' },
    Unpaid: { variant: 'default', label: '○ Unpaid' },
    Overdue: { variant: 'destructive', label: '⚠ Overdue' },
  };
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const Invoices = () => {
  const { invoices } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = invoices.filter(
    inv =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Invoices</CardTitle>
              <CardDescription>Track and manage all invoices and payments</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or vendor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Invoice No.</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Invoice Date</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Days Delayed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                      <TableCell className="font-medium text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.vendorName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(inv.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(inv.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(inv.balanceAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-center">
                        {inv.daysDelayed && inv.daysDelayed > 0 ? (
                          <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
                            {inv.daysDelayed} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
