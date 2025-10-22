import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

const profileSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required').max(100),
  organization_email: z.string().email('Invalid email address').max(255),
  organization_phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  organization_address: z.string().max(500),
  organization_gst_tin: z.string().max(50),
  organization_website: z.string().url('Invalid website URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organization_name: '',
      organization_email: '',
      organization_phone: '',
      organization_address: '',
      organization_gst_tin: '',
      organization_website: '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setValue('organization_name', data.organization_name || '');
        setValue('organization_email', data.organization_email || '');
        setValue('organization_phone', data.organization_phone || '');
        setValue('organization_address', data.organization_address || '');
        setValue('organization_gst_tin', data.organization_gst_tin || '');
        setValue('organization_website', data.organization_website || '');
      }
    } catch (error: any) {
      toast.error('Failed to load profile data');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          organization_name: data.organization_name,
          organization_email: data.organization_email,
          organization_phone: data.organization_phone,
          organization_address: data.organization_address,
          organization_gst_tin: data.organization_gst_tin,
          organization_website: data.organization_website || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Organization Profile</CardTitle>
              <CardDescription>Manage your organization's basic information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name *</Label>
                <Input
                  id="organization_name"
                  {...register('organization_name')}
                  placeholder="Your Company Ltd"
                />
                {errors.organization_name && (
                  <p className="text-sm text-destructive">{errors.organization_name.message}</p>
                )}
              </div>

              {/* Organization Email */}
              <div className="space-y-2">
                <Label htmlFor="organization_email">Email *</Label>
                <Input
                  id="organization_email"
                  type="email"
                  {...register('organization_email')}
                  placeholder="info@yourcompany.com"
                />
                {errors.organization_email && (
                  <p className="text-sm text-destructive">{errors.organization_email.message}</p>
                )}
              </div>

              {/* Organization Phone */}
              <div className="space-y-2">
                <Label htmlFor="organization_phone">Phone *</Label>
                <Input
                  id="organization_phone"
                  {...register('organization_phone')}
                  placeholder="+1234567890"
                />
                {errors.organization_phone && (
                  <p className="text-sm text-destructive">{errors.organization_phone.message}</p>
                )}
              </div>

              {/* GST-TIN */}
              <div className="space-y-2">
                <Label htmlFor="organization_gst_tin">GST-TIN Number</Label>
                <Input
                  id="organization_gst_tin"
                  {...register('organization_gst_tin')}
                  placeholder="GST123456789"
                />
                {errors.organization_gst_tin && (
                  <p className="text-sm text-destructive">{errors.organization_gst_tin.message}</p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="organization_website">Website</Label>
                <Input
                  id="organization_website"
                  type="url"
                  {...register('organization_website')}
                  placeholder="https://yourcompany.com"
                />
                {errors.organization_website && (
                  <p className="text-sm text-destructive">{errors.organization_website.message}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="organization_address">Address</Label>
                <Textarea
                  id="organization_address"
                  {...register('organization_address')}
                  placeholder="123 Business St, Corporate City, CC 10001"
                  rows={3}
                />
                {errors.organization_address && (
                  <p className="text-sm text-destructive">{errors.organization_address.message}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
