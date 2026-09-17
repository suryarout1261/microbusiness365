import { useRef, useEffect, useState, type ReactNode } from 'react';

function FitText({ text, className = '', maxLines = 1 }: { text: string; className?: string; maxLines?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(48);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    // start large, shrink until fits
    const start = 56;
    let s = start;
    // measure with hidden font size
    el.style.fontSize = start + 'px';
    const parentW = parent.clientWidth;
    const parentH = parent.clientHeight || 100;
    // binary search for best size
    let lo = 10, hi = start;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      el.style.fontSize = mid + 'px';
      const fits = el.scrollWidth <= parentW + 2 && el.scrollHeight <= parentH + 2;
      if (fits) lo = mid;
      else hi = mid - 1;
    }
    el.style.fontSize = lo + 'px';
    setSize(lo);
  }, [text]);

  return <span ref={ref} className={`inline-block whitespace-nowrap ${className}`} style={{ fontSize: size, lineHeight: 1.1 }}>{text}</span>;
}

export default FitText;
