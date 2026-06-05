// frontend/src/components/DashboardView.tsx
import CandlestickChart from './CandlestickChart';
import MarketOverview   from './MarketOverview';

export default function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: '16px', paddingBottom: '80px' }}>
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <CandlestickChart symbol="NIFTY" height={480} />
        <MarketOverview />
      </div>
    </div>
  );
}
