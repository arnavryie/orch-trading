// frontend/src/components/TrackRecordView.tsx
import { useState, useEffect } from 'react';

const API = '';

interface AIResult { ai: string; verdict: string; correct: boolean; }
interface Prediction {
  symbol: string;
  action: string;
  price: number;
  timestamp: string;
  agreement: number;
  confidence: number;
  status: 'pending' | 'evaluated' | 'no_data';
  return_pct?: number;
  future_close?: number;
  consensus_correct?: boolean;
  ai_results?: AIResult[];
}

export default function TrackRecordView() {
  const [board, setBoard] = useState<any[]>([]);
  const [consensus, setConsensus] = useState<any>({});
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState({ evaluated: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const fetchRecord = async () => {
    try {
      const [scoreRes, predRes] = await Promise.all([
        fetch(`${API}/api/track-record/scoreboard`).then(r => r.json()),
        fetch(`${API}/api/track-record/predictions`).then(r => r.json()),
      ]);
      setBoard(scoreRes.board || []);
      setConsensus(scoreRes.consensus || {});
      setStats({ evaluated: scoreRes.evaluated, pending: scoreRes.pending });
      setPredictions(predRes.predictions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, []);

  if (loading) return <div className="p-10 text-center text-[#888]">Loading AI performance...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">AI Track Record</h1>
        <p className="text-[#888] text-sm mb-6">
          Predictions are scored against actual price action over a 5-day horizon.
          The Consensus Engine uses these scores to weigh each AI's vote.
        </p>

        {/* The Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] p-5 flex flex-col items-center justify-center h-full">
              <div className="text-[#888] text-xs font-bold uppercase tracking-widest mb-2">Council Consensus</div>
              <div className="text-4xl font-black text-white">{consensus.accuracy ?? 0}%</div>
              <div className="text-[#666] text-xs mt-2">{consensus.correct ?? 0} right / {consensus.total ?? 0} calls</div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            {board.map((ai: any, i: number) => (
              <div key={ai.ai} className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] p-4 flex items-center justify-between" style={{ animationDelay: `${i * 0.1}s` }}>
                <div>
                  <div className="text-white font-bold">{ai.ai}</div>
                  <div className="text-[#666] text-xs">{ai.correct} right / {ai.total} calls</div>
                </div>
                <div className={`text-xl font-black ${ai.accuracy >= 60 ? 'text-[#22c55e]' : ai.accuracy < 40 ? 'text-[#ef4444]' : 'text-[#f5b041]'}`}>
                  {ai.accuracy}%
                </div>
              </div>
            ))}
            {board.length === 0 && <div className="col-span-2 text-center text-[#555] py-4 text-sm">Not enough evaluated predictions yet.</div>}
          </div>
        </div>

        {/* Raw Log */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">Prediction Log</h2>
          <div className="text-[#666] text-xs">{stats.evaluated} evaluated · {stats.pending} pending 5-day close</div>
        </div>

        <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141414] text-[#888] text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-normal">Date</th>
                <th className="p-4 font-normal">Stock</th>
                <th className="p-4 font-normal">Council Call</th>
                <th className="p-4 font-normal">Outcome</th>
                <th className="p-4 font-normal">AI Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {predictions.map((p, i) => (
                <tr key={i} className="hover:bg-[#141414] transition-colors">
                  <td className="p-4 text-[#888] tabular-nums whitespace-nowrap">
                    {new Date(p.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="p-4 text-white font-medium">{p.symbol}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      p.action === 'BUY' ? 'bg-[#22c55e]/20 text-[#22c55e]' :
                      p.action === 'SELL' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                      'bg-[#666]/20 text-[#aaa]'
                    }`}>{p.action}</span>
                    <div className="text-[#555] text-[10px] mt-1">@ ₹{p.price?.toLocaleString()}</div>
                  </td>
                  <td className="p-4">
                    {p.status === 'pending' ? (
                      <span className="text-[#f5b041] text-xs">Waiting 5 days…</span>
                    ) : p.status === 'no_data' ? (
                      <span className="text-[#666] text-xs">No chart data</span>
                    ) : (
                      <div>
                        <div className={`font-bold ${p.consensus_correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {p.consensus_correct ? 'CORRECT' : 'WRONG'}
                        </div>
                        <div className="text-[#888] text-[11px]">
                          Moved {p.return_pct! > 0 ? '+' : ''}{p.return_pct}%
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {p.status === 'evaluated' && p.ai_results ? (
                      <div className="flex gap-2 text-[11px]">
                        {p.ai_results.map(r => (
                          <span key={r.ai} className={r.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                            {r.ai}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-[#555]">—</span>}
                  </td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-[#666]">No predictions logged yet. Run the council to start scoring.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
