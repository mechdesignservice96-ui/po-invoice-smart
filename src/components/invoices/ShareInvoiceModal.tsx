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
      const margin = 14;
      let yPos = 15;

      // Helper function for new page with header
      const addPageHeader = () => {
        doc.addPage();
        yPos = 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE - ' + invoice.invoiceNumber + ' (Continued)', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
      };

      // ===== HEADER SECTION =====
      // Company Name - Large and Bold
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      if (profile?.organization_name) {
        doc.text(profile.organization_name.toUpperCase(), margin, yPos);
      }
      yPos += 7;

      // Contact Info - Smaller
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (profile?.organization_address) {
        const addressText = doc.splitTextToSize(profile.organization_address, 120);
        addressText.forEach((line: string) => {
          doc.text(line, margin, yPos);
          yPos += 3.5;
        });
      }
      if (profile?.organization_phone || profile?.organization_email) {
        const contactLine = [profile?.organization_phone, profile?.organization_email].filter(Boolean).join(' | ');
        doc.text(contactLine, margin, yPos);
        yPos += 3.5;
      }
      if (profile?.organization_gst_tin) {
        doc.setFont('helvetica', 'bold');
        doc.text('GSTIN: ' + profile.organization_gst_tin, margin, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 3.5;
      }
      if (profile?.organization_website) {
        doc.text(profile.organization_website, margin, yPos);
        yPos += 1;
      }

      // Horizontal line separator
      yPos += 2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // INVOICE Title - Centered, Bold
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // ===== INVOICE DETAILS BOX =====
      const detailsBoxY = yPos;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 20);

      // Left side - Invoice details
      yPos += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoiceNumber, margin + 25, yPos);

      if (invoice.poNumber) {
        doc.setFont('helvetica', 'bold');
        doc.text('PO No:', margin + 70, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.poNumber, margin + 85, yPos);
      }

      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Date:', margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.invoiceDate), margin + 25, yPos);

      if (invoice.poDate) {
        doc.setFont('helvetica', 'bold');
        doc.text('PO Date:', margin + 70, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(invoice.poDate), margin + 85, yPos);
      }

      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', margin + 3, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.dueDate), margin + 25, yPos);

      // Right side - Payment terms
      doc.setFont('helvetica', 'bold');
      doc.text('Place of Supply:', pageWidth - 80, detailsBoxY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text('As per GST', pageWidth - 80, detailsBoxY + 10);

      yPos = detailsBoxY + 20 + 8;

      // ===== BILLING & SHIPPING DETAILS =====
      const billingStartY = yPos;
      
      // Bill To Box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      const boxWidth = (pageWidth - 3 * margin) / 2;
      
      doc.rect(margin, yPos, boxWidth, 32);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, boxWidth, 6, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', margin + 2, yPos + 4);
      
      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.vendorName, margin + 2, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      
      if (deliveryAddress.trim()) {
        const billAddressLines = doc.splitTextToSize(deliveryAddress, boxWidth - 6);
        billAddressLines.slice(0, 4).forEach((line: string) => {
          doc.text(line, margin + 2, yPos);
          yPos += 3.5;
        });
      }

      // Ship To Box
      yPos = billingStartY;
      const shipBoxX = margin + boxWidth + margin;
      
      doc.rect(shipBoxX, yPos, boxWidth, 32);
      doc.setFillColor(240, 240, 240);
      doc.rect(shipBoxX, yPos, boxWidth, 6, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text('SHIP TO:', shipBoxX + 2, yPos + 4);
      
      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.vendorName, shipBoxX + 2, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      
      if (deliveryAddress.trim()) {
        const shipAddressLines = doc.splitTextToSize(deliveryAddress, boxWidth - 6);
        shipAddressLines.slice(0, 4).forEach((line: string) => {
          doc.text(line, shipBoxX + 2, yPos);
          yPos += 3.5;
        });
      }

      yPos = billingStartY + 32 + 8;

      // ===== LINE ITEMS TABLE =====
      const tableStartY = yPos;
      
      // Table header
      doc.setFillColor(50, 50, 50);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      // Column positions
      const colSN = margin + 2;
      const colDesc = margin + 10;
      const colHSN = margin + 90;
      const colQty = margin + 110;
      const colRate = margin + 130;
      const colAmount = margin + 150;
      const colTax = margin + 165;
      const colTotal = pageWidth - margin - 3;
      
      doc.text('#', colSN, yPos + 5.5);
      doc.text('DESCRIPTION', colDesc, yPos + 5.5);
      doc.text('HSN/SAC', colHSN, yPos + 5.5);
      doc.text('QTY', colQty + 5, yPos + 5.5, { align: 'center' });
      doc.text('RATE', colRate + 8, yPos + 5.5, { align: 'right' });
      doc.text('AMOUNT', colAmount + 7, yPos + 5.5, { align: 'right' });
      doc.text('TAX%', colTax + 5, yPos + 5.5, { align: 'right' });
      doc.text('TOTAL', colTotal, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Table rows
      let subtotal = 0;
      let totalTaxAmount = 0;
      
      (invoice.lineItems || []).forEach((item, index) => {
        if (yPos > pageHeight - 60) {
          addPageHeader();
        }

        const descLines = doc.splitTextToSize(item.particulars, 75);
        const rowHeight = Math.max(descLines.length * 4 + 4, 8);
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const textY = yPos + (rowHeight / 2) + 1;
        
        doc.text((index + 1).toString(), colSN, textY);
        doc.text(descLines, colDesc, yPos + 4);
        doc.text('N/A', colHSN, textY);
        doc.text(item.qtyDispatched.toString(), colQty + 5, textY, { align: 'center' });
        
        const unitPrice = item.basicAmount / item.qtyDispatched;
        doc.text(unitPrice.toFixed(2), colRate + 8, textY, { align: 'right' });
        doc.text(item.basicAmount.toFixed(2), colAmount + 7, textY, { align: 'right' });
        doc.text(invoice.gstPercent + '%', colTax + 5, textY, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.text(item.lineTotal.toFixed(2), colTotal, textY, { align: 'right' });
        
        // Row border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
        
        subtotal += item.basicAmount;
        totalTaxAmount += item.gstAmount;
        yPos += rowHeight;
      });

      // Table border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, tableStartY, pageWidth - 2 * margin, yPos - tableStartY);
      
      yPos += 8;

      // ===== TAX BREAKDOWN =====
      const taxBreakdownX = pageWidth - 95;
      const taxValueX = pageWidth - margin - 3;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Taxable Amount:', taxBreakdownX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + subtotal.toFixed(2), taxValueX, yPos, { align: 'right' });
      yPos += 5;
      
      // CGST & SGST (assuming intra-state for simplicity)
      const cgstAmount = totalTaxAmount / 2;
      const sgstAmount = totalTaxAmount / 2;
      
      doc.setFont('helvetica', 'normal');
      doc.text('CGST @ ' + (invoice.gstPercent / 2) + '%:', taxBreakdownX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + cgstAmount.toFixed(2), taxValueX, yPos, { align: 'right' });
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.text('SGST @ ' + (invoice.gstPercent / 2) + '%:', taxBreakdownX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + sgstAmount.toFixed(2), taxValueX, yPos, { align: 'right' });
      yPos += 5;

      if (invoice.transportationCost && invoice.transportationCost > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Transportation Charges:', taxBreakdownX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text('₹ ' + invoice.transportationCost.toFixed(2), taxValueX, yPos, { align: 'right' });
        yPos += 5;
      }

      doc.setFont('helvetica', 'normal');
      doc.text('Round Off:', taxBreakdownX, yPos);
      const roundOff = Math.round(invoice.totalCost) - invoice.totalCost;
      doc.setFont('helvetica', 'bold');
      doc.text('₹ ' + roundOff.toFixed(2), taxValueX, yPos, { align: 'right' });
      yPos += 7;

      // Total line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.line(taxBreakdownX - 2, yPos, taxValueX + 2, yPos);
      yPos += 5;

      // Grand Total
      doc.setFillColor(50, 50, 50);
      doc.rect(taxBreakdownX - 3, yPos - 4, 92, 8, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL AMOUNT:', taxBreakdownX, yPos + 1);
      doc.text('₹ ' + Math.round(invoice.totalCost).toFixed(2), taxValueX, yPos + 1, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      // Amount in words
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const amountInWords = numberToWords(Math.round(invoice.totalCost));
      doc.text('Amount in Words:', margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'italic');
      const wordsLines = doc.splitTextToSize(amountInWords, pageWidth - 2 * margin);
      wordsLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 4;
      });
      yPos += 4;

      // ===== BANK DETAILS =====
      if (profile?.organization_name) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, (pageWidth - 3 * margin) / 2, 24);
        
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, (pageWidth - 3 * margin) / 2, 5, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('BANK DETAILS', margin + 2, yPos + 3.5);
        yPos += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Account Name: ' + (profile?.organization_name || 'Not Provided'), margin + 2, yPos);
        yPos += 3.5;
        doc.text('Bank Name: Not Provided', margin + 2, yPos);
        yPos += 3.5;
        doc.text('Account No: Not Provided', margin + 2, yPos);
        yPos += 3.5;
        doc.text('IFSC Code: Not Provided', margin + 2, yPos);
        yPos += 3.5;
        doc.text('UPI ID: Not Provided', margin + 2, yPos);
      }

      // ===== TERMS & DECLARATION =====
      yPos = yPos > pageHeight - 50 ? (addPageHeader(), 20) : yPos - 24;
      const termsX = margin + (pageWidth - 3 * margin) / 2 + margin;
      
      doc.setDrawColor(0, 0, 0);
      doc.rect(termsX, yPos, (pageWidth - 3 * margin) / 2, 24);
      
      doc.setFillColor(240, 240, 240);
      doc.rect(termsX, yPos, (pageWidth - 3 * margin) / 2, 5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TERMS & CONDITIONS', termsX + 2, yPos + 3.5);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('1. Payment due within 15 days', termsX + 2, yPos);
      yPos += 3;
      doc.text('2. Late payment: 1.5% interest per month', termsX + 2, yPos);
      yPos += 3;
      doc.text('3. Goods once sold will not be taken back', termsX + 2, yPos);
      yPos += 3;
      doc.text('4. Subject to local jurisdiction', termsX + 2, yPos);
      yPos += 3;
      doc.text('5. E. & O.E.', termsX + 2, yPos);
      
      yPos += 10;

      // ===== DECLARATION & SIGNATURE =====
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DECLARATION:', margin, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('We declare that this invoice shows the actual price of the goods described and that all', margin, yPos);
      yPos += 3;
      doc.text('particulars are true and correct. This is not a proof of delivery.', margin, yPos);
      yPos += 8;

      // Signature box
      doc.text('For ' + (profile?.organization_name || 'Company'), pageWidth - 70, yPos);
      yPos += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('Authorized Signatory', pageWidth - 70, yPos);

      // Footer
      yPos = pageHeight - 10;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('This is a computer-generated invoice and does not require a physical signature.', pageWidth / 2, yPos, { align: 'center' });

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
