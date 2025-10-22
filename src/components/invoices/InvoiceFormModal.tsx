import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Invoice, InvoiceLineItem } from '@/types';
import { formatDate } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const invoiceHeaderSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  poNumber: z.string().optional(),
  poDate: z.string().optional(),
  gstPercent: z.number().min(0).max(100),
  transportationCost: z.number().min(0),
  amountReceived: z.number().min(0),
  dueDate: z.string().min(1, 'Due date is required'),
});

type InvoiceHeaderData = z.infer<typeof invoiceHeaderSchema>;

interface InvoiceFormModalProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice;
}

export function InvoiceFormModal({ open, onClose, invoice }: InvoiceFormModalProps) {
  const { vendors, addInvoice, updateInvoice } = useApp();
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InvoiceHeaderData>({
    resolver: zodResolver(invoiceHeaderSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      vendorId: '',
      poNumber: '',
      poDate: '',
      gstPercent: 18,
      transportationCost: 0,
      amountReceived: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const watchedFields = watch();

  // Initialize form with invoice data if editing
  useEffect(() => {
    if (invoice) {
      setValue('invoiceNumber', invoice.invoiceNumber);
      setValue('invoiceDate', new Date(invoice.invoiceDate).toISOString().split('T')[0]);
      setValue('vendorId', invoice.vendorId);
      setValue('poNumber', invoice.poNumber || '');
      setValue('poDate', invoice.poDate ? new Date(invoice.poDate).toISOString().split('T')[0] : '');
      setValue('gstPercent', invoice.gstPercent || 18);
      setValue('transportationCost', invoice.transportationCost || 0);
      setValue('amountReceived', invoice.amountReceived);
      setValue('dueDate', new Date(invoice.dueDate).toISOString().split('T')[0]);
      setSelectedVendorId(invoice.vendorId);
      setLineItems(invoice.lineItems || []);
    } else {
      const invoiceCount = Math.floor(Math.random() * 1000) + 1;
      const year = new Date().getFullYear();
      setValue('invoiceNumber', `INV-${year}-${String(invoiceCount).padStart(3, '0')}`);
      setLineItems([createEmptyLineItem()]);
    }
  }, [invoice, setValue]);

  const createEmptyLineItem = (): InvoiceLineItem => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    particulars: '',
    poQty: 0,
    qtyDispatched: 0,
    balanceQty: 0,
    basicAmount: 0,
    gstAmount: 0,
    lineTotal: 0,
  });

  const addLineItem = () => {
    setLineItems([...lineItems, createEmptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    } else {
      toast.error('At least one line item is required');
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedItems = [...lineItems];
    const item = { ...updatedItems[index] };
    
    (item as any)[field] = value;

    // Calculate derived values
    item.balanceQty = item.poQty - item.qtyDispatched;
    const gstPercent = watchedFields.gstPercent || 18;
    item.gstAmount = (item.basicAmount * gstPercent) / 100;
    item.lineTotal = item.basicAmount + item.gstAmount;

    updatedItems[index] = item;
    setLineItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const transportationCost = watchedFields.transportationCost || 0;
    const totalCost = subtotal + transportationCost;
    const pendingAmount = totalCost - (watchedFields.amountReceived || 0);
    return { totalCost, pendingAmount };
  };

  const { totalCost, pendingAmount } = calculateTotals();

  const onSubmit = (data: InvoiceHeaderData) => {
    const vendor = vendors.find(v => v.id === data.vendorId);
    if (!vendor) {
      toast.error('Please select a vendor');
      return;
    }

    if (lineItems.length === 0 || lineItems.some(item => !item.particulars.trim())) {
      toast.error('Please fill in all line item particulars');
      return;
    }

    const totals = calculateTotals();

    const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: new Date(data.invoiceDate),
      vendorId: data.vendorId,
      vendorName: vendor.name,
      poNumber: data.poNumber,
      poDate: data.poDate ? new Date(data.poDate) : undefined,
      lineItems: lineItems,
      gstPercent: data.gstPercent,
      transportationCost: data.transportationCost,
      totalCost: totals.totalCost,
      amountReceived: data.amountReceived,
      pendingAmount: totals.pendingAmount,
      status: totals.pendingAmount === 0 ? 'Paid' : totals.pendingAmount < totals.totalCost ? 'Partial' : 'Unpaid',
      dueDate: new Date(data.dueDate),
      daysDelayed: 0,
    };

    if (invoice) {
      updateInvoice(invoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }

    reset();
    setLineItems([]);
    onClose();
  };

  const handleReset = () => {
    reset();
    setSelectedVendorId('');
    setLineItems([createEmptyLineItem()]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🧾 {invoice ? 'Edit' : 'Add'} Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Header Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectContent className="bg-background z-50">
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

                {/* PO Number */}
                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    {...register('poNumber')}
                    placeholder="PO-2025-001"
                  />
                </div>

                {/* PO Date */}
                <div className="space-y-2">
                  <Label htmlFor="poDate">PO Date</Label>
                  <Input
                    id="poDate"
                    type="date"
                    {...register('poDate')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                {/* GST % */}
                <div className="space-y-2">
                  <Label htmlFor="gstPercent">GST % (Applied to all items) *</Label>
                  <Select
                    value={String(watchedFields.gstPercent || 18)}
                    onValueChange={(value) => {
                      setValue('gstPercent', Number(value));
                      // Recalculate all line items with new GST%
                      const updatedItems = lineItems.map(item => {
                        const gstAmount = (item.basicAmount * Number(value)) / 100;
                        return {
                          ...item,
                          gstAmount,
                          lineTotal: item.basicAmount + gstAmount,
                        };
                      });
                      setLineItems(updatedItems);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gstPercent && (
                    <p className="text-sm text-destructive">{errors.gstPercent.message}</p>
                  )}
                </div>

                {/* Transportation Cost */}
                <div className="space-y-2">
                  <Label htmlFor="transportationCost">Transportation Cost (₹) *</Label>
                  <Input
                    id="transportationCost"
                    type="number"
                    {...register('transportationCost', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.transportationCost && (
                    <p className="text-sm text-destructive">{errors.transportationCost.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items / Particulars</CardTitle>
              <Button type="button" onClick={addLineItem} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <Card key={item.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Item #{index + 1}</CardTitle>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Particulars */}
                    <div className="space-y-2">
                      <Label>Particulars / Description *</Label>
                      <Textarea
                        value={item.particulars}
                        onChange={(e) => updateLineItem(index, 'particulars', e.target.value)}
                        placeholder="Describe the items or services..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* PO Qty */}
                      <div className="space-y-2">
                        <Label>PO Qty</Label>
                        <Input
                          type="number"
                          value={item.poQty}
                          onChange={(e) => updateLineItem(index, 'poQty', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>

                      {/* Qty Dispatched */}
                      <div className="space-y-2">
                        <Label>Dispatched</Label>
                        <Input
                          type="number"
                          value={item.qtyDispatched}
                          onChange={(e) => updateLineItem(index, 'qtyDispatched', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>

                      {/* Balance Qty */}
                      <div className="space-y-2">
                        <Label>Balance</Label>
                        <Input
                          value={item.balanceQty}
                          readOnly
                          className="bg-muted font-semibold"
                        />
                      </div>

                      {/* Basic Amount */}
                      <div className="space-y-2">
                        <Label>Basic (₹)</Label>
                        <Input
                          type="number"
                          value={item.basicAmount}
                          onChange={(e) => updateLineItem(index, 'basicAmount', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>

                      {/* GST Amount */}
                      <div className="space-y-2">
                        <Label>GST (₹)</Label>
                        <Input
                          value={item.gstAmount.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="space-y-2">
                        <Label>Total (₹)</Label>
                        <Input
                          value={item.lineTotal.toFixed(2)}
                          readOnly
                          className="bg-muted font-semibold text-primary"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Payment & Totals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Cost */}
                <div className="space-y-2">
                  <Label>Total Cost (₹)</Label>
                  <Input
                    value={totalCost.toFixed(2)}
                    readOnly
                    className="bg-muted font-bold text-lg text-primary"
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

                {/* Pending Amount */}
                <div className="space-y-2">
                  <Label>Pending Amount (₹)</Label>
                  <Input
                    value={pendingAmount.toFixed(2)}
                    readOnly
                    className="bg-muted font-bold text-lg text-destructive"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
