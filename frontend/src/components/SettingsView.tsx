import { useEffect, useState } from "react";
const API = "http://localhost:8765";

export default function SettingsView() {
  const [settings, setSettings] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings`).then(r => r.json()).then(setSettings);
  }, []);

  const save = () => {
    fetch(`${API}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
  };

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type={type}
        value={settings[key] || ""}
        onChange={e => setSettings({ ...settings, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "24px", maxWidth: "600px", paddingBottom: "80px" }}>
      <h2 style={{ color: "#fff", marginBottom: "24px" }}>Settings</h2>

      <div style={{ background: "#1e1e1e", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "14px" }}>🤖 AI Provider</h3>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Active Provider</label>
          <select
            value={settings.ai_provider || "gemini"}
            onChange={e => setSettings({ ...settings, ai_provider: e.target.value })}
            style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "8px 12px", borderRadius: "6px", width: "100%" }}
          >
            <option value="gemini">Gemini Flash (Recommended)</option>
            <option value="groq">Groq (Llama 3.3 — Fast)</option>
            <option value="openai">OpenAI GPT-4o</option>
          </select>
        </div>
        {field("Gemini API Key", "gemini_api_key", "password", "AIza...")}
        {field("Groq API Key", "groq_api_key", "password", "gsk_...")}
        {field("OpenAI API Key", "openai_api_key", "password", "sk-...")}
      </div>

      <div style={{ background: "#1e1e1e", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "14px" }}>📊 Broker</h3>
        <div style={{ background: "#14532d22", border: "1px solid #16a34a44", borderRadius: "8px", padding: "12px", marginBottom: "12px", color: "#86efac", fontSize: "13px" }}>
          ✅ Currently in <strong>Demo Mode</strong> — ₹10,00,000 virtual funds
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Broker</label>
          <select
            value={settings.broker || "demo"}
            onChange={e => setSettings({ ...settings, broker: e.target.value })}
            style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "8px 12px", borderRadius: "6px", width: "100%" }}
          >
            <option value="demo">Demo Mode (Virtual ₹10L)</option>
            <option value="fyers">Fyers</option>
            <option value="zerodha">Zerodha Kite</option>
            <option value="upstox">Upstox</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#1e1e1e", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "14px" }}>⚙️ Trading Parameters</h3>
        {field("Max Position Size (₹)", "max_position_size", "number")}
        {field("Daily Loss Limit (₹)", "daily_loss_limit", "number")}
        {field("Risk Per Trade (%)", "risk_per_trade", "number")}
      </div>

      <button
        onClick={save}
        style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", cursor: "pointer", width: "100%" }}
      >
        {saved ? "✅ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
