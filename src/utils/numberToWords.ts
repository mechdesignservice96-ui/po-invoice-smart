const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  if (num < 10) return ones[num];
  
  if (num < 20) return teens[num - 10];
  
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }
  
  return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertLessThanThousand(num % 100) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  // Handle decimal part
  const [integerPart, decimalPart] = num.toFixed(2).split('.');
  const integer = parseInt(integerPart);
  
  if (integer === 0 && decimalPart === '00') return 'Zero';
  
  // Indian numbering system: Crore, Lakh, Thousand, Hundred
  const crore = Math.floor(integer / 10000000);
  const lakh = Math.floor((integer % 10000000) / 100000);
  const thousand = Math.floor((integer % 100000) / 1000);
  const remainder = integer % 1000;
  
  let result = '';
  
  if (crore > 0) {
    result += convertLessThanThousand(crore) + ' Crore ';
  }
  
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + ' Lakh ';
  }
  
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + ' Thousand ';
  }
  
  if (remainder > 0) {
    result += convertLessThanThousand(remainder);
  }
  
  result = result.trim() + ' Rupees';
  
  // Add paise if present
  if (decimalPart && decimalPart !== '00') {
    const paiseNum = parseInt(decimalPart);
    if (paiseNum > 0) {
      result += ' and ' + convertLessThanThousand(paiseNum) + ' Paise';
    }
  }
  
  return result.trim() + ' Only';
}
