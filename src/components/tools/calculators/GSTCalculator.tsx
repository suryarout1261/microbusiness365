import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function GSTCalculator() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [result, setResult] = useState<{ gst: number; total: number }>({ gst: 0, total: 0 });

  const calculate = () => {
    const amt = parseFloat(amount) || 0;
    const r = parseFloat(rate) || 0;
    if (amt < 0 || r < 0) { setResult({ gst: 0, total: 0 }); return; }
    const gst = amt * r / 100;
    setResult({ gst, total: amt + gst });
  };

  const reset = () => {
    setAmount('');
    setRate('');
    setResult({ gst: 0, total: 0 });
  };

  return (
    <CalculatorLayout
      title="GST Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="TOTAL WITH GST"
      resultValue={`₹${result.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
      resultSubtext={`GST (₹${result.gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}) @ ${rate || '0'}%`}
      resultDetails={[
        { label: 'Original Amount', value: `₹${parseFloat(amount || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
        { label: 'GST Amount', value: `₹${result.gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
        { label: 'Total With GST', value: `₹${result.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
        { label: 'GST Rate', value: `${rate || '0'}%` },
      ]}
      chartBars={[
        { label: 'Original Amount', value: parseFloat(amount || '0'), color: '#6366f1' },
        { label: 'GST', value: result.gst, color: '#22c55e' },
      ]}
    >
      <NumberInput id="amt" label="Amount (₹)" value={amount} onChange={(_, v) => setAmount(v)} placeholder="e.g. 1000" step="0.01" />
      <NumberInput id="rate" label="GST Rate (%)" value={rate} onChange={(_, v) => setRate(v)} placeholder="e.g. 18" step="0.5" />
    </CalculatorLayout>
  );
}
