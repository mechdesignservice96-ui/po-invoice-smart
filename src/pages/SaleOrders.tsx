import { useState } from 'react';
import { Plus, Search, Filter, FileDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { SOStatus } from '@/types';
import { SOFormModal } from '@/components/sale-orders/SOFormModal';
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

const getStatusBadge = (status: SOStatus) => {
  const variants: Record<
    SOStatus,
    { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; label: string }
  > = {
    Draft: { variant: 'secondary', label: 'Draft' },
    Confirmed: { variant: 'default', label: 'Confirmed' },
    Dispatched: { variant: 'warning', label: 'Dispatched' },
    Delivered: { variant: 'success', label: 'Delivered' },
    Completed: { variant: 'success', label: 'Completed' },
  };
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const SaleOrders = () => {
  const { saleOrders, deleteSaleOrder } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<(typeof saleOrders)[0] | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [soToDelete, setSOToDelete] = useState<string | null>(null);

  const filteredSOs = saleOrders.filter(
    so =>
      so.soNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      so.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary calculations
  const totalSOs = filteredSOs.length;
  const confirmedCount = filteredSOs.filter(so => so.status === 'Confirmed').length;
  const dispatchedCount = filteredSOs.filter(so => so.status === 'Dispatched').length;
  const deliveredCount = filteredSOs.filter(so => so.status === 'Delivered' || so.status === 'Completed').length;
  const totalSalesValue = filteredSOs.reduce((sum, so) => sum + so.total, 0);

  const handleEdit = (so: (typeof saleOrders)[0]) => {
    setSelectedSO(so);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSOToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (soToDelete) {
      deleteSaleOrder(soToDelete);
      setDeleteDialogOpen(false);
      setSOToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedSO(undefined);
    setIsModalOpen(true);
  };

  const handleExportToExcel = () => {
    if (filteredSOs.length === 0) {
      toast.error('No sale orders to export');
      return;
    }

    const exportData = filteredSOs.map((so, index) => ({
      'Sl. No': index + 1,
      'SO Number': so.soNumber,
      'SO Date': formatDate(so.soDate),
      'Customer Name': so.customerName,
      'Particulars / Items': so.particulars,
      'SO Qty': so.soQty,
      'Basic Amount (₹)': so.basicAmount,
      'GST (%)': so.gstPercent,
      'GST Amount (₹)': so.gstAmount,
      'Total (₹)': so.total,
      'Balance Qty': so.balanceQty,
      Status: so.status,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sale Orders');

    const fileName = `SaleOrders_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success('✅ Export successful — file downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total SOs</CardDescription>
            <CardTitle className="text-3xl">{totalSOs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Confirmed</CardDescription>
            <CardTitle className="text-3xl text-primary">{confirmedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Dispatched</CardDescription>
            <CardTitle className="text-3xl text-warning">{dispatchedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Delivered</CardDescription>
            <CardTitle className="text-3xl text-success">{deliveredCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalSalesValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Sale Orders</CardTitle>
              <CardDescription>Manage and track all sale orders to customers</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportToExcel}>
                <FileDown className="w-4 h-4" />
                Export to Excel
              </Button>
              <Button className="gap-2" onClick={handleAddNew}>
                <Plus className="w-4 h-4" />
                New SO
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
                placeholder="Search by SO number or customer..."
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
                  <TableHead className="font-semibold">SO Number</TableHead>
                  <TableHead className="font-semibold">SO Date</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Particulars</TableHead>
                  <TableHead className="font-semibold text-right">SO Qty</TableHead>
                  <TableHead className="font-semibold text-right">Basic Amount</TableHead>
                  <TableHead className="font-semibold text-right">GST (%)</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Balance Qty</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No sale orders found. Create your first SO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSOs.map((so, index) => (
                    <TableRow key={so.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{so.soNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(so.soDate)}</TableCell>
                      <TableCell>{so.customerName}</TableCell>
                      <TableCell className="max-w-xs truncate" title={so.particulars}>
                        {so.particulars}
                      </TableCell>
                      <TableCell className="text-right">{so.soQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(so.basicAmount)}</TableCell>
                      <TableCell className="text-right">{so.gstPercent}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(so.total)}
                      </TableCell>
                      <TableCell className="text-right">{so.balanceQty}</TableCell>
                      <TableCell>{getStatusBadge(so.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(so)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(so.id)}
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

      {/* SO Form Modal */}
      <SOFormModal open={isModalOpen} onOpenChange={setIsModalOpen} so={selectedSO} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sale order. This action cannot be undone.
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

export default SaleOrders;
