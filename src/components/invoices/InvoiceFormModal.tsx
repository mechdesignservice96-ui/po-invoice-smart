import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Invoice } from '@/types';
import { formatDate } from '@/utils/formatters';

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  particulars: z.string().min(1, 'Particulars are required'),
  poQty: z.number().min(0, 'PO quantity must be positive'),
  qtyDispatched: z.number().min(0, 'Dispatched quantity must be positive'),
  basicAmount: z.number().min(0, 'Basic amount must be positive'),
  gstPercent: z.number().min(0).max(100),
  transportationCost: z.number().min(0),
  amountReceived: z.number().min(0),
  dueDate: z.string().min(1, 'Due date is required'),
}).refine(data => data.qtyDispatched <= data.poQty, {
  message: 'Dispatched quantity cannot exceed PO quantity',
  path: ['qtyDispatched'],
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormModalProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice;
}

export function InvoiceFormModal({ open, onClose, invoice }: InvoiceFormModalProps) {
  const { vendors, addInvoice, updateInvoice } = useApp();
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [calculatedValues, setCalculatedValues] = useState({
    balanceQty: 0,
    gstAmount: 0,
    totalCost: 0,
    pendingAmount: 0,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      vendorId: '',
      particulars: '',
      poQty: 0,
      qtyDispatched: 0,
      basicAmount: 0,
      gstPercent: 18,
      transportationCost: 0,
      amountReceived: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const watchedFields = watch();

  useEffect(() => {
    if (invoice) {
      setValue('invoiceNumber', invoice.invoiceNumber);
      setValue('invoiceDate', new Date(invoice.invoiceDate).toISOString().split('T')[0]);
      setValue('vendorId', invoice.vendorId);
      setValue('particulars', invoice.particulars);
      setValue('poQty', invoice.poQty);
      setValue('qtyDispatched', invoice.qtyDispatched);
      setValue('basicAmount', invoice.basicAmount);
      setValue('gstPercent', invoice.gstPercent);
      setValue('transportationCost', invoice.transportationCost);
      setValue('amountReceived', invoice.amountReceived);
      setValue('dueDate', new Date(invoice.dueDate).toISOString().split('T')[0]);
      setSelectedVendorId(invoice.vendorId);
    } else {
      const invoiceCount = Math.floor(Math.random() * 1000) + 1;
      const year = new Date().getFullYear();
      setValue('invoiceNumber', `INV-${year}-${String(invoiceCount).padStart(3, '0')}`);
    }
  }, [invoice, setValue]);

  useEffect(() => {
    const balanceQty = (watchedFields.poQty || 0) - (watchedFields.qtyDispatched || 0);
    const gstAmount = ((watchedFields.basicAmount || 0) * (watchedFields.gstPercent || 0)) / 100;
    const totalCost = (watchedFields.basicAmount || 0) + gstAmount + (watchedFields.transportationCost || 0);
    const pendingAmount = totalCost - (watchedFields.amountReceived || 0);

    setCalculatedValues({
      balanceQty,
      gstAmount,
      totalCost,
      pendingAmount,
    });
  }, [watchedFields]);

  const onSubmit = (data: InvoiceFormData) => {
    const vendor = vendors.find(v => v.id === data.vendorId);
    if (!vendor) return;

    const balanceQty = data.poQty - data.qtyDispatched;
    const gstAmount = (data.basicAmount * data.gstPercent) / 100;
    const totalCost = data.basicAmount + gstAmount + data.transportationCost;
    const pendingAmount = totalCost - data.amountReceived;

    const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: new Date(data.invoiceDate),
      vendorId: data.vendorId,
      vendorName: vendor.name,
      particulars: data.particulars,
      poQty: data.poQty,
      qtyDispatched: data.qtyDispatched,
      balanceQty,
      basicAmount: data.basicAmount,
      gstPercent: data.gstPercent,
      gstAmount,
      transportationCost: data.transportationCost,
      totalCost,
      amountReceived: data.amountReceived,
      pendingAmount,
      status: pendingAmount === 0 ? 'Paid' : pendingAmount < totalCost ? 'Partial' : 'Unpaid',
      dueDate: new Date(data.dueDate),
      daysDelayed: 0,
    };

    if (invoice) {
      updateInvoice(invoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }

    reset();
    onClose();
  };

  const handleReset = () => {
    reset();
    setSelectedVendorId('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🧾 {invoice ? 'Edit' : 'Add'} Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice No. *</Label>
              <Input
                id="invoiceNumber"
                {...register('invoiceNumber')}
                placeholder="INV-2025-001"
              />
              {errors.invoiceNumber && (
                <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
              )}
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                {...register('invoiceDate')}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-destructive">{errors.invoiceDate.message}</p>
              )}
            </div>

            {/* Vendor ID */}
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor *</Label>
              <Select
                value={selectedVendorId}
                onValueChange={(value) => {
                  setSelectedVendorId(value);
                  setValue('vendorId', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.id} - {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vendorId && (
                <p className="text-sm text-destructive">{errors.vendorId.message}</p>
              )}
            </div>

            {/* Vendor Name (Read-only) */}
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input
                value={vendors.find(v => v.id === selectedVendorId)?.name || ''}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Particulars */}
          <div className="space-y-2">
            <Label htmlFor="particulars">Particulars / Items *</Label>
            <Textarea
              id="particulars"
              {...register('particulars')}
              placeholder="Describe the items or services..."
              rows={3}
            />
            {errors.particulars && (
              <p className="text-sm text-destructive">{errors.particulars.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PO Qty */}
            <div className="space-y-2">
              <Label htmlFor="poQty">PO Qty *</Label>
              <Input
                id="poQty"
                type="number"
                {...register('poQty', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.poQty && (
                <p className="text-sm text-destructive">{errors.poQty.message}</p>
              )}
            </div>

            {/* Qty Dispatched */}
            <div className="space-y-2">
              <Label htmlFor="qtyDispatched">Qty Dispatched *</Label>
              <Input
                id="qtyDispatched"
                type="number"
                {...register('qtyDispatched', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.qtyDispatched && (
                <p className="text-sm text-destructive">{errors.qtyDispatched.message}</p>
              )}
            </div>

            {/* Balance Qty (Read-only) */}
            <div className="space-y-2">
              <Label>Balance Qty</Label>
              <Input
                value={calculatedValues.balanceQty}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Amount */}
            <div className="space-y-2">
              <Label htmlFor="basicAmount">Basic Amount (₹) *</Label>
              <Input
                id="basicAmount"
                type="number"
                {...register('basicAmount', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.basicAmount && (
                <p className="text-sm text-destructive">{errors.basicAmount.message}</p>
              )}
            </div>

            {/* GST % */}
            <div className="space-y-2">
              <Label htmlFor="gstPercent">GST (%)</Label>
              <Select
                value={String(watchedFields.gstPercent)}
                onValueChange={(value) => setValue('gstPercent', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GST Amount (Read-only) */}
            <div className="space-y-2">
              <Label>GST Amount (₹)</Label>
              <Input
                value={calculatedValues.gstAmount.toFixed(2)}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>

            {/* Transportation Cost */}
            <div className="space-y-2">
              <Label htmlFor="transportationCost">Transportation Cost (₹)</Label>
              <Input
                id="transportationCost"
                type="number"
                {...register('transportationCost', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Total Cost (Read-only) */}
            <div className="space-y-2">
              <Label>Total Cost (₹)</Label>
              <Input
                value={calculatedValues.totalCost.toFixed(2)}
                readOnly
                className="bg-muted font-semibold text-primary"
              />
            </div>

            {/* Amount Received */}
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received (₹)</Label>
              <Input
                id="amountReceived"
                type="number"
                {...register('amountReceived', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            {/* Pending Amount (Read-only) */}
            <div className="space-y-2">
              <Label>Pending Amount (₹)</Label>
              <Input
                value={calculatedValues.pendingAmount.toFixed(2)}
                readOnly
                className="bg-muted font-semibold text-destructive"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleReset}>
              🔄 Reset
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              ❌ Cancel
            </Button>
            <Button type="submit">
              💾 Save Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
