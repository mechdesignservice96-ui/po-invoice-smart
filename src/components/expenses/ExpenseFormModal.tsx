import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { Expense, ExpenseCategory, PaymentMode, ExpenseStatus } from '@/types';

const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Travel', 'Rent', 'Utilities', 'Supplies', 'Misc'], {
    required_error: 'Category is required',
  }),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount: z.string().min(1, 'Amount is required'),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Card'], {
    required_error: 'Payment mode is required',
  }),
  status: z.enum(['Paid', 'Pending'], {
    required_error: 'Status is required',
  }),
  attachment: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
}

export const ExpenseFormModal = ({ open, onClose, expense }: ExpenseFormModalProps) => {
  const { addExpense, updateExpense } = useApp();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: '',
      category: 'Misc',
      description: '',
      amount: '',
      paymentMode: 'Cash',
      status: 'Pending',
      attachment: '',
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        date: new Date(expense.date).toISOString().split('T')[0],
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        paymentMode: expense.paymentMode,
        status: expense.status,
        attachment: expense.attachment || '',
      });
    } else {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        category: 'Misc',
        description: '',
        amount: '',
        paymentMode: 'Cash',
        status: 'Pending',
        attachment: '',
      });
    }
  }, [expense, form]);

  const onSubmit = (data: ExpenseFormData) => {
    const expenseData = {
      date: new Date(data.date),
      category: data.category as ExpenseCategory,
      description: data.description,
      amount: parseFloat(data.amount),
      paymentMode: data.paymentMode as PaymentMode,
      status: data.status as ExpenseStatus,
      attachment: data.attachment || undefined,
    };

    if (expense) {
      updateExpense(expense.id, expenseData);
    } else {
      addExpense(expenseData);
    }

    onClose();
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Supplies">Supplies</SelectItem>
                        <SelectItem value="Misc">Misc</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter expense description"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="File URL or reference"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {expense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
