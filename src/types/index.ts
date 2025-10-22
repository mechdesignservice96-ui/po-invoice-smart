export type SOStatus = 'Draft' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Completed';
export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';
export type ExpenseStatus = 'Paid' | 'Pending';
export type ExpenseCategory = 'Travel' | 'Rent' | 'Utilities' | 'Supplies' | 'Misc';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card';

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstTin: string;
  paymentTerms: number; // days
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  paymentTerms: number; // days
  createdAt: Date;
}

export interface SOLineItem {
  id: string;
  particulars: string;
  soQty: number;
  qtyDispatched: number;
  balanceQty: number; // auto: soQty - qtyDispatched
  basicAmount: number;
  gstPercent: number;
  gstAmount: number; // auto: basicAmount * gstPercent / 100
  lineTotal: number; // auto: basicAmount + gstAmount
}

export interface SaleOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  soDate: Date;
  poNumber?: string;
  poDate?: Date;
  lineItems: SOLineItem[]; // Multiple line items
  total: number; // auto: sum of all lineItems.lineTotal
  status: SOStatus;
  notes?: string;
  createdAt: Date;
  // Legacy fields (kept for migration)
  particulars?: string;
  soQty?: number;
  basicAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  balanceQty?: number;
}

export interface InvoiceLineItem {
  id: string;
  particulars: string;
  poQty: number;
  qtyDispatched: number;
  balanceQty: number; // auto: poQty - qtyDispatched
  basicAmount: number;
  gstPercent: number;
  gstAmount: number; // auto: basicAmount * gstPercent / 100
  transportationCost: number;
  lineTotal: number; // auto: basicAmount + gstAmount + transportationCost
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  vendorId: string;
  vendorName: string;
  poNumber?: string;
  poDate?: Date;
  lineItems: InvoiceLineItem[]; // Multiple line items
  totalCost: number; // auto: sum of all lineItems.lineTotal
  amountReceived: number;
  pendingAmount: number; // auto: totalCost - amountReceived
  status: InvoiceStatus;
  dueDate: Date;
  daysDelayed?: number; // auto: today - dueDate (if overdue)
  poId?: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  date: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  status: ExpenseStatus;
  attachment?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalPOValue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
}
