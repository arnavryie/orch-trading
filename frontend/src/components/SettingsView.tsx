import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Settings as SettingsIcon, Shield, Sliders, Cpu, Save } from 'lucide-react';

export default function SettingsView() {
  const [config, setConfig] = useState<any>({});
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get().then((data) => {
      setConfig(data.config || {});
      setSettings(data.settings || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.settings.save({ ...config, ...settings });
    setSaving(false);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const updateSettings = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
          <SettingsIcon size={24} className="text-brand" /> Settings
        </h1>
        <p className="text-text-muted text-sm mt-1">Configure your trading parameters, API keys, and AI providers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trading Parameters */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4 border-b border-border-subtle pb-2">
            <Sliders size={18} className="text-bullish" /> Trading Parameters
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Max Position Size (₹)</label>
              <input 
                type="number" 
                value={config.max_position_size || ''} 
                onChange={(e) => updateConfig('max_position_size', parseInt(e.target.value) || 0)}
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50"
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Daily Loss Limit (₹)</label>
              <input 
                type="number" 
                value={config.daily_loss_limit || ''} 
                onChange={(e) => updateConfig('daily_loss_limit', parseInt(e.target.value) || 0)}
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Risk Per Trade (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={config.risk_per_trade || ''} 
                onChange={(e) => updateConfig('risk_per_trade', parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50"
              />
            </div>
          </div>
        </div>

        {/* AI & Providers */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4 border-b border-border-subtle pb-2">
            <Cpu size={18} className="text-brand" /> AI Providers
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Primary AI Provider</label>
              <select 
                value={config.ai_provider || 'gemini'} 
                onChange={(e) => updateConfig('ai_provider', e.target.value)}
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50"
              >
                <option value="gemini">Gemini (Google)</option>
                <option value="groq">Groq (Llama 3)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Gemini API Key</label>
              <input 
                type="password" 
                value={settings.GEMINI_API_KEY || ''} 
                onChange={(e) => updateSettings('GEMINI_API_KEY', e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50 placeholder:text-text-muted/50"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Groq API Key</label>
              <input 
                type="password" 
                value={settings.GROQ_API_KEY || ''} 
                onChange={(e) => updateSettings('GROQ_API_KEY', e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50 placeholder:text-text-muted/50"
              />
            </div>
          </div>
        </div>

        {/* Watchlist & Automation */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6 space-y-4 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4 border-b border-border-subtle pb-2">
            <Shield size={18} className="text-neutral" /> Watchlist & Automation
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Auto-Trader Status</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={config.auto_trading || false}
                  onChange={(e) => updateConfig('auto_trading', e.target.checked)}
                />
                <div className="w-11 h-6 bg-border-medium peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bullish"></div>
                <span className="ml-3 text-sm font-medium text-white font-mono">
                  {config.auto_trading ? 'Enabled (Active during market hours)' : 'Disabled (Monitoring only)'}
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Watchlist Symbols (Comma Separated)</label>
              <textarea 
                value={(config.watchlist || []).join(', ')} 
                onChange={(e) => updateConfig('watchlist', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                rows={3}
                className="w-full bg-bg-app border border-border-medium rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand/50 leading-relaxed"
                placeholder="RELIANCE, TCS, INFY, HDFCBANK..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border-subtle">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 bg-brand text-bg-app px-6 py-2 rounded-lg font-semibold hover:bg-brand/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-brand/20"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
