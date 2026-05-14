// frontend/src/components/TVMarketOverview.tsx
import React, { useEffect, useRef } from "react";

export const TVMarketOverview: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      dateRange: "1D",
      showChart: true,
      locale: "en",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height: "660",
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "NSE:NIFTY", d: "NIFTY 50" },
            { s: "BSE:SENSEX", d: "SENSEX" },
            { s: "NSE:BANKNIFTY", d: "BANK NIFTY" },
            { s: "NSE:CNXMIDCAP", d: "NIFTY MIDCAP" },
          ],
          originalTitle: "Indices",
        },
        {
          title: "Top Stocks",
          symbols: [
            { s: "NSE:RELIANCE" },
            { s: "NSE:TCS" },
            { s: "NSE:INFY" },
            { s: "NSE:HDFCBANK" },
            { s: "NSE:SBIN" },
            { s: "NSE:WIPRO" },
          ],
          originalTitle: "Top Stocks",
        },
      ],
    });
    ref.current.appendChild(script);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, []);

  return <div ref={ref} style={{ width: "100%", height: "660px" }} />;
};
