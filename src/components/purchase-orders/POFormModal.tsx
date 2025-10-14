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
import { PurchaseOrder } from '@/types';
import { toast } from 'sonner';

const poFormSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required'),
  poDate: z.string().min(1, 'PO Date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  particulars: z.string().min(1, 'Particulars are required'),
  poQty: z.coerce.number().positive('Quantity must be positive'),
  basicAmount: z.coerce.number().positive('Basic Amount must be positive'),
  gstPercent: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

type POFormValues = z.infer<typeof poFormSchema>;

interface POFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po?: PurchaseOrder;
}

export const POFormModal = ({ open, onOpenChange, po }: POFormModalProps) => {
  const { vendors, addPurchaseOrder, updatePurchaseOrder, purchaseOrders } = useApp();

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poNumber: '',
      poDate: new Date().toISOString().split('T')[0],
      vendorId: '',
      particulars: '',
      poQty: 0,
      basicAmount: 0,
      gstPercent: 18,
      notes: '',
    },
  });

  useEffect(() => {
    if (po) {
      form.reset({
        poNumber: po.poNumber,
        poDate: new Date(po.poDate).toISOString().split('T')[0],
        vendorId: po.vendorId,
        particulars: po.particulars,
        poQty: po.poQty,
        basicAmount: po.basicAmount,
        gstPercent: po.gstPercent,
        notes: po.notes || '',
      });
    } else {
      const nextNumber = purchaseOrders.length + 1;
      const year = new Date().getFullYear();
      const poNumber = `PO-${year}-${String(nextNumber).padStart(3, '0')}`;
      form.reset({
        poNumber,
        poDate: new Date().toISOString().split('T')[0],
        vendorId: '',
        particulars: '',
        poQty: 0,
        basicAmount: 0,
        gstPercent: 18,
        notes: '',
      });
    }
  }, [po, form, purchaseOrders.length]);

  // Auto-calculate vendor name when vendor changes
  const selectedVendor = vendors.find(v => v.id === form.watch('vendorId'));

  const onSubmit = (values: POFormValues) => {
    const vendor = vendors.find(v => v.id === values.vendorId);
    if (!vendor) {
      toast.error('Please select a valid vendor');
      return;
    }

    const basicAmount = Number(values.basicAmount);
    const gstPercent = Number(values.gstPercent);
    const gstAmount = (basicAmount * gstPercent) / 100;
    const total = basicAmount + gstAmount;

    const poData: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
      poNumber: values.poNumber,
      poDate: new Date(values.poDate),
      vendorId: values.vendorId,
      vendorName: vendor.name,
      particulars: values.particulars,
      poQty: Number(values.poQty),
      basicAmount,
      gstPercent,
      gstAmount,
      total,
      balanceQty: Number(values.poQty), // Initially all qty is balance
      status: 'Ordered',
      notes: values.notes,
    };

    if (po) {
      updatePurchaseOrder(po.id, poData);
      toast.success('Purchase Order updated successfully');
    } else {
      addPurchaseOrder(poData);
      toast.success('Purchase Order created successfully');
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
          <DialogTitle>📦 {po ? 'Edit' : 'Add'} Purchase Order</DialogTitle>
          <DialogDescription>
            {po ? 'Update purchase order details' : 'Create a new purchase order'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PO-2025-001" readOnly />
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
                    <FormLabel>PO Date</FormLabel>
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
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.taxId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedVendor && (
              <div className="text-sm text-muted-foreground">
                Contact: {selectedVendor.contactPerson} | Email: {selectedVendor.email} | Phone:{' '}
                {selectedVendor.phone}
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
                name="poQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Quantity</FormLabel>
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
              <Button type="submit">💾 Save PO</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
