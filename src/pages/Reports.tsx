import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { format, subDays, subMonths, subYears, isAfter, isBefore, startOfDay } from 'date-fns';

type TimePeriod = '1day' | '15days' | '30days' | '6months' | '1year';

const Reports = () => {
  const { saleOrders, customers, expenses } = useApp();
  const [expensePeriod, setExpensePeriod] = useState<TimePeriod>('30days');

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
        'Total': item.billingAmount,
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
      const paidAmount = payload.find((p: any) => p.dataKey === 'Paid Amount')?.value || 0;
      const balanceAmount = payload.find((p: any) => p.dataKey === 'Balance')?.value || 0;
      const total = paidAmount + balanceAmount;
      
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg animate-scale-in">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <p className="text-sm text-green-600">
            Paid Amount: {formatCurrency(paidAmount)}
          </p>
          <p className="text-sm text-orange-600">
            Balance: {formatCurrency(balanceAmount)}
          </p>
          <p className="text-sm font-bold text-foreground mt-2 pt-2 border-t border-border">
            Total Billing: {formatCurrency(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label to show total on top of bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const data = billingChartData[index];
    if (data && data.Total) {
      return (
        <text 
          x={x + width / 2} 
          y={y - 8} 
          fill="hsl(var(--foreground))" 
          textAnchor="middle" 
          fontSize={12}
          fontWeight={600}
        >
          {formatCurrency(data.Total)}
        </text>
      );
    }
    return null;
  };

  // Get date range based on selected period
  const getDateRange = (period: TimePeriod): Date => {
    const today = new Date();
    switch (period) {
      case '1day':
        return subDays(today, 1);
      case '15days':
        return subDays(today, 15);
      case '30days':
        return subDays(today, 30);
      case '6months':
        return subMonths(today, 6);
      case '1year':
        return subYears(today, 1);
      default:
        return subDays(today, 30);
    }
  };

  // Calculate daily expenses chart data
  const dailyExpensesData = useMemo(() => {
    const startDate = startOfDay(getDateRange(expensePeriod));
    const today = startOfDay(new Date());
    
    // Filter expenses within the date range (inclusive of today)
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = startOfDay(new Date(expense.date));
      return (expenseDate >= startDate && expenseDate <= today);
    });

    // Group expenses by date
    const expensesByDate = new Map<string, { date: Date; amount: number }>();
    
    filteredExpenses.forEach(expense => {
      const expenseDate = startOfDay(new Date(expense.date));
      const dateKey = format(expenseDate, 'MMM dd');
      
      if (!expensesByDate.has(dateKey)) {
        expensesByDate.set(dateKey, { date: expenseDate, amount: 0 });
      }
      const current = expensesByDate.get(dateKey)!;
      current.amount += expense.amount;
    });

    // Convert to array and sort by date chronologically
    const data = Array.from(expensesByDate.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ date, amount }) => ({
        date: format(date, 'MMM dd'),
        amount,
      }));

    // If no data, show a message-friendly empty array
    return data.length > 0 ? data : [];
  }, [expenses, expensePeriod]);

  // Calculate expense stats
  const expenseStats = useMemo(() => {
    const startDate = startOfDay(getDateRange(expensePeriod));
    const today = startOfDay(new Date());
    
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = startOfDay(new Date(expense.date));
      return (expenseDate >= startDate && expenseDate <= today);
    });

    const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const uniqueDays = new Set(filteredExpenses.map(exp => format(startOfDay(new Date(exp.date)), 'yyyy-MM-dd'))).size;
    const avgDaily = uniqueDays > 0 ? totalExpense / uniqueDays : 0;
    const paidCount = filteredExpenses.filter(exp => exp.status === 'Paid').length;
    const pendingCount = filteredExpenses.filter(exp => exp.status === 'Pending').length;

    // Category breakdown
    const byCategory = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    return {
      total: totalExpense,
      avgDaily,
      paidCount,
      pendingCount,
      topCategory: topCategory ? topCategory[0] : 'N/A',
      topCategoryAmount: topCategory ? topCategory[1] : 0,
    };
  }, [expenses, expensePeriod]);

  // Custom tooltip for expenses
  const ExpenseTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg animate-scale-in">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <p className="text-sm text-primary font-medium">
            Expense: {formatCurrency(payload[0].value)}
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
                  margin={{ top: 40, right: 30, left: 20, bottom: 80 }}
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
                    stackId="billing"
                    fill="url(#paidGradient)" 
                    radius={[0, 0, 0, 0]}
                    animationDuration={1000}
                    animationBegin={0}
                  />
                  <Bar 
                    dataKey="Balance" 
                    stackId="billing"
                    fill="url(#balanceGradient)" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationBegin={200}
                  >
                    <LabelList content={renderCustomLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Expenses Chart */}
      <Card className="animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Daily Expenses Tracker
              </CardTitle>
              <CardDescription>
                Track your daily expenses over different time periods
              </CardDescription>
            </div>
            <Tabs value={expensePeriod} onValueChange={(value) => setExpensePeriod(value as TimePeriod)}>
              <TabsList>
                <TabsTrigger value="1day">1D</TabsTrigger>
                <TabsTrigger value="15days">15D</TabsTrigger>
                <TabsTrigger value="30days">30D</TabsTrigger>
                <TabsTrigger value="6months">6M</TabsTrigger>
                <TabsTrigger value="1year">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Expense Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
              <div className="text-2xl font-bold">{formatCurrency(expenseStats.total)}</div>
            </div>
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Avg. Daily</div>
              <div className="text-2xl font-bold">{formatCurrency(expenseStats.avgDaily)}</div>
            </div>
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Top Category</div>
              <div className="text-lg font-bold">{expenseStats.topCategory}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(expenseStats.topCategoryAmount)}</div>
            </div>
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="text-sm font-medium">
                <span className="text-green-600">{expenseStats.paidCount} Paid</span>
                {' / '}
                <span className="text-orange-600">{expenseStats.pendingCount} Pending</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          {dailyExpensesData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No expense data available</p>
              <p className="text-sm">Add daily expenses to see the tracker chart</p>
            </div>
          ) : (
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyExpensesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  className="animate-fade-in"
                >
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    stroke="hsl(var(--border))"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ExpenseTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fill="url(#expenseGradient)" 
                    animationDuration={1200}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
