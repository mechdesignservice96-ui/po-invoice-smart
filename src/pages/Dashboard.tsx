import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, FileText, Clock, Database } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { InvoiceStatus } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  sampleCustomers, 
  sampleVendors, 
  generateSampleSaleOrders, 
  generateSampleInvoices, 
  sampleExpenses 
} from '@/utils/sampleData';

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

const Dashboard = () => {
  const { 
    dashboardStats, 
    invoices, 
    saleOrders, 
    customers, 
    vendors,
    addCustomer,
    addVendor,
    addSaleOrder,
    addInvoice,
    addExpense
  } = useApp();
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const hasNoData = customers.length === 0 && vendors.length === 0 && saleOrders.length === 0 && invoices.length === 0;

  const handleLoadSampleData = async () => {
    setIsLoadingSample(true);
    try {
      // Add customers
      for (const customer of sampleCustomers) {
        await addCustomer(customer);
      }

      // Add vendors
      for (const vendor of sampleVendors) {
        await addVendor(vendor);
      }

      // Wait for data to propagate
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate and add sale orders
      const newCustomers = customers.length > 0 ? customers.slice(-4) : [];
      const sampleSOs = generateSampleSaleOrders(newCustomers.length > 0 ? newCustomers : customers);
      for (const so of sampleSOs) {
        await addSaleOrder(so);
      }

      // Generate and add invoices
      const newVendors = vendors.length > 0 ? vendors.slice(-3) : [];
      const sampleInvs = generateSampleInvoices(newVendors.length > 0 ? newVendors : vendors);
      for (const inv of sampleInvs) {
        await addInvoice(inv);
      }

      // Add expenses
      for (const expense of sampleExpenses) {
        await addExpense(expense);
      }

      toast.success('Sample data loaded successfully! Added 4 customers, 3 vendors, 4 sale orders, 3 invoices, and 7 expenses.');
    } catch (error) {
      console.error('Error loading sample data:', error);
      toast.error('Failed to load sample data');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Get recent overdue invoices
  const overdueInvoices = invoices
    .filter(inv => inv.status === 'Overdue')
    .sort((a, b) => (b.daysDelayed || 0) - (a.daysDelayed || 0))
    .slice(0, 5);

  // Chart data - monthly SO vs Paid
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const soAmount = saleOrders
        .filter(so => new Date(so.soDate).toLocaleString('default', { month: 'short' }) === month)
        .reduce((sum, so) => sum + so.total, 0);

      const paidAmount = invoices
        .filter(inv => new Date(inv.invoiceDate).toLocaleString('default', { month: 'short' }) === month)
        .reduce((sum, inv) => sum + inv.amountReceived, 0);

      return {
        month,
        'SO Value': soAmount,
        'Paid Amount': paidAmount,
      };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* No Data - Sample Data Card */}
      {hasNoData && (
        <Card className="border-primary/50 bg-primary/5 animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Database className="w-5 h-5" />
              Welcome to Finance Suite!
            </CardTitle>
            <CardDescription>
              Get started by loading sample data to explore all features including customers, vendors, sale orders, invoices, and expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleLoadSampleData}
              disabled={isLoadingSample}
              size="lg"
            >
              {isLoadingSample ? (
                <>Loading Sample Data...</>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Load Sample Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total SO Value"
          value={formatCurrency(dashboardStats.totalPOValue)}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(dashboardStats.totalInvoiced)}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(dashboardStats.totalPaid)}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(dashboardStats.totalOutstanding)}
          icon={IndianRupee}
          variant="warning"
        />
      </div>

      {/* Overdue Alert */}
      {dashboardStats.overdueCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Overdue Invoices Alert
            </CardTitle>
            <CardDescription>
              You have {dashboardStats.overdueCount} overdue invoice(s) totaling{' '}
              <span className="font-bold text-destructive">{formatCurrency(dashboardStats.overdueAmount)}</span>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="animate-scale-in shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/10 border-b">
            <CardTitle className="text-xl font-bold">Monthly SO vs Paid Amount</CardTitle>
            <CardDescription>Track sale orders against payments received</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getMonthlyData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  className="text-xs font-medium"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  className="text-xs font-medium"
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="SO Value" 
                  fill="url(#colorSO)" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={60}
                />
                <Bar 
                  dataKey="Paid Amount" 
                  fill="url(#colorPaid)" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overdue Invoices Table */}
        <Card className="animate-scale-in shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-destructive/5 to-warning/5 border-b">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="w-5 h-5 text-destructive" />
              Recent Overdue Invoices
            </CardTitle>
            <CardDescription>Invoices that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {overdueInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-success" />
                <p className="font-medium">No overdue invoices!</p>
                <p className="text-sm">All invoices are up to date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{invoice.vendorName}</p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {invoice.daysDelayed} days overdue
                      </span>
                      <span className="font-bold text-destructive">
                        {formatCurrency(invoice.pendingAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
