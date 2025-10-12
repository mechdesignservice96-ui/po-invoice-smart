import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, FileText, Clock } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { InvoiceStatus } from '@/types';

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
  const { dashboardStats, invoices, purchaseOrders } = useApp();

  // Get recent overdue invoices
  const overdueInvoices = invoices
    .filter(inv => inv.status === 'Overdue')
    .sort((a, b) => (b.daysDelayed || 0) - (a.daysDelayed || 0))
    .slice(0, 5);

  // Chart data - monthly PO vs Paid
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const poAmount = purchaseOrders
        .filter(po => new Date(po.poDate).toLocaleString('default', { month: 'short' }) === month)
        .reduce((sum, po) => sum + po.totalAmount, 0);

      const paidAmount = invoices
        .filter(inv => new Date(inv.invoiceDate).toLocaleString('default', { month: 'short' }) === month)
        .reduce((sum, inv) => sum + inv.paidAmount, 0);

      return {
        month,
        'PO Value': poAmount,
        'Paid Amount': paidAmount,
      };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total PO Value"
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
          icon={DollarSign}
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
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Monthly PO vs Paid Amount</CardTitle>
            <CardDescription>Track purchase orders against payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="PO Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Paid Amount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overdue Invoices Table */}
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-destructive" />
              Recent Overdue Invoices
            </CardTitle>
            <CardDescription>Invoices that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
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
                        {formatCurrency(invoice.balanceAmount)}
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
