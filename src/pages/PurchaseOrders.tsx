import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { POStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const getStatusBadge = (status: POStatus) => {
  const variants: Record<POStatus, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    Created: { variant: 'secondary', label: 'Created' },
    Ordered: { variant: 'default', label: 'Ordered' },
    Received: { variant: 'warning', label: 'Received' },
    Paid: { variant: 'success', label: 'Paid' },
    Completed: { variant: 'success', label: 'Completed' },
  };
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const PurchaseOrders = () => {
  const { purchaseOrders } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPOs = purchaseOrders.filter(
    po =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Purchase Orders</CardTitle>
              <CardDescription>Manage and track all purchase orders</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New PO
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by PO number or vendor..."
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
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">PO Date</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-right">Advance Paid</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No purchase orders found. Create your first PO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map(po => (
                    <TableRow key={po.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                      <TableCell className="font-medium text-primary">{po.poNumber}</TableCell>
                      <TableCell>{po.vendorName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(po.poDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(po.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(po.advancePaid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(po.balanceAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
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

export default PurchaseOrders;
