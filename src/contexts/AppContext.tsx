import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, Customer, SaleOrder, Invoice, DashboardStats, Expense } from '@/types';
import { toast } from 'sonner';

interface AppContextType {
  vendors: Vendor[];
  customers: Customer[];
  saleOrders: SaleOrder[];
  invoices: Invoice[];
  expenses: Expense[];
  dashboardStats: DashboardStats;
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addSaleOrder: (so: Omit<SaleOrder, 'id' | 'soNumber' | 'createdAt'>) => void;
  updateSaleOrder: (id: string, so: Partial<SaleOrder>) => void;
  deleteSaleOrder: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'daysDelayed'>) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  VENDORS: 'finance_vendors',
  CUSTOMERS: 'finance_customers',
  SOS: 'finance_sos',
  INVOICES: 'finance_invoices',
  EXPENSES: 'finance_expenses',
};

// Helper function to calculate days delayed
const calculateDaysDelayed = (dueDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Helper function to determine invoice status
const determineInvoiceStatus = (invoice: Invoice): Invoice['status'] => {
  if (invoice.amountReceived >= invoice.totalCost) return 'Paid';
  if (invoice.amountReceived > 0) return 'Partial';
  const daysDelayed = calculateDaysDelayed(invoice.dueDate);
  if (daysDelayed > 0) return 'Overdue';
  return 'Unpaid';
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedVendors = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENDORS) || '[]');
    const loadedCustomers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    const loadedSOs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOS) || '[]');
    const loadedInvoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const loadedExpenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');

    // Parse dates
    const parseDates = (items: any[], dateFields: string[]) =>
      items.map(item => {
        const parsed = { ...item };
        dateFields.forEach(field => {
          if (parsed[field]) parsed[field] = new Date(parsed[field]);
        });
        return parsed;
      });

    // Migrate old invoice format to new lineItems format
    const migrateInvoices = (invoices: any[]): Invoice[] => {
      return invoices.map(inv => {
        // Check if invoice has old format (direct particulars, poQty, etc.)
        if (inv.particulars && !inv.lineItems) {
          // Convert old format to new format
          return {
            ...inv,
            lineItems: [
              {
                id: `item-${inv.id}-1`,
                particulars: inv.particulars,
                poQty: inv.poQty || 0,
                qtyDispatched: inv.qtyDispatched || 0,
                balanceQty: inv.balanceQty || 0,
                basicAmount: inv.basicAmount || 0,
                gstPercent: inv.gstPercent || 0,
                gstAmount: inv.gstAmount || 0,
                transportationCost: inv.transportationCost || 0,
                lineTotal: inv.totalCost || 0,
              },
            ],
            // Remove old fields
            particulars: undefined,
            poQty: undefined,
            qtyDispatched: undefined,
            balanceQty: undefined,
            basicAmount: undefined,
            gstPercent: undefined,
            gstAmount: undefined,
            transportationCost: undefined,
          };
        }
        // Ensure lineItems exists
        return {
          ...inv,
          lineItems: inv.lineItems || [],
        };
      });
    };

    // Initialize with dummy data if empty
    if (loadedVendors.length === 0) {
      const dummyVendors: Vendor[] = [
        {
          id: 'V1',
          name: 'Tech Solutions Ltd',
          contactPerson: 'John Smith',
          email: 'john@techsolutions.com',
          phone: '+1-555-0101',
          taxId: 'TAX-001',
          paymentTerms: 30,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'V2',
          name: 'Office Supplies Co',
          contactPerson: 'Sarah Johnson',
          email: 'sarah@officesupplies.com',
          phone: '+1-555-0102',
          taxId: 'TAX-002',
          paymentTerms: 15,
          createdAt: new Date('2024-02-01'),
        },
        {
          id: 'V3',
          name: 'Cloud Services Inc',
          contactPerson: 'Michael Chen',
          email: 'michael@cloudservices.com',
          phone: '+1-555-0103',
          taxId: 'TAX-003',
          paymentTerms: 30,
          createdAt: new Date('2024-03-10'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(dummyVendors));
      setVendors(dummyVendors);

      const dummyCustomers: Customer[] = [
        {
          id: 'C1',
          name: 'Acme Corporation',
          contactPerson: 'Robert Davis',
          email: 'robert@acmecorp.com',
          phone: '+1-555-0201',
          taxId: 'CUST-TAX-001',
          address: '123 Business St, Corporate City, CC 10001',
          paymentTerms: 30,
          createdAt: new Date('2024-01-10'),
        },
        {
          id: 'C2',
          name: 'Global Retailers Ltd',
          contactPerson: 'Emily Wilson',
          email: 'emily@globalretailers.com',
          phone: '+1-555-0202',
          taxId: 'CUST-TAX-002',
          address: '456 Market Ave, Trade Town, TT 20002',
          paymentTerms: 15,
          createdAt: new Date('2024-02-15'),
        },
        {
          id: 'C3',
          name: 'TechWorld Systems',
          contactPerson: 'David Kumar',
          email: 'david@techworld.com',
          phone: '+1-555-0203',
          taxId: 'CUST-TAX-003',
          address: '789 Innovation Blvd, Silicon Valley, SV 30003',
          paymentTerms: 30,
          createdAt: new Date('2024-03-20'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(dummyCustomers));
      setCustomers(dummyCustomers);

      const dummySOs: SaleOrder[] = [
        {
          id: 'SO1',
          soNumber: 'SO-2025-001',
          customerId: 'C1',
          customerName: 'Acme Corporation',
          soDate: new Date('2025-01-05'),
          particulars: 'Enterprise Software License - Premium Package with 24/7 Support',
          soQty: 100,
          basicAmount: 500000,
          gstPercent: 18,
          gstAmount: 90000,
          total: 590000,
          balanceQty: 40,
          status: 'Confirmed',
          notes: 'Annual enterprise license for 100 users',
          createdAt: new Date('2025-01-05'),
        },
        {
          id: 'SO2',
          soNumber: 'SO-2025-002',
          customerId: 'C2',
          customerName: 'Global Retailers Ltd',
          soDate: new Date('2025-01-10'),
          particulars: 'POS System Hardware - Terminal & Scanner Bundle',
          soQty: 50,
          basicAmount: 150000,
          gstPercent: 12,
          gstAmount: 18000,
          total: 168000,
          balanceQty: 0,
          status: 'Dispatched',
          notes: 'POS hardware for retail stores',
          createdAt: new Date('2025-01-10'),
        },
        {
          id: 'SO3',
          soNumber: 'SO-2025-003',
          customerId: 'C3',
          customerName: 'TechWorld Systems',
          soDate: new Date('2024-12-20'),
          particulars: 'Cloud Infrastructure Setup & Maintenance - Q1 2025',
          soQty: 1,
          basicAmount: 240000,
          gstPercent: 18,
          gstAmount: 43200,
          total: 283200,
          balanceQty: 0,
          status: 'Delivered',
          notes: 'Cloud infrastructure services Q1',
          createdAt: new Date('2024-12-20'),
        },
        {
          id: 'SO4',
          soNumber: 'SO-2025-004',
          customerId: 'C1',
          customerName: 'Acme Corporation',
          soDate: new Date('2025-01-12'),
          particulars: 'Custom CRM Development - Phase 1 with Integration',
          soQty: 1,
          basicAmount: 350000,
          gstPercent: 18,
          gstAmount: 63000,
          total: 413000,
          balanceQty: 0,
          status: 'Dispatched',
          notes: 'CRM development project',
          createdAt: new Date('2025-01-12'),
        },
        {
          id: 'SO5',
          soNumber: 'SO-2025-005',
          customerId: 'C3',
          customerName: 'TechWorld Systems',
          soDate: new Date('2025-01-15'),
          particulars: 'IT Consulting Services - Annual Retainer Package',
          soQty: 12,
          basicAmount: 960000,
          gstPercent: 18,
          gstAmount: 172800,
          total: 1132800,
          balanceQty: 10,
          status: 'Confirmed',
          notes: 'Monthly consulting retainer',
          createdAt: new Date('2025-01-15'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.SOS, JSON.stringify(dummySOs));
      setSaleOrders(dummySOs);

      const dummyInvoices: Invoice[] = [
        {
          id: 'INV1',
          invoiceNumber: 'INV-2025-001',
          invoiceDate: new Date('2025-01-15'),
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poNumber: 'PO-2025-001',
          poDate: new Date('2025-01-05'),
          lineItems: [
            {
              id: 'item1',
              particulars: 'Dell Latitude 5420 Laptops - i7 11th Gen, 16GB RAM, 512GB SSD',
              poQty: 100,
              qtyDispatched: 60,
              balanceQty: 40,
              basicAmount: 250000,
              gstPercent: 18,
              gstAmount: 45000,
              transportationCost: 5000,
              lineTotal: 300000,
            },
          ],
          totalCost: 300000,
          amountReceived: 150000,
          pendingAmount: 150000,
          status: 'Partial',
          dueDate: new Date('2025-02-15'),
          daysDelayed: 0,
          poId: 'PO1',
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'INV2',
          invoiceNumber: 'INV-2025-002',
          invoiceDate: new Date('2025-01-12'),
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          poNumber: 'PO-2025-002',
          poDate: new Date('2025-01-10'),
          lineItems: [
            {
              id: 'item2-1',
              particulars: 'Ergonomic Office Chairs - Premium Model',
              poQty: 30,
              qtyDispatched: 30,
              balanceQty: 0,
              basicAmount: 45000,
              gstPercent: 12,
              gstAmount: 5400,
              transportationCost: 1200,
              lineTotal: 51600,
            },
            {
              id: 'item2-2',
              particulars: 'Adjustable Standing Desk Frames',
              poQty: 20,
              qtyDispatched: 20,
              balanceQty: 0,
              basicAmount: 30000,
              gstPercent: 12,
              gstAmount: 3600,
              transportationCost: 800,
              lineTotal: 34400,
            },
          ],
          totalCost: 86000,
          amountReceived: 0,
          pendingAmount: 86000,
          status: 'Overdue',
          dueDate: new Date('2025-01-05'),
          daysDelayed: 7,
          poId: 'PO2',
          createdAt: new Date('2025-01-12'),
        },
        {
          id: 'INV3',
          invoiceNumber: 'INV-2025-003',
          invoiceDate: new Date('2024-12-28'),
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poNumber: 'PO-2025-003',
          poDate: new Date('2024-12-20'),
          lineItems: [
            {
              id: 'item3',
              particulars: 'AWS Cloud Hosting - Q1 2025 Premium Package with 24/7 Support',
              poQty: 1,
              qtyDispatched: 1,
              balanceQty: 0,
              basicAmount: 120000,
              gstPercent: 18,
              gstAmount: 21600,
              transportationCost: 0,
              lineTotal: 141600,
            },
          ],
          totalCost: 141600,
          amountReceived: 141600,
          pendingAmount: 0,
          status: 'Paid',
          dueDate: new Date('2025-01-28'),
          daysDelayed: 0,
          poId: 'PO3',
          createdAt: new Date('2024-12-28'),
        },
        {
          id: 'INV4',
          invoiceNumber: 'INV-2025-004',
          invoiceDate: new Date('2025-01-18'),
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poNumber: 'PO-2025-004',
          poDate: new Date('2025-01-12'),
          lineItems: [
            {
              id: 'item4-1',
              particulars: 'HP LaserJet Pro Printers',
              poQty: 10,
              qtyDispatched: 10,
              balanceQty: 0,
              basicAmount: 74000,
              gstPercent: 18,
              gstAmount: 13320,
              transportationCost: 1400,
              lineTotal: 88720,
            },
            {
              id: 'item4-2',
              particulars: 'HP Toner Cartridges - High Yield',
              poQty: 50,
              qtyDispatched: 50,
              balanceQty: 0,
              basicAmount: 111000,
              gstPercent: 18,
              gstAmount: 19980,
              transportationCost: 2100,
              lineTotal: 133080,
            },
          ],
          totalCost: 221800,
          amountReceived: 110900,
          pendingAmount: 110900,
          status: 'Partial',
          dueDate: new Date('2025-02-18'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-18'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(dummyInvoices));
      setInvoices(dummyInvoices);

      const dummyExpenses: Expense[] = [
        {
          id: 'EXP1',
          date: new Date('2025-01-20'),
          category: 'Travel',
          description: 'Client meeting travel to Mumbai',
          amount: 8500,
          paymentMode: 'Card',
          status: 'Paid',
          createdAt: new Date('2025-01-20'),
        },
        {
          id: 'EXP2',
          date: new Date('2025-01-18'),
          category: 'Rent',
          description: 'Office rent for January 2025',
          amount: 50000,
          paymentMode: 'Bank Transfer',
          status: 'Paid',
          createdAt: new Date('2025-01-18'),
        },
        {
          id: 'EXP3',
          date: new Date('2025-01-15'),
          category: 'Utilities',
          description: 'Electricity bill for December 2024',
          amount: 12000,
          paymentMode: 'UPI',
          status: 'Paid',
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'EXP4',
          date: new Date('2025-01-12'),
          category: 'Supplies',
          description: 'Office stationery and supplies',
          amount: 3500,
          paymentMode: 'Cash',
          status: 'Paid',
          createdAt: new Date('2025-01-12'),
        },
        {
          id: 'EXP5',
          date: new Date('2025-01-10'),
          category: 'Misc',
          description: 'Team lunch and refreshments',
          amount: 4200,
          paymentMode: 'Card',
          status: 'Paid',
          createdAt: new Date('2025-01-10'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(dummyExpenses));
      setExpenses(dummyExpenses);
    } else {
      setVendors(parseDates(loadedVendors, ['createdAt']));
      setCustomers(parseDates(loadedCustomers, ['createdAt']));
      setSaleOrders(parseDates(loadedSOs, ['soDate', 'createdAt']));
      const migratedInvoices = migrateInvoices(loadedInvoices);
      setInvoices(parseDates(migratedInvoices, ['invoiceDate', 'dueDate', 'createdAt']));
      setExpenses(parseDates(loadedExpenses, ['date', 'createdAt']));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOS, JSON.stringify(saleOrders));
  }, [saleOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalPOValue: saleOrders.reduce((sum, so) => sum + so.total, 0),
    totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalCost, 0),
    totalPaid: invoices.reduce((sum, inv) => sum + inv.amountReceived, 0),
    totalOutstanding: invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0),
    overdueCount: invoices.filter(inv => inv.status === 'Overdue').length,
    overdueAmount: invoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.pendingAmount, 0),
  };

  const addVendor = (vendor: Omit<Vendor, 'id' | 'createdAt'>) => {
    const newVendor: Vendor = {
      ...vendor,
      id: `V${Date.now()}`,
      createdAt: new Date(),
    };
    setVendors([...vendors, newVendor]);
    toast.success('Vendor added successfully');
  };

  const updateVendor = (id: string, vendor: Partial<Vendor>) => {
    setVendors(vendors.map(v => (v.id === id ? { ...v, ...vendor } : v)));
    toast.success('Vendor updated successfully');
  };

  const deleteVendor = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
    toast.success('Vendor deleted successfully');
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `C${Date.now()}`,
      createdAt: new Date(),
    };
    setCustomers([...customers, newCustomer]);
    toast.success('Customer added successfully');
  };

  const updateCustomer = (id: string, customer: Partial<Customer>) => {
    setCustomers(customers.map(c => (c.id === id ? { ...c, ...customer } : c)));
    toast.success('Customer updated successfully');
  };

  const deleteCustomer = (id: string) => {
    setCustomers(customers.filter(c => c.id !== id));
    toast.success('Customer deleted successfully');
  };

  const addSaleOrder = (so: Omit<SaleOrder, 'id' | 'soNumber' | 'createdAt'>) => {
    const soNumber = `SO-${new Date().getFullYear()}-${String(saleOrders.length + 1).padStart(3, '0')}`;
    const newSO: SaleOrder = {
      ...so,
      id: `SO${Date.now()}`,
      soNumber,
      createdAt: new Date(),
    };
    setSaleOrders([...saleOrders, newSO]);
    toast.success(`Sale Order ${soNumber} created successfully`);
  };

  const updateSaleOrder = (id: string, so: Partial<SaleOrder>) => {
    setSaleOrders(saleOrders.map(s => (s.id === id ? { ...s, ...so } : s)));
    toast.success('Sale Order updated successfully');
  };

  const deleteSaleOrder = (id: string) => {
    setSaleOrders(saleOrders.filter(s => s.id !== id));
    toast.success('Sale Order deleted successfully');
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'daysDelayed'>) => {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
    const daysDelayed = calculateDaysDelayed(invoice.dueDate);
    const newInvoice: Invoice = {
      ...invoice,
      id: `INV${Date.now()}`,
      invoiceNumber,
      daysDelayed,
      createdAt: new Date(),
    };
    // Auto-determine status
    newInvoice.status = determineInvoiceStatus(newInvoice);
    setInvoices([...invoices, newInvoice]);
    toast.success(`Invoice ${invoiceNumber} created successfully`);
  };

  const updateInvoice = (id: string, invoice: Partial<Invoice>) => {
    setInvoices(
      invoices.map(inv => {
        if (inv.id === id) {
          const updated = { ...inv, ...invoice };
          updated.daysDelayed = calculateDaysDelayed(updated.dueDate);
          updated.status = determineInvoiceStatus(updated);
          return updated;
        }
        return inv;
      })
    );
    toast.success('Invoice updated successfully');
  };

  const deleteInvoice = (id: string) => {
    setInvoices(invoices.filter(inv => inv.id !== id));
    toast.success('Invoice deleted successfully');
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `EXP${Date.now()}`,
      createdAt: new Date(),
    };
    setExpenses([...expenses, newExpense]);
    toast.success('Expense added successfully');
  };

  const updateExpense = (id: string, expense: Partial<Expense>) => {
    setExpenses(expenses.map(exp => (exp.id === id ? { ...exp, ...expense } : exp)));
    toast.success('Expense updated successfully');
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
    toast.success('Expense deleted successfully');
  };

  return (
    <AppContext.Provider
      value={{
        vendors,
        customers,
        saleOrders,
        invoices,
        expenses,
        dashboardStats,
        addVendor,
        updateVendor,
        deleteVendor,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSaleOrder,
        updateSaleOrder,
        deleteSaleOrder,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addExpense,
        updateExpense,
        deleteExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
