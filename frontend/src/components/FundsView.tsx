import { useEffect, useState } from "react";
import CountUp from "./CountUp";
import { SkeletonList } from "./Skeleton";

const API = "";

export default function FundsView() {
  const [funds, setFunds] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/funds`).then(r => r.json()).then(setFunds);
  }, []);

  if (!funds) return <div className="p-6"><SkeletonList rows={4} /></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "24px", paddingBottom: "80px" }}>
      <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#f59e0b", fontSize: "13px" }}>
        ⚠️ This is a demo account with virtual money. No real trades are executed.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <div className="card-lift" style={{ background: "#0f0f0f", borderRadius: "12px", padding: "24px", border: "1px solid #1a1a1a" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}>Equity</div>
          <div style={{ color: "#fff", fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            <CountUp value={funds.available_cash} />
          </div>
          <div style={{ fontSize: "13px", color: "#888" }}>Margin available</div>
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: "12px" }}>Opening balance</span>
            <span style={{ color: "#fff", fontSize: "12px" }}>₹{(funds.opening_balance / 100000).toFixed(1)}L</span>
          </div>
          <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: "12px" }}>Margins used</span>
            <span style={{ color: "#fff", fontSize: "12px" }}>₹{funds.total_invested?.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="card-lift" style={{ background: "#0f0f0f", borderRadius: "12px", padding: "24px", border: "1px solid #1a1a1a" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}>Portfolio P&L</div>
          <div style={{ color: (funds.pnl || 0) >= 0 ? "#40e56c" : "#ffb4ab", fontSize: "32px", fontWeight: "bold" }}>
            <CountUp value={funds.pnl} prefix={funds.pnl >= 0 ? '+₹' : '-₹'} />
          </div>
          <div style={{ color: "#888", fontSize: "13px" }}>{funds.pnl_pct?.toFixed(2)}% overall return</div>
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: "12px" }}>Portfolio value</span>
            <span style={{ color: "#fff", fontSize: "12px" }}>₹{funds.portfolio_value?.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => fetch(`${API}/api/demo/reset`, { method: "POST" }).then(() => window.location.reload())}
        className="btn-press"
        style={{ marginTop: "24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
      >
        🔄 Reset Demo Account (restore ₹10,00,000)
      </button>
    </div>
  );
}
