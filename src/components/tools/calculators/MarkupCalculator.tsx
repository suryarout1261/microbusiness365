import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function MarkupCalculator() {
  const [cost, setCost] = useState('');
  const [markup, setMarkup] = useState('');
  const [result, setResult] = useState<{ sellingPrice: number; markupAmount: number } | null>(null);

  const calculate = () => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(markup) || 0;
    const markupAmount = c * m / 100;
    const sellingPrice = c + markupAmount;
    setResult({ sellingPrice, markupAmount });
  };

  const reset = () => {
    setCost('');
    setMarkup('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="Markup Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="SELLING PRICE"
      resultValue={result ? `₹${result.sellingPrice.toFixed(2)}` : ''}
      resultSubtext={result ? `Markup: ₹${result.markupAmount.toFixed(2)} (${markup || '0'}%)` : ''}
      resultDetails={result ? [
        { label: 'Cost Price', value: `₹${parseFloat(cost || '0').toFixed(2)}` },
        { label: 'Markup Amount', value: `₹${result.markupAmount.toFixed(2)}` },
        { label: 'Selling Price', value: `₹${result.sellingPrice.toFixed(2)}` },
        { label: 'Markup %', value: `${markup || '0'}%` },
      ] : []}
      chartBars={result ? [
        { label: 'Cost', value: parseFloat(cost) || 0, color: '#6366f1' },
        { label: 'Markup', value: result.markupAmount, color: '#f59e0b' },
      ] : []}
    >
      <NumberInput id="cost" label="Cost Price (₹)" value={cost} onChange={(_, v) => setCost(v)} placeholder="e.g. 5000" step="0.01" />
      <NumberInput id="markup" label="Markup (%)" value={markup} onChange={(_, v) => setMarkup(v)} placeholder="e.g. 20" step="0.5" />
    </CalculatorLayout>
  );
}