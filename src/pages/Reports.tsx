import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';

const Reports = () => {
  const { saleOrders, customers } = useApp();

  // Calculate customer billing data for chart
  const billingChartData = useMemo(() => {
    const billingMap = new Map<string, { 
      customerName: string;
      billingAmount: number;
      paidAmount: number;
      balanceAmount: number;
    }>();

    // Aggregate billing from sale orders
    saleOrders.forEach(so => {
      if (!billingMap.has(so.customerId)) {
        billingMap.set(so.customerId, {
          customerName: so.customerName,
          billingAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
        });
      }
      const billing = billingMap.get(so.customerId)!;
      billing.billingAmount += so.total;
      const assumedPaid = so.status === 'Completed' ? so.total : so.total * 0.5;
      billing.paidAmount += assumedPaid;
      billing.balanceAmount = billing.billingAmount - billing.paidAmount;
    });

    // Convert to array and sort by billing amount (top 10)
    return Array.from(billingMap.values())
      .sort((a, b) => b.billingAmount - a.billingAmount)
      .slice(0, 10)
      .map(item => ({
        name: item.customerName.length > 15 ? item.customerName.substring(0, 15) + '...' : item.customerName,
        'Paid Amount': item.paidAmount,
        'Balance': item.balanceAmount,
      }));
  }, [saleOrders]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalBilling = billingChartData.reduce((sum, item) => sum + item['Paid Amount'] + item['Balance'], 0);
    const totalPaid = billingChartData.reduce((sum, item) => sum + item['Paid Amount'], 0);
    const totalBalance = billingChartData.reduce((sum, item) => sum + item['Balance'], 0);
    const paymentRate = totalBilling > 0 ? (totalPaid / totalBilling) * 100 : 0;

    return {
      totalBilling,
      totalPaid,
      totalBalance,
      paymentRate,
    };
  }, [billingChartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg animate-scale-in">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            Total: {formatCurrency(payload.reduce((sum: number, p: any) => sum + p.value, 0))}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Customer billing insights and payment tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover-scale">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBilling)}</div>
            <p className="text-xs text-muted-foreground mt-1">Top 10 customers</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Payments received</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding amount</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Payment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paymentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Collection efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Chart */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Customer Billing Overview
          </CardTitle>
          <CardDescription>
            Top 10 customers by billing amount - Paid vs Balance comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingChartData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No billing data available</p>
              <p className="text-sm">Create sale orders to generate billing reports</p>
            </div>
          ) : (
            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={billingChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  className="animate-fade-in"
                >
                  <defs>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38, 92%, 60%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    stroke="hsl(var(--border))"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="Paid Amount" 
                    fill="url(#paidGradient)" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationBegin={0}
                  />
                  <Bar 
                    dataKey="Balance" 
                    fill="url(#balanceGradient)" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationBegin={200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
