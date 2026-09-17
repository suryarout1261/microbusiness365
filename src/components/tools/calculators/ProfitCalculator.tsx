import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function ProfitCalculator() {
  const [revenue, setRevenue] = useState('');
  const [costs, setCosts] = useState('');
  const [result, setResult] = useState<{ profit: number; margin: number }>({ profit: 0, margin: 0 });

  const calculate = () => {
    const rev = parseFloat(revenue) || 0;
    const cost = parseFloat(costs) || 0;
    if (rev < 0 || cost < 0) { setResult({ profit: 0, margin: 0 }); return; }
    const profit = rev - cost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    setResult({ profit, margin });
  };

  const reset = () => {
    setRevenue('');
    setCosts('');
    setResult({ profit: 0, margin: 0 });
  };

  return (
    <CalculatorLayout
      title="Profit Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel={result.profit >= 0 ? 'PROFIT' : 'LOSS'}
      resultValue={`₹${result.profit.toFixed(2)}`}
      resultSubtext={`Margin: ${result.margin.toFixed(2)}%`}
      resultDetails={[
        { label: 'Revenue', value: `₹${parseFloat(revenue || '0').toFixed(2)}` },
        { label: 'Total Costs', value: `₹${parseFloat(costs || '0').toFixed(2)}` },
        { label: 'Profit / Loss', value: `₹${result.profit.toFixed(2)}` },
        { label: 'Margin', value: `${result.margin.toFixed(2)}%` },
      ]}
      chartBars={[
        { label: 'Revenue', value: parseFloat(revenue) || 0, color: '#6366f1' },
        { label: 'Costs', value: parseFloat(costs) || 0, color: '#ef4444' },
        { label: 'Profit', value: Math.abs(result.profit), color: result.profit >= 0 ? '#22c55e' : '#f59e0b' },
      ]}
    >
      <NumberInput id="rev" label="Revenue (₹)" value={revenue} onChange={(_, v) => setRevenue(v)} placeholder="e.g. 10000" step="0.01" />
      <NumberInput id="cost" label="Total Costs (₹)" value={costs} onChange={(_, v) => setCosts(v)} placeholder="e.g. 7000" step="0.01" />
    </CalculatorLayout>
  );
}