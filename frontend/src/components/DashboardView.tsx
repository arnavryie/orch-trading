import { TVMarketOverview } from "./TVMarketOverview";
import { TVChart } from "./TVChart";

export default function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: "16px", paddingBottom: "80px" }}>
      <div className="max-w-6xl mx-auto">
        <div style={{ marginBottom: "16px" }}>
          <TVChart symbol="NIFTY" height={450} interval="D" />
        </div>
        <TVMarketOverview />
      </div>
    </div>
  );
}
