import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, Customer, SaleOrder, Invoice, DashboardStats, Expense } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AppContextType {
  vendors: Vendor[];
  customers: Customer[];
  saleOrders: SaleOrder[];
  invoices: Invoice[];
  expenses: Expense[];
  dashboardStats: DashboardStats;
  loading: boolean;
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => Promise<void>;
  updateVendor: (id: string, vendor: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSaleOrder: (so: Omit<SaleOrder, 'id' | 'soNumber' | 'createdAt'>) => Promise<void>;
  updateSaleOrder: (id: string, so: Partial<SaleOrder>) => Promise<void>;
  deleteSaleOrder: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'daysDelayed'>) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;
      setVendors(
        (vendorsData || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          contactPerson: v.contact_person,
          email: v.email,
          phone: v.phone,
          gstTin: v.gst_tin,
          paymentTerms: v.payment_terms,
          createdAt: new Date(v.created_at),
        }))
      );

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      setCustomers(
        (customersData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          contactPerson: c.contact_person,
          email: c.email,
          phone: c.phone,
          taxId: c.tax_id,
          address: c.address,
          paymentTerms: c.payment_terms,
          createdAt: new Date(c.created_at),
        }))
      );

      // Fetch sale orders
      const { data: sosData, error: sosError } = await supabase
        .from('sale_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (sosError) throw sosError;
      setSaleOrders(
        (sosData || []).map((so: any) => ({
          id: so.id,
          soNumber: so.so_number,
          customerId: so.customer_id,
          customerName: so.customer_name,
          soDate: new Date(so.so_date),
          poNumber: so.po_number,
          poDate: so.po_date ? new Date(so.po_date) : undefined,
          lineItems: so.line_items || [],
          total: parseFloat(so.total),
          status: so.status,
          notes: so.notes,
          createdAt: new Date(so.created_at),
        }))
      );

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(
        (invoicesData || []).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate: new Date(inv.invoice_date),
          vendorId: inv.vendor_id,
          vendorName: inv.vendor_name,
          poNumber: inv.po_number,
          poDate: inv.po_date ? new Date(inv.po_date) : undefined,
          lineItems: inv.line_items || [],
          gstPercent: parseFloat(inv.gst_percent),
          transportationCost: parseFloat(inv.transportation_cost),
          discount: parseFloat(inv.discount),
          totalCost: parseFloat(inv.total_cost),
          amountReceived: parseFloat(inv.amount_received),
          pendingAmount: parseFloat(inv.pending_amount),
          status: inv.status,
          dueDate: new Date(inv.due_date),
          daysDelayed: calculateDaysDelayed(new Date(inv.due_date)),
          poId: inv.po_id,
          createdAt: new Date(inv.created_at),
        }))
      );

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false});

      if (expensesError) throw expensesError;
      setExpenses(
        (expensesData || []).map((exp: any) => ({
          id: exp.id,
          date: new Date(exp.date),
          category: exp.category,
          description: exp.description,
          amount: parseFloat(exp.amount),
          paymentMode: exp.payment_mode,
          status: exp.status,
          attachment: exp.attachment,
          createdAt: new Date(exp.created_at),
        }))
      );
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [user]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Vendors real-time subscription
    const vendorsChannel = supabase
      .channel('vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Vendors change:', payload);
          fetchData(); // Refetch all data on any change
        }
      )
      .subscribe();
    channels.push(vendorsChannel);

    // Customers real-time subscription
    const customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Customers change:', payload);
          fetchData();
        }
      )
      .subscribe();
    channels.push(customersChannel);

    // Sale Orders real-time subscription
    const sosChannel = supabase
      .channel('sale_orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Sale Orders change:', payload);
          fetchData();
        }
      )
      .subscribe();
    channels.push(sosChannel);

    // Invoices real-time subscription
    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Invoices change:', payload);
          fetchData();
        }
      )
      .subscribe();
    channels.push(invoicesChannel);

    // Expenses real-time subscription
    const expensesChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Expenses change:', payload);
          fetchData();
        }
      )
      .subscribe();
    channels.push(expensesChannel);

    // Cleanup subscriptions
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]);

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalPOValue: saleOrders.reduce((sum, so) => sum + so.total, 0),
    totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalCost, 0),
    totalPaid: invoices.reduce((sum, inv) => sum + inv.amountReceived, 0),
    totalOutstanding: invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0),
    overdueCount: invoices.filter((inv) => inv.status === 'Overdue').length,
    overdueAmount: invoices
      .filter((inv) => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.pendingAmount, 0),
  };

  // CRUD operations for vendors
  const addVendor = async (vendor: Omit<Vendor, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('vendors').insert({
        user_id: user.id,
        name: vendor.name,
        contact_person: vendor.contactPerson,
        email: vendor.email,
        phone: vendor.phone,
        gst_tin: vendor.gstTin,
        payment_terms: vendor.paymentTerms,
      });

      if (error) throw error;
      toast.success('Vendor added successfully');
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      toast.error('Failed to add vendor: ' + error.message);
    }
  };

  const updateVendor = async (id: string, vendor: Partial<Vendor>) => {
    try {
      const updateData: any = {};
      if (vendor.name) updateData.name = vendor.name;
      if (vendor.contactPerson) updateData.contact_person = vendor.contactPerson;
      if (vendor.email) updateData.email = vendor.email;
      if (vendor.phone) updateData.phone = vendor.phone;
      if (vendor.gstTin) updateData.gst_tin = vendor.gstTin;
      if (vendor.paymentTerms !== undefined) updateData.payment_terms = vendor.paymentTerms;

      const { error } = await supabase.from('vendors').update(updateData).eq('id', id);

      if (error) throw error;
      toast.success('Vendor updated successfully');
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor: ' + error.message);
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);

      if (error) throw error;
      toast.success('Vendor deleted successfully');
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor: ' + error.message);
    }
  };

  // CRUD operations for customers
  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('customers').insert({
        user_id: user.id,
        name: customer.name,
        contact_person: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        tax_id: customer.taxId,
        address: customer.address,
        payment_terms: customer.paymentTerms,
      });

      if (error) throw error;
      toast.success('Customer added successfully');
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer: ' + error.message);
    }
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    try {
      const updateData: any = {};
      if (customer.name) updateData.name = customer.name;
      if (customer.contactPerson) updateData.contact_person = customer.contactPerson;
      if (customer.email) updateData.email = customer.email;
      if (customer.phone) updateData.phone = customer.phone;
      if (customer.taxId) updateData.tax_id = customer.taxId;
      if (customer.address) updateData.address = customer.address;
      if (customer.paymentTerms !== undefined) updateData.payment_terms = customer.paymentTerms;

      const { error } = await supabase.from('customers').update(updateData).eq('id', id);

      if (error) throw error;
      toast.success('Customer updated successfully');
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer: ' + error.message);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) throw error;
      toast.success('Customer deleted successfully');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer: ' + error.message);
    }
  };

  // CRUD operations for sale orders
  const addSaleOrder = async (so: Omit<SaleOrder, 'id' | 'soNumber' | 'createdAt'>) => {
    if (!user) return;

    try {
      // Generate SO number
      const soNumber = `SO-${new Date().getFullYear()}-${String(saleOrders.length + 1).padStart(3, '0')}`;

      const { error } = await supabase.from('sale_orders').insert([{
        user_id: user.id,
        so_number: soNumber,
        customer_id: so.customerId,
        customer_name: so.customerName,
        so_date: so.soDate.toISOString(),
        po_number: so.poNumber || null,
        po_date: so.poDate?.toISOString() || null,
        line_items: so.lineItems as any,
        total: so.total,
        status: so.status,
        notes: so.notes || null,
      }]);

      if (error) throw error;
      toast.success(`Sale Order ${soNumber} created successfully`);
    } catch (error: any) {
      console.error('Error adding sale order:', error);
      toast.error('Failed to add sale order: ' + error.message);
    }
  };

  const updateSaleOrder = async (id: string, so: Partial<SaleOrder>) => {
    try {
      const updateData: any = {};
      if (so.customerId) updateData.customer_id = so.customerId;
      if (so.customerName) updateData.customer_name = so.customerName;
      if (so.soDate) updateData.so_date = so.soDate.toISOString();
      if (so.poNumber !== undefined) updateData.po_number = so.poNumber;
      if (so.poDate !== undefined) updateData.po_date = so.poDate?.toISOString();
      if (so.lineItems) updateData.line_items = so.lineItems;
      if (so.total !== undefined) updateData.total = so.total;
      if (so.status) updateData.status = so.status;
      if (so.notes !== undefined) updateData.notes = so.notes;

      const { error } = await supabase.from('sale_orders').update(updateData).eq('id', id);

      if (error) throw error;
      toast.success('Sale Order updated successfully');
    } catch (error: any) {
      console.error('Error updating sale order:', error);
      toast.error('Failed to update sale order: ' + error.message);
    }
  };

  const deleteSaleOrder = async (id: string) => {
    try {
      const { error } = await supabase.from('sale_orders').delete().eq('id', id);

      if (error) throw error;
      toast.success('Sale Order deleted successfully');
    } catch (error: any) {
      console.error('Error deleting sale order:', error);
      toast.error('Failed to delete sale order: ' + error.message);
    }
  };

  // CRUD operations for invoices
  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'daysDelayed'>) => {
    if (!user) return;

    try {
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;

      const { error } = await supabase.from('invoices').insert([{
        user_id: user.id,
        invoice_number: invoiceNumber,
        invoice_date: invoice.invoiceDate.toISOString(),
        vendor_id: invoice.vendorId,
        vendor_name: invoice.vendorName,
        po_number: invoice.poNumber || null,
        po_date: invoice.poDate?.toISOString() || null,
        line_items: invoice.lineItems as any,
        gst_percent: invoice.gstPercent,
        transportation_cost: invoice.transportationCost,
        discount: invoice.discount,
        total_cost: invoice.totalCost,
        amount_received: invoice.amountReceived,
        pending_amount: invoice.pendingAmount,
        status: invoice.status,
        due_date: invoice.dueDate.toISOString(),
        po_id: invoice.poId || null,
      }]);

      if (error) throw error;
      toast.success(`Invoice ${invoiceNumber} created successfully`);
    } catch (error: any) {
      console.error('Error adding invoice:', error);
      toast.error('Failed to add invoice: ' + error.message);
    }
  };

  const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    try {
      const updateData: any = {};
      if (invoice.invoiceDate) updateData.invoice_date = invoice.invoiceDate.toISOString();
      if (invoice.vendorId) updateData.vendor_id = invoice.vendorId;
      if (invoice.vendorName) updateData.vendor_name = invoice.vendorName;
      if (invoice.poNumber !== undefined) updateData.po_number = invoice.poNumber;
      if (invoice.poDate !== undefined) updateData.po_date = invoice.poDate?.toISOString();
      if (invoice.lineItems) updateData.line_items = invoice.lineItems;
      if (invoice.gstPercent !== undefined) updateData.gst_percent = invoice.gstPercent;
      if (invoice.transportationCost !== undefined) updateData.transportation_cost = invoice.transportationCost;
      if (invoice.discount !== undefined) updateData.discount = invoice.discount;
      if (invoice.totalCost !== undefined) updateData.total_cost = invoice.totalCost;
      if (invoice.amountReceived !== undefined) updateData.amount_received = invoice.amountReceived;
      if (invoice.pendingAmount !== undefined) updateData.pending_amount = invoice.pendingAmount;
      if (invoice.status) updateData.status = invoice.status;
      if (invoice.dueDate) updateData.due_date = invoice.dueDate.toISOString();
      if (invoice.poId !== undefined) updateData.po_id = invoice.poId;

      const { error } = await supabase.from('invoices').update(updateData).eq('id', id);

      if (error) throw error;
      toast.success('Invoice updated successfully');
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice: ' + error.message);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);

      if (error) throw error;
      toast.success('Invoice deleted successfully');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice: ' + error.message);
    }
  };

  // CRUD operations for expenses
  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        date: expense.date.toISOString(),
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_mode: expense.paymentMode,
        status: expense.status,
        attachment: expense.attachment,
      });

      if (error) throw error;
      toast.success('Expense added successfully');
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense: ' + error.message);
    }
  };

  const updateExpense = async (id: string, expense: Partial<Expense>) => {
    try {
      const updateData: any = {};
      if (expense.date) updateData.date = expense.date.toISOString();
      if (expense.category) updateData.category = expense.category;
      if (expense.description) updateData.description = expense.description;
      if (expense.amount !== undefined) updateData.amount = expense.amount;
      if (expense.paymentMode) updateData.payment_mode = expense.paymentMode;
      if (expense.status) updateData.status = expense.status;
      if (expense.attachment !== undefined) updateData.attachment = expense.attachment;

      const { error } = await supabase.from('expenses').update(updateData).eq('id', id);

      if (error) throw error;
      toast.success('Expense updated successfully');
    } catch (error: any) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense: ' + error.message);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);

      if (error) throw error;
      toast.success('Expense deleted successfully');
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        vendors,
        customers,
        saleOrders,
        invoices,
        expenses,
        dashboardStats,
        loading,
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