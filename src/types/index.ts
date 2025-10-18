export type POStatus = 'Created' | 'Ordered' | 'Received' | 'Paid' | 'Completed';
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
  taxId: string;
  paymentTerms: number; // days
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  poDate: Date;
  particulars: string;
  poQty: number;
  basicAmount: number;
  gstPercent: number;
  gstAmount: number; // auto: basicAmount * gstPercent / 100
  total: number; // auto: basicAmount + gstAmount
  balanceQty: number; // auto: poQty - receivedQty (from invoices)
  status: POStatus;
  notes?: string;
  createdAt: Date;
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
