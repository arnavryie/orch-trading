// frontend/src/components/AutoTraderView.tsx
// THE CONSENSUS ENGINE control panel — start/stop council-driven auto-trading.
import { useState, useEffect, useRef } from 'react';

const API = '';

interface Activity { time: string; kind: string; msg: string; executed?: boolean; }
interface Status {
  running: boolean;
  status: string;
  cycle: number;
  trades_today: number;
  daily_pnl: number;
  last_run: string | null;
  settings: {
    auto_execute: boolean;
    min_agreement: number;
    min_confidence: number;
    scan_interval_min: number;
    max_position_size: number;
    daily_loss_limit: number;
  };
  activity: Activity[];
}

const kindColor = (k: string) =>
  k === 'trade' ? '#22c55e' : k === 'signal' ? '#4184f3' : k === 'halt' ? '#ef4444' : '#888';

export default function AutoTraderView() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await fetch(`${API}/api/auto-trader/status`).then(r => r.json());
      setStatus(s);
      if (s.settings) setSettings((prev: any) => ({ ...s.settings, ...prev }));
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const saveSettings = async (patch: any) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await fetch(`${API}/api/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const toggle = async () => {
    setBusy(true);
    const endpoint = status?.running ? 'stop' : 'start';
    await fetch(`${API}/api/auto-trader/${endpoint}`, { method: 'POST' });
    await fetchStatus();
    setBusy(false);
  };

  const runOnce = async () => {
    setBusy(true);
    await fetch(`${API}/api/auto-trader/run-once`, { method: 'POST' });
    await fetchStatus();
    setBusy(false);
  };

  const running = status?.running;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header + master switch */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Consensus Engine</h1>
            <p className="text-[#888] text-sm mt-1">Auto-trades only when the AI council agrees above your thresholds.</p>
          </div>
          <button
            onClick={toggle}
            disabled={busy}
            className={`btn-press px-6 py-3 rounded-xl font-bold text-sm transition-smooth ${
              running ? 'bg-[#ef4444] text-white' : 'bg-[#22c55e] text-black'
            } disabled:opacity-50`}
          >
            {busy ? '…' : running ? '■ Stop Engine' : '▶ Start Engine'}
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Status', value: status?.status ?? '—', color: running ? '#22c55e' : '#888' },
            { label: 'Scans run', value: status?.cycle ?? 0, color: '#fff' },
            { label: 'Trades today', value: status?.trades_today ?? 0, color: '#4184f3' },
            { label: "Today's P&L", value: `₹${(status?.daily_pnl ?? 0).toLocaleString('en-IN')}`, color: (status?.daily_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
          ].map(card => (
            <div key={card.label} className="card-lift bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
              <div className="text-[#666] text-[11px] uppercase tracking-wider">{card.label}</div>
              <div className="text-lg font-bold mt-1" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Safety banner */}
        <div className={`rounded-lg p-3 mb-6 text-[13px] border ${
          settings.auto_execute
            ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ffb4ab]'
            : 'bg-[#4184f3]/10 border-[#4184f3]/30 text-[#9dc0ff]'
        }`}>
          {settings.auto_execute
            ? '⚡ LIVE EXECUTION: the engine will place demo orders automatically when the council agrees.'
            : '👁 MONITOR-ONLY: the engine logs signals but does NOT place orders. Flip the switch below to enable execution.'}
        </div>

        {/* Threshold controls */}
        <div className="bg-[#0f0f0f] rounded-xl p-5 border border-[#1a1a1a] mb-6">
          <h3 className="text-white font-bold text-sm mb-4">Trading Rules</h3>

          {/* Auto-execute toggle */}
          <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
            <div>
              <div className="text-white text-sm">Auto-execute trades</div>
              <div className="text-[#666] text-[11px]">Off = signals only. On = places demo orders.</div>
            </div>
            <button
              onClick={() => saveSettings({ auto_execute: !settings.auto_execute })}
              className={`w-12 h-6 rounded-full transition-smooth relative ${settings.auto_execute ? 'bg-[#22c55e]' : 'bg-[#333]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${settings.auto_execute ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Min agreement slider */}
          <SliderRow
            label="Min council agreement"
            hint="Only act when this % of AIs agree"
            value={settings.min_agreement ?? 75}
            min={50} max={100} step={5} suffix="%"
            onChange={(v) => saveSettings({ min_agreement: v })}
          />

          {/* Min confidence slider */}
          <SliderRow
            label="Min confidence"
            hint="Only act above this confidence level"
            value={settings.min_confidence ?? 65}
            min={40} max={95} step={5} suffix="%"
            onChange={(v) => saveSettings({ min_confidence: v })}
          />

          {/* Scan interval */}
          <SliderRow
            label="Scan interval"
            hint="How often to run the council on your watchlist"
            value={settings.scan_interval_min ?? 5}
            min={1} max={30} step={1} suffix=" min"
            onChange={(v) => saveSettings({ scan_interval_min: v })}
          />
        </div>

        {/* Run once (testing) */}
        <button
          onClick={runOnce}
          disabled={busy}
          className="btn-press w-full py-3 rounded-lg bg-[#1a1a1a] text-[#ccc] text-sm mb-6 hover:bg-[#222] transition-smooth disabled:opacity-50"
        >
          {busy ? 'Running council scan…' : '↻ Run one scan now (test)'}
        </button>

        {/* Live activity feed */}
        <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Live Activity</h3>
            {running && <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e]"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />running</span>}
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            {(!status?.activity || status.activity.length === 0) ? (
              <div className="text-center py-10 text-[#555] text-sm">
                No activity yet. Start the engine or run a scan.
              </div>
            ) : (
              status.activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#141414] fade-in">
                  <span className="text-[#444] text-[11px] tabular-nums w-16">{a.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: kindColor(a.kind) }} />
                  <span className="text-[#ccc] text-[13px] flex-1">{a.msg}</span>
                  {a.executed !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.executed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#666]/15 text-[#888]'}`}>
                      {a.executed ? 'EXECUTED' : 'LOGGED'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[#555] text-[11px] mt-4 text-center">
          Demo mode · virtual money · the Risk Manager (Claude) has the final word inside every council run · not financial advice
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, hint, value, min, max, step, suffix, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-3 border-b border-[#1a1a1a] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-white text-sm">{label}</div>
          <div className="text-[#666] text-[11px]">{hint}</div>
        </div>
        <span className="text-primary font-bold text-sm tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#4184f3] cursor-pointer"
      />
    </div>
  );
}
