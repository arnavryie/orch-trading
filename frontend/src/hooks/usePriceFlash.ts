import { useEffect, useRef, useState } from 'react';

/**
 * Returns a className that flashes green/red for 0.6s whenever `value` changes.
 * Usage: const flash = usePriceFlash(price); <span className={flash}>{price}</span>
 */
export function usePriceFlash(value: number | undefined): string {
  const prev = useRef(value);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (value === undefined || prev.current === undefined) {
      prev.current = value;
      return;
    }
    if (value > prev.current) setFlash('flash-up');
    else if (value < prev.current) setFlash('flash-down');
    prev.current = value;
    const t = setTimeout(() => setFlash(''), 600);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
