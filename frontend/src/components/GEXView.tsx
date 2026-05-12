import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export default function GEXView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.market.getGEX().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Calculating Gamma Exposure...</div>;
  if (!data) return null;

  const chartData = data.gex || [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Gamma Exposure (GEX)</h1>
        <p className="text-text-muted text-sm">{data.symbol} • Spot: ₹{data.spot?.toLocaleString('en-IN')} • Flip Point: ₹{data.flip_point?.toLocaleString('en-IN')}</p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-6 h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="strike" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
            <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
              itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')} Cr`, 'GEX']}
            />
            <ReferenceLine x={data.spot} stroke="#e3b341" strokeDasharray="3 3" label={{ position: 'top', value: 'Spot', fill: '#e3b341', fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#30363d" />
            <Bar dataKey="gex">
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.gex > 0 ? '#00c48c' : '#f85149'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
