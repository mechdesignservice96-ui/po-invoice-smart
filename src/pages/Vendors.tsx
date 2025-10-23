import { useState, useRef } from 'react';
import { Plus, Search, Download, FileUp, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { VendorFormModal } from '@/components/vendors/VendorFormModal';
import { Vendor } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Vendors = () => {
  const { vendors, deleteVendor, addVendor } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>(undefined);

  const filteredVendors = vendors.filter(
    vendor =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Sl. No': 1,
      'Vendor Name': 'Sample Vendor Ltd',
      'Contact Person': 'John Smith',
      'Email': 'john.smith@samplevendor.com',
      'Phone': '+91-9876543210',
      'GST-TIN Number': 'GST123456789',
      'Payment Terms (Days)': 30,
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    const colWidths = [
      { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');

    XLSX.writeFile(workbook, 'Vendors_Import_Template.xlsx');

    toast.success('✅ Template downloaded — use this format for importing');
  };

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
      'GST-TIN Number': vendor.gstTin,
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('No data found in the Excel file');
          return;
        }

        let importedCount = 0;
        let errorCount = 0;

        jsonData.forEach((row: any) => {
          try {
            if (!row['Vendor Name'] || !row['Email']) {
              errorCount++;
              return;
            }

            addVendor({
              name: String(row['Vendor Name']),
              contactPerson: String(row['Contact Person'] || ''),
              email: String(row['Email']),
              phone: String(row['Phone'] || ''),
              gstTin: String(row['GST-TIN Number'] || ''),
              paymentTerms: Number(row['Payment Terms (Days)']) || 30,
            });

            importedCount++;
          } catch (error) {
            console.error('Error importing vendor:', error);
            errorCount++;
          }
        });

        if (importedCount > 0) {
          toast.success(`✅ Successfully imported ${importedCount} vendor${importedCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          toast.warning(`⚠️ ${errorCount} row${errorCount > 1 ? 's' : ''} skipped due to missing or invalid data`);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to import Excel file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file');
    };

    reader.readAsBinaryString(file);
    
    if (event.target) {
      event.target.value = '';
    }
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
              />
              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
              <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleImportClick}>
                <FileUp className="w-4 h-4" />
                <span className="hidden sm:inline">Import from Excel</span>
                <span className="sm:hidden">Import</span>
              </Button>
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
            <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Sl. No</TableHead>
                    <TableHead className="font-semibold">Vendor Name</TableHead>
                    <TableHead className="font-semibold">Contact Person</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">GST-TIN Number</TableHead>
                    <TableHead className="font-semibold text-center">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No vendors found. Add your first vendor to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor, index) => (
                    <TableRow key={vendor.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.email}</TableCell>
                      <TableCell className="text-muted-foreground">{vendor.phone}</TableCell>
                      <TableCell className="font-mono text-sm">{vendor.gstTin}</TableCell>
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
