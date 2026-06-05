import { useEffect, useState } from "react";
const API = "";

export default function FundsView() {
  const [funds, setFunds] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/funds`).then(r => r.json()).then(setFunds);
  }, []);

  if (!funds) return <div style={{padding:"24px", color:"#aaa"}}>Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "24px", paddingBottom: "80px" }}>
      <div style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#f59e0b", fontSize: "13px" }}>
        ⚠️ This is a demo account with virtual money. No real trades are executed.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <div style={{ background: "#1e1e1e", borderRadius: "12px", padding: "24px" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}>Equity</div>
          <div style={{ color: "#fff", fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>₹{(funds.available_cash / 100000).toFixed(1)}L</div>
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

        <div style={{ background: "#1e1e1e", borderRadius: "12px", padding: "24px" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}>Portfolio P&L</div>
          <div style={{ color: (funds.pnl || 0) >= 0 ? "#22c55e" : "#ef4444", fontSize: "32px", fontWeight: "bold" }}>
            {(funds.pnl || 0) >= 0 ? "+" : ""}₹{funds.pnl?.toLocaleString("en-IN")}
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
        style={{ marginTop: "24px", background: "#7f1d1d", border: "1px solid #dc2626", color: "#fca5a5", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
      >
        🔄 Reset Demo Account (restore ₹10,00,000)
      </button>
    </div>
  );
}
