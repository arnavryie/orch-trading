/**
 * useChat.ts
 * ----------
 * React hook that handles the agentic chat interface.
 * Sends messages to POST /api/chat, handles loading state,
 * and dispatches refresh events when orders are placed.
 */

import { useState, useCallback } from 'react';

export interface ChatAction {
  tool: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  actions: ChatAction[];
  redirect: string | null;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  actions?: ChatAction[];
  timestamp: string;
}

export function useChat(onPageChange?: (page: string) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastActions, setLastActions] = useState<ChatAction[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), context: {} }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();
      setLastActions(data.actions || []);

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: data.reply || 'Command executed.',
        actions: data.actions,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Trigger UI refresh events based on actions
      const actionTools = data.actions?.map(a => a.tool) ?? [];
      if (actionTools.includes('place_order')) {
        window.dispatchEvent(new CustomEvent('holdings-refresh'));
        window.dispatchEvent(new CustomEvent('orders-refresh'));
        window.dispatchEvent(new CustomEvent('funds-refresh'));
      }
      if (actionTools.includes('set_alert')) {
        window.dispatchEvent(new CustomEvent('alerts-refresh'));
      }
      // When ARIA analyzed a symbol, update the dashboard to show that symbol
      const analyzeAction = data.actions?.find(a => a.tool === 'analyze_market');
      if (analyzeAction?.args?.symbol) {
        window.dispatchEvent(new CustomEvent('symbol-change', { detail: analyzeAction.args.symbol as string }));
      }

      // Handle navigation redirect
      if (data.redirect && onPageChange) {
        onPageChange(data.redirect);
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useChat] Error:', errMsg);
      const errorMsg: ChatMessage = {
        role: 'ai',
        text: `⚠ Engine offline: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, onPageChange]);

  const clearHistory = useCallback(() => setMessages([]), []);

  return { messages, loading, lastActions, sendMessage, clearHistory };
}
