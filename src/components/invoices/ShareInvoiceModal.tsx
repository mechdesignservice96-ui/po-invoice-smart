import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Share2, Download, Mail, MessageCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface ShareInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const ShareInvoiceModal = ({ open, onClose, invoice }: ShareInvoiceModalProps) => {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = (): Blob | null => {
    if (!invoice) return null;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 30;

      // Set default font
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // INVOICE Title - Centered at top
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Invoice Number (Left) and Dates (Right)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Left side - Invoice No
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 20, yPos);
      
      // Right side - Dates
      doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 6;
      doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 12;

      // Bill From Section
      doc.setFont('helvetica', 'bold');
      doc.text('Bill From:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.vendorName, 20, yPos);
      yPos += 10;

      // Delivery Address Section
      doc.setFont('helvetica', 'bold');
      doc.text('Delivery Address:', 20, yPos);
      yPos += 6;
      
      if (deliveryAddress.trim()) {
        doc.setFont('helvetica', 'normal');
        const addressLines = doc.splitTextToSize(deliveryAddress, 170);
        addressLines.slice(0, 3).forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text('N/A', 20, yPos);
        yPos += 5;
      }
      yPos += 5;

      // PO Details Section (on same line)
      if (invoice.poNumber) {
        doc.setFont('helvetica', 'normal');
        doc.text(`PO Number: ${invoice.poNumber}`, 20, yPos);
        
        if (invoice.poDate) {
          doc.text(`PO Date: ${formatDate(invoice.poDate)}`, 100, yPos);
        }
        yPos += 10;
      }

      // Line Items Table
      yPos += 5;
      const tableStartY = yPos;
      
      // Table Header with light gray background
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, pageWidth - 40, 8, 'F');
      
      // Header border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(20, yPos, pageWidth - 40, 8, 'S');
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Item', 25, yPos + 5);
      doc.text('Qty', 110, yPos + 5, { align: 'center' });
      doc.text('Rate', 135, yPos + 5, { align: 'right' });
      doc.text('GST%', 155, yPos + 5, { align: 'center' });
      doc.text('Amount', pageWidth - 25, yPos + 5, { align: 'right' });
      
      yPos += 8;

      // Line Items
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      (invoice.lineItems || []).forEach((item, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }

        const itemText = doc.splitTextToSize(item.particulars, 80);
        const itemHeight = Math.max(itemText.length * 5, 8);
        
        // Draw row border
        doc.setDrawColor(230, 230, 230);
        doc.rect(20, yPos, pageWidth - 40, itemHeight, 'S');
        
        // Item text
        doc.text(itemText, 25, yPos + 5);
        
        // Other columns - centered vertically
        const centerY = yPos + (itemHeight / 2) + 1;
        doc.text(item.qtyDispatched.toString(), 110, centerY, { align: 'center' });
        doc.text(formatCurrency(item.basicAmount / item.qtyDispatched), 135, centerY, { align: 'right' });
        doc.text(`${invoice.gstPercent}%`, 155, centerY, { align: 'center' });
        doc.text(formatCurrency(item.lineTotal), pageWidth - 25, centerY, { align: 'right' });
        
        yPos += itemHeight;
      });

      yPos += 10;

      // Horizontal line before totals
      doc.setDrawColor(200, 200, 200);
      doc.line(pageWidth - 90, yPos, pageWidth - 20, yPos);
      yPos += 8;

      // Totals Section - Right aligned
      const totalsLabelX = pageWidth - 85;
      const totalsValueX = pageWidth - 25;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Total Amount
      doc.text('Total Amount:', totalsLabelX, yPos);
      doc.text(formatCurrency(invoice.totalCost), totalsValueX, yPos, { align: 'right' });
      yPos += 7;

      // Amount Received
      doc.text('Amount Received:', totalsLabelX, yPos);
      doc.text(formatCurrency(invoice.amountReceived), totalsValueX, yPos, { align: 'right' });
      yPos += 7;

      // Amount Due - In Red
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('Amount Due:', totalsLabelX, yPos);
      doc.text(formatCurrency(invoice.pendingAmount), totalsValueX, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 20;

      // Thank you message
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

      return doc.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleDownload = async () => {
    if (!invoice || !deliveryAddress.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter delivery address.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const pdfBlob = generatePDF();
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: 'Invoice downloaded successfully!',
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (method: 'native' | 'email' | 'whatsapp') => {
    if (!invoice || !deliveryAddress.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter delivery address.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const pdfBlob = generatePDF();
      if (!pdfBlob) {
        setIsGenerating(false);
        return;
      }

      const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;

      if (method === 'native' && navigator.share) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice for ${invoice.vendorName} - ${formatCurrency(invoice.totalCost)}`,
          files: [file],
        });
        toast({
          title: 'Success',
          description: 'Invoice shared successfully!',
        });
      } else if (method === 'email') {
        const url = URL.createObjectURL(pdfBlob);
        const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`);
        const body = encodeURIComponent(
          `Please find attached invoice ${invoice.invoiceNumber} for ${invoice.vendorName}.\n\nTotal Amount: ${formatCurrency(invoice.totalCost)}\nAmount Due: ${formatCurrency(invoice.pendingAmount)}\n\nDelivery Address:\n${deliveryAddress}`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Opening Email',
          description: 'Please attach the downloaded PDF to your email.',
        });
        // Also trigger download for email attachment
        handleDownload();
      } else if (method === 'whatsapp') {
        const text = encodeURIComponent(
          `Invoice ${invoice.invoiceNumber}\nVendor: ${invoice.vendorName}\nTotal: ${formatCurrency(invoice.totalCost)}\nDue: ${formatCurrency(invoice.pendingAmount)}\n\nDelivery Address:\n${deliveryAddress}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
        
        toast({
          title: 'Opening WhatsApp',
          description: 'Please send the downloaded PDF separately.',
        });
        // Also trigger download for WhatsApp attachment
        handleDownload();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: 'Error',
        description: 'Failed to share invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
          <DialogDescription>
            Enter delivery address to generate and share invoice {invoice?.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-address">Delivery Address *</Label>
            <Textarea
              id="delivery-address"
              placeholder="Enter complete delivery address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDownload}
              disabled={isGenerating || !deliveryAddress.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download
            </Button>

            <Button
              onClick={() => handleShare('email')}
              disabled={isGenerating || !deliveryAddress.trim()}
              variant="outline"
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>

            <Button
              onClick={() => handleShare('whatsapp')}
              disabled={isGenerating || !deliveryAddress.trim()}
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>

            {navigator.share && (
              <Button
                onClick={() => handleShare('native')}
                disabled={isGenerating || !deliveryAddress.trim()}
                variant="outline"
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
