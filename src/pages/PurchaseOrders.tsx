import { useState } from 'react';
import { Plus, Search, Filter, FileDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { POStatus } from '@/types';
import { POFormModal } from '@/components/purchase-orders/POFormModal';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const getStatusBadge = (status: POStatus) => {
  const variants: Record<
    POStatus,
    { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; label: string }
  > = {
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
  const { purchaseOrders, deletePurchaseOrder } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<(typeof purchaseOrders)[0] | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState<string | null>(null);

  const filteredPOs = purchaseOrders.filter(
    po =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary calculations
  const totalPOs = filteredPOs.length;
  const orderedCount = filteredPOs.filter(po => po.status === 'Ordered').length;
  const receivedCount = filteredPOs.filter(po => po.status === 'Received').length;
  const paidCount = filteredPOs.filter(po => po.status === 'Paid' || po.status === 'Completed').length;
  const totalPurchaseValue = filteredPOs.reduce((sum, po) => sum + po.total, 0);

  const handleEdit = (po: (typeof purchaseOrders)[0]) => {
    setSelectedPO(po);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPOToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (poToDelete) {
      deletePurchaseOrder(poToDelete);
      setDeleteDialogOpen(false);
      setPOToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedPO(undefined);
    setIsModalOpen(true);
  };

  const handleExportToExcel = () => {
    if (filteredPOs.length === 0) {
      toast.error('No purchase orders to export');
      return;
    }

    const exportData = filteredPOs.map((po, index) => ({
      'Sl. No': index + 1,
      'PO Number': po.poNumber,
      'PO Date': formatDate(po.poDate),
      'Vendor Name': po.vendorName,
      'Particulars / Items': po.particulars,
      'PO Qty': po.poQty,
      'Basic Amount (₹)': po.basicAmount,
      'GST (%)': po.gstPercent,
      'GST Amount (₹)': po.gstAmount,
      'Total (₹)': po.total,
      'Balance Qty': po.balanceQty,
      Status: po.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit column widths
    const maxWidth = 20;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row]).length)
        ),
        maxWidth
      ),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

    const fileName = `PurchaseOrders_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success('✅ Export successful — file downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total POs</CardDescription>
            <CardTitle className="text-3xl">{totalPOs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ordered</CardDescription>
            <CardTitle className="text-3xl text-primary">{orderedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Received</CardDescription>
            <CardTitle className="text-3xl text-warning">{receivedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-3xl text-success">{paidCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalPurchaseValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Purchase Orders</CardTitle>
              <CardDescription>Manage and track all purchase orders</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportToExcel}>
                <FileDown className="w-4 h-4" />
                Export to Excel
              </Button>
              <Button className="gap-2" onClick={handleAddNew}>
                <Plus className="w-4 h-4" />
                New PO
              </Button>
            </div>
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
                  <TableHead className="font-semibold">Sl. No</TableHead>
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">PO Date</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Particulars</TableHead>
                  <TableHead className="font-semibold text-right">PO Qty</TableHead>
                  <TableHead className="font-semibold text-right">Basic Amount</TableHead>
                  <TableHead className="font-semibold text-right">GST (%)</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Balance Qty</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No purchase orders found. Create your first PO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po, index) => (
                    <TableRow key={po.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{po.poNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(po.poDate)}</TableCell>
                      <TableCell>{po.vendorName}</TableCell>
                      <TableCell className="max-w-xs truncate" title={po.particulars}>
                        {po.particulars}
                      </TableCell>
                      <TableCell className="text-right">{po.poQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(po.basicAmount)}</TableCell>
                      <TableCell className="text-right">{po.gstPercent}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(po.total)}
                      </TableCell>
                      <TableCell className="text-right">{po.balanceQty}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(po)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(po.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PO Form Modal */}
      <POFormModal open={isModalOpen} onOpenChange={setIsModalOpen} po={selectedPO} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseOrders;
