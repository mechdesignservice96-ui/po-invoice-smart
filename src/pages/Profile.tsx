import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile');
      } else if (data) {
        setValue('organization_name', data.organization_name || '');
        setValue('organization_email', data.organization_email || '');
        setValue('organization_phone', data.organization_phone || '');
        setValue('organization_address', data.organization_address || '');
        setValue('organization_gst_tin', data.organization_gst_tin || '');
        setValue('organization_website', data.organization_website || '');
        setLogoUrl(data.company_logo_url);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
    setLoading(false);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...data,
          company_logo_url: logoUrl,
        });

      if (error) throw error;
      
      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    }
    setSaving(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('company-logos')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !user) return;

    try {
      const path = logoUrl.split('/').slice(-2).join('/');
      const { error } = await supabase.storage
        .from('company-logos')
        .remove([path]);

      if (error) throw error;

      setLogoUrl(null);
      toast.success('Logo removed successfully!');
    } catch (error) {
      console.error('Failed to remove logo:', error);
      toast.error('Failed to remove logo');
    }
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
            {/* Company Logo Upload Section */}
            <div className="space-y-4 pb-6 border-b">
              <Label>Company Logo</Label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {logoUrl ? (
                    <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        className="w-full h-full object-contain bg-muted"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/20">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload your company logo. Recommended size: 500x500px. Max file size: 2MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
              </div>
            </div>

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
