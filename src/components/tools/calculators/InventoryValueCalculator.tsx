import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function InventoryValueCalculator() {
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [result, setResult] = useState<{ totalValue: number; qty: number }>({ totalValue: 0, qty: 0 });

  const calculate = () => {
    const q = parseFloat(quantity) || 0;
    const cp = parseFloat(costPrice) || 0;
    if (q < 0 || cp < 0) { setResult({ totalValue: 0, qty: 0 }); return; }
    const totalValue = q * cp;
    setResult({ totalValue, qty: q });
  };

  const reset = () => {
    setQuantity('');
    setCostPrice('');
    setResult({ totalValue: 0, qty: 0 });
  };

  return (
    <CalculatorLayout
      title="Inventory Value Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="INVENTORY VALUE"
      resultValue={`₹${result.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
      resultSubtext={`${result.qty} units × ₹${parseFloat(costPrice || '0').toFixed(2)} per unit`}
      resultDetails={[
        { label: 'Quantity', value: `${result.qty} units` },
        { label: 'Unit Price', value: `₹${parseFloat(costPrice || '0').toFixed(2)}` },
        { label: 'Total Value', value: `₹${result.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
        { label: 'Total Units', value: `${result.qty}` },
      ]}
      chartBars={[
        { label: 'Quantity', value: parseFloat(quantity) || 0, color: '#6366f1' },
        { label: 'Total Value', value: result.totalValue, color: '#22c55e' },
      ]}
    >
      <NumberInput id="qty" label="Quantity in Stock" value={quantity} onChange={(_, v) => setQuantity(v)} placeholder="e.g. 500" step="1" />
      <NumberInput id="cp" label="Cost Price per Unit (₹)" value={costPrice} onChange={(_, v) => setCostPrice(v)} placeholder="e.g. 100" step="0.01" />
    </CalculatorLayout>
  );
}