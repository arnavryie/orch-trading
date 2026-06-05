import { useEffect, useState } from "react";
const API = "";

export default function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/orders`)
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding:"24px", color:"#aaa"}}>Loading orders...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "16px 24px", paddingBottom: "80px" }}>
      <h2 style={{ color: "#fff", marginBottom: "16px" }}>Orders</h2>
      {orders.length === 0 ? (
        <div style={{ color: "#888", textAlign: "center", marginTop: "60px" }}>
          <div>No orders yet.</div>
          <div style={{ color: "#555", marginTop: "8px" }}>Try: "buy reliance 10" in the chat below</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2d2d2d" }}>
              {["Symbol", "Type", "Qty", "Price", "Status", "Time"].map(h => (
                <th key={h} style={{ color: "#888", padding: "8px 12px", textAlign: "left", fontSize: "12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.order_id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                <td style={{ color: "#fff", padding: "12px", fontWeight: "bold" }}>{o.symbol}</td>
                <td style={{ color: o.type === "BUY" ? "#22c55e" : "#ef4444", padding: "12px", fontWeight: "bold" }}>{o.type}</td>
                <td style={{ color: "#ddd", padding: "12px" }}>{o.qty}</td>
                <td style={{ color: "#ddd", padding: "12px" }}>₹{o.price?.toLocaleString("en-IN")}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: "#16a34a22", color: "#22c55e", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>{o.status}</span>
                </td>
                <td style={{ color: "#888", padding: "12px", fontSize: "12px" }}>{new Date(o.timestamp).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
