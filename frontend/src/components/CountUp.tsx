import { useEffect, useRef, useState } from 'react';

export default function CountUp({ value, prefix = '₹', decimals = 0, duration = 600 }: { value: number; prefix?: string; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const startVal = useRef(value);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startVal.current = display;
    startTime.current = null;
    let raf: number;
    const animate = (t: number) => {
      if (startTime.current === null) startTime.current = t;
      const progress = Math.min((t - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(startVal.current + (value - startVal.current) * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, display]);

  return <span className="tabular-nums">{prefix}{display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
