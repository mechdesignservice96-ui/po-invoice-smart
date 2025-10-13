import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, PurchaseOrder, Invoice, Payment, DashboardStats } from '@/types';
import { toast } from 'sonner';

interface AppContextType {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  payments: Payment[];
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
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  deletePayment: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  VENDORS: 'finance_vendors',
  POS: 'finance_pos',
  INVOICES: 'finance_invoices',
  PAYMENTS: 'finance_payments',
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
  const [payments, setPayments] = useState<Payment[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedVendors = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENDORS) || '[]');
    const loadedPOs = JSON.parse(localStorage.getItem(STORAGE_KEYS.POS) || '[]');
    const loadedInvoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const loadedPayments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');

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
          dueDate: new Date('2025-02-05'),
          totalAmount: 15000,
          advancePaid: 5000,
          balanceAmount: 10000,
          status: 'Ordered',
          notes: 'Annual software license renewal',
          createdAt: new Date('2025-01-05'),
        },
        {
          id: 'PO2',
          poNumber: 'PO-2025-002',
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          poDate: new Date('2025-01-10'),
          dueDate: new Date('2025-01-25'),
          totalAmount: 3500,
          advancePaid: 0,
          balanceAmount: 3500,
          status: 'Received',
          notes: 'Office furniture and supplies',
          createdAt: new Date('2025-01-10'),
        },
        {
          id: 'PO3',
          poNumber: 'PO-2025-003',
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          poDate: new Date('2024-12-20'),
          dueDate: new Date('2025-01-01'),
          totalAmount: 8000,
          advancePaid: 8000,
          balanceAmount: 0,
          status: 'Paid',
          notes: 'Cloud hosting services Q1',
          createdAt: new Date('2024-12-20'),
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
          particulars: 'Annual software license renewal - Enterprise Plan',
          poQty: 100,
          qtyDispatched: 60,
          balanceQty: 40,
          basicAmount: 13636.36,
          gstPercent: 10,
          gstAmount: 1363.64,
          transportationCost: 0,
          totalCost: 15000,
          amountReceived: 5000,
          pendingAmount: 10000,
          status: 'Partial',
          dueDate: new Date('2025-02-15'),
          daysDelayed: 0,
          poId: 'PO1',
          poNumber: 'PO-2025-001',
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'INV2',
          invoiceNumber: 'INV-2025-002',
          invoiceDate: new Date('2025-01-12'),
          vendorId: 'V2',
          vendorName: 'Office Supplies Co',
          particulars: 'Office furniture and supplies - Desks, Chairs, Filing Cabinets',
          poQty: 50,
          qtyDispatched: 50,
          balanceQty: 0,
          basicAmount: 3181.82,
          gstPercent: 10,
          gstAmount: 318.18,
          transportationCost: 0,
          totalCost: 3500,
          amountReceived: 0,
          pendingAmount: 3500,
          status: 'Overdue',
          dueDate: new Date('2025-01-05'),
          daysDelayed: 7,
          poId: 'PO2',
          poNumber: 'PO-2025-002',
          createdAt: new Date('2025-01-12'),
        },
        {
          id: 'INV3',
          invoiceNumber: 'INV-2025-003',
          invoiceDate: new Date('2024-12-28'),
          vendorId: 'V3',
          vendorName: 'Cloud Services Inc',
          particulars: 'Cloud hosting services Q1 - AWS Infrastructure',
          poQty: 1,
          qtyDispatched: 1,
          balanceQty: 0,
          basicAmount: 7272.73,
          gstPercent: 10,
          gstAmount: 727.27,
          transportationCost: 0,
          totalCost: 8000,
          amountReceived: 8000,
          pendingAmount: 0,
          status: 'Paid',
          dueDate: new Date('2025-01-28'),
          daysDelayed: 0,
          poId: 'PO3',
          poNumber: 'PO-2025-003',
          createdAt: new Date('2024-12-28'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(dummyInvoices));
      setInvoices(dummyInvoices);

      const dummyPayments: Payment[] = [
        {
          id: 'PAY1',
          invoiceId: 'INV1',
          invoiceNumber: 'INV-2025-001',
          vendorName: 'Tech Solutions Ltd',
          paymentDate: new Date('2025-01-20'),
          amount: 5000,
          method: 'Bank Transfer',
          referenceNumber: 'TXN-001',
          remarks: 'Advance payment',
          createdAt: new Date('2025-01-20'),
        },
        {
          id: 'PAY2',
          invoiceId: 'INV3',
          invoiceNumber: 'INV-2025-003',
          vendorName: 'Cloud Services Inc',
          paymentDate: new Date('2025-01-05'),
          amount: 8000,
          method: 'Check',
          referenceNumber: 'CHK-5001',
          remarks: 'Full payment',
          createdAt: new Date('2025-01-05'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(dummyPayments));
      setPayments(dummyPayments);
    } else {
      setVendors(parseDates(loadedVendors, ['createdAt']));
      setPurchaseOrders(parseDates(loadedPOs, ['poDate', 'dueDate', 'createdAt']));
      setInvoices(parseDates(loadedInvoices, ['invoiceDate', 'dueDate', 'createdAt']));
      setPayments(parseDates(loadedPayments, ['paymentDate', 'createdAt']));
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
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalPOValue: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
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

  const addPayment = (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    const newPayment: Payment = {
      ...payment,
      id: `PAY${Date.now()}`,
      createdAt: new Date(),
    };
    setPayments([...payments, newPayment]);

    // Update the related invoice
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    if (invoice) {
      const newAmountReceived = invoice.amountReceived + payment.amount;
      const newPendingAmount = invoice.totalCost - newAmountReceived;
      updateInvoice(invoice.id, {
        amountReceived: newAmountReceived,
        pendingAmount: newPendingAmount,
      });
    }

    toast.success('Payment recorded successfully');
  };

  const deletePayment = (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (payment) {
      // Update the related invoice
      const invoice = invoices.find(inv => inv.id === payment.invoiceId);
      if (invoice) {
        const newAmountReceived = invoice.amountReceived - payment.amount;
        const newPendingAmount = invoice.totalCost - newAmountReceived;
        updateInvoice(invoice.id, {
          amountReceived: newAmountReceived,
          pendingAmount: newPendingAmount,
        });
      }
    }
    setPayments(payments.filter(p => p.id !== id));
    toast.success('Payment deleted successfully');
  };

  return (
    <AppContext.Provider
      value={{
        vendors,
        purchaseOrders,
        invoices,
        payments,
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
        addPayment,
        deletePayment,
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
