import { useState } from 'react';
import { Plus, Search, Download, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { VendorFormModal } from '@/components/vendors/VendorFormModal';
import { Vendor } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Vendors = () => {
  const { vendors, deleteVendor } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>(undefined);

  const filteredVendors = vendors.filter(
    vendor =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportToExcel = () => {
    if (filteredVendors.length === 0) {
      toast.error('No vendors to export');
      return;
    }

    const exportData = filteredVendors.map((vendor, index) => ({
      'Sl. No': index + 1,
      'Vendor Name': vendor.name,
      'Contact Person': vendor.contactPerson,
      'Email': vendor.email,
      'Phone': vendor.phone,
      'Tax ID': vendor.taxId,
      'Payment Terms (Days)': vendor.paymentTerms,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    const colWidths = [
      { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');

    const fileName = `Vendors_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success('✅ Export successful — file downloaded');
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = (vendorId: string, vendorName: string) => {
    if (confirm(`Are you sure you want to delete vendor "${vendorName}"?`)) {
      deleteVendor(vendorId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVendor(undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Vendors</CardTitle>
              <CardDescription>Manage your vendor directory</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportToExcel}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Vendor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Vendor Name</TableHead>
                  <TableHead className="font-semibold">Contact Person</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Tax ID</TableHead>
                  <TableHead className="font-semibold text-center">Payment Terms</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No vendors found. Add your first vendor to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map(vendor => (
                    <TableRow key={vendor.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-primary">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.email}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.phone}</TableCell>
                      <TableCell className="font-mono text-sm">{vendor.taxId}</TableCell>
                      <TableCell className="text-center">{vendor.paymentTerms} days</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(vendor)}
                            className="h-8 w-8 hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(vendor.id, vendor.name)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VendorFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        vendor={editingVendor}
      />
    </div>
  );
};

export default Vendors;
