export type POStatus = 'Created' | 'Ordered' | 'Received' | 'Paid' | 'Completed';
export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card' | 'UPI';

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
  dueDate: Date;
  totalAmount: number;
  advancePaid: number;
  balanceAmount: number;
  status: POStatus;
  notes?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poId?: string;
  poNumber?: string;
  vendorId: string;
  vendorName: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  daysDelayed?: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  paymentDate: Date;
  amount: number;
  method: PaymentMethod;
  referenceNumber: string;
  remarks?: string;
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
