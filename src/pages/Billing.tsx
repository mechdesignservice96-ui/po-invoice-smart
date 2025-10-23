import { useState, useMemo } from 'react';
import { Search, AlertCircle, FileText, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface CustomerBilling {
  customerId: string;
  customerName: string;
  totalInvoices: number;
  billingAmount: number;
  paidAmount: number;
  balanceAmount: number;
  lastInvoiceDate: Date;
  status: 'Paid' | 'Partial' | 'Overdue';
  invoices: any[];
}

const getStatusBadge = (status: 'Paid' | 'Partial' | 'Overdue') => {
  const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }> = {
    Paid: { variant: 'success', label: '✅ Paid' },
    Partial: { variant: 'warning', label: '🟡 Partial' },
    Overdue: { variant: 'destructive', label: '🔴 Overdue' },
  };
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const Billing = () => {
  const { invoices, customers, saleOrders } = useApp();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoicesDialog, setViewInvoicesDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBilling | null>(null);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [reminderCustomer, setReminderCustomer] = useState<CustomerBilling | null>(null);

  // Calculate customer billing data
  const customerBillingData = useMemo(() => {
    const billingMap = new Map<string, CustomerBilling>();

    // First, get all customers from Sale Orders
    saleOrders.forEach(so => {
      if (!billingMap.has(so.customerId)) {
        billingMap.set(so.customerId, {
          customerId: so.customerId,
          customerName: so.customerName,
          totalInvoices: 0,
          billingAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
          lastInvoiceDate: new Date(0),
          status: 'Paid',
          invoices: [],
        });
      }
    });

    // Also add customers from the customers list
    customers.forEach(customer => {
      if (!billingMap.has(customer.id)) {
        billingMap.set(customer.id, {
          customerId: customer.id,
          customerName: customer.name,
          totalInvoices: 0,
          billingAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
          lastInvoiceDate: new Date(0),
          status: 'Paid',
          invoices: [],
        });
      }
    });

    // Aggregate invoice data - Note: Current invoices are vendor-based, not customer-based
    // For this demo, we'll treat vendor invoices as customer invoices
    // In a real scenario, you'd need invoices linked to customers (from sale orders)
    
    // Since invoices are currently vendor-based, let's create customer billing from sale orders
    saleOrders.forEach(so => {
      const billing = billingMap.get(so.customerId);
      if (billing) {
        billing.totalInvoices += 1;
        billing.billingAmount += so.total;
        // Assume partial payment for demo (in real app, track customer payments)
        const assumedPaid = so.status === 'Completed' ? so.total : so.total * 0.5;
        billing.paidAmount += assumedPaid;
        billing.balanceAmount = billing.billingAmount - billing.paidAmount;
        
        if (so.soDate > billing.lastInvoiceDate) {
          billing.lastInvoiceDate = so.soDate;
        }

        billing.invoices.push(so);

        // Determine status
        if (billing.balanceAmount === 0) {
          billing.status = 'Paid';
        } else if (billing.paidAmount > 0) {
          billing.status = 'Partial';
        } else {
          // Check if overdue (30 days from last invoice)
          const daysSinceInvoice = Math.floor((new Date().getTime() - billing.lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          billing.status = daysSinceInvoice > 30 ? 'Overdue' : 'Partial';
        }
      }
    });

    return Array.from(billingMap.values()).filter(b => b.totalInvoices > 0);
  }, [invoices, customers, saleOrders]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCustomers = customerBillingData.length;
    const fullyPaid = customerBillingData.filter(c => c.status === 'Paid').length;
    const partialPayments = customerBillingData.filter(c => c.status === 'Partial').length;
    const overdue = customerBillingData.filter(c => c.status === 'Overdue').length;
    const totalBilling = customerBillingData.reduce((sum, c) => sum + c.billingAmount, 0);

    return {
      totalCustomers,
      fullyPaid,
      partialPayments,
      overdue,
      totalBilling,
    };
  }, [customerBillingData]);

  // Filter customers
  const filteredCustomers = customerBillingData.filter(customer => {
    const matchesSearch = 
      customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleExport = () => {
    const exportData = filteredCustomers.map((customer, index) => ({
      'Sl. No': index + 1,
      'Customer Name': customer.customerName,
      'Total Invoices': customer.totalInvoices,
      'Billing Amount (₹)': customer.billingAmount,
      'Paid Amount (₹)': customer.paidAmount,
      'Balance (₹)': customer.balanceAmount,
      'Last Invoice Date': formatDate(customer.lastInvoiceDate),
      'Status': customer.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Billing Summary');
    XLSX.writeFile(wb, `billing-summary-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Export Successful',
      description: 'Billing summary has been exported to Excel',
    });
  };

  const handleViewInvoices = (customer: CustomerBilling) => {
    setSelectedCustomer(customer);
    setViewInvoicesDialog(true);
  };

  const handleSendReminder = (customer: CustomerBilling) => {
    setReminderCustomer(customer);
    setReminderDialog(true);
  };

  const confirmSendReminder = () => {
    toast({
      title: 'Reminder Sent',
      description: `Payment reminder sent to ${reminderCustomer?.customerName}`,
    });
    setReminderDialog(false);
    setReminderCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Customer-wise billing summary and payment tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully Paid Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.fullyPaid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Partial Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.partialPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Billing Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBilling)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {stats.overdue > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium">
            ⚠️ You have {stats.overdue} overdue customer{stats.overdue > 1 ? 's' : ''} — Immediate action required.
          </span>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing Summary</CardTitle>
              <CardDescription>
                Track customer billing, payments, and outstanding balances
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Sl. No</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-center">Total Invoices</TableHead>
                  <TableHead className="text-right">Billing Amount (₹)</TableHead>
                  <TableHead className="text-right">Paid Amount (₹)</TableHead>
                  <TableHead className="text-right">Balance (₹)</TableHead>
                  <TableHead>Last Invoice Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No billing data found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{customer.customerName}</TableCell>
                      <TableCell className="text-center">{customer.totalInvoices}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.billingAmount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(customer.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(customer.balanceAmount)}
                      </TableCell>
                      <TableCell>{formatDate(customer.lastInvoiceDate)}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoices(customer)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          {customer.balanceAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(customer)}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Remind
                            </Button>
                          )}
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

      {/* View Invoices Dialog */}
      <Dialog open={viewInvoicesDialog} onOpenChange={setViewInvoicesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoices for {selectedCustomer?.customerName}</DialogTitle>
            <DialogDescription>
              All invoices for this customer
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCustomer?.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.soNumber}</TableCell>
                    <TableCell>{formatDate(invoice.soDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'Completed' ? 'success' : 'default'}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <AlertDialog open={reminderDialog} onOpenChange={setReminderDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Payment Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Send a payment reminder to {reminderCustomer?.customerName} for the pending balance of{' '}
              {reminderCustomer && formatCurrency(reminderCustomer.balanceAmount)}?
              <br />
              <br />
              This will send a WhatsApp/Email notification to the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSendReminder}>
              Send Reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Billing;
