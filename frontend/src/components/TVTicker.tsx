// frontend/src/components/TVTicker.tsx
import React, { useEffect, useRef } from "react";

export const TVTicker: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NSE:NIFTY50", title: "NIFTY 50" },
        { proName: "BSE:SENSEX", title: "SENSEX" },
        { proName: "NSE:BANKNIFTY", title: "BANK NIFTY" },
        { proName: "NSE:RELIANCE", title: "RELIANCE" },
        { proName: "NSE:TCS", title: "TCS" },
        { proName: "NSE:INFY", title: "INFOSYS" },
        { proName: "NSE:HDFCBANK", title: "HDFC BANK" },
        { proName: "NSE:ICICIBANK", title: "ICICI BANK" },
        { proName: "NSE:SBIN", title: "SBI" },
        { proName: "NSE:WIPRO", title: "WIPRO" },
        { proName: "NSE:BHARTIARTL", title: "AIRTEL" },
        { proName: "NSE:ITC",        title: "ITC" },
        { proName: "NSE:AXISBANK",   title: "AXIS BANK" },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });
    ref.current.appendChild(script);

    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, []);

  return <div ref={ref} style={{ height: "46px", width: "100%" }} />;
};
