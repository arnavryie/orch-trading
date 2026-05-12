import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function StrategyView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.risk.getStrategy().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Loading strategy library...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Strategy Library</h1>
        <p className="text-text-muted text-sm">Options & Equity predefined trading setups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.strategies?.map((s: any) => (
          <div key={s.id} className="bg-bg-card border border-border-subtle rounded-xl p-5 hover:border-brand/50 transition-colors group cursor-pointer shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${s.type === 'Options' ? 'bg-brand/20 text-brand' : 'bg-bullish/20 text-bullish'}`}>
                {s.type}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${s.risk === 'Low' ? 'text-bullish' : s.risk === 'Medium' ? 'text-neutral' : 'text-bearish'}`}>
                {s.risk} Risk
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-mono mb-2 group-hover:text-brand transition-colors">{s.name}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
