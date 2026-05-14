// frontend/src/components/TVMiniChart.tsx
import React, { useEffect, useRef } from "react";

interface TVMiniChartProps {
  symbol: string;
  height?: number;
}

export const TVMiniChart: React.FC<TVMiniChartProps> = ({ symbol, height = 150 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tvSym = symbol.includes(":") ? symbol : `NSE:${symbol.toUpperCase()}`;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSym,
      width: "100%",
      height: height,
      locale: "en",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
    });
    ref.current.appendChild(script);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [tvSym]);

  return <div ref={ref} style={{ height: `${height}px`, width: "100%" }} />;
};
