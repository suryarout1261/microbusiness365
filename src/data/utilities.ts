export interface Utility {
  slug: string;
  name: string;
  desc: string;
  category: 'calculator' | 'generator';
}

export const UTILITIES: Utility[] = [
  { slug: 'gst-calculator', name: 'GST Calculator', desc: 'Add or remove GST from any amount', category: 'calculator' },
  { slug: 'profit-calculator', name: 'Profit Calculator', desc: 'Revenue minus costs, instantly', category: 'calculator' },
  { slug: 'margin-calculator', name: 'Profit Margin Calculator', desc: 'Margin as a percentage of price', category: 'calculator' },
  { slug: 'markup-calculator', name: 'Markup Calculator', desc: 'Markup on top of your cost', category: 'calculator' },
  { slug: 'discount-calculator', name: 'Discount Calculator', desc: 'Price after a percentage off', category: 'calculator' },
  { slug: 'break-even-calculator', name: 'Break-even Calculator', desc: 'Units to break even', category: 'calculator' },
  { slug: 'roi-calculator', name: 'ROI Calculator', desc: 'Return on your investment', category: 'calculator' },
  { slug: 'emi-calculator', name: 'EMI Calculator', desc: 'Monthly loan instalments', category: 'calculator' },
  { slug: 'percentage-calculator', name: 'Percentage Calculator', desc: 'Percentages, fast and clear', category: 'calculator' },
  { slug: 'unit-price-calculator', name: 'Unit Price Calculator', desc: 'Price per unit or per piece', category: 'calculator' },
  { slug: 'inventory-value-calculator', name: 'Inventory Value Calculator', desc: 'Value of stock on hand', category: 'calculator' },
  { slug: 'selling-price-calculator', name: 'Selling Price Calculator', desc: 'Right price for a target margin', category: 'calculator' },
  { slug: 'invoice-generator', name: 'Invoice Generator', desc: 'Create and print an invoice', category: 'generator' },
  { slug: 'quotation-generator', name: 'Quotation Generator', desc: 'Send a quick quote', category: 'generator' },
  { slug: 'receipt-generator', name: 'Receipt Generator', desc: 'Print a simple receipt', category: 'generator' },
];
