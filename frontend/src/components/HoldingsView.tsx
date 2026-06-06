import { useEffect, useState } from "react";
import FlashPrice from "./FlashPrice";
import CountUp from "./CountUp";
import { SkeletonList } from "./Skeleton";

const API = "";

export default function HoldingsView() {
  const [holdings, setHoldings] = useState([]);
  const [funds, setFunds] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/holdings`).then(r => r.json()),
      fetch(`${API}/api/funds`).then(r => r.json()),
    ]).then(([h, f]) => {
      setHoldings(h);
      setFunds(f);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><SkeletonList rows={5} /></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "16px 24px", paddingBottom: "80px" }}>
      {funds && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          <div className="card-lift" style={{ background: "#0f0f0f", borderRadius: "8px", padding: "16px", flex: 1, border: "1px solid #1a1a1a" }}>
            <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Available Cash</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "bold" }}><CountUp value={funds.available_cash} /></div>
          </div>
          <div className="card-lift" style={{ background: "#0f0f0f", borderRadius: "8px", padding: "16px", flex: 1, border: "1px solid #1a1a1a" }}>
            <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Portfolio Value</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "bold" }}><CountUp value={funds.portfolio_value} /></div>
          </div>
          <div className="card-lift" style={{ background: "#0f0f0f", borderRadius: "8px", padding: "16px", flex: 1, border: "1px solid #1a1a1a" }}>
            <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Total P&L</div>
            <div style={{ color: (funds.pnl || 0) >= 0 ? "#40e56c" : "#ffb4ab", fontSize: "22px", fontWeight: "bold" }}>
              <CountUp value={funds.pnl} prefix={funds.pnl >= 0 ? '+₹' : '-₹'} /> ({funds.pnl_pct?.toFixed(1)}%)
            </div>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div style={{ color: "#888", textAlign: "center", marginTop: "60px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💼</div>
          <div>No holdings yet. Use the Watchlist to buy stocks.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" }}>
          {holdings.map((h: any) => (
            <div key={h.symbol} className="row-hover card-lift bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-semibold text-sm">{h.symbol}</div>
                  <div className="text-[#555] text-[11px]">NSE · {h.quantity} qty · avg ₹{h.avg_price}</div>
                </div>
                <div className="text-right">
                  <FlashPrice value={h.current_price} className="text-white font-semibold text-sm" />
                  <div className={`text-[11px] mt-0.5 ${h.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toFixed(0)} ({h.pnl >= 0 ? '+' : ''}{h.pnl_pct?.toFixed(2)}%)
                  </div>
                </div>
              </div>
              {/* P&L bar */}
              <div className="h-1 bg-[#1a1a1a] rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.abs(h.pnl_pct || 0) * 5, 100)}%`, background: h.pnl >= 0 ? '#40e56c' : '#ff6464' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
