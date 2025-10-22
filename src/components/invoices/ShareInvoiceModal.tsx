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
      let yPos = 20;

      // Company Logo/Header Section with Border
      doc.setDrawColor(41, 98, 255);
      doc.setLineWidth(3);
      doc.line(15, 15, pageWidth - 15, 15);
      
      yPos = 22;
      
      // Company Name - Large and Bold
      doc.setTextColor(41, 98, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('TECH SOLUTIONS LTD', 15, yPos);
      yPos += 8;
      
      // Company Details
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('123 Business Park, Electronic City, Bangalore - 560100', 15, yPos);
      yPos += 5;
      doc.text('GST Number: 29ABCDE1234F1Z5', 15, yPos);
      yPos += 5;
      doc.text('Phone: +91 98765 43210 | Email: info@techsolutions.com', 15, yPos);
      yPos += 5;
      doc.text('Website: www.techsolutions.com', 15, yPos);
      
      // Separator line
      yPos += 5;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, pageWidth - 15, yPos);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos = 60;


      // Main Title - INVOICE
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Invoice Info Box (Top Right aligned with title)
      const infoBoxX = pageWidth - 70;
      const infoBoxY = yPos - 20;
      
      doc.setFillColor(41, 98, 255);
      doc.rect(infoBoxX - 3, infoBoxY, 58, 24, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', infoBoxX, infoBoxY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoiceNumber, pageWidth - 18, infoBoxY + 6, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', infoBoxX, infoBoxY + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.invoiceDate), pageWidth - 18, infoBoxY + 12, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', infoBoxX, infoBoxY + 18);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.dueDate), pageWidth - 18, infoBoxY + 18, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      yPos += 5;

      // Bill From Section
      doc.setFillColor(250, 250, 250);
      doc.rect(15, yPos, 85, 25, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(15, yPos, 85, 25, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Bill From:', 18, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(invoice.vendorName, 18, yPos + 12);
      
      // Delivery Address Section
      doc.setFillColor(250, 250, 250);
      doc.rect(105, yPos, 90, 25, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(105, yPos, 90, 25, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Delivery Address:', 108, yPos + 6);
      yPos += 12;
      
      if (deliveryAddress.trim()) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const addressLines = doc.splitTextToSize(deliveryAddress, 82);
        addressLines.slice(0, 2).forEach((line: string) => {
          doc.text(line, 108, yPos);
          yPos += 4;
        });
      }
      
      yPos += 15;

      // PO Details Section
      if (invoice.poNumber) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PO Number:', 15, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.poNumber, 45, yPos);
        
        if (invoice.poDate) {
          doc.setFont('helvetica', 'bold');
          doc.text('PO Date:', 100, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(formatDate(invoice.poDate), 125, yPos);
        }
        yPos += 10;
      }

      // Line Items Table
      yPos += 5;
      const tableStartY = yPos;
      
      // Table Header
      doc.setFillColor(41, 98, 255);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Item', 18, yPos + 5);
      doc.text('Qty', 95, yPos + 5, { align: 'center' });
      doc.text('Rate', 115, yPos + 5, { align: 'right' });
      doc.text('GST%', 140, yPos + 5, { align: 'center' });
      doc.text('Amount', pageWidth - 18, yPos + 5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Table Border
      doc.setDrawColor(220, 220, 220);
      doc.rect(15, tableStartY, pageWidth - 30, 8, 'S');

      // Line Items
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let itemNumber = 1;
      
      (invoice.lineItems || []).forEach((item) => {
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }

        // Alternating row colors
        if (itemNumber % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, yPos - 3, pageWidth - 30, 10, 'F');
        }

        const itemText = doc.splitTextToSize(item.particulars, 70);
        doc.text(itemText[0], 18, yPos + 3);
        doc.text(item.qtyDispatched.toString(), 95, yPos + 3, { align: 'center' });
        doc.text(formatCurrency(item.basicAmount / item.qtyDispatched), 115, yPos + 3, { align: 'right' });
        doc.text(`${invoice.gstPercent}%`, 140, yPos + 3, { align: 'center' });
        doc.text(formatCurrency(item.lineTotal), pageWidth - 18, yPos + 3, { align: 'right' });
        
        // Draw row border
        doc.setDrawColor(230, 230, 230);
        doc.line(15, yPos + 7, pageWidth - 15, yPos + 7);
        
        yPos += 10;
        itemNumber++;
      });

      yPos += 3;

      // Calculate totals
      const subtotal = (invoice.lineItems || []).reduce((sum, item) => sum + item.basicAmount, 0);
      const totalGST = (invoice.lineItems || []).reduce((sum, item) => sum + item.gstAmount, 0);

      // Totals Section
      const totalsX = pageWidth - 85;
      
      // Subtotal
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(formatCurrency(subtotal), pageWidth - 18, yPos, { align: 'right' });
      yPos += 6;

      // GST
      doc.text(`GST (${invoice.gstPercent}%):`, totalsX, yPos);
      doc.text(formatCurrency(totalGST), pageWidth - 18, yPos, { align: 'right' });
      yPos += 6;

      // Transportation
      if (invoice.transportationCost > 0) {
        doc.text('Transportation:', totalsX, yPos);
        doc.text(formatCurrency(invoice.transportationCost), pageWidth - 18, yPos, { align: 'right' });
        yPos += 6;
      }

      // Total Amount - Highlighted
      doc.setDrawColor(41, 98, 255);
      doc.setLineWidth(0.5);
      doc.line(totalsX - 5, yPos - 2, pageWidth - 15, yPos - 2);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Total Amount:', totalsX, yPos + 3);
      doc.text(formatCurrency(invoice.totalCost), pageWidth - 18, yPos + 3, { align: 'right' });
      yPos += 8;

      // Amount Received
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Amount Received:', totalsX, yPos);
      doc.setTextColor(0, 150, 0);
      doc.text(formatCurrency(invoice.amountReceived), pageWidth - 18, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      // Amount Due - Highlighted in red
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text('Amount Due:', totalsX, yPos);
      doc.text(formatCurrency(invoice.pendingAmount), pageWidth - 18, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 15;

      // Terms & Conditions / Notes Section
      if (yPos < pageHeight - 35) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, yPos, pageWidth - 30, 15, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(15, yPos, pageWidth - 30, 15, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Terms & Conditions:', 18, yPos + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Payment is due within the specified due date. Late payments may incur additional charges.', 18, yPos + 10);
      }

      // Footer
      doc.setFillColor(41, 98, 255);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setFontSize(7);
      doc.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, pageHeight - 4, { align: 'center' });

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
