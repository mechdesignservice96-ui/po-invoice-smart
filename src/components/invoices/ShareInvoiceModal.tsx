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

      // Goods/Services Details Section
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Goods / Services Details:', margin, yPos);
      yPos += 5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Table Header
      doc.setFillColor(240, 240, 240);
      const tableStartY = yPos;
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin + 2, yPos + 5);
      doc.text('HSN/SAC', margin + 75, yPos + 5, { align: 'center' });
      doc.text('Qty', margin + 100, yPos + 5, { align: 'center' });
      doc.text('Unit Price', margin + 125, yPos + 5, { align: 'right' });
      doc.text('Tax', margin + 150, yPos + 5, { align: 'center' });
      doc.text('Total', pageWidth - margin - 2, yPos + 5, { align: 'right' });
      
      yPos += 8;

      // Line Items
      doc.setFont('helvetica', 'normal');
      let subtotal = 0;
      
      (invoice.lineItems || []).forEach((item, index) => {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = 20;
        }

        const itemText = doc.splitTextToSize(item.particulars, 65);
        const itemHeight = Math.max(itemText.length * 4.5, 8);
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight, 'F');
        }
        
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight);
        
        doc.setFontSize(8);
        doc.text(itemText, margin + 2, yPos + 5);
        
        const centerY = yPos + (itemHeight / 2) + 1;
        doc.text('N/A', margin + 75, centerY, { align: 'center' });
        doc.text(item.qtyDispatched.toString() + ' pcs', margin + 100, centerY, { align: 'center' });
        
        const unitPrice = item.basicAmount / item.qtyDispatched;
        doc.text('₹' + unitPrice.toFixed(2), margin + 125, centerY, { align: 'right' });
        doc.text(invoice.gstPercent + '% GST', margin + 150, centerY, { align: 'center' });
        doc.text('₹' + item.lineTotal.toFixed(2), pageWidth - margin - 2, centerY, { align: 'right' });
        
        subtotal += item.basicAmount;
        yPos += itemHeight;
      });
      
      yPos += 5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Summary Section
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const summaryX = pageWidth - 80;
      const summaryValueX = pageWidth - margin;
      
      doc.text('Subtotal:', summaryX, yPos);
      doc.text('₹' + subtotal.toFixed(2), summaryValueX, yPos, { align: 'right' });
      yPos += 5;
      
      const totalTax = invoice.totalCost - subtotal - (invoice.transportationCost || 0);
      doc.text('Tax Amount (GST):', summaryX, yPos);
      doc.text('₹' + totalTax.toFixed(2), summaryValueX, yPos, { align: 'right' });
      yPos += 5;
      
      if (invoice.transportationCost && invoice.transportationCost > 0) {
        doc.text('Transportation Cost:', summaryX, yPos);
        doc.text('₹' + invoice.transportationCost.toFixed(2), summaryValueX, yPos, { align: 'right' });
        yPos += 5;
      }
      
      doc.text('Discounts:', summaryX, yPos);
      doc.text('₹0.00', summaryValueX, yPos, { align: 'right' });
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Grand Total:', summaryX, yPos);
      doc.text('₹' + invoice.totalCost.toFixed(2), summaryValueX, yPos, { align: 'right' });
      yPos += 7;
      
      // Amount in Words
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const amountInWords = numberToWords(invoice.totalCost);
      doc.text('Amount in Words: ' + amountInWords, margin, yPos);
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
