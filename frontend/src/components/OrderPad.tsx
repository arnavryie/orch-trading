import { useState, useEffect } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';

interface Props {
  open: boolean;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  onClose: () => void;
  onDone?: () => void;
}

export default function OrderPad({ open, symbol, side, price, onClose, onDone }: Props) {
  const [qty, setQty]       = useState(1);
  const [livePrice, setLive] = useState(price);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => { setLive(price); setQty(1); setResult(null); }, [symbol, price, open]);

  // Live-update the price while pad is open
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      api.market.getQuote(symbol).then(q => { if (q?.price > 0) setLive(q.price); }).catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, [open, symbol]);

  if (!open) return null;

  const total = qty * livePrice;
  const isBuy = side === 'BUY';

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.broker.placeOrder({ symbol, qty, order_type: side });
      setResult(res.message || `${side} ${qty} ${symbol} placed`);
      onDone?.();
      setTimeout(onClose, 1200);
    } catch {
      setResult('Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-[1100] fade-in" />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[400px] bg-[#0d0d0d] border-l border-[#1e1e1e] z-[1101] slide-in-right flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 ${isBuy ? 'bg-kite-blue/10' : 'bg-[#ff5722]/10'} border-b border-[#1e1e1e]`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-kite-blue text-white' : 'bg-[#ff5722] text-white'}`}>{side}</span>
                <span className="text-white font-bold text-base">{symbol}</span>
              </div>
              <div className="text-[#888] text-xs mt-1">NSE · Demo Order</div>
            </div>
            <FlashPrice value={livePrice} className="text-white font-bold" />
          </div>
        </div>

        {/* Form */}
        <div className="p-5 flex-1">
          <label className="text-[#888] text-xs uppercase tracking-wider">Quantity</label>
          <div className="flex items-center gap-2 mt-2 mb-5">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded bg-[#1a1a1a] text-white btn-press">−</button>
            <input
              type="number" value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center outline-none focus:border-kite-blue transition-smooth"
            />
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded bg-[#1a1a1a] text-white btn-press">+</button>
          </div>

          {/* Quick qty chips */}
          <div className="flex gap-2 mb-6">
            {[5, 10, 25, 50].map(n => (
              <button key={n} onClick={() => setQty(n)}
                className="flex-1 py-1.5 rounded bg-[#161616] text-[#aaa] text-xs btn-press hover:bg-[#1f1f1f] transition-smooth">
                {n}
              </button>
            ))}
          </div>

          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#888]">Approx. value</span>
              <FlashPrice value={total} className="text-white font-semibold" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#666]">{qty} × ₹{livePrice.toLocaleString('en-IN')}</span>
              <span className="text-[#666]">Demo funds</span>
            </div>
          </div>

          {result && (
            <div className="mt-4 text-center text-sm text-bullish fade-in">{result}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="px-5 py-3 rounded-lg bg-[#1a1a1a] text-[#aaa] text-sm btn-press flex-1">Cancel</button>
          <button
            onClick={submit}
            disabled={submitting}
            className={`px-5 py-3 rounded-lg text-white font-bold text-sm btn-press flex-[2] ${isBuy ? 'bg-kite-blue' : 'bg-[#ff5722]'} disabled:opacity-50`}
          >
            {submitting ? 'Placing…' : `${side} ${qty} ${symbol}`}
          </button>
        </div>
      </div>
    </>
  );
}
