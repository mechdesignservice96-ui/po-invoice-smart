import { useEffect, useState } from 'react';
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
import { SaleOrder, SOLineItem } from '@/types';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

const lineItemSchema = z.object({
  id: z.string(),
  particulars: z.string().min(1, 'Particulars required'),
  soQty: z.coerce.number().positive('Qty must be positive'),
  qtyDispatched: z.coerce.number().min(0, 'Cannot be negative'),
  balanceQty: z.coerce.number().min(0, 'Cannot be negative'),
  basicAmount: z.coerce.number().positive('Amount must be positive'),
  gstPercent: z.coerce.number().min(0).max(100),
  gstAmount: z.coerce.number().min(0),
  lineTotal: z.coerce.number().min(0),
});

const soFormSchema = z.object({
  soNumber: z.string().min(1, 'SO Number is required'),
  soDate: z.string().min(1, 'SO Date is required'),
  poNumber: z.string().optional(),
  poDate: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  status: z.enum(['Draft', 'Confirmed', 'Dispatched', 'Delivered', 'Completed']),
  lineItems: z.array(lineItemSchema).min(1, 'At least one item is required'),
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
  const [lineItems, setLineItems] = useState<SOLineItem[]>([]);

  const form = useForm<SOFormValues>({
    resolver: zodResolver(soFormSchema),
    defaultValues: {
      soNumber: '',
      soDate: new Date().toISOString().split('T')[0],
      poNumber: '',
      poDate: '',
      customerId: '',
      status: 'Draft' as const,
      lineItems: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (so) {
      form.reset({
        soNumber: so.soNumber,
        soDate: new Date(so.soDate).toISOString().split('T')[0],
        poNumber: so.poNumber || '',
        poDate: so.poDate ? new Date(so.poDate).toISOString().split('T')[0] : '',
        customerId: so.customerId,
        status: so.status,
        lineItems: so.lineItems || [],
        notes: so.notes || '',
      });
      setLineItems(so.lineItems || []);
    } else {
      const nextNumber = saleOrders.length + 1;
      const year = new Date().getFullYear();
      const soNumber = `SO-${year}-${String(nextNumber).padStart(3, '0')}`;
      form.reset({
        soNumber,
        soDate: new Date().toISOString().split('T')[0],
        poNumber: '',
        poDate: '',
        customerId: '',
        status: 'Draft' as const,
        lineItems: [],
        notes: '',
      });
      setLineItems([]);
    }
  }, [so, form, saleOrders.length]);

  const selectedCustomer = customers.find(c => c.id === form.watch('customerId'));

  const addLineItem = () => {
    const newItem: SOLineItem = {
      id: `item-${Date.now()}`,
      particulars: '',
      soQty: 0,
      qtyDispatched: 0,
      balanceQty: 0,
      basicAmount: 0,
      gstPercent: 18,
      gstAmount: 0,
      lineTotal: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof SOLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate dependent fields
    const item = updated[index];
    if (field === 'basicAmount' || field === 'gstPercent') {
      item.gstAmount = (item.basicAmount * item.gstPercent) / 100;
      item.lineTotal = item.basicAmount + item.gstAmount;
    }
    if (field === 'soQty' || field === 'qtyDispatched') {
      item.balanceQty = item.soQty - item.qtyDispatched;
    }

    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  };

  const onSubmit = (values: SOFormValues) => {
    const customer = customers.find(c => c.id === values.customerId);
    if (!customer) {
      toast.error('Please select a valid customer');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate each line item
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.particulars || item.particulars.trim() === '') {
        toast.error(`Item #${i + 1}: Particulars cannot be empty`);
        return;
      }
      if (item.soQty <= 0) {
        toast.error(`Item #${i + 1}: SO Quantity must be greater than 0`);
        return;
      }
      if (item.basicAmount <= 0) {
        toast.error(`Item #${i + 1}: Basic Amount must be greater than 0`);
        return;
      }
    }

    if (so) {
      // Update existing sale order
      const updateData: Partial<SaleOrder> = {
        soDate: new Date(values.soDate),
        poNumber: values.poNumber || undefined,
        poDate: values.poDate ? new Date(values.poDate) : undefined,
        customerId: values.customerId,
        customerName: customer.name,
        lineItems: lineItems,
        total: calculateTotal(),
        status: values.status,
        notes: values.notes,
      };
      updateSaleOrder(so.id, updateData);
      toast.success('Sale Order updated successfully');
    } else {
      // Create new sale order (soNumber is generated by addSaleOrder)
      const newSOData: Omit<SaleOrder, 'id' | 'soNumber' | 'createdAt'> = {
        soDate: new Date(values.soDate),
        poNumber: values.poNumber || undefined,
        poDate: values.poDate ? new Date(values.poDate) : undefined,
        customerId: values.customerId,
        customerName: customer.name,
        lineItems: lineItems,
        total: calculateTotal(),
        status: values.status,
        notes: values.notes,
      };
      addSaleOrder(newSOData);
      toast.success('Sale Order created successfully');
    }

    onOpenChange(false);
    form.reset();
    setLineItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🛒 {so ? 'Edit' : 'Add'} Sale Order</DialogTitle>
          <DialogDescription>
            {so ? 'Update sale order details' : 'Create a new sale order with multiple items'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PO-CUST-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedCustomer && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                Contact: {selectedCustomer.contactPerson} | Email: {selectedCustomer.email} | Phone:{' '}
                {selectedCustomer.phone}
              </div>
            )}

            {/* Line Items Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Item #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-sm font-medium">Particulars</label>
                          <Textarea
                            value={item.particulars}
                            onChange={e => updateLineItem(index, 'particulars', e.target.value)}
                            placeholder="Item description..."
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm font-medium">SO Qty</label>
                            <Input
                              type="number"
                              value={item.soQty}
                              onChange={e => updateLineItem(index, 'soQty', Number(e.target.value))}
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Qty Dispatched</label>
                            <Input
                              type="number"
                              value={item.qtyDispatched}
                              onChange={e => updateLineItem(index, 'qtyDispatched', Number(e.target.value))}
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Balance Qty</label>
                            <Input type="number" value={item.balanceQty} disabled />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm font-medium">Basic Amount (₹)</label>
                            <Input
                              type="number"
                              value={item.basicAmount}
                              onChange={e => updateLineItem(index, 'basicAmount', Number(e.target.value))}
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">GST (%)</label>
                            <Select
                              value={String(item.gstPercent)}
                              onValueChange={value => updateLineItem(index, 'gstPercent', Number(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">GST Amount (₹)</label>
                            <Input type="number" value={item.gstAmount.toFixed(2)} disabled />
                          </div>
                        </div>

                        <div className="bg-muted/50 p-3 rounded flex justify-between items-center">
                          <span className="font-medium">Line Total:</span>
                          <span className="text-lg font-bold">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total SO Value:</span>
                <span>{formatCurrency(calculateTotal())}</span>
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

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Cancel</span>
                <span className="hidden sm:inline">❌ Cancel</span>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { form.reset(); setLineItems([]); }}
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Reset</span>
                <span className="hidden sm:inline">🔄 Reset</span>
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">💾 Save SO</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
