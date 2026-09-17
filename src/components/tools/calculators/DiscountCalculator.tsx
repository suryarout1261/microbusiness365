import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function DiscountCalculator() {
  const [original, setOriginal] = useState('');
  const [discount, setDiscount] = useState('');
  const [result, setResult] = useState<{ discountAmount: number; salePrice: number } | null>(null);

  const calculate = () => {
    const o = parseFloat(original) || 0;
    const d = parseFloat(discount) || 0;
    const discountAmount = o * d / 100;
    const salePrice = o - discountAmount;
    setResult({ discountAmount, salePrice });
  };

  const reset = () => {
    setOriginal('');
    setDiscount('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Discount Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="RESULT"
      resultValue={result ? `₹${result.salePrice.toFixed(2)}` : ''}
      resultSubtext={result ? `Discount applied: ${discount || '0'}%` : ''}
      resultDetails={result ? [
        { label: 'Original Price', value: `₹${parseFloat(original || '0').toFixed(2)}` },
        { label: 'Discount Amount', value: `₹${result.discountAmount.toFixed(2)}` },
        { label: 'Final Price', value: `₹${result.salePrice.toFixed(2)}` },
        { label: 'Discount %', value: `${discount || '0'}%` },
      ] : []}
      chartBars={result ? [
        { label: 'Original Price', value: parseFloat(original || '0'), color: '#6366f1' },
        { label: 'Discount Amount', value: result.discountAmount, color: '#f59e0b' },
        { label: 'Final Price', value: result.salePrice, color: '#22c55e' },
      ] : []}
    >
      <NumberInput id="orig" label="Original Price (₹)" value={original} onChange={(_, v) => setOriginal(v)} placeholder="e.g. 1000" step="0.01" />
      <NumberInput id="disc" label="Discount (%)" value={discount} onChange={(_, v) => setDiscount(v)} placeholder="e.g. 10" step="0.1" />
    </CalculatorLayout>
  );
}
