import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const profileSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required'),
  organization_email: z.string().email('Invalid email address'),
  organization_phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  organization_address: z.string().min(1, 'Address is required'),
  organization_gst_tin: z.string().min(1, 'GST-TIN Number is required'),
  organization_website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const PROFILE_STORAGE_KEY = 'finance_organization_profile';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setValue('organization_name', data.organization_name || '');
        setValue('organization_email', data.organization_email || '');
        setValue('organization_phone', data.organization_phone || '');
        setValue('organization_address', data.organization_address || '');
        setValue('organization_gst_tin', data.organization_gst_tin || '');
        setValue('organization_website', data.organization_website || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
    setLoading(false);
  };

  const onSubmit = (data: ProfileFormData) => {
    setSaving(true);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
      toast.success('Profile saved successfully!');
    } catch (error) {
      toast.error('Failed to save profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Organization Profile</CardTitle>
          <CardDescription>Manage your organization's information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name *</Label>
                <Input
                  id="organization_name"
                  {...register('organization_name')}
                  placeholder="ABC Corporation"
                />
                {errors.organization_name && (
                  <p className="text-sm text-destructive">{errors.organization_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_email">Organization Email *</Label>
                <Input
                  id="organization_email"
                  type="email"
                  {...register('organization_email')}
                  placeholder="info@company.com"
                />
                {errors.organization_email && (
                  <p className="text-sm text-destructive">{errors.organization_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_phone">Phone Number *</Label>
                <Input
                  id="organization_phone"
                  {...register('organization_phone')}
                  placeholder="+1234567890"
                />
                {errors.organization_phone && (
                  <p className="text-sm text-destructive">{errors.organization_phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_gst_tin">GST-TIN Number *</Label>
                <Input
                  id="organization_gst_tin"
                  {...register('organization_gst_tin')}
                  placeholder="GST123456789"
                />
                {errors.organization_gst_tin && (
                  <p className="text-sm text-destructive">{errors.organization_gst_tin.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="organization_address">Address *</Label>
                <Input
                  id="organization_address"
                  {...register('organization_address')}
                  placeholder="123 Business St, City, State, ZIP"
                />
                {errors.organization_address && (
                  <p className="text-sm text-destructive">{errors.organization_address.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="organization_website">Website</Label>
                <Input
                  id="organization_website"
                  {...register('organization_website')}
                  placeholder="https://www.company.com"
                />
                {errors.organization_website && (
                  <p className="text-sm text-destructive">{errors.organization_website.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
