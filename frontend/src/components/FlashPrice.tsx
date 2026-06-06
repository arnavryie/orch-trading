import { usePriceFlash } from '../hooks/usePriceFlash';

interface Props {
  value: number;
  prefix?: string;
  className?: string;
  decimals?: number;
}

export default function FlashPrice({ value, prefix = '₹', className = '', decimals = 2 }: Props) {
  const flash = usePriceFlash(value);
  return (
    <span className={`${flash} ${className} rounded px-1 -mx-1 tabular-nums`} style={{ transition: 'background-color 0.6s ease' }}>
      {prefix}{value?.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
