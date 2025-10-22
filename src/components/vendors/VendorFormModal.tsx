import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { Vendor } from '@/types';

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  gstTin: z.string().min(1, 'GST-TIN Number is required'),
  paymentTerms: z.number().min(0, 'Payment terms must be positive'),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
}

export function VendorFormModal({ open, onClose, vendor }: VendorFormModalProps) {
  const { addVendor, updateVendor } = useApp();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstTin: '',
      paymentTerms: 30,
    },
  });

  useEffect(() => {
    if (vendor) {
      setValue('name', vendor.name);
      setValue('contactPerson', vendor.contactPerson);
      setValue('email', vendor.email);
      setValue('phone', vendor.phone);
      setValue('gstTin', vendor.gstTin);
      setValue('paymentTerms', vendor.paymentTerms);
    }
  }, [vendor, setValue]);

  const onSubmit = (data: VendorFormData) => {
    const vendorData: Omit<Vendor, 'id' | 'createdAt'> = {
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      gstTin: data.gstTin,
      paymentTerms: data.paymentTerms,
    };

    if (vendor) {
      updateVendor(vendor.id, vendorData);
    } else {
      addVendor(vendorData);
    }

    reset();
    onClose();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🏢 {vendor ? 'Edit' : 'Add'} Vendor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="ABC Corporation"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="John Doe"
              />
              {errors.contactPerson && (
                <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="vendor@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1234567890"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* GST-TIN Number */}
            <div className="space-y-2">
              <Label htmlFor="gstTin">GST-TIN Number *</Label>
              <Input
                id="gstTin"
                {...register('gstTin')}
                placeholder="GST123456789"
              />
              {errors.gstTin && (
                <p className="text-sm text-destructive">{errors.gstTin.message}</p>
              )}
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms (Days) *</Label>
              <Input
                id="paymentTerms"
                type="number"
                {...register('paymentTerms', { valueAsNumber: true })}
                placeholder="30"
              />
              {errors.paymentTerms && (
                <p className="text-sm text-destructive">{errors.paymentTerms.message}</p>
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
              💾 Save Vendor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
