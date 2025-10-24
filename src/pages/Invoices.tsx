import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Filter, Download, FileUp, Edit, Trash2, AlertCircle, ChevronDown, ChevronRight, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { InvoiceStatus } from '@/types';
import { InvoiceFormModal } from '@/components/invoices/InvoiceFormModal';
import { ShareInvoiceModal } from '@/components/invoices/ShareInvoiceModal';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const { invoices, deleteInvoice, addInvoice, vendors } = useApp();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [invoiceToShare, setInvoiceToShare] = useState<any>(null);
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Read vendor filter from URL params
  useEffect(() => {
    const vendorId = searchParams.get('vendor');
    if (vendorId) {
      setVendorFilter(vendorId);
    }
  }, [searchParams]);

  const clearVendorFilter = () => {
    setVendorFilter(null);
    searchParams.delete('vendor');
    setSearchParams(searchParams);
  };

  const toggleRowExpansion = (invoiceId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.lineItems && inv.lineItems.some(item => item.particulars.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesVendor = !vendorFilter || inv.vendorId === vendorFilter;
    
    // Column-based filter
    let matchesColumnFilter = true;
    if (filterColumn && filterValue) {
      const lowerFilterValue = filterValue.toLowerCase();
      switch (filterColumn) {
        case 'invoiceNumber':
          matchesColumnFilter = inv.invoiceNumber.toLowerCase().includes(lowerFilterValue);
          break;
        case 'date':
          matchesColumnFilter = formatDate(inv.invoiceDate).toLowerCase().includes(lowerFilterValue);
          break;
        case 'vendorName':
          matchesColumnFilter = inv.vendorName.toLowerCase().includes(lowerFilterValue);
          break;
        case 'poNumber':
          matchesColumnFilter = (inv.poNumber || '').toLowerCase().includes(lowerFilterValue);
          break;
        case 'poDate':
          matchesColumnFilter = inv.poDate ? formatDate(inv.poDate).toLowerCase().includes(lowerFilterValue) : false;
          break;
        case 'items':
          matchesColumnFilter = inv.lineItems?.some(item => 
            item.particulars.toLowerCase().includes(lowerFilterValue)
          ) || false;
          break;
        case 'total':
          matchesColumnFilter = formatCurrency(inv.totalCost).toLowerCase().includes(lowerFilterValue);
          break;
        case 'received':
          matchesColumnFilter = formatCurrency(inv.amountReceived).toLowerCase().includes(lowerFilterValue);
          break;
        case 'pending':
          matchesColumnFilter = formatCurrency(inv.pendingAmount).toLowerCase().includes(lowerFilterValue);
          break;
        case 'status':
          matchesColumnFilter = inv.status.toLowerCase().includes(lowerFilterValue);
          break;
        case 'dueDate':
          matchesColumnFilter = formatDate(inv.dueDate).toLowerCase().includes(lowerFilterValue);
          break;
      }
    }
    
    return matchesSearch && matchesVendor && matchesColumnFilter;
  });

  const getFilteredVendorName = () => {
    if (!vendorFilter) return '';
    const vendor = vendors.find(v => v.id === vendorFilter);
    return vendor?.name || '';
  };

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

  const handleShare = (invoice: any) => {
    setInvoiceToShare(invoice);
    setShareModalOpen(true);
  };

  const clearColumnFilter = () => {
    setFilterColumn('');
    setFilterValue('');
  };

  const columnOptions = [
    { value: 'invoiceNumber', label: 'Invoice Number' },
    { value: 'date', label: 'Date' },
    { value: 'vendorName', label: 'Vendor Name' },
    { value: 'poNumber', label: 'PO Number' },
    { value: 'poDate', label: 'PO Date' },
    { value: 'items', label: 'Items' },
    { value: 'total', label: 'Total (₹)' },
    { value: 'received', label: 'Received (₹)' },
    { value: 'pending', label: 'Pending (₹)' },
    { value: 'status', label: 'Status' },
    { value: 'dueDate', label: 'Due Date' },
  ];

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Sl. No': 'INV-001',
        'Invoice No.': 'INV-2025-001',
        'Invoice Date': '2025-01-22',
        'Vendor Name': 'Sample Vendor Ltd',
        'PO Number': 'PO-2025-001',
        'PO Date': '2025-01-20',
        'GST (%)': 18,
        'Transportation Cost (₹)': 1000,
        'Discount (₹)': 500,
        'Particulars': 'Sample Item 1 - Product Description',
        'Qty Dispatched': 100,
        'Basic Amount (₹)': 50000,
        'GST Amount (₹)': 9000,
        'Line Total (₹)': 59000,
        'Total Cost (₹)': 120000,
        'Amount Received (₹)': 60000,
        'Pending Amount (₹)': 60000,
        'Status': 'Partial',
        'Due Date': '2025-02-22',
      },
      {
        'Sl. No': '',
        'Invoice No.': '',
        'Invoice Date': '',
        'Vendor Name': '',
        'PO Number': '',
        'PO Date': '',
        'GST (%)': '',
        'Transportation Cost (₹)': '',
        'Discount (₹)': '',
        'Particulars': 'Sample Item 2 - Another Product',
        'Qty Dispatched': 50,
        'Basic Amount (₹)': 50000,
        'GST Amount (₹)': 9000,
        'Line Total (₹)': 59000,
        'Total Cost (₹)': '',
        'Amount Received (₹)': '',
        'Pending Amount (₹)': '',
        'Status': '',
        'Due Date': '',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
      { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    XLSX.writeFile(workbook, 'Invoices_Import_Template.xlsx');

    toast({
      title: '✅ Template Downloaded',
      description: 'Use this format for importing invoices. Multiple line items share the same invoice number.',
    });
  };

  const handleExportToExcel = () => {
    const exportData = filteredInvoices.flatMap((inv) => 
      (inv.lineItems || []).map((item, itemIndex) => ({
        'Sl. No': itemIndex === 0 ? `INV-${inv.invoiceNumber}` : '',
        'Invoice No.': itemIndex === 0 ? inv.invoiceNumber : '',
        'Invoice Date': itemIndex === 0 ? formatDate(inv.invoiceDate) : '',
        'Vendor Name': itemIndex === 0 ? inv.vendorName : '',
        'PO Number': itemIndex === 0 ? (inv.poNumber || '') : '',
        'PO Date': itemIndex === 0 ? (inv.poDate ? formatDate(inv.poDate) : '') : '',
        'GST (%)': itemIndex === 0 ? inv.gstPercent : '',
        'Transportation Cost (₹)': itemIndex === 0 ? inv.transportationCost : '',
        'Discount (₹)': itemIndex === 0 ? inv.discount : '',
        'Particulars': item.particulars,
        'Qty Dispatched': item.qtyDispatched,
        'Basic Amount (₹)': item.basicAmount,
        'GST Amount (₹)': item.gstAmount,
        'Line Total (₹)': item.lineTotal,
        'Total Cost (₹)': itemIndex === 0 ? inv.totalCost : '',
        'Amount Received (₹)': itemIndex === 0 ? inv.amountReceived : '',
        'Pending Amount (₹)': itemIndex === 0 ? inv.pendingAmount : '',
        'Status': itemIndex === 0 ? inv.status : '',
        'Due Date': itemIndex === 0 ? formatDate(inv.dueDate) : '',
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
      { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }
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
          toast({ title: 'Error', description: 'No data found in the Excel file', variant: 'destructive' });
          return;
        }

        // Group line items by invoice
        const invoiceMap = new Map<string, any>();
        
        jsonData.forEach((row: any) => {
          const invoiceNumber = row['Invoice No.'];
          if (!invoiceNumber) return;

          if (!invoiceMap.has(invoiceNumber)) {
            invoiceMap.set(invoiceNumber, {
              header: row,
              lineItems: []
            });
          }

          // Add line item if particulars exist
          if (row['Particulars']) {
            invoiceMap.get(invoiceNumber).lineItems.push(row);
          }
        });

        let importedCount = 0;
        let errorCount = 0;

        invoiceMap.forEach((invoice) => {
          try {
            const header = invoice.header;
            
            // Validate required fields
            if (!header['Vendor Name'] || !header['Invoice Date'] || invoice.lineItems.length === 0) {
              errorCount++;
              return;
            }

            const gstPercent = Number(header['GST (%)']) || 18;
            const transportationCost = Number(header['Transportation Cost (₹)']) || 0;
            const discount = Number(header['Discount (₹)']) || 0;

            const lineItems = invoice.lineItems.map((item: any, index: number) => {
              const basicAmount = Number(item['Basic Amount (₹)']) || 0;
              const gstAmount = (basicAmount * gstPercent) / 100;
              const lineTotal = basicAmount + gstAmount;
              
              return {
                id: `item-${Date.now()}-${index}`,
                particulars: String(item['Particulars']),
                qtyDispatched: Number(item['Qty Dispatched']) || 0,
                basicAmount,
                gstAmount,
                lineTotal,
              };
            });

            const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
            const totalCost = subtotal + transportationCost - discount;

            const invoiceDate = new Date(header['Invoice Date']);
            const poDate = header['PO Date'] ? new Date(header['PO Date']) : undefined;
            const dueDate = header['Due Date'] ? new Date(header['Due Date']) : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

            addInvoice({
              vendorId: 'V1',
              vendorName: String(header['Vendor Name']),
              invoiceDate,
              poNumber: header['PO Number'] || undefined,
              poDate,
              lineItems,
              gstPercent,
              transportationCost,
              discount,
              totalCost: Number(header['Total Cost (₹)']) || totalCost,
              amountReceived: Number(header['Amount Received (₹)']) || 0,
              pendingAmount: Number(header['Pending Amount (₹)']) || 0,
              status: ['Paid', 'Partial', 'Unpaid', 'Overdue'].includes(header['Status']) ? header['Status'] : 'Unpaid',
              dueDate,
            });

            importedCount++;
          } catch (error) {
            console.error('Error importing invoice:', error);
            errorCount++;
          }
        });

        if (importedCount > 0) {
          toast({ title: 'Success', description: `Successfully imported ${importedCount} invoice${importedCount > 1 ? 's' : ''}` });
        }
        if (errorCount > 0) {
          toast({ title: 'Warning', description: `${errorCount} row${errorCount > 1 ? 's' : ''} skipped due to missing or invalid data`, variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast({ title: 'Error', description: 'Failed to import Excel file. Please check the file format.', variant: 'destructive' });
      }
    };

    reader.onerror = () => {
      toast({ title: 'Error', description: 'Failed to read the file', variant: 'destructive' });
    };

    reader.readAsBinaryString(file);
    
    if (event.target) {
      event.target.value = '';
    }
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
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="w-4 h-4" />
                      <span className="hidden md:inline">Download Template</span>
                      <span className="md:hidden">Template</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download Excel template for importing</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleImportClick}>
                      <FileUp className="w-4 h-4" />
                      <span className="hidden md:inline">Import from Excel</span>
                      <span className="md:hidden">Import</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Import invoices from Excel file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                      <Download className="w-4 h-4" />
                      <span className="hidden md:inline">Export to Excel</span>
                      <span className="md:hidden">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download invoice report as Excel file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="sm" onClick={() => {
                setSelectedInvoice(null);
                setIsModalOpen(true);
              }}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Invoice</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, vendor, or particulars..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-background z-50" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Filter by Column</h4>
                      <Select value={filterColumn} onValueChange={setFilterColumn}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {columnOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {filterColumn && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Value</label>
                        <Input
                          placeholder={`Enter ${columnOptions.find(c => c.value === filterColumn)?.label}...`}
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearColumnFilter}
                        className="flex-1"
                      >
                        Clear
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => setFilterOpen(false)}
                        className="flex-1"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Filter Badges */}
            {(vendorFilter || (filterColumn && filterValue)) && (
              <div className="flex items-center gap-2 flex-wrap">
                {vendorFilter && (
                  <Badge variant="secondary" className="text-sm gap-2">
                    Vendor: {getFilteredVendorName()}
                    <button onClick={clearVendorFilter} className="hover:bg-muted rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filterColumn && filterValue && (
                  <Badge variant="secondary" className="text-sm gap-2">
                    {columnOptions.find(c => c.value === filterColumn)?.label}: {filterValue}
                    <button onClick={clearColumnFilter} className="hover:bg-muted rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-semibold">Sl. No</TableHead>
                    <TableHead className="font-semibold">Invoice No.</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Vendor Name</TableHead>
                    <TableHead className="font-semibold">PO Number</TableHead>
                    <TableHead className="font-semibold">PO Date</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold text-right">Total (₹)</TableHead>
                    <TableHead className="font-semibold text-right">Received (₹)</TableHead>
                    <TableHead className="font-semibold text-right">Pending (₹)</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv, index) => (
                    <>
                      <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRowExpansion(inv.id)}
                          >
                            {expandedRows.has(inv.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium text-primary cursor-pointer hover:underline">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(inv.invoiceDate)}</TableCell>
                        <TableCell>{inv.vendorName}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.poNumber || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.poDate ? formatDate(inv.poDate) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{(inv.lineItems || []).length} item(s)</Badge>
                        </TableCell>
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
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleShare(inv)}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Share Invoice</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                      
                      {/* Expanded Line Items */}
                      {expandedRows.has(inv.id) && inv.lineItems && inv.lineItems.length > 0 && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={14} className="p-0">
                            <div className="px-6 py-4">
                              <div className="mb-4 p-4 bg-background rounded-lg border">
                                <h4 className="text-sm font-semibold mb-3">Invoice Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">GST Rate:</span>
                                    <div className="font-semibold text-lg">{inv.gstPercent}%</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total GST:</span>
                                    <div className="font-semibold text-lg">{formatCurrency(inv.lineItems.reduce((sum, item) => sum + item.gstAmount, 0))}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Transportation:</span>
                                    <div className="font-semibold text-lg">{formatCurrency(inv.transportationCost)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Discount:</span>
                                    <div className="font-semibold text-lg text-green-600">{formatCurrency(inv.discount)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Invoice Total:</span>
                                    <div className="font-semibold text-lg text-primary">{formatCurrency(inv.totalCost)}</div>
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
                                      <TableHead className="font-semibold text-right">Dispatched</TableHead>
                                      <TableHead className="font-semibold text-right">Basic (₹)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {inv.lineItems.map((item, itemIndex) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">{itemIndex + 1}</TableCell>
                                        <TableCell className="max-w-[300px]">{item.particulars}</TableCell>
                                        <TableCell className="text-right">{item.qtyDispatched}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.basicAmount)}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

      <ShareInvoiceModal
        open={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setInvoiceToShare(null);
        }}
        invoice={invoiceToShare}
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
