import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';

type Message = { role: 'user' | 'assistant'; content: string; ts: number };
type Provider = 'gemini' | 'groq' | 'openai';

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  openai: 'OpenAI',
};

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>(() =>
    (localStorage.getItem('ai_provider') as Provider) || 'gemini'
  );
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>(() => ({
    gemini: localStorage.getItem('ai_key_gemini') || '',
    groq: localStorage.getItem('ai_key_groq') || '',
    openai: localStorage.getItem('ai_key_openai') || '',
  }));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  const saveSettings = () => {
    localStorage.setItem('ai_provider', provider);
    Object.entries(apiKeys).forEach(([k, v]) => localStorage.setItem(`ai_key_${k}`, v));
    setSettingsOpen(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.chat(text, {
        provider,
        api_key: apiKeys[provider] || undefined,
      });
      const reply = res?.response || res?.message || res?.content || JSON.stringify(res);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err?.message || 'Failed to reach the AI backend. Please check your API key and backend connection.'}`,
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <>
      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setSettingsOpen(false)}>
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-semibold text-[#f7ddd2]">AI Chat Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-[#888] hover:text-[#f7ddd2] transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Provider Selection */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold text-[#e2bfb0] uppercase tracking-wider mb-2 block">AI Provider</label>
              <div className="flex gap-2">
                {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`flex-1 py-2 rounded text-[12px] font-semibold transition-colors border ${
                      provider === p
                        ? 'bg-primary text-[#562000] border-primary'
                        : 'bg-black text-[#e2bfb0] border-[#333] hover:border-primary/50'
                    }`}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* API Keys */}
            {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
              <div key={p} className="mb-4">
                <label className="text-[11px] font-semibold text-[#e2bfb0] uppercase tracking-wider mb-1.5 block">
                  {PROVIDER_LABELS[p]} API Key
                </label>
                <input
                  type="password"
                  value={apiKeys[p]}
                  onChange={e => setApiKeys(prev => ({ ...prev, [p]: e.target.value }))}
                  placeholder={`Enter ${PROVIDER_LABELS[p]} API key...`}
                  className="w-full bg-black border border-[#333] rounded px-3 py-2 text-[13px] font-mono text-[#f7ddd2] placeholder:text-[#555] outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            ))}

            <button
              onClick={saveSettings}
              className="w-full mt-4 bg-primary text-[#562000] py-2.5 rounded text-[13px] font-bold hover:bg-primary/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Floating Chat Panel */}
      {open && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4">
          <div className="bg-[#0d0d0d]/95 backdrop-blur-xl border border-[#333333]/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#333333]/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[16px] ms-fill">smart_toy</span>
                </div>
                <span className="text-[14px] font-semibold text-[#f7ddd2]">AI Assistant</span>
                <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider px-1.5 py-0.5 bg-[#1a1a1a] rounded border border-[#333]">
                  {PROVIDER_LABELS[provider]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[#888] hover:text-primary hover:bg-[#1a1a1a] transition-colors"
                  title="Settings"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[#888] hover:text-[#ffb4ab] hover:bg-[#1a1a1a] transition-colors"
                    title="Clear chat"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[#888] hover:text-[#f7ddd2] hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ minHeight: '200px', maxHeight: '400px' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                  <span className="material-symbols-outlined text-[48px] text-primary/40 ms-fill">smart_toy</span>
                  <p className="text-[13px] text-[#888]">Ask me about your portfolio, market conditions,<br/>or trading strategies.</p>
                </div>
              ) : messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-[14px] ms-fill">smart_toy</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-[#562000] rounded-br-sm font-medium'
                      : 'bg-[#1a1a1a] text-[#f7ddd2] border border-[#333333] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <span className="material-symbols-outlined text-primary text-[14px] ms-fill">smart_toy</span>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#333333] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-[#333333]/60 p-3 shrink-0">
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333333] rounded-xl px-3 py-2 focus-within:border-primary/60 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio, markets, or strategies..."
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#f7ddd2] placeholder:text-[#555]"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg bg-primary text-[#562000] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px] ms-fill">send</span>
                </button>
              </div>
              <p className="text-[10px] text-[#555] text-center mt-2">
                {apiKeys[provider] ? `Using ${PROVIDER_LABELS[provider]} API key` : `No ${PROVIDER_LABELS[provider]} key — using backend default`} ·{' '}
                <button onClick={() => setSettingsOpen(true)} className="text-primary hover:underline">Configure</button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact pill shown when chat is closed */}
      {!open && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99] w-full max-w-lg px-4 pointer-events-none">
          <div
            className="bg-[#0d0d0d]/90 backdrop-blur-md border border-[#333333]/50 rounded-full shadow-xl flex items-center px-5 py-3 gap-4 cursor-pointer hover:border-primary/40 transition-all pointer-events-auto"
            onClick={() => { setOpen(true); }}
          >
            <span className="material-symbols-outlined text-[#888] text-[20px] ms-fill">smart_toy</span>
            <span className="text-[14px] text-[#555] flex-1">Ask AI about your trades...</span>
            <span className="material-symbols-outlined text-[#888] text-[20px]">mic</span>
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-8 right-8 z-[101]">
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-black ${
            open ? 'bg-[#1a1a1a] text-[#f7ddd2]' : 'bg-primary text-[#562000]'
          }`}
          title={open ? 'Close AI Chat' : 'Open AI Chat'}
        >
          <span className="material-symbols-outlined text-[28px] ms-fill">{open ? 'close' : 'smart_toy'}</span>
        </button>
      </div>
    </>
  );
}
