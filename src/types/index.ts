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
  invoiceDate: Date;
  vendorId: string;
  vendorName: string;
  particulars: string;
  poQty: number;
  qtyDispatched: number;
  balanceQty: number; // auto: poQty - qtyDispatched
  basicAmount: number;
  gstPercent: number;
  gstAmount: number; // auto: basicAmount * gstPercent / 100
  transportationCost: number;
  totalCost: number; // auto: basicAmount + gstAmount + transportationCost
  amountReceived: number;
  pendingAmount: number; // auto: totalCost - amountReceived
  status: InvoiceStatus;
  dueDate: Date;
  daysDelayed?: number; // auto: today - dueDate (if overdue)
  poId?: string;
  poNumber?: string;
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
