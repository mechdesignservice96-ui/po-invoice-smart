import { useState, useRef } from 'react';
import { Plus, Search, Download, FileUp, Edit, Trash2, Building2, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { Customer } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Customers = () => {
  const { customers, deleteCustomer, addCustomer } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Sl. No': 1,
      'Customer Name': 'Acme Corporation',
      'Contact Person': 'Robert Davis',
      'Email': 'robert@acmecorp.com',
      'Phone': '+91-9876543210',
      'Tax ID / GST Number': '29ABCDE1234F1Z5',
      'Address': '123 Business Street, City, State - 560001',
      'Payment Terms (Days)': 30,
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    const colWidths = [
      { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    XLSX.writeFile(workbook, 'Customers_Import_Template.xlsx');

    toast.success('✅ Template downloaded — use this format for importing');
  };

  const handleExportToExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const exportData = filteredCustomers.map((customer, index) => ({
      'Sl. No': index + 1,
      'Customer Name': customer.name,
      'Contact Person': customer.contactPerson,
      'Email': customer.email,
      'Phone': customer.phone,
      'Tax ID / GST Number': customer.taxId,
      'Address': customer.address,
      'Payment Terms (Days)': customer.paymentTerms,
      'Created Date': new Date(customer.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    const colWidths = [
      { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const fileName = `Customers_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
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
            if (!row['Customer Name'] || !row['Email']) {
              errorCount++;
              return;
            }

            addCustomer({
              name: String(row['Customer Name']),
              contactPerson: String(row['Contact Person'] || ''),
              email: String(row['Email']),
              phone: String(row['Phone'] || ''),
              taxId: String(row['Tax ID / GST Number'] || ''),
              address: String(row['Address'] || ''),
              paymentTerms: Number(row['Payment Terms (Days)']) || 30,
            });

            importedCount++;
          } catch (error) {
            console.error('Error importing customer:', error);
            errorCount++;
          }
        });

        if (importedCount > 0) {
          toast.success(`✅ Successfully imported ${importedCount} customer${importedCount > 1 ? 's' : ''}`);
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

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = (customerId: string, customerName: string) => {
    if (confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
      deleteCustomer(customerId);
      toast.success(`Customer "${customerName}" deleted successfully`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Customer Management
              </CardTitle>
              <CardDescription>Manage your customer directory and relationships</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Total Customers: {customers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
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
              <span>Download Template</span>
            </Button>
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleImportClick}>
              <FileUp className="w-4 h-4" />
              <span>Import from Excel</span>
            </Button>
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportToExcel}>
              <Download className="w-4 h-4" />
              <span>Export to Excel</span>
            </Button>
            <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or contact person..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[calc(100vh-32rem)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-16">Sl. No</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Customer Name</TableHead>
                    <TableHead className="font-semibold min-w-[150px]">Contact Person</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Email</TableHead>
                    <TableHead className="font-semibold min-w-[130px]">Phone</TableHead>
                    <TableHead className="font-semibold min-w-[150px]">Tax ID</TableHead>
                    <TableHead className="font-semibold min-w-[250px]">Address</TableHead>
                    <TableHead className="font-semibold text-center min-w-[120px]">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-center min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Building2 className="w-12 h-12 opacity-20" />
                          <p className="text-lg font-medium">No customers found</p>
                          <p className="text-sm">Add your first customer to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer, index) => (
                      <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-primary">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{customer.contactPerson}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{customer.taxId}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span className="text-sm line-clamp-2">{customer.address}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            {customer.paymentTerms} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(customer)}
                              className="h-8 w-8 hover:bg-primary/10"
                              title="Edit customer"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id, customer.name)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              title="Delete customer"
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

          {/* Summary Footer */}
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <p>Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
              <p>Average Payment Terms: {Math.round(customers.reduce((acc, c) => acc + c.paymentTerms, 0) / customers.length)} days</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        customer={editingCustomer}
      />
    </div>
  );
};

export default Customers;
