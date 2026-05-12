import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.broker.getOrders()
      .then(data => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">Order Ledger</h1>
          <p className="text-text-muted text-sm">Executed and pending trades history</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-muted animate-pulse">Scanning transmission records...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-muted">No orders placed in current cycle.</td>
              </tr>
            ) : (
              orders.map((o, idx) => (
                <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.transaction_type === 'BUY' ? 'bg-bullish-dark text-bullish' : 'bg-bearish-dark text-bearish'}`}>
                      {o.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{o.symbol}</td>
                  <td className="px-6 py-4 text-right">{o.quantity}</td>
                  <td className="px-6 py-4 text-right">₹{o.price || o.average_price || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${o.status === 'COMPLETE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
