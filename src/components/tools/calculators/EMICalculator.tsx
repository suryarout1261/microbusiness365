import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function EMICalculator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [result, setResult] = useState<{ emi: number; totalPayable: number; totalInterest: number } | null>(null);

  const calculate = () => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 12 / 100;
    const n = Math.max(parseInt(tenure) || 0, 1);
    if (p <= 0 || r <= 0) { setResult(null); return; }
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPayable = emi * n;
    const totalInterest = totalPayable - p;
    setResult({ emi, totalPayable, totalInterest });
  };

  const reset = () => {
    setPrincipal('');
    setRate('');
    setTenure('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="EMI Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="MONTHLY EMI"
      resultValue={result ? `₹${result.emi.toFixed(2)}` : ''}
      resultSubtext={result ? `Total Payable: ₹${result.totalPayable.toFixed(2)} | Interest: ₹${result.totalInterest.toFixed(2)}` : ''}
      resultDetails={result ? [
        { label: 'Principal', value: `₹${parseFloat(principal || '0').toFixed(2)}` },
        { label: 'Monthly EMI', value: `₹${result.emi.toFixed(2)}` },
        { label: 'Total Interest', value: `₹${result.totalInterest.toFixed(2)}` },
        { label: 'Total Payable', value: `₹${result.totalPayable.toFixed(2)}` },
      ] : []}
      chartBars={result ? [
        { label: 'Principal', value: parseFloat(principal || '0'), color: '#6366f1' },
        { label: 'Interest', value: result.totalInterest, color: '#f59e0b' },
      ] : []}
    >
      <NumberInput id="p" label="Loan Amount (₹)" value={principal} onChange={(_, v) => setPrincipal(v)} placeholder="e.g. 500000" step="0.01" />
      <NumberInput id="r" label="Annual Interest Rate (%)" value={rate} onChange={(_, v) => setRate(v)} placeholder="e.g. 12" step="0.1" />
      <NumberInput id="n" label="Tenure (Months)" value={tenure} onChange={(_, v) => setTenure(v)} placeholder="e.g. 12" step="1" min="1" />
    </CalculatorLayout>
  );
}
