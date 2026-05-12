import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function IVSmileView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.market.getIVSmile().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Calculating IV Smile...</div>;
  if (!data || !data.smile) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Implied Volatility (IV) Smile</h1>
        <p className="text-text-muted text-sm">{data.symbol} • Spot: ₹{data.spot?.toLocaleString('en-IN')}</p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-6 h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.smile} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="strike" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
            <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
              itemStyle={{ fontFamily: 'monospace' }}
              formatter={(value: any) => [`${value}%`, 'IV']}
            />
            <Line type="monotone" dataKey="iv_call" stroke="#00c48c" strokeWidth={2} dot={{ r: 4, fill: '#00c48c' }} name="Call IV" />
            <Line type="monotone" dataKey="iv_put" stroke="#f85149" strokeWidth={2} dot={{ r: 4, fill: '#f85149' }} name="Put IV" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
