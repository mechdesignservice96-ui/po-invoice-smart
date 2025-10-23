import { useState, useEffect } from 'react';
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
import { numberToWords } from '@/utils/numberToWords';
import { supabase } from '@/integrations/supabase/client';

interface ShareInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const ShareInvoiceModal = ({ open, onClose, invoice }: ShareInvoiceModalProps) => {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
    };
    
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const generatePDF = (): Blob | null => {
    if (!invoice) return null;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = 20;

      // Header - INVOICE Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
      
      // Divider line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Invoice Details - Right aligned
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', pageWidth - 80, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoiceNumber, pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Date:', pageWidth - 80, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.invoiceDate), pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', pageWidth - 80, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.dueDate), pageWidth - margin, yPos, { align: 'right' });
      yPos += 10;

      // Seller Details Section
      const sellerStartY = yPos;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Seller Details:', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, 100, yPos);
      yPos += 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (profile?.organization_name) {
        doc.setFont('helvetica', 'bold');
        doc.text(profile.organization_name, margin, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
      }
      if (profile?.organization_address) {
        const addressLines = doc.splitTextToSize(profile.organization_address, 85);
        addressLines.forEach((line: string) => {
          doc.text(line, margin, yPos);
          yPos += 4;
        });
      }
      if (profile?.organization_phone) {
        doc.text(profile.organization_phone, margin, yPos);
        yPos += 4;
      }
      if (profile?.organization_email) {
        doc.text(profile.organization_email, margin, yPos);
        yPos += 4;
      }
      if (profile?.organization_gst_tin) {
        doc.text('GSTIN: ' + profile.organization_gst_tin, margin, yPos);
        yPos += 4;
      }
      
      // Buyer Details Section - Right side
      let buyerYPos = sellerStartY;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Buyer Details:', pageWidth / 2 + 5, buyerYPos);
      buyerYPos += 5;
      doc.line(pageWidth / 2 + 5, buyerYPos, pageWidth - margin, buyerYPos);
      buyerYPos += 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.vendorName, pageWidth / 2 + 5, buyerYPos);
      buyerYPos += 4;
      doc.setFont('helvetica', 'normal');
      
      if (deliveryAddress.trim()) {
        const buyerAddressLines = doc.splitTextToSize(deliveryAddress, 85);
        buyerAddressLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2 + 5, buyerYPos);
          buyerYPos += 4;
        });
      }
      
      yPos = Math.max(yPos, buyerYPos) + 8;

      // PO Details Section with border box
      if (invoice.poNumber) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        const poBoxHeight = 8;
        doc.rect(margin, yPos, pageWidth - 2 * margin, poBoxHeight);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PO Number:', margin + 2, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.poNumber, margin + 25, yPos + 5.5);
        
        if (invoice.poDate) {
          doc.setFont('helvetica', 'bold');
          doc.text('PO Date:', margin + 80, yPos + 5.5);
          doc.setFont('helvetica', 'normal');
          doc.text(formatDate(invoice.poDate), margin + 100, yPos + 5.5);
        }
        
        yPos += poBoxHeight + 10;
      }

      // Goods/Services Details Section with full border box
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Goods / Services Details:', margin, yPos);
      yPos += 8;

      // Outer box for the entire table
      const tableStartY = yPos;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      
      // Table Header with darker background
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'FD');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Column widths
      const col1Width = 70;  // Description
      const col2Width = 25;  // HSN/SAC
      const col3Width = 20;  // Qty
      const col4Width = 28;  // Unit Price
      const col5Width = 25;  // Tax
      const col6Width = 24;  // Total
      
      doc.text('Description', margin + 2, yPos + 6.5);
      doc.text('HSN/SAC', margin + col1Width + 10, yPos + 6.5, { align: 'center' });
      doc.text('Qty', margin + col1Width + col2Width + 12, yPos + 6.5, { align: 'center' });
      doc.text('Unit Price', margin + col1Width + col2Width + col3Width + 20, yPos + 6.5, { align: 'right' });
      doc.text('Tax', margin + col1Width + col2Width + col3Width + col4Width + 15, yPos + 6.5, { align: 'center' });
      doc.text('Total', pageWidth - margin - 5, yPos + 6.5, { align: 'right' });
      
      yPos += 10;

      // Line Items with clear borders
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      let subtotal = 0;
      const lineItemsStartY = yPos;
      
      (invoice.lineItems || []).forEach((item, index) => {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = 20;
        }

        const itemText = doc.splitTextToSize(item.particulars, 65);
        const itemHeight = Math.max(itemText.length * 5, 10);
        
        // White background for rows
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight, 'F');
        
        // Row borders
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos + itemHeight, pageWidth - margin, yPos + itemHeight);
        
        // Vertical lines
        doc.line(margin + col1Width, yPos, margin + col1Width, yPos + itemHeight);
        doc.line(margin + col1Width + col2Width, yPos, margin + col1Width + col2Width, yPos + itemHeight);
        doc.line(margin + col1Width + col2Width + col3Width, yPos, margin + col1Width + col2Width + col3Width, yPos + itemHeight);
        doc.line(margin + col1Width + col2Width + col3Width + col4Width, yPos, margin + col1Width + col2Width + col3Width + col4Width, yPos + itemHeight);
        doc.line(margin + col1Width + col2Width + col3Width + col4Width + col5Width, yPos, margin + col1Width + col2Width + col3Width + col4Width + col5Width, yPos + itemHeight);
        
        doc.setFontSize(9);
        doc.text(itemText, margin + 2, yPos + 6);
        
        const centerY = yPos + (itemHeight / 2) + 2;
        doc.text('N/A', margin + col1Width + 12.5, centerY, { align: 'center' });
        doc.text(item.qtyDispatched.toString() + ' pcs', margin + col1Width + col2Width + 10, centerY, { align: 'center' });
        
        const unitPrice = item.basicAmount / item.qtyDispatched;
        doc.setFont('helvetica', 'bold');
        doc.text('₹ ' + unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + col1Width + col2Width + col3Width + 26, centerY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.gstPercent + '% GST', margin + col1Width + col2Width + col3Width + col4Width + 12.5, centerY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('₹ ' + item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - margin - 5, centerY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        subtotal += item.basicAmount;
        yPos += itemHeight;
      });
      
      // Close the table with outer border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(margin, tableStartY, pageWidth - 2 * margin, yPos - tableStartY);
      
      yPos += 10;

      // Summary Section with box
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPos);
      yPos += 8;
      
      const summaryX = pageWidth - 85;
      const summaryValueX = pageWidth - margin - 3;
      const summaryBoxWidth = 80;
      const summaryStartY = yPos;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Subtotal:', summaryX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), summaryValueX, yPos, { align: 'right' });
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      const totalTax = invoice.totalCost - subtotal - (invoice.transportationCost || 0);
      doc.text('Tax Amount (GST):', summaryX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), summaryValueX, yPos, { align: 'right' });
      yPos += 6;
      
      if (invoice.transportationCost && invoice.transportationCost > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Transportation:', summaryX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text('₹ ' + invoice.transportationCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), summaryValueX, yPos, { align: 'right' });
        yPos += 6;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text('Discounts:', summaryX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ 0.00', summaryValueX, yPos, { align: 'right' });
      yPos += 8;
      
      // Divider line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(summaryX - 2, yPos, pageWidth - margin, yPos);
      yPos += 6;
      
      // Amount Due - highlighted
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Amount Due:', summaryX, yPos);
      doc.setTextColor(220, 38, 38); // Red color for emphasis
      doc.text('₹ ' + invoice.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), summaryValueX, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPos += 8;
      
      // Draw box around summary
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(summaryX - 3, summaryStartY - 5, summaryBoxWidth, yPos - summaryStartY);
      yPos += 2;
      
      // Amount in Words
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      const amountInWords = numberToWords(invoice.totalCost);
      doc.text('Amount in Words: ' + amountInWords, margin, yPos);
      yPos += 12;
      
      // Thank you message
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;


      // Payment Details Section
      if (profile?.bank_name || profile?.upi_id) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details:', margin, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Accepted Methods: Bank Transfer, UPI', margin, yPos);
        yPos += 5;
        
        if (profile?.bank_name) {
          doc.text('Bank Name: ' + profile.bank_name, margin, yPos);
          yPos += 4;
        }
        if (profile?.account_name) {
          doc.text('Account Name: ' + profile.account_name, margin, yPos);
          yPos += 4;
        }
        if (profile?.account_number) {
          doc.text('Account Number: ' + profile.account_number, margin, yPos);
          yPos += 4;
        }
        if (profile?.ifsc_code) {
          doc.text('IFSC Code: ' + profile.ifsc_code, margin, yPos);
          yPos += 4;
        }
        if (profile?.upi_id) {
          doc.text('UPI ID: ' + profile.upi_id, margin, yPos);
          yPos += 4;
        }
        yPos += 5;
      }

      // Terms and Conditions
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms and Conditions:', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('- Payable within 15 days of invoice date.', margin, yPos);
      yPos += 4;
      doc.text('- A late payment penalty of 1.5% per month will be applied to overdue amounts.', margin, yPos);
      yPos += 4;
      doc.text('- All disputes subject to jurisdiction.', margin, yPos);
      yPos += 8;

      // Authorization Section
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Authorization:', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.line(margin, yPos, margin + 50, yPos);
      yPos += 4;
      doc.text('Authorized Signature', margin, yPos);
      yPos += 4;
      if (profile?.organization_name) {
        doc.setFont('helvetica', 'italic');
        doc.text(profile.organization_name, margin, yPos);
      }

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
