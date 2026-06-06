import { useEffect, useState } from "react";
import FlashPrice from "./FlashPrice";
import { SkeletonList } from "./Skeleton";

const API = "";

export default function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [explainModal, setExplainModal] = useState<any>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/orders`)
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const explainTrade = async (orderId: string) => {
    setLoadingExplanation(true);
    setExplainModal({ orderId, loading: true });
    try {
      const res = await fetch(`${API}/api/explain/${orderId}`);
      if (!res.ok) throw new Error("No explanation found");
      const data = await res.json();
      setExplainModal({ orderId, data, loading: false });
    } catch (e: any) {
      setExplainModal({ orderId, error: e.message, loading: false });
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (loading) return <div className="p-6"><SkeletonList rows={5} /></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar relative" style={{ padding: "16px 24px", paddingBottom: "80px" }}>
      <h2 style={{ color: "#fff", marginBottom: "16px" }}>Orders ({orders.length})</h2>
      {orders.length === 0 ? (
        <div style={{ color: "#888", textAlign: "center", marginTop: "60px" }}>
          <div>No orders yet.</div>
          <div style={{ color: "#555", marginTop: "8px" }}>Try: "buy reliance 10" in the chat below</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2d2d2d" }}>
              {["Symbol", "Type", "Qty", "Price", "Status", "Time", "Analysis"].map(h => (
                <th key={h} style={{ color: "#888", padding: "8px 12px", textAlign: "left", fontSize: "12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.order_id} className="row-hover transition-colors" style={{ borderBottom: "1px solid #1e1e1e" }}>
                <td style={{ color: "#fff", padding: "12px", fontWeight: "bold" }}>{o.symbol}</td>
                <td style={{ color: o.type === "BUY" ? "#40e56c" : "#ffb4ab", padding: "12px", fontWeight: "bold" }}>{o.type}</td>
                <td style={{ color: "#ddd", padding: "12px" }}>{o.qty}</td>
                <td style={{ color: "#ddd", padding: "12px" }}><FlashPrice value={o.price} /></td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: "#16a34a22", color: "#40e56c", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>{o.status}</span>
                </td>
                <td style={{ color: "#888", padding: "12px", fontSize: "12px" }}>{new Date(o.timestamp).toLocaleString("en-IN")}</td>
                <td style={{ padding: "12px" }}>
                  <button 
                    onClick={() => explainTrade(o.order_id)}
                    className="px-3 py-1 rounded bg-[#222] hover:bg-[#333] text-[#aaa] text-xs transition-smooth"
                  >
                    Why?
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Explanation Modal */}
      {explainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setExplainModal(null)}
              className="absolute top-4 right-4 text-[#888] hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl font-bold text-white mb-4">Trade Explanation</h2>
            
            {explainModal.loading ? (
              <div className="text-center py-10 text-[#888]">Retrieving council reasoning...</div>
            ) : explainModal.error ? (
              <div className="text-center py-10 text-[#ef4444] bg-[#ef4444]/10 rounded-xl">
                {explainModal.error}
              </div>
            ) : explainModal.data ? (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#141414] rounded-xl p-4 border border-[#1e1e1e]">
                    <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1">Execution</div>
                    <div className="text-lg font-bold text-white">
                      {explainModal.data.side} {explainModal.data.qty} {explainModal.data.symbol}
                    </div>
                  </div>
                  <div className="flex-1 bg-[#141414] rounded-xl p-4 border border-[#1e1e1e]">
                    <div className="text-[10px] text-[#888] uppercase tracking-widest mb-1">Desk Personality</div>
                    <div className="text-lg font-bold text-[#4184f3] uppercase">
                      {explainModal.data.personality}
                    </div>
                  </div>
                </div>

                {explainModal.data.consensus && (
                  <div className="bg-[#141414] rounded-xl p-4 border border-[#1e1e1e]">
                    <div className="text-[10px] text-[#888] uppercase tracking-widest mb-2">Consensus</div>
                    <div className="text-white text-sm leading-relaxed">
                      {explainModal.data.consensus.summary}
                    </div>
                  </div>
                )}

                {explainModal.data.devils_advocate && explainModal.data.devils_advocate.counter_case && (
                  <div className="bg-[#ef4444]/10 rounded-xl p-4 border border-[#ef4444]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">👿</span>
                      <div className="text-[10px] text-[#ffb4ab] uppercase tracking-widest">Devil's Advocate Argued</div>
                    </div>
                    <div className="text-[#ffb4ab] text-sm leading-relaxed">
                      {explainModal.data.devils_advocate.counter_case}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] text-[#888] uppercase tracking-widest ml-1">Individual Votes</div>
                  {explainModal.data.votes?.map((v: any, i: number) => (
                    <div key={i} className="bg-[#141414] rounded-xl p-4 border border-[#1e1e1e]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-bold text-sm">{v.role} <span className="text-[#666] text-xs font-normal">({v.ai})</span></div>
                        <div className={`text-xs font-bold ${v.verdict === 'BUY' ? 'text-[#22c55e]' : v.verdict === 'SELL' ? 'text-[#ef4444]' : 'text-[#f5b041]'}`}>
                          {v.verdict} {v.confidence ? `(${v.confidence}%)` : ''}
                        </div>
                      </div>
                      <div className="text-[#aaa] text-sm leading-relaxed">
                        {v.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
