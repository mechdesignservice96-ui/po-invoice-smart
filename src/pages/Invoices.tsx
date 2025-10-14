import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { InvoiceStatus } from '@/types';
import { InvoiceFormModal } from '@/components/invoices/InvoiceFormModal';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const getStatusBadge = (status: InvoiceStatus) => {
  const variants: Record<InvoiceStatus, { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }> = {
    Paid: { variant: 'success', label: '🟢 Paid' },
    Partial: { variant: 'warning', label: '🟠 Partial' },
    Unpaid: { variant: 'default', label: '○ Unpaid' },
    Overdue: { variant: 'destructive', label: '🔴 Overdue' },
  };
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const Invoices = () => {
  const { invoices, deleteInvoice } = useApp();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(
    inv =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.particulars.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice(invoiceToDelete);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleExportToExcel = () => {
    const exportData = filteredInvoices.map((inv, index) => ({
      'Sl. No': index + 1,
      'Invoice No.': inv.invoiceNumber,
      'Invoice Date': formatDate(inv.invoiceDate),
      'Vendor ID': inv.vendorId,
      'Vendor Name': inv.vendorName,
      'PO Number': inv.poNumber || '',
      'PO Date': inv.poDate ? formatDate(inv.poDate) : '',
      'Particulars': inv.particulars,
      'PO Qty': inv.poQty,
      'Qty Dispatched': inv.qtyDispatched,
      'Balance Qty': inv.balanceQty,
      'Basic Amount (₹)': inv.basicAmount,
      'GST (%)': inv.gstPercent,
      'GST Amount (₹)': inv.gstAmount,
      'Transportation Cost (₹)': inv.transportationCost,
      'Total Cost (₹)': inv.totalCost,
      'Amount Received (₹)': inv.amountReceived,
      'Pending Amount (₹)': inv.pendingAmount,
      'Status': inv.status,
      'Due Date': formatDate(inv.dueDate),
      'Days Delayed': inv.daysDelayed || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    const today = new Date();
    const filename = `Invoices_Report_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(workbook, filename);

    toast({
      title: '✅ Export Successful',
      description: 'Invoice report has been downloaded.',
    });
  };

  // Calculate summary stats
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Partial').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;
  const totalReceivable = invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{paidInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivable)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueInvoices > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium">
            🔔 {overdueInvoices} Overdue Invoice{overdueInvoices > 1 ? 's' : ''} — Immediate action required
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Invoices</CardTitle>
              <CardDescription>Track, Create, and Manage Purchase Order-Linked Invoices</CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="gap-2" onClick={handleExportToExcel}>
                      <Download className="w-4 h-4" />
                      Export to Excel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download invoice report as Excel file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button className="gap-2" onClick={() => {
                setSelectedInvoice(null);
                setIsModalOpen(true);
              }}>
                <Plus className="w-4 h-4" />
                New Invoice
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
                placeholder="Search by invoice number, vendor, or particulars..."
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
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Sl. No</TableHead>
                  <TableHead className="font-semibold">Invoice No.</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Vendor ID</TableHead>
                  <TableHead className="font-semibold">Vendor Name</TableHead>
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">PO Date</TableHead>
                  <TableHead className="font-semibold">Particulars</TableHead>
                  <TableHead className="font-semibold text-right">PO Qty</TableHead>
                  <TableHead className="font-semibold text-right">Dispatched</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold text-right">Basic (₹)</TableHead>
                  <TableHead className="font-semibold text-right">GST %</TableHead>
                  <TableHead className="font-semibold text-right">Transport (₹)</TableHead>
                  <TableHead className="font-semibold text-right">Total (₹)</TableHead>
                  <TableHead className="font-semibold text-right">Received (₹)</TableHead>
                  <TableHead className="font-semibold text-right">Pending (₹)</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-center">Days Delayed</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={21} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv, index) => (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium text-primary cursor-pointer hover:underline">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell>{inv.vendorId}</TableCell>
                      <TableCell>{inv.vendorName}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.poNumber || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.poDate ? formatDate(inv.poDate) : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{inv.particulars}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{inv.particulars}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">{inv.poQty}</TableCell>
                      <TableCell className="text-right">{inv.qtyDispatched}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {inv.balanceQty}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.basicAmount)}</TableCell>
                      <TableCell className="text-right">{inv.gstPercent}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.transportationCost)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(inv.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(inv.amountReceived)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(inv.pendingAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-center">
                        {inv.daysDelayed && inv.daysDelayed > 0 ? (
                          <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
                            {inv.daysDelayed} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(inv)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(inv.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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

      <InvoiceFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Invoices;
