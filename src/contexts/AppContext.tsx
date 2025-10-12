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
  if (invoice.paidAmount >= invoice.totalAmount) return 'Paid';
  if (invoice.paidAmount > 0) return 'Partial';
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

    setVendors(parseDates(loadedVendors, ['createdAt']));
    setPurchaseOrders(parseDates(loadedPOs, ['poDate', 'dueDate', 'createdAt']));
    setInvoices(parseDates(loadedInvoices, ['invoiceDate', 'dueDate', 'createdAt']));
    setPayments(parseDates(loadedPayments, ['paymentDate', 'createdAt']));
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
    totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    totalPaid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    totalOutstanding: invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0),
    overdueCount: invoices.filter(inv => inv.status === 'Overdue').length,
    overdueAmount: invoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.balanceAmount, 0),
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
      const newPaidAmount = invoice.paidAmount + payment.amount;
      const newBalanceAmount = invoice.totalAmount - newPaidAmount;
      updateInvoice(invoice.id, {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
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
        const newPaidAmount = invoice.paidAmount - payment.amount;
        const newBalanceAmount = invoice.totalAmount - newPaidAmount;
        updateInvoice(invoice.id, {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
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
