import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { Customer } from '@/types';
import { Building2, User, Mail, Phone, FileText, MapPin, Calendar } from 'lucide-react';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  taxId: z.string().min(1, 'Tax ID is required'),
  address: z.string().min(10, 'Complete address is required'),
  paymentTerms: z.number().min(0, 'Payment terms must be positive').max(365, 'Payment terms cannot exceed 365 days'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}

export function CustomerFormModal({ open, onClose, customer }: CustomerFormModalProps) {
  const { addCustomer, updateCustomer } = useApp();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      taxId: '',
      address: '',
      paymentTerms: 30,
    },
  });

  useEffect(() => {
    if (customer) {
      setValue('name', customer.name);
      setValue('contactPerson', customer.contactPerson);
      setValue('email', customer.email);
      setValue('phone', customer.phone);
      setValue('taxId', customer.taxId);
      setValue('address', customer.address);
      setValue('paymentTerms', customer.paymentTerms);
    } else {
      reset();
    }
  }, [customer, setValue, reset]);

  const onSubmit = (data: CustomerFormData) => {
    const customerData: Omit<Customer, 'id' | 'createdAt'> = {
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      taxId: data.taxId,
      address: data.address,
      paymentTerms: data.paymentTerms,
    };

    if (customer) {
      updateCustomer(customer.id, customerData);
    } else {
      addCustomer(customerData);
    }

    reset();
    onClose();
  };

  const handleReset = () => {
    if (customer) {
      setValue('name', customer.name);
      setValue('contactPerson', customer.contactPerson);
      setValue('email', customer.email);
      setValue('phone', customer.phone);
      setValue('taxId', customer.taxId);
      setValue('address', customer.address);
      setValue('paymentTerms', customer.paymentTerms);
    } else {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Company Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Customer Name *
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Acme Corporation"
                  className="transition-all"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <Label htmlFor="contactPerson" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Person *
                </Label>
                <Input
                  id="contactPerson"
                  {...register('contactPerson')}
                  placeholder="John Doe"
                  className="transition-all"
                />
                {errors.contactPerson && (
                  <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@acmecorp.com"
                  className="transition-all"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+91-9876543210"
                  className="transition-all"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tax & Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Tax & Address Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax ID */}
              <div className="space-y-2">
                <Label htmlFor="taxId" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tax ID / GST Number *
                </Label>
                <Input
                  id="taxId"
                  {...register('taxId')}
                  placeholder="29ABCDE1234F1Z5"
                  className="transition-all font-mono"
                />
                {errors.taxId && (
                  <p className="text-sm text-destructive">{errors.taxId.message}</p>
                )}
              </div>

              {/* Payment Terms */}
              <div className="space-y-2">
                <Label htmlFor="paymentTerms" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Payment Terms (Days) *
                </Label>
                <Input
                  id="paymentTerms"
                  type="number"
                  {...register('paymentTerms', { valueAsNumber: true })}
                  placeholder="30"
                  min="0"
                  max="365"
                  className="transition-all"
                />
                {errors.paymentTerms && (
                  <p className="text-sm text-destructive">{errors.paymentTerms.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Complete Address *
              </Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="123 Business Street, City, State - 560001"
                rows={3}
                className="transition-all resize-none"
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
