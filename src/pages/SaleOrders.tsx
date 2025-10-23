import { useState, useRef } from 'react';
import { Plus, Search, Filter, FileDown, FileUp, Edit, Trash2, ExternalLink, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
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
  const { saleOrders, deleteSaleOrder, addSaleOrder, customers, addInvoice, vendors } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<(typeof saleOrders)[0] | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [soToDelete, setSOToDelete] = useState<string | null>(null);
  const [createInvoiceDialogOpen, setCreateInvoiceDialogOpen] = useState(false);
  const [soForInvoice, setSOForInvoice] = useState<(typeof saleOrders)[0] | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Get customer info
  const getCustomerInfo = (customerId: string) => {
    return customers.find(c => c.id === customerId);
  };

  const toggleRowExpansion = (soId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(soId)) {
      newExpanded.delete(soId);
    } else {
      newExpanded.add(soId);
    }
    setExpandedRows(newExpanded);
  };

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

  const handleCreateInvoice = (so: (typeof saleOrders)[0]) => {
    setSOForInvoice(so);
    setCreateInvoiceDialogOpen(true);
  };

  const confirmCreateInvoice = () => {
    if (!soForInvoice) return;

    // Use the first vendor as default (in a real app, you'd select this)
    const defaultVendor = vendors[0];
    if (!defaultVendor) {
      toast.error('Please add at least one vendor first');
      return;
    }

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice from SO with matching line items
    addInvoice({
      invoiceDate: new Date(),
      vendorId: defaultVendor.id,
      vendorName: defaultVendor.name,
      poNumber: soForInvoice.poNumber,
      poDate: soForInvoice.poDate,
      lineItems: soForInvoice.lineItems.map(item => ({
        id: `inv-${item.id}`,
        particulars: item.particulars,
        poQty: item.soQty,
        qtyDispatched: item.qtyDispatched,
        balanceQty: item.balanceQty,
        basicAmount: item.basicAmount,
        gstAmount: item.gstAmount,
        lineTotal: item.lineTotal,
      })),
      gstPercent: soForInvoice.lineItems[0]?.gstPercent || 18,
      transportationCost: 0,
      totalCost: soForInvoice.total,
      amountReceived: 0,
      pendingAmount: soForInvoice.total,
      status: 'Unpaid',
      dueDate,
      poId: soForInvoice.id,
    });

    toast.success(`Invoice created from ${soForInvoice.soNumber}`);
    setCreateInvoiceDialogOpen(false);
    setSOForInvoice(null);
    
    // Navigate to invoices page
    navigate('/invoices');
  };

  const handleAddNew = () => {
    setSelectedSO(undefined);
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Sl. No': 1,
      'SO Number': 'SO-2025-001',
      'SO Date': '2025-01-22',
      'Customer Name': 'Sample Customer Ltd',
      'Particulars / Items': 'Sample Product or Service Description',
      'SO Qty': 10,
      'Basic Amount (₹)': 100000,
      'GST (%)': 18,
      'GST Amount (₹)': 18000,
      'Total (₹)': 118000,
      'Balance Qty': 10,
      'Status': 'Draft',
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    const maxWidth = 20;
    const colWidths = Object.keys(templateData[0]).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...templateData.map(row => String(row[key as keyof typeof row]).length)
        ),
        maxWidth
      ),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sale Orders');

    XLSX.writeFile(workbook, 'SaleOrders_Import_Template.xlsx');

    toast.success('✅ Template downloaded — use this format for importing');
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('No data found in the Excel file');
          return;
        }

        let importedCount = 0;
        let errorCount = 0;

        jsonData.forEach((row: any) => {
          try {
            // Validate required fields
            if (!row['Customer Name'] || !row['Particulars / Items'] || !row['SO Qty'] || !row['Basic Amount (₹)']) {
              errorCount++;
              return;
            }

            // Parse date
            let soDate = new Date();
            if (row['SO Date']) {
              const parsedDate = new Date(row['SO Date']);
              if (!isNaN(parsedDate.getTime())) {
                soDate = parsedDate;
              }
            }

            // Calculate values
            const basicAmount = Number(row['Basic Amount (₹)']) || 0;
            const gstPercent = Number(row['GST (%)']) || 18;
            const gstAmount = (basicAmount * gstPercent) / 100;
            const total = basicAmount + gstAmount;
            const soQty = Number(row['SO Qty']) || 1;
            const balanceQty = row['Balance Qty'] !== undefined ? Number(row['Balance Qty']) : soQty;

            // Validate status
            const status = ['Draft', 'Confirmed', 'Dispatched', 'Delivered', 'Completed'].includes(row['Status'])
              ? row['Status']
              : 'Draft';

            addSaleOrder({
              customerId: 'C1', // Default customer ID
              customerName: String(row['Customer Name']),
              soDate,
              lineItems: [
                {
                  id: `item-${Date.now()}-${Math.random()}`,
                  particulars: String(row['Particulars / Items']),
                  soQty,
                  qtyDispatched: soQty - balanceQty,
                  balanceQty,
                  basicAmount,
                  gstPercent,
                  gstAmount,
                  lineTotal: total,
                },
              ],
              total,
              status,
              notes: row['Notes'] || '',
            });

            importedCount++;
          } catch (error) {
            console.error('Error importing row:', error);
            errorCount++;
          }
        });

        if (importedCount > 0) {
          toast.success(`✅ Successfully imported ${importedCount} sale order${importedCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          toast.warning(`⚠️ ${errorCount} row${errorCount > 1 ? 's' : ''} skipped due to missing or invalid data`);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to import Excel file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file');
    };

    reader.readAsBinaryString(file);
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
              />
              <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
                <FileDown className="w-4 h-4" />
                Download Template
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleImportClick}>
                <FileUp className="w-4 h-4" />
                Import from Excel
              </Button>
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold">Sl. No</TableHead>
                  <TableHead className="font-semibold">SO Number</TableHead>
                  <TableHead className="font-semibold">SO Date</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">PO Date</TableHead>
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="font-semibold text-right">Qty Ordered</TableHead>
                  <TableHead className="font-semibold text-right">Qty Dispatched</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold text-right">Total Value</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      No sale orders found. Create your first SO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSOs.map((so, index) => {
                    const customer = getCustomerInfo(so.customerId);
                    const totalQtyOrdered = so.lineItems.reduce((sum, item) => sum + item.soQty, 0);
                    const totalQtyDispatched = so.lineItems.reduce((sum, item) => sum + item.qtyDispatched, 0);
                    const totalBalance = so.lineItems.reduce((sum, item) => sum + item.balanceQty, 0);
                    
                    return (
                      <>
                        <TableRow key={so.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleRowExpansion(so.id)}
                            >
                              {expandedRows.has(so.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium text-primary">{so.soNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(so.soDate)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{so.customerName}</span>
                              {customer && (
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {so.poNumber || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {so.poDate ? formatDate(so.poDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {so.lineItems.length} item{so.lineItems.length !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{totalQtyOrdered}</TableCell>
                          <TableCell className="text-right font-medium text-primary">{totalQtyDispatched}</TableCell>
                          <TableCell className="text-right font-medium text-warning">
                            {totalBalance > 0 ? totalBalance : '✓'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(so.total)}
                          </TableCell>
                          <TableCell>{getStatusBadge(so.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(so)}
                                className="h-8 w-8"
                                title="Edit SO"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCreateInvoice(so)}
                                className="h-8 w-8 text-success hover:text-success"
                                title="Create Invoice"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(so.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete SO"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Line Items */}
                        {expandedRows.has(so.id) && so.lineItems && so.lineItems.length > 0 && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={14} className="p-0">
                              <div className="px-6 py-4">
                                <div className="mb-4 p-4 bg-background rounded-lg border">
                                  <h4 className="text-sm font-semibold mb-3">Sale Order Summary</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Total Items:</span>
                                      <div className="font-semibold text-lg">{so.lineItems.length}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Total Quantity:</span>
                                      <div className="font-semibold text-lg">{totalQtyOrdered}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Dispatched:</span>
                                      <div className="font-semibold text-lg text-primary">{totalQtyDispatched}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">SO Total:</span>
                                      <div className="font-semibold text-lg text-primary">{formatCurrency(so.total)}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <h4 className="text-sm font-semibold mb-3">Line Items Details</h4>
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted">
                                        <TableHead className="font-semibold">Item #</TableHead>
                                        <TableHead className="font-semibold">Particulars</TableHead>
                                        <TableHead className="font-semibold text-right">SO Qty</TableHead>
                                        <TableHead className="font-semibold text-right">Dispatched</TableHead>
                                        <TableHead className="font-semibold text-right">Balance</TableHead>
                                        <TableHead className="font-semibold text-right">Basic (₹)</TableHead>
                                        <TableHead className="font-semibold text-right">GST %</TableHead>
                                        <TableHead className="font-semibold text-right">GST (₹)</TableHead>
                                        <TableHead className="font-semibold text-right">Total (₹)</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {so.lineItems.map((item, itemIndex) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-medium">{itemIndex + 1}</TableCell>
                                          <TableCell className="max-w-[300px]">{item.particulars}</TableCell>
                                          <TableCell className="text-right">{item.soQty}</TableCell>
                                          <TableCell className="text-right text-primary">{item.qtyDispatched}</TableCell>
                                          <TableCell className="text-right font-semibold text-warning">
                                            {item.balanceQty}
                                          </TableCell>
                                          <TableCell className="text-right">{formatCurrency(item.basicAmount)}</TableCell>
                                          <TableCell className="text-right">{item.gstPercent}%</TableCell>
                                          <TableCell className="text-right">{formatCurrency(item.gstAmount)}</TableCell>
                                          <TableCell className="text-right font-semibold">{formatCurrency(item.lineTotal)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
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

      {/* Create Invoice Confirmation Dialog */}
      <AlertDialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Invoice from Sale Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new invoice based on {soForInvoice?.soNumber}. The invoice will include all line items and quantities from the sale order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateInvoice}>Create Invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SaleOrders;
