import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function SellingPriceCalculator() {
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('');
  const [result, setResult] = useState<{ sellingPrice: number; markupAmount: number } | null>(null);

  const calculate = () => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    if (m >= 100) { setResult(null); return; }
    const sellingPrice = c / (1 - m / 100);
    const markupAmount = sellingPrice - c;
    setResult({ sellingPrice, markupAmount });
  };

  const reset = () => {
    setCost('');
    setMargin('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Selling Price Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="SELLING PRICE"
      resultValue={result ? `₹${result.sellingPrice.toFixed(2)}` : ''}
      resultSubtext={result ? `Markup: ₹${result.markupAmount.toFixed(2)} (${margin || '0'}% margin)` : ''}
      resultDetails={result ? [
        { label: 'Cost Price', value: `₹${parseFloat(cost || '0').toFixed(2)}` },
        { label: 'Target Margin', value: `${margin || '0'}%` },
        { label: 'Markup Amount', value: `₹${result.markupAmount.toFixed(2)}` },
        { label: 'Selling Price', value: `₹${result.sellingPrice.toFixed(2)}` },
      ] : []}
      chartBars={result ? [
        { label: 'Cost', value: parseFloat(cost) || 0, color: '#6366f1' },
        { label: 'Markup', value: result.markupAmount, color: '#f59e0b' },
      ] : []}
    >
      <NumberInput id="cost" label="Cost Price (₹)" value={cost} onChange={(_, v) => setCost(v)} placeholder="e.g. 5000" step="0.01" />
      <NumberInput id="margin" label="Target Margin (%)" value={margin} onChange={(_, v) => setMargin(v)} placeholder="e.g. 20" step="0.5" />
    </CalculatorLayout>
  );
}