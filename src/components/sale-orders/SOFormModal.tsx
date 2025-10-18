import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { SaleOrder } from '@/types';
import { toast } from 'sonner';

const soFormSchema = z.object({
  soNumber: z.string().min(1, 'SO Number is required'),
  soDate: z.string().min(1, 'SO Date is required'),
  customerId: z.string().min(1, 'Customer is required'),
  particulars: z.string().min(1, 'Particulars are required'),
  soQty: z.coerce.number().positive('Quantity must be positive'),
  basicAmount: z.coerce.number().positive('Basic Amount must be positive'),
  gstPercent: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

type SOFormValues = z.infer<typeof soFormSchema>;

interface SOFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  so?: SaleOrder;
}

export const SOFormModal = ({ open, onOpenChange, so }: SOFormModalProps) => {
  const { customers, addSaleOrder, updateSaleOrder, saleOrders } = useApp();

  const form = useForm<SOFormValues>({
    resolver: zodResolver(soFormSchema),
    defaultValues: {
      soNumber: '',
      soDate: new Date().toISOString().split('T')[0],
      customerId: '',
      particulars: '',
      soQty: 0,
      basicAmount: 0,
      gstPercent: 18,
      notes: '',
    },
  });

  useEffect(() => {
    if (so) {
      form.reset({
        soNumber: so.soNumber,
        soDate: new Date(so.soDate).toISOString().split('T')[0],
        customerId: so.customerId,
        particulars: so.particulars,
        soQty: so.soQty,
        basicAmount: so.basicAmount,
        gstPercent: so.gstPercent,
        notes: so.notes || '',
      });
    } else {
      const nextNumber = saleOrders.length + 1;
      const year = new Date().getFullYear();
      const soNumber = `SO-${year}-${String(nextNumber).padStart(3, '0')}`;
      form.reset({
        soNumber,
        soDate: new Date().toISOString().split('T')[0],
        customerId: '',
        particulars: '',
        soQty: 0,
        basicAmount: 0,
        gstPercent: 18,
        notes: '',
      });
    }
  }, [so, form, saleOrders.length]);

  // Auto-calculate customer info when customer changes
  const selectedCustomer = customers.find(c => c.id === form.watch('customerId'));

  const onSubmit = (values: SOFormValues) => {
    const customer = customers.find(c => c.id === values.customerId);
    if (!customer) {
      toast.error('Please select a valid customer');
      return;
    }

    const basicAmount = Number(values.basicAmount);
    const gstPercent = Number(values.gstPercent);
    const gstAmount = (basicAmount * gstPercent) / 100;
    const total = basicAmount + gstAmount;

    const soData: Omit<SaleOrder, 'id' | 'createdAt'> = {
      soNumber: values.soNumber,
      soDate: new Date(values.soDate),
      customerId: values.customerId,
      customerName: customer.name,
      particulars: values.particulars,
      soQty: Number(values.soQty),
      basicAmount,
      gstPercent,
      gstAmount,
      total,
      balanceQty: Number(values.soQty), // Initially all qty is balance
      status: 'Confirmed',
      notes: values.notes,
    };

    if (so) {
      updateSaleOrder(so.id, soData);
      toast.success('Sale Order updated successfully');
    } else {
      addSaleOrder(soData);
      toast.success('Sale Order created successfully');
    }

    onOpenChange(false);
    form.reset();
  };

  const basicAmount = form.watch('basicAmount') || 0;
  const gstPercent = form.watch('gstPercent') || 0;
  const gstAmount = (Number(basicAmount) * Number(gstPercent)) / 100;
  const total = Number(basicAmount) + gstAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🛒 {so ? 'Edit' : 'Add'} Sale Order</DialogTitle>
          <DialogDescription>
            {so ? 'Update sale order details' : 'Create a new sale order'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="soNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SO Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SO-2025-001" readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="soDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SO Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.taxId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCustomer && (
              <div className="text-sm text-muted-foreground">
                Contact: {selectedCustomer.contactPerson} | Email: {selectedCustomer.email} | Phone:{' '}
                {selectedCustomer.phone}
              </div>
            )}

            <FormField
              control={form.control}
              name="particulars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Particulars / Items</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter item details, description, specifications..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="soQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SO Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="0" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="basicAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basic Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="0" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gstPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST (%)</FormLabel>
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GST" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Basic Amount:</span>
                <span className="font-semibold">₹{basicAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST ({gstPercent}%):</span>
                <span className="font-semibold">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes or remarks..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ❌ Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                🔄 Reset
              </Button>
              <Button type="submit">💾 Save SO</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
