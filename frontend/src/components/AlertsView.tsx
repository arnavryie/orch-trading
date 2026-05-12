import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function AlertsView() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [form, setForm] = useState({ symbol: '', condition: 'above', price: '' });

  const load = () => api.alerts.getAll().then(d => setAlerts(d.alerts || []));
  useEffect(() => { load(); }, []);

  const addAlert = async () => {
    if (!form.symbol || !form.price) return;
    await api.alerts.add({ ...form, price: parseFloat(form.price) });
    setForm({ symbol: '', condition: 'above', price: '' });
    load();
  };

  const removeAlert = async (id: string) => {
    await api.alerts.remove(id);
    load();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Price Alerts</h1>
        <p className="text-text-muted text-sm">Get notified when stocks hit target prices</p>
      </div>

      {/* Add Alert Form */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 space-y-4">
        <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Add New Alert</p>
        <div className="grid grid-cols-3 gap-3">
          <input
            className="bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted font-mono focus:outline-none focus:border-brand/50"
            placeholder="Symbol (e.g. RELIANCE)"
            value={form.symbol}
            onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
          />
          <select
            className="bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
            value={form.condition}
            onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
          >
            <option value="above">Price Above</option>
            <option value="below">Price Below</option>
          </select>
          <input
            type="number"
            className="bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted font-mono focus:outline-none focus:border-brand/50"
            placeholder="Target Price (₹)"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          />
        </div>
        <button onClick={addAlert} className="bg-brand/20 border border-brand/40 text-brand px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand/30 transition-colors">
          + Add Alert
        </button>
      </div>

      {/* Alerts List */}
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        {alerts.length === 0 ? (
          <div className="px-6 py-12 text-center text-text-muted">No alerts configured yet.</div>
        ) : alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-6 py-4 border-b border-border-subtle last:border-0">
            <div className="font-mono">
              <span className="text-white font-bold">{a.symbol}</span>
              <span className="text-text-muted mx-2">{a.condition}</span>
              <span className="text-brand font-semibold">₹{a.price?.toLocaleString('en-IN')}</span>
            </div>
            <button onClick={() => removeAlert(a.id)} className="text-bearish/60 hover:text-bearish text-xs font-mono transition-colors">
              remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
