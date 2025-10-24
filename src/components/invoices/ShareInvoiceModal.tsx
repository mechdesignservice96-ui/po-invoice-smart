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
      const margin = 20;
      let yPos = 20;

      // Professional color palette
      const primaryColor: [number, number, number] = [41, 98, 255]; // Modern blue
      const darkGray: [number, number, number] = [45, 55, 72];
      const lightGray: [number, number, number] = [247, 250, 252];
      const mediumGray: [number, number, number] = [203, 213, 225];
      const textGray: [number, number, number] = [71, 85, 105];
      const successGreen: [number, number, number] = [16, 185, 129];

      // Helper function for new page with header
      const addPageHeader = () => {
        doc.addPage();
        yPos = 20;
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE - ' + invoice.invoiceNumber + ' (Continued)', pageWidth / 2, 7.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPos += 15;
      };

      // ===== MODERN HEADER WITH BRAND COLOR =====
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Company Name - Modern and Bold
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      if (profile?.organization_name) {
        doc.text(profile.organization_name.toUpperCase(), margin, yPos + 8);
      }
      
      // Contact Info - Clean white text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let contactY = yPos + 16;
      
      if (profile?.organization_address) {
        const addressText = doc.splitTextToSize(profile.organization_address, 100);
        addressText.slice(0, 2).forEach((line: string) => {
          doc.text(line, margin, contactY);
          contactY += 4;
        });
      }
      
      if (profile?.organization_phone || profile?.organization_email) {
        const contactLine = [profile?.organization_phone, profile?.organization_email].filter(Boolean).join(' • ');
        doc.text(contactLine, margin, contactY);
        contactY += 4;
      }
      
      if (profile?.organization_gst_tin) {
        doc.text('GSTIN: ' + profile.organization_gst_tin, margin, contactY);
      }

      // TAX INVOICE label - Right side
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', pageWidth - margin, yPos + 15, { align: 'right' });
      
      yPos = 55;

      // ===== INVOICE DETAILS - MODERN CARDS =====
      // Left card - Invoice details
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, 85, 28, 2, 2, 'F');
      
      let cardY = yPos + 6;
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Invoice Number', margin + 4, cardY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.text(invoice.invoiceNumber, margin + 4, cardY + 5);
      
      cardY += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      doc.text('Invoice Date', margin + 4, cardY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text(formatDate(invoice.invoiceDate), margin + 4, cardY + 5);

      // Right card - PO & Due Date
      doc.setFillColor(...lightGray);
      doc.roundedRect(pageWidth - margin - 85, yPos, 85, 28, 2, 2, 'F');
      
      cardY = yPos + 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      
      if (invoice.poNumber) {
        doc.text('PO Number', pageWidth - margin - 81, cardY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.setFontSize(10);
        doc.text(invoice.poNumber, pageWidth - margin - 81, cardY + 5);
      }
      
      cardY += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      doc.text('Due Date', pageWidth - margin - 81, cardY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text(formatDate(invoice.dueDate), pageWidth - margin - 81, cardY + 5);

      yPos += 35;

      // ===== BILLING & SHIPPING - MODERN BOXES =====
      const boxWidth = (pageWidth - 3 * margin) / 2;
      
      // Bill To
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, boxWidth, 35, 2, 2);
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, yPos, boxWidth, 8, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('BILL TO', margin + 3, yPos + 5.5);
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(11);
      doc.text(invoice.vendorName, margin + 3, yPos + 13);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      let billY = yPos + 18;
      if (deliveryAddress.trim()) {
        const billAddressLines = doc.splitTextToSize(deliveryAddress, boxWidth - 8);
        billAddressLines.slice(0, 3).forEach((line: string) => {
          doc.text(line, margin + 3, billY);
          billY += 4;
        });
      }

      // Ship To
      const shipBoxX = margin + boxWidth + margin;
      doc.setDrawColor(...mediumGray);
      doc.roundedRect(shipBoxX, yPos, boxWidth, 35, 2, 2);
      doc.setFillColor(...primaryColor);
      doc.roundedRect(shipBoxX, yPos, boxWidth, 8, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SHIP TO', shipBoxX + 3, yPos + 5.5);
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(11);
      doc.text(invoice.vendorName, shipBoxX + 3, yPos + 13);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      let shipY = yPos + 18;
      if (deliveryAddress.trim()) {
        const shipAddressLines = doc.splitTextToSize(deliveryAddress, boxWidth - 8);
        shipAddressLines.slice(0, 3).forEach((line: string) => {
          doc.text(line, shipBoxX + 3, shipY);
          shipY += 4;
        });
      }

      yPos += 43;

      // ===== MODERN TABLE =====
      const tableStartY = yPos;
      
      // Table header with gradient effect
      doc.setFillColor(...darkGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 9, 1, 1, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      const colSN = margin + 3;
      const colDesc = margin + 15;
      const colHSN = margin + 95;
      const colQty = margin + 118;
      const colRate = margin + 138;
      const colAmount = margin + 160;
      const colTax = margin + 177;
      const colTotal = pageWidth - margin - 4;
      
      doc.text('#', colSN, yPos + 6);
      doc.text('DESCRIPTION', colDesc, yPos + 6);
      doc.text('HSN/SAC', colHSN, yPos + 6);
      doc.text('QTY', colQty, yPos + 6);
      doc.text('RATE', colRate, yPos + 6);
      doc.text('AMOUNT', colAmount, yPos + 6);
      doc.text('TAX%', colTax, yPos + 6);
      doc.text('TOTAL', colTotal, yPos + 6, { align: 'right' });
      
      yPos += 9;
      doc.setTextColor(...darkGray);

      // Table rows with alternating colors
      let subtotal = 0;
      let totalTaxAmount = 0;
      
      (invoice.lineItems || []).forEach((item, index) => {
        if (yPos > pageHeight - 60) {
          addPageHeader();
        }

        // Properly split description to fit within column width (80 units)
        const descLines = doc.splitTextToSize(item.particulars, 80);
        const rowHeight = Math.max(descLines.length * 4 + 4, 9);
        
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 253);
          doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...textGray);
        
        const textY = yPos + (rowHeight / 2) + 1.5;
        
        // Serial number
        doc.text((index + 1).toString(), colSN, textY);
        
        // Description - wrapped text starting from top
        doc.setTextColor(...darkGray);
        doc.setFontSize(8.5);
        descLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, colDesc, yPos + 4 + (lineIndex * 4));
        });
        
        // Other columns - centered vertically
        doc.setFontSize(9);
        doc.setTextColor(...textGray);
        doc.text('N/A', colHSN, textY);
        doc.text(item.qtyDispatched.toString(), colQty, textY);
        
        const unitPrice = item.basicAmount / item.qtyDispatched;
        doc.text(unitPrice.toFixed(2), colRate, textY);
        doc.text(item.basicAmount.toFixed(2), colAmount, textY);
        doc.text(invoice.gstPercent + '%', colTax, textY);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text('₹' + item.lineTotal.toFixed(2), colTotal, textY, { align: 'right' });
        
        doc.setDrawColor(...mediumGray);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
        
        subtotal += item.basicAmount;
        totalTaxAmount += item.gstAmount;
        yPos += rowHeight;
      });

      // Table border
      doc.setDrawColor(...mediumGray);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, tableStartY, pageWidth - 2 * margin, yPos - tableStartY, 1, 1);
      
      yPos += 10;

      // ===== MODERN TOTALS SECTION =====
      const totalsX = pageWidth - 95;
      const totalsWidth = 75;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      
      doc.text('Subtotal:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('₹' + subtotal.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
      yPos += 6;
      
      const cgstAmount = totalTaxAmount / 2;
      const sgstAmount = totalTaxAmount / 2;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text('CGST @ ' + (invoice.gstPercent / 2) + '%:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('₹' + cgstAmount.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text('SGST @ ' + (invoice.gstPercent / 2) + '%:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('₹' + sgstAmount.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
      yPos += 6;

      if (invoice.transportationCost && invoice.transportationCost > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textGray);
        doc.text('Transportation:', totalsX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text('₹' + invoice.transportationCost.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
        yPos += 6;
      }

      if (invoice.discount && invoice.discount > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textGray);
        doc.text('Discount:', totalsX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text('- ₹' + invoice.discount.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
        yPos += 6;
      }

      const roundOff = Math.round(invoice.totalCost) - invoice.totalCost;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text('Round Off:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('₹' + roundOff.toFixed(2), totalsX + totalsWidth, yPos, { align: 'right' });
      yPos += 8;

      // Grand Total - Professional highlight
      doc.setFillColor(...successGreen);
      doc.roundedRect(totalsX - 3, yPos - 4, totalsWidth + 6, 10, 2, 2, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL:', totalsX, yPos + 2);
      doc.text('₹' + Math.round(invoice.totalCost).toFixed(2), totalsX + totalsWidth, yPos + 2, { align: 'right' });
      doc.setTextColor(...darkGray);
      yPos += 14;

      // Amount in words - Elegant box
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 16, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textGray);
      doc.text('Amount in Words:', margin + 3, yPos + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      const amountInWords = numberToWords(Math.round(invoice.totalCost));
      const wordsLines = doc.splitTextToSize(amountInWords, pageWidth - 2 * margin - 6);
      doc.text(wordsLines, margin + 3, yPos + 10);
      
      yPos += 22;

      // ===== BANK DETAILS & TERMS - SIDE BY SIDE =====
      const sectionWidth = (pageWidth - 3 * margin) / 2;
      
      if (profile?.organization_name) {
        doc.setDrawColor(...mediumGray);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, sectionWidth, 28, 2, 2);
        
        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, yPos, sectionWidth, 7, 2, 2, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...darkGray);
        doc.text('BANK DETAILS', margin + 3, yPos + 4.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...textGray);
        let bankY = yPos + 11;
        doc.text('Account Name: ' + (profile?.account_name || profile?.organization_name || 'Not Provided'), margin + 3, bankY);
        bankY += 4;
        doc.text('Bank Name: ' + (profile?.bank_name || 'Not Provided'), margin + 3, bankY);
        bankY += 4;
        doc.text('Account No: ' + (profile?.account_number || 'Not Provided'), margin + 3, bankY);
        bankY += 4;
        doc.text('IFSC Code: ' + (profile?.ifsc_code || 'Not Provided'), margin + 3, bankY);
        
        // Add UPI ID if available
        if (profile?.upi_id) {
          bankY += 4;
          doc.text('UPI ID: ' + profile.upi_id, margin + 3, bankY);
        }
      }

      const termsX = margin + sectionWidth + margin;
      doc.setDrawColor(...mediumGray);
      doc.roundedRect(termsX, yPos, sectionWidth, 28, 2, 2);
      
      doc.setFillColor(...lightGray);
      doc.roundedRect(termsX, yPos, sectionWidth, 7, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.text('TERMS & CONDITIONS', termsX + 3, yPos + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textGray);
      let termsY = yPos + 11;
      doc.text('• Payment due within 15 days', termsX + 3, termsY);
      termsY += 3.5;
      doc.text('• Late payment: 1.5% interest per month', termsX + 3, termsY);
      termsY += 3.5;
      doc.text('• Goods once sold will not be taken back', termsX + 3, termsY);
      termsY += 3.5;
      doc.text('• Subject to local jurisdiction', termsX + 3, termsY);
      
      yPos += 35;

      // ===== SIGNATURE & DECLARATION =====
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...textGray);
      doc.text('DECLARATION:', margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('We declare that this invoice shows the actual price of the goods described and that', margin, yPos + 4);
      doc.text('all particulars are true and correct.', margin, yPos + 8);
      
      // Signature
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textGray);
      doc.text('For ' + (profile?.organization_name || 'Company'), pageWidth - margin - 55, yPos);
      
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('Authorized Signatory', pageWidth - margin - 55, yPos);

      // Professional Footer
      doc.setFillColor(...lightGray);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text('This is a computer-generated invoice and does not require a physical signature.', pageWidth / 2, pageHeight - 6, { align: 'center' });

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
