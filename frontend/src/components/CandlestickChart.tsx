import React from 'react';
import { ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, Cell } from 'recharts';

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: OHLCV[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close >= data.open;
    const color = isUp ? 'text-bullish' : 'text-bearish';
    
    return (
      <div className="bg-bg-card border border-border-medium rounded shadow-xl p-3 text-xs font-mono">
        <p className="text-text-muted mb-2 border-b border-border-subtle pb-1">{data.date}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-text-muted">Open:</span> <span className="text-white text-right">₹{data.open.toFixed(2)}</span>
          <span className="text-text-muted">High:</span> <span className="text-white text-right">₹{data.high.toFixed(2)}</span>
          <span className="text-text-muted">Low:</span> <span className="text-white text-right">₹{data.low.toFixed(2)}</span>
          <span className="text-text-muted">Close:</span> <span className={`text-right font-bold ${color}`}>₹{data.close.toFixed(2)}</span>
          <span className="text-text-muted">Volume:</span> <span className="text-neutral text-right">{data.volume.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom shape for candlestick body and wicks
const Candlestick = (props: any) => {
  const { x, y, width, height, open, close, high, low, xAxis, yAxis } = props;
  
  // Need to manually calculate pixel coordinates for the wicks
  const isUp = close >= open;
  const color = isUp ? '#00c48c' : '#f85149'; // bullish/bearish hex colors
  
  if (!yAxis || !xAxis || typeof open === 'undefined') return null;

  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);
  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);

  const xCenter = x + width / 2;

  // Body rect
  const yTop = Math.min(yOpen, yClose);
  const yBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(1, yBottom - yTop); // at least 1px

  return (
    <g>
      {/* Upper wick */}
      <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yTop} stroke={color} strokeWidth={1} />
      {/* Lower wick */}
      <line x1={xCenter} y1={yBottom} x2={xCenter} y2={yLow} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={yTop} width={width} height={bodyHeight} fill={isUp ? 'transparent' : color} stroke={color} strokeWidth={1.5} />
    </g>
  );
};

export default function CandlestickChart({ data, height = 400 }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center w-full bg-white/[0.02] border border-border-subtle rounded-xl text-text-muted font-mono text-sm" style={{ height }}>No chart data available</div>;
  }

  // Calculate domain for Y-axis with some padding
  const minLow = Math.min(...data.map(d => d.low));
  const maxHigh = Math.max(...data.map(d => d.high));
  const padding = (maxHigh - minLow) * 0.05;
  const yDomain = [Math.max(0, minLow - padding), maxHigh + padding];
  
  // Format dates for X-axis
  const formattedData = data.map(d => ({
    ...d,
    // Add dummy values to trigger rendering, the custom shape will use original values
    dummyClose: d.close, 
    displayDate: d.date.split('-').slice(1).join('/') // MM/DD
  }));

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="displayDate" 
            tick={{ fill: '#8b949e', fontSize: 10 }} 
            tickLine={false}
            axisLine={{ stroke: '#30363d' }}
            minTickGap={20}
          />
          <YAxis 
            domain={yDomain} 
            tick={{ fill: '#8b949e', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: number) => `₹${val}`}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          
          {/* Main Candlestick Series - we use Bar as a container to inject our custom shape */}
          <Bar dataKey="dummyClose" shape={<Candlestick />} isAnimationActive={false}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
