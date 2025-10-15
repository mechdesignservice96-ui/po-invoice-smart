import { useState } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Vendors = () => {
  const { vendors } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

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
              <Button className="gap-2 w-full sm:w-auto">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No vendors found. Add your first vendor to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map(vendor => (
                    <TableRow key={vendor.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                      <TableCell className="font-medium text-primary">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.email}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.phone}</TableCell>
                      <TableCell className="font-mono text-sm">{vendor.taxId}</TableCell>
                      <TableCell className="text-center">{vendor.paymentTerms} days</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;
