// frontend/src/components/TVChart.tsx
import React, { useEffect, useRef } from "react";

interface TVChartProps {
  symbol: string;      // e.g. "RELIANCE" or "NSE:RELIANCE"
  height?: number;
  theme?: "dark" | "light";
  interval?: string;   // "D" | "W" | "60" | "15" | "5" | "1"
}

export const TVChart: React.FC<TVChartProps> = ({
  symbol,
  height = 400,
  theme = "dark",
  interval = "D",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Format symbol for TradingView NSE
  const tvSymbol = symbol.includes(":") ? symbol : `NSE:${symbol.toUpperCase()}`;

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: interval,
      timezone: "Asia/Kolkata",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: theme === "dark" ? "rgba(18,18,18,1)" : "rgba(255,255,255,1)",
    });
    containerRef.current.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, interval, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
};
