import { useState, useMemo } from 'react';
import { Plus, Search, Download, Edit, Trash2, Wallet, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ExpenseFormModal } from '@/components/expenses/ExpenseFormModal';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DailyExpenses = () => {
  const { expenses, deleteExpense } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const filteredExpenses = expenses.filter(
    expense =>
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(expense.date).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = useMemo(() => {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return expenses.filter(exp => new Date(exp.date) >= startOfMonth);
  }, [expenses, today]);

  const todayExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      expDate.setHours(0, 0, 0, 0);
      return expDate.getTime() === today.getTime();
    });
  }, [expenses, today]);

  const totalExpensesThisMonth = thisMonth.reduce((sum, exp) => sum + exp.amount, 0);
  const todayTotal = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Find top expense category
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // Calculate average daily spend for this month
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const averageDailySpend = totalExpensesThisMonth / daysInMonth;

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const exportData = filteredExpenses.map((expense, index) => ({
      'Sl. No': index + 1,
      Date: formatDate(expense.date),
      Category: expense.category,
      Description: expense.description,
      'Payment Mode': expense.paymentMode,
      'Amount (₹)': expense.amount,
      Status: expense.status,
      Attachment: expense.attachment || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Expenses');

    const today = new Date();
    const fileName = `Daily_Expenses_Report_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    toast.success('✅ Export successful — file downloaded');
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = (expenseId: string, description: string) => {
    if (confirm(`Are you sure you want to delete expense "${description}"?`)) {
      deleteExpense(expenseId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Expenses</h1>
        <p className="text-muted-foreground mt-2">Track and manage your daily business expenditures efficiently.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpensesThisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">{thisMonth.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{todayExpenses.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Expense Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCategory ? topCategory[0] : 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {topCategory ? formatCurrency(topCategory[1]) : 'No expenses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageDailySpend)}</div>
            <p className="text-xs text-muted-foreground mt-1">For this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Expense Records</CardTitle>
              <CardDescription>View and manage all your business expenses</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, description, or date..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Sl. No</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Payment Mode</TableHead>
                  <TableHead className="font-semibold text-right">Amount (₹)</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No expenses found. Add your first expense to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense, index) => (
                    <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>{expense.paymentMode}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={expense.status === 'Paid' ? 'default' : 'secondary'}>
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                            className="h-8 w-8 hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id, expense.description)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredExpenses.length > 0 && (
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <div>
                Showing {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
              </div>
              <div className="font-semibold">
                Total: {formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        expense={editingExpense}
      />
    </div>
  );
};

export default DailyExpenses;
