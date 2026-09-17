import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function PercentageCalculator() {
  const [number, setNumber] = useState('');
  const [percent, setPercent] = useState('');
  const [result, setResult] = useState<{ value: number; remaining: number } | null>(null);

  const calculate = () => {
    const n = parseFloat(number) || 0;
    const p = parseFloat(percent) || 0;
    const value = n * p / 100;
    const remaining = n - value;
    setResult({ value, remaining });
  };

  const reset = () => {
    setNumber('');
    setPercent('');
    setResult(null);
  };

  const pct = parseFloat(percent || '0');

  return (
    <CalculatorLayout
      title="Percentage Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel={`${pct}% OF`}
      resultValue={result ? `₹${result.value.toFixed(2)}` : ''}
      resultSubtext={result ? `Remaining: ₹${result.remaining.toFixed(2)} (${(100 - pct).toFixed(0)}%)` : ''}
      resultDetails={result ? [
        { label: 'Total', value: `₹${parseFloat(number || '0').toFixed(2)}` },
        { label: `${pct}% Value`, value: `₹${result.value.toFixed(2)}` },
        { label: 'Remaining', value: `₹${result.remaining.toFixed(2)}` },
        { label: 'Percentage', value: `${pct}%` },
      ] : []}
      chartBars={result ? [
        { label: `${pct}%`, value: result.value, color: '#6366f1' },
        { label: 'Remaining', value: result.remaining, color: '#94a3b8' },
      ] : []}
    >
      <NumberInput id="num" label="Number / Total (₹)" value={number} onChange={(_, v) => setNumber(v)} placeholder="e.g. 5000" step="0.01" />
      <NumberInput id="pct" label="Percentage (%)" value={percent} onChange={(_, v) => setPercent(v)} placeholder="e.g. 10" step="0.5" />
    </CalculatorLayout>
  );
}