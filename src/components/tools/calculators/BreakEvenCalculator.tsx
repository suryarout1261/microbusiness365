import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function BreakEvenCalculator() {
  const [fixedCosts, setFixedCosts] = useState('');
  const [varCost, setVarCost] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<{ units: number; revenue: number; totalCost: number } | null>(null);

  const calculate = () => {
    const fc = parseFloat(fixedCosts) || 0;
    const vc = parseFloat(varCost) || 0;
    const p = parseFloat(price) || 0;
    if (p <= vc) { setResult(null); return; }
    const units = Math.ceil(fc / (p - vc));
    const revenue = units * p;
    const totalCost = fc + units * vc;
    setResult({ units, revenue, totalCost });
  };

  const reset = () => {
    setFixedCosts('');
    setVarCost('');
    setPrice('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Break-even Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="BREAK-EVEN POINT"
      resultValue={result ? `${result.units} units` : ''}
      resultSubtext={result ? `Revenue: ₹${result.revenue.toFixed(2)} | Total Cost: ₹${result.totalCost.toFixed(2)}` : ''}
      resultDetails={result ? [
        { label: 'Units to Sell', value: `${result.units} units` },
        { label: 'Revenue', value: `₹${result.revenue.toFixed(2)}` },
        { label: 'Total Cost', value: `₹${result.totalCost.toFixed(2)}` },
        { label: 'Profit', value: `₹${(result.revenue - result.totalCost).toFixed(2)}` },
      ] : []}
      chartBars={result ? [
        { label: 'Revenue', value: result.revenue, color: '#22c55e' },
        { label: 'Total Cost', value: result.totalCost, color: '#ef4444' },
        { label: 'Fixed Costs', value: parseFloat(fixedCosts) || 0, color: '#6366f1' },
      ] : []}
    >
      <NumberInput id="fixed" label="Fixed Costs (₹)" value={fixedCosts} onChange={(_, v) => setFixedCosts(v)} placeholder="e.g. 50000" step="0.01" />
      <NumberInput id="vc" label="Variable Cost per Unit (₹)" value={varCost} onChange={(_, v) => setVarCost(v)} placeholder="e.g. 20" step="0.01" />
      <NumberInput id="price" label="Selling Price per Unit (₹)" value={price} onChange={(_, v) => setPrice(v)} placeholder="e.g. 50" step="0.01" />
    </CalculatorLayout>
  );
}