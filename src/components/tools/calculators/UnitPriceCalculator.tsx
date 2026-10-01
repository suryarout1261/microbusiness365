import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function UnitPriceCalculator() {
  const [totalPrice, setTotalPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState<{ unitPrice: number; totalCost: number } | null>(null);

  const calculate = () => {
    const tp = parseFloat(totalPrice) || 0;
    const q = parseInt(quantity, 10) || 0;
    if (q <= 0) { setResult(null); return; }
    const unitPrice = tp / q;
    setResult({ unitPrice, totalCost: tp });
  };

  const reset = () => {
    setTotalPrice('');
    setQuantity('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Unit Price Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="PRICE PER UNIT"
      resultValue={result ? `₹${result.unitPrice.toFixed(2)}` : ''}
      resultSubtext={result ? `Quantity: ${quantity || '0'} units | Total: ₹${result.totalCost.toFixed(2)}` : ''}
      resultDetails={result ? [
        { label: 'Total Price', value: `₹${parseFloat(totalPrice || '0').toFixed(2)}` },
        { label: 'Quantity', value: `${quantity || '0'} units` },
        { label: 'Unit Price', value: `₹${result.unitPrice.toFixed(2)}` },
        { label: 'Total Cost', value: `₹${result.totalCost.toFixed(2)}` },
      ] : []}
      chartBars={result ? [
        { label: 'Total Price', value: parseFloat(totalPrice) || 0, color: '#6366f1' },
        { label: 'Per Unit', value: result.unitPrice * Math.min(parseInt(quantity) || 1, 10), color: '#22c55e' },
      ] : []}
    >
      <NumberInput id="tp" label="Total Price (₹)" value={totalPrice} onChange={(_, v) => setTotalPrice(v)} placeholder="e.g. 1000" step="0.01" />
      <NumberInput id="qty" label="Quantity" value={quantity} onChange={(_, v) => setQuantity(v)} placeholder="e.g. 10" step="1" integerOnly={true} />
    </CalculatorLayout>
  );
}