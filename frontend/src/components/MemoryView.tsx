import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MemoryView() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.memory.getAll().then(d => setEntries((d.entries || []).reverse())).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">AI Memory</h1>
        <p className="text-text-muted text-sm">Log of all AI decisions, analyses, and trade history</p>
      </div>
      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse font-mono">Loading memory logs...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <p className="text-4xl mb-3">🧠</p>
          <p>No memory entries yet. Run the AI analysis or auto-trader to generate logs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className={`bg-bg-card border rounded-xl p-4 ${e.type === 'trade' ? 'border-brand/30' : 'border-border-subtle'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${e.type === 'trade' ? 'bg-brand/20 text-brand' : 'bg-white/5 text-text-muted'}`}>
                  {e.type}
                </span>
                <span className="text-[10px] text-text-muted font-mono">{e.timestamp ? new Date(e.timestamp).toLocaleString('en-IN') : ''}</span>
              </div>
              {e.type === 'trade' && (
                <div className="font-mono text-sm">
                  <span className={`font-bold ${e.action === 'BUY' ? 'text-bullish' : 'text-bearish'}`}>{e.action}</span>
                  <span className="text-white ml-2">{e.symbol}</span>
                  <span className="text-text-muted ml-2">×{e.quantity} @ ₹{e.price}</span>
                  <span className={`ml-2 text-xs ${e.status === 'COMPLETE' ? 'text-bullish' : 'text-neutral'}`}>{e.status}</span>
                </div>
              )}
              {e.reason && <p className="text-xs text-text-muted mt-1">{e.reason}</p>}
              {e.commentary && <p className="text-xs text-text-muted/70 mt-1 italic">{e.commentary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
