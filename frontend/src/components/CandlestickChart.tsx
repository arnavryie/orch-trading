import React, { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType,
  CandlestickSeries, HistogramSeries,
} from 'lightweight-charts';
import { api } from '../api/client';

const PERIODS = [
  { label: '1D',  period: '1d',  interval: '5m'  },
  { label: '1W',  period: '5d',  interval: '15m' },
  { label: '1M',  period: '1mo', interval: '1h'  },
  { label: '3M',  period: '3mo', interval: '1d'  },
  { label: '1Y',  period: '1y',  interval: '1d'  },
  { label: '5Y',  period: '5y',  interval: '1wk' },
];

interface Props {
  symbol?: string;
  height?: number;
}

export default function CandlestickChart({ symbol = 'NIFTY', height = 480 }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<ReturnType<typeof createChart> | null>(null);
  const candleRef      = useRef<any>(null);
  const volumeRef      = useRef<any>(null);

  const [activePeriod, setActivePeriod] = useState('3M');
  const [currentSym,   setCurrentSym]   = useState(symbol.toUpperCase());
  const [inputSym,     setInputSym]     = useState(symbol.toUpperCase());
  const [quote,        setQuote]        = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#888' },
      grid:   { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#222' },
      timeScale:       { borderColor: '#222', timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: height - 52,
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    const volume = chart.addSeries(HistogramSeries, {
      color: '#26a69a', priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current  = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [height]);

  // Load data
  const loadData = async (sym: string, periodLabel: string) => {
    const opt = PERIODS.find(p => p.label === periodLabel) || PERIODS[3];
    setLoading(true); setError('');
    try {
      const [chartData, quoteData] = await Promise.all([
        api.market.getChart(sym, opt.period, opt.interval),
        api.market.getQuote(sym),
      ]);
      setQuote(quoteData);
      const rows = (chartData.data || [])
        .filter((d: any) => d.close > 0)
        .sort((a: any, b: any) => a.time - b.time);

      candleRef.current?.setData(rows.map((d: any) => ({
        time: d.time, open: d.open, high: d.high, low: d.low, close: d.close,
      })));
      volumeRef.current?.setData(rows.map((d: any) => ({
        time: d.time, value: d.volume,
        color: d.close >= d.open ? '#22c55e44' : '#ef444444',
      })));
      chartRef.current?.timeScale().fitContent();
    } catch (e: any) {
      setError(e.message || 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentSym, activePeriod);
    const iv = setInterval(() => loadData(currentSym, activePeriod), 60_000);
    return () => clearInterval(iv);
  }, [currentSym, activePeriod]);

  const pos = (quote?.change_pct ?? 0) >= 0;

  return (
    <div className="bg-[#0a0a0a] rounded-lg overflow-hidden border border-[#1e1e1e]" style={{ height }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1e1e1e] h-[52px] flex-shrink-0">
        {/* Symbol input */}
        <div className="flex items-center gap-1 bg-[#161616] rounded px-2 py-1">
          <span className="text-[#555] text-xs">🔍</span>
          <input
            value={inputSym}
            onChange={e => setInputSym(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') setCurrentSym(inputSym); }}
            className="bg-transparent outline-none text-white text-xs w-24 placeholder:text-[#444]"
            placeholder="RELIANCE…"
          />
        </div>

        {/* Live quote */}
        {quote && !error && (
          <>
            <span className="text-white font-bold text-sm">
              ₹{quote.price?.toLocaleString('en-IN')}
            </span>
            <span className={`text-xs font-medium ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {pos ? '▲' : '▼'} {Math.abs(quote.change_pct ?? 0).toFixed(2)}%
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              quote.market_open
                ? 'bg-[#14532d]/30 text-[#22c55e] border-[#22c55e]/20'
                : 'bg-[#3d1a1a]/30 text-[#f59e0b] border-[#f59e0b]/20'
            }`}>
              {quote.market_open ? '● LIVE' : '● CLOSED'}
            </span>
          </>
        )}
        {loading && <span className="text-[#555] text-xs animate-pulse">Loading…</span>}
        {error   && <span className="text-[#ef4444] text-xs">{error}</span>}

        <div className="flex-1" />

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setActivePeriod(p.label)}
              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                activePeriod === p.label
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'text-[#666] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} style={{ height: height - 52, width: '100%' }} />
    </div>
  );
}
