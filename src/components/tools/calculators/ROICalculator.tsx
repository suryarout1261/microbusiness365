import { useState } from 'react';
import CalculatorLayout from './CalculatorLayout';
import NumberInput from './NumberInput';

export default function ROICalculator() {
  const [investment, setInvestment] = useState('');
  const [returnAmount, setReturnAmount] = useState('');
  const [result, setResult] = useState<{ roi: number; netProfit: number } | null>(null);

  const calculate = () => {
    const inv = parseFloat(investment) || 0;
    const ret = parseFloat(returnAmount) || 0;
    const netProfit = ret - inv;
    const roi = inv > 0 ? (netProfit / inv) * 100 : 0;
    setResult({ roi, netProfit });
  };

  const reset = () => {
    setInvestment('');
    setReturnAmount('');
    setResult(null);
  };

  return (
    <CalculatorLayout
      title="ROI Calculator"
      onCalculate={calculate}
      onReset={reset}
      resultLabel="ROI"
      resultValue={result ? `${result.roi.toFixed(2)}%` : ''}
      resultSubtext={result ? `Net Profit: ₹${result.netProfit.toFixed(2)}` : ''}
      resultDetails={result ? [
        { label: 'Investment', value: `₹${parseFloat(investment || '0').toFixed(2)}` },
        { label: 'Return', value: `₹${parseFloat(returnAmount || '0').toFixed(2)}` },
        { label: 'Net Profit', value: `₹${result.netProfit.toFixed(2)}` },
        { label: 'ROI', value: `${result.roi.toFixed(2)}%` },
      ] : []}
      chartBars={result ? [
        { label: 'Investment', value: parseFloat(investment) || 0, color: '#6366f1' },
        { label: 'Return', value: parseFloat(returnAmount) || 0, color: '#22c55e' },
      ] : []}
    >
      <NumberInput id="inv" label="Investment Amount (₹)" value={investment} onChange={(_, v) => setInvestment(v)} placeholder="e.g. 100000" step="0.01" />
      <NumberInput id="ret" label="Return / Gain (₹)" value={returnAmount} onChange={(_, v) => setReturnAmount(v)} placeholder="e.g. 130000" step="0.01" />
    </CalculatorLayout>
  );
}