// frontend/src/components/SettingsView.tsx — Kite-polished
import { useEffect, useState } from "react";
const API = "";

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
    <div className="mb-4">
      <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">{label}</label>
      <input
        type={type}
        value={settings[key] || ""}
        onChange={e => setSettings({ ...settings, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#4184f3]/50 transition-smooth placeholder:text-[#444]"
      />
    </div>
  );

  const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1e1e1e] p-5 mb-4 card-lift">
      <h3 className="text-white text-[13px] font-semibold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "24px", maxWidth: "620px", paddingBottom: "80px" }}>
      <h2 className="text-white text-xl font-bold mb-6">Settings</h2>

      <Section icon="🤖" title="AI Providers">
        <div className="mb-4">
          <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">Active Chat Provider</label>
          <select
            value={settings.ai_provider || "gemini"}
            onChange={e => setSettings({ ...settings, ai_provider: e.target.value })}
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#4184f3]/50 transition-smooth"
          >
            <option value="gemini">Gemini Flash (Recommended)</option>
            <option value="groq">Groq (Llama 3.3 — Fast)</option>
            <option value="openai">OpenAI GPT-4o</option>
            <option value="grok">Grok (xAI) — News & Sentiment</option>
            <option value="claude">Claude — Risk & Execution</option>
          </select>
        </div>
        {field("Gemini API Key", "gemini_api_key", "password", "AIza...")}
        {field("Groq API Key", "groq_api_key", "password", "gsk_...")}
        {field("OpenAI API Key", "openai_api_key", "password", "sk-...")}
        {field("Grok (xAI) API Key", "grok_api_key", "password", "xai-...")}
        {field("Claude (Anthropic) API Key", "claude_api_key", "password", "sk-ant-...")}
        <div className="text-[11px] text-[#555] mt-2 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
          💡 Add all 4 keys to enable the full AI Council (Grok + GPT + Gemini + Claude). Each key activates that seat.
        </div>
      </Section>

      <Section icon="📊" title="Broker">
        <div className="mb-4 p-3 bg-[#0a3a1a] border border-[#16a34a]/30 rounded-lg text-[#86efac] text-[12px]">
          ✅ Currently in <strong>Demo Mode</strong> — ₹10,00,000 virtual funds
        </div>
        <div className="mb-4">
          <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">Broker</label>
          <select
            value={settings.broker || "demo"}
            onChange={e => setSettings({ ...settings, broker: e.target.value })}
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#4184f3]/50 transition-smooth"
          >
            <option value="demo">Demo Mode (Virtual ₹10L)</option>
            <option value="fyers">Fyers</option>
            <option value="zerodha">Zerodha Kite</option>
            <option value="upstox">Upstox</option>
          </select>
        </div>
      </Section>

      <Section icon="⚙️" title="Trading Parameters">
        {field("Max Position Size (₹)", "max_position_size", "number")}
        {field("Daily Loss Limit (₹)", "daily_loss_limit", "number")}
        {field("Risk Per Trade (%)", "risk_per_trade", "number")}
      </Section>

      <Section icon="🧠" title="Desk Behaviour">
        <div className="mb-4">
          <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">Risk Personality</label>
          <select
            value={settings.risk_personality || "balanced"}
            onChange={e => setSettings({ ...settings, risk_personality: e.target.value })}
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#4184f3]/50 transition-smooth"
          >
            <option value="conservative">Conservative (Capital Protection)</option>
            <option value="balanced">Balanced (Opportunity vs Risk)</option>
            <option value="aggressive">Aggressive (High Conviction & Size)</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1a1a1a]">
          <div>
            <div className="text-white text-[13px] font-semibold">Devil's Advocate</div>
            <div className="text-[#666] text-[11px] mt-0.5">Force an AI to argue against the council's verdict</div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, devils_advocate: settings.devils_advocate === false ? true : false })}
            className={`w-10 h-5 rounded-full transition-smooth relative ${(settings.devils_advocate !== false) ? 'bg-[#22c55e]' : 'bg-[#333]'}`}
          >
            <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${(settings.devils_advocate !== false) ? 'left-[22px]' : 'left-[2px]'}`} />
          </button>
        </div>
      </Section>

      <button
        id="settings-save"
        onClick={save}
        className="w-full py-3 rounded-xl bg-[#4184f3] text-white font-bold text-[13px] btn-press transition-smooth hover:bg-[#4184f3]/90"
      >
        {saved ? "✅ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
