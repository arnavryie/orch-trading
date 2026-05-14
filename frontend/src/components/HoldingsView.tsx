import { TVMiniChart } from "./TVMiniChart";
import { useEffect, useState } from "react";

const API = "http://localhost:8765";

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

  if (loading) return <div style={{padding:"24px", color:"#aaa"}}>Loading holdings...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "16px 24px", paddingBottom: "80px" }}>
      {funds && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#1e1e1e", borderRadius: "8px", padding: "16px", flex: 1 }}>
            <div style={{ color: "#888", fontSize: "12px" }}>Available Cash</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "bold" }}>₹{funds.available_cash?.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ background: "#1e1e1e", borderRadius: "8px", padding: "16px", flex: 1 }}>
            <div style={{ color: "#888", fontSize: "12px" }}>Portfolio Value</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "bold" }}>₹{funds.portfolio_value?.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ background: "#1e1e1e", borderRadius: "8px", padding: "16px", flex: 1 }}>
            <div style={{ color: "#888", fontSize: "12px" }}>Total P&L</div>
            <div style={{ color: (funds.pnl || 0) >= 0 ? "#22c55e" : "#ef4444", fontSize: "22px", fontWeight: "bold" }}>
              ₹{funds.pnl?.toLocaleString("en-IN")} ({funds.pnl_pct?.toFixed(1)}%)
            </div>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div style={{ color: "#888", textAlign: "center", marginTop: "60px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💼</div>
          <div>No holdings yet. Use the chat below to buy stocks.</div>
          <div style={{ color: "#555", marginTop: "8px" }}>Try: "buy reliance 10 shares"</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" }}>
          {holdings.map((h: any) => (
            <div key={h.symbol} style={{ background: "#1e1e1e", borderRadius: "8px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <span style={{ color: "#fff", fontWeight: "bold", fontSize: "16px" }}>{h.symbol}</span>
                  <span style={{ color: "#888", fontSize: "12px", marginLeft: "8px" }}>NSE • {h.quantity} shares</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>₹{h.current_price?.toLocaleString("en-IN")}</div>
                  <div style={{ color: h.pnl >= 0 ? "#22c55e" : "#ef4444", fontSize: "12px" }}>
                    {h.pnl >= 0 ? "▲" : "▼"} ₹{Math.abs(h.pnl)?.toFixed(0)} ({Math.abs(h.pnl_pct)?.toFixed(1)}%)
                  </div>
                </div>
              </div>
              <TVMiniChart symbol={h.symbol} height={150} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
