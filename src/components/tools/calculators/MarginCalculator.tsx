import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function MarginCalculator() {
  const [revenue, setRevenue] = useState('');
  const [cost, setCost] = useState('');
  const [result, setResult] = useState<{ margin: number; profit: number } | null>(null);

  const calculate = () => {
    const rev = parseFloat(revenue) || 0;
    const c = parseFloat(cost) || 0;
    const profit = rev - c;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    setResult({ margin, profit });
  };

  const reset = () => {
    setRevenue('');
    setCost('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Profit Margin Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="MARGIN"
      resultValue={result ? `${result.margin.toFixed(2)}%` : ''}
      resultSubtext={result ? `Profit: ₹${result.profit.toFixed(2)}` : ''}
      resultDetails={result ? [
        { label: 'Revenue', value: `₹${parseFloat(revenue || '0').toFixed(2)}` },
        { label: 'Cost', value: `₹${parseFloat(cost || '0').toFixed(2)}` },
        { label: 'Profit', value: `₹${result.profit.toFixed(2)}` },
        { label: 'Margin', value: `${result.margin.toFixed(2)}%` },
      ] : []}
      chartBars={result ? [
        { label: 'Profit', value: Math.max(result.profit, 0), color: '#22c55e' },
        { label: 'Cost', value: parseFloat(cost) || 0, color: '#ef4444' },
      ] : []}
    >
      <NumberInput id="rev" label="Selling Price / Revenue (₹)" value={revenue} onChange={(_, v) => setRevenue(v)} placeholder="e.g. 10000" step="0.01" />
      <NumberInput id="cost" label="Cost Price (₹)" value={cost} onChange={(_, v) => setCost(v)} placeholder="e.g. 7000" step="0.01" />
    </CalculatorLayout>
  );
}