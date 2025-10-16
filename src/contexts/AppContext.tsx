import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, PurchaseOrder, Invoice, DashboardStats, Expense } from '@/types';
import { toast } from 'sonner';

interface AppContextType {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  expenses: Expense[];
  dashboardStats: DashboardStats;
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => void;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
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
  POS: 'finance_pos',
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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedVendors = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENDORS) || '[]');
    const loadedPOs = JSON.parse(localStorage.getItem(STORAGE_KEYS.POS) || '[]');
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

      const dummyPOs: PurchaseOrder[] = [
        {
          id: 'PO1',
          poNumber: 'PO-2025-001',
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poDate: new Date('2025-01-05'),
          particulars: 'Dell Latitude 5420 Laptops - i7 11th Gen, 16GB RAM, 512GB SSD',
          poQty: 100,
          basicAmount: 250000,
          gstPercent: 18,
          gstAmount: 45000,
          total: 295000,
          balanceQty: 40,
          status: 'Ordered',
          notes: 'Annual laptop procurement for new employees',
          createdAt: new Date('2025-01-05'),
        },
        {
          id: 'PO2',
          poNumber: 'PO-2025-002',
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          poDate: new Date('2025-01-10'),
          particulars: 'Ergonomic Office Chairs - Premium Model with Lumbar Support',
          poQty: 50,
          basicAmount: 75000,
          gstPercent: 12,
          gstAmount: 9000,
          total: 84000,
          balanceQty: 0,
          status: 'Received',
          notes: 'Office furniture upgrade project',
          createdAt: new Date('2025-01-10'),
        },
        {
          id: 'PO3',
          poNumber: 'PO-2025-003',
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poDate: new Date('2024-12-20'),
          particulars: 'AWS Cloud Hosting - Q1 2025 Premium Package with 24/7 Support',
          poQty: 1,
          basicAmount: 120000,
          gstPercent: 18,
          gstAmount: 21600,
          total: 141600,
          balanceQty: 0,
          status: 'Paid',
          notes: 'Cloud hosting services Q1',
          createdAt: new Date('2024-12-20'),
        },
        {
          id: 'PO4',
          poNumber: 'PO-2025-004',
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poDate: new Date('2025-01-12'),
          particulars: 'HP LaserJet Pro Printers - Network enabled with automatic duplex',
          poQty: 25,
          basicAmount: 185000,
          gstPercent: 18,
          gstAmount: 33300,
          total: 218300,
          balanceQty: 0,
          status: 'Received',
          notes: 'Department printer upgrade',
          createdAt: new Date('2025-01-12'),
        },
        {
          id: 'PO5',
          poNumber: 'PO-2025-005',
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poDate: new Date('2025-01-15'),
          particulars: 'Microsoft 365 Business Premium Licenses - Annual Subscription',
          poQty: 150,
          basicAmount: 480000,
          gstPercent: 18,
          gstAmount: 86400,
          total: 566400,
          balanceQty: 0,
          status: 'Ordered',
          notes: 'Company-wide license renewal',
          createdAt: new Date('2025-01-15'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(dummyPOs));
      setPurchaseOrders(dummyPOs);

      const dummyInvoices: Invoice[] = [
        {
          id: 'INV1',
          invoiceNumber: 'INV-2025-001',
          invoiceDate: new Date('2025-01-15'),
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poNumber: 'PO-2025-001',
          poDate: new Date('2025-01-05'),
          particulars: 'Dell Latitude 5420 Laptops - i7 11th Gen, 16GB RAM, 512GB SSD',
          poQty: 100,
          qtyDispatched: 60,
          balanceQty: 40,
          basicAmount: 250000,
          gstPercent: 18,
          gstAmount: 45000,
          transportationCost: 5000,
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
          particulars: 'Ergonomic Office Chairs - Premium Model with Lumbar Support',
          poQty: 50,
          qtyDispatched: 50,
          balanceQty: 0,
          basicAmount: 75000,
          gstPercent: 12,
          gstAmount: 9000,
          transportationCost: 2000,
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
          particulars: 'AWS Cloud Hosting - Q1 2025 Premium Package with 24/7 Support',
          poQty: 1,
          qtyDispatched: 1,
          balanceQty: 0,
          basicAmount: 120000,
          gstPercent: 18,
          gstAmount: 21600,
          transportationCost: 0,
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
          particulars: 'HP LaserJet Pro Printers - Network enabled with automatic duplex',
          poQty: 25,
          qtyDispatched: 25,
          balanceQty: 0,
          basicAmount: 185000,
          gstPercent: 18,
          gstAmount: 33300,
          transportationCost: 3500,
          totalCost: 221800,
          amountReceived: 110900,
          pendingAmount: 110900,
          status: 'Partial',
          dueDate: new Date('2025-02-18'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-18'),
        },
        {
          id: 'INV5',
          invoiceNumber: 'INV-2025-005',
          invoiceDate: new Date('2024-12-15'),
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          poNumber: 'PO-2024-015',
          poDate: new Date('2024-12-05'),
          particulars: 'Standing Desks - Electric Height Adjustable with Memory Settings',
          poQty: 30,
          qtyDispatched: 20,
          balanceQty: 10,
          basicAmount: 95000,
          gstPercent: 12,
          gstAmount: 11400,
          transportationCost: 4500,
          totalCost: 110900,
          amountReceived: 0,
          pendingAmount: 110900,
          status: 'Overdue',
          dueDate: new Date('2024-12-31'),
          daysDelayed: 13,
          createdAt: new Date('2024-12-15'),
        },
        {
          id: 'INV6',
          invoiceNumber: 'INV-2025-006',
          invoiceDate: new Date('2025-01-20'),
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poNumber: 'PO-2025-005',
          poDate: new Date('2025-01-15'),
          particulars: 'Microsoft 365 Business Premium Licenses - Annual Subscription',
          poQty: 150,
          qtyDispatched: 150,
          balanceQty: 0,
          basicAmount: 480000,
          gstPercent: 18,
          gstAmount: 86400,
          transportationCost: 0,
          totalCost: 566400,
          amountReceived: 0,
          pendingAmount: 566400,
          status: 'Unpaid',
          dueDate: new Date('2025-02-20'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-20'),
        },
        {
          id: 'INV7',
          invoiceNumber: 'INV-2025-007',
          invoiceDate: new Date('2025-01-08'),
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poNumber: 'PO-2025-006',
          poDate: new Date('2025-01-02'),
          particulars: 'Logitech Wireless Keyboards and Mouse Combo - Ergonomic Design',
          poQty: 200,
          qtyDispatched: 200,
          balanceQty: 0,
          basicAmount: 85000,
          gstPercent: 18,
          gstAmount: 15300,
          transportationCost: 1200,
          totalCost: 101500,
          amountReceived: 101500,
          pendingAmount: 0,
          status: 'Paid',
          dueDate: new Date('2025-02-08'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-08'),
        },
        {
          id: 'INV8',
          invoiceNumber: 'INV-2025-008',
          invoiceDate: new Date('2024-12-20'),
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          poNumber: 'PO-2024-016',
          poDate: new Date('2024-12-10'),
          particulars: 'Whiteboard with Markers - Large 6x4 feet magnetic surface',
          poQty: 15,
          qtyDispatched: 10,
          balanceQty: 5,
          basicAmount: 42000,
          gstPercent: 12,
          gstAmount: 5040,
          transportationCost: 2500,
          totalCost: 49540,
          amountReceived: 0,
          pendingAmount: 49540,
          status: 'Overdue',
          dueDate: new Date('2025-01-10'),
          daysDelayed: 3,
          createdAt: new Date('2024-12-20'),
        },
        {
          id: 'INV9',
          invoiceNumber: 'INV-2025-009',
          invoiceDate: new Date('2025-01-22'),
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poNumber: 'PO-2025-007',
          poDate: new Date('2025-01-18'),
          particulars: 'Zoom Video Conferencing Enterprise License - 500 User Capacity',
          poQty: 1,
          qtyDispatched: 1,
          balanceQty: 0,
          basicAmount: 280000,
          gstPercent: 18,
          gstAmount: 50400,
          transportationCost: 0,
          totalCost: 330400,
          amountReceived: 0,
          pendingAmount: 330400,
          status: 'Unpaid',
          dueDate: new Date('2025-02-22'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-22'),
        },
        {
          id: 'INV10',
          invoiceNumber: 'INV-2025-010',
          invoiceDate: new Date('2025-01-10'),
          vendorId: 'V1',
          vendorName: 'Tech Solutions Ltd',
          poNumber: 'PO-2025-008',
          poDate: new Date('2025-01-03'),
          particulars: 'Samsung 27" LED Monitors - Full HD with HDMI and DisplayPort',
          poQty: 80,
          qtyDispatched: 80,
          balanceQty: 0,
          basicAmount: 320000,
          gstPercent: 18,
          gstAmount: 57600,
          transportationCost: 6000,
          totalCost: 383600,
          amountReceived: 191800,
          pendingAmount: 191800,
          status: 'Partial',
          dueDate: new Date('2025-02-10'),
          daysDelayed: 0,
          createdAt: new Date('2025-01-10'),
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
      setPurchaseOrders(parseDates(loadedPOs, ['poDate', 'createdAt']));
      setInvoices(parseDates(loadedInvoices, ['invoiceDate', 'dueDate', 'createdAt']));
      setExpenses(parseDates(loadedExpenses, ['date', 'createdAt']));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalPOValue: purchaseOrders.reduce((sum, po) => sum + po.total, 0),
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

  const addPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => {
    const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...po,
      id: `PO${Date.now()}`,
      poNumber,
      createdAt: new Date(),
    };
    setPurchaseOrders([...purchaseOrders, newPO]);
    toast.success(`Purchase Order ${poNumber} created successfully`);
  };

  const updatePurchaseOrder = (id: string, po: Partial<PurchaseOrder>) => {
    setPurchaseOrders(purchaseOrders.map(p => (p.id === id ? { ...p, ...po } : p)));
    toast.success('Purchase Order updated successfully');
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders(purchaseOrders.filter(p => p.id !== id));
    toast.success('Purchase Order deleted successfully');
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
        purchaseOrders,
        invoices,
        expenses,
        dashboardStats,
        addVendor,
        updateVendor,
        deleteVendor,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
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
