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

      // INVOICE Title - Top Left
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', 20, yPos);
      
      // Company name - Top Right
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.vendorName.toUpperCase(), pageWidth - 20, yPos, { align: 'right' });
      yPos += 15;

      // Bill To Section (Left side)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO', 20, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      if (deliveryAddress.trim()) {
        const addressLines = doc.splitTextToSize(deliveryAddress, 80);
        addressLines.slice(0, 4).forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 4;
        });
      }
      
      // Reset position for right side details
      let rightYPos = 35;
      
      // Invoice details on the right
      doc.setFontSize(9);
      const labelX = pageWidth - 75;
      const valueX = pageWidth - 20;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', labelX, rightYPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoiceNumber, valueX, rightYPos, { align: 'right' });
      rightYPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', labelX, rightYPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.invoiceDate), valueX, rightYPos, { align: 'right' });
      rightYPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Due date:', labelX, rightYPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.dueDate), valueX, rightYPos, { align: 'right' });
      rightYPos += 5;
      
      if (invoice.poNumber) {
        doc.setFont('helvetica', 'bold');
        doc.text('Reference:', labelX, rightYPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.poNumber, valueX, rightYPos, { align: 'right' });
        rightYPos += 5;
      }

      yPos = Math.max(yPos, rightYPos) + 10;

      // Colored header sections (Green boxes with dates/amounts)
      const boxWidth = (pageWidth - 50) / 4;
      const boxHeight = 15;
      const boxY = yPos;
      
      // Green color for boxes
      doc.setFillColor(76, 175, 80);
      
      // PO Number box
      doc.rect(20, boxY, boxWidth, boxHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.poNumber || 'N/A', 20 + boxWidth/2, boxY + 6, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDate(invoice.poDate || invoice.invoiceDate), 20 + boxWidth/2, boxY + 11, { align: 'center' });
      
      // Invoice Date box
      doc.setFillColor(100, 200, 100);
      doc.rect(20 + boxWidth + 3, boxY, boxWidth, boxHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Invoice Date', 20 + boxWidth*1.5 + 3, boxY + 6, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDate(invoice.invoiceDate), 20 + boxWidth*1.5 + 3, boxY + 11, { align: 'center' });
      
      // Due Date box
      doc.setFillColor(120, 220, 120);
      doc.rect(20 + boxWidth*2 + 6, boxY, boxWidth, boxHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Due Date', 20 + boxWidth*2.5 + 6, boxY + 6, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDate(invoice.dueDate), 20 + boxWidth*2.5 + 6, boxY + 11, { align: 'center' });
      
      // Amount Due box - Dark color
      doc.setFillColor(60, 60, 60);
      doc.rect(20 + boxWidth*3 + 9, boxY, boxWidth, boxHeight, 'F');
      doc.setFontSize(8);
      doc.text('Amount Due', 20 + boxWidth*3.5 + 9, boxY + 6, { align: 'center' });
      doc.setFontSize(10);
      doc.text(formatCurrency(invoice.pendingAmount), 20 + boxWidth*3.5 + 9, boxY + 11, { align: 'center' });
      
      yPos += boxHeight + 10;

      // Line Items Table
      doc.setTextColor(0, 0, 0);
      
      // Table Header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 10, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.rect(20, yPos, pageWidth - 40, 10, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description', 25, yPos + 6);
      doc.text('Qty', 125, yPos + 6, { align: 'center' });
      doc.text('Unit Price', 155, yPos + 6, { align: 'right' });
      doc.text('Amount', pageWidth - 25, yPos + 6, { align: 'right' });
      
      yPos += 10;

      // Line Items
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      (invoice.lineItems || []).forEach((item, index) => {
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }

        const itemText = doc.splitTextToSize(item.particulars, 85);
        const itemHeight = Math.max(itemText.length * 6, 10);
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(20, yPos, pageWidth - 40, itemHeight, 'F');
        }
        
        doc.setDrawColor(220, 220, 220);
        doc.rect(20, yPos, pageWidth - 40, itemHeight, 'S');
        
        doc.setFont('helvetica', 'normal');
        doc.text(itemText, 25, yPos + 6);
        
        const centerY = yPos + (itemHeight / 2) + 1.5;
        doc.setFont('helvetica', 'bold');
        doc.text(item.qtyDispatched.toString(), 125, centerY, { align: 'center' });
        
        const unitPrice = item.basicAmount / item.qtyDispatched;
        const unitPriceFormatted = new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(unitPrice);
        doc.text(`₹${unitPriceFormatted}`, 155, centerY, { align: 'right' });
        
        const lineTotalFormatted = new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(item.lineTotal);
        doc.text(`₹${lineTotalFormatted}`, pageWidth - 25, centerY, { align: 'right' });
        
        yPos += itemHeight;
      });

      // Total section
      yPos += 5;
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.8);
      doc.line(125, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL:', 125, yPos);
      
      const totalFormatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(invoice.totalCost);
      doc.text(`₹${totalFormatted}`, pageWidth - 25, yPos, { align: 'right' });
      
      yPos += 15;

      // Issued by signature section
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Issued by: signature', pageWidth - 20, yPos, { align: 'right' });
      
      // Company branding at bottom
      yPos = pageHeight - 35;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(76, 175, 80);
      doc.text(invoice.vendorName, pageWidth / 2, yPos, { align: 'center' });
      
      // Footer with contact info
      yPos += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
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
