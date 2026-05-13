import { useState, useEffect } from 'react';
import { api } from '../api/client';

const ROW_ITEMS = ['Opening balance', 'Payin', 'Payout', 'SPAN', 'Delivery margin', 'Exposure', 'Options premium'];
const COLLATERAL_ITEMS = ['Collateral (Liquid funds)', 'Collateral (Equity)', 'Total collateral'];

export default function FundsView() {
  const [funds, setFunds] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.broker.getFunds()
      .then(data => setFunds(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    window.addEventListener('funds-refresh', () => api.broker.getFunds().then(setFunds).catch(() => {}));
  }, []);

  const equity = funds?.equity || funds;
  const availableMargin = equity?.available_margin ?? equity?.available_cash ?? 100000;
  const usedMargin = equity?.used_margin ?? 0;
  const availableCash = equity?.available_cash ?? availableMargin;
  const openingBalance = equity?.opening_balance ?? availableMargin;

  const fmtCcy = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="text-[#888] text-[13px] font-mono animate-pulse">Synchronizing capital state...</div>
    </div>
  );

  const FundCard = ({ title, icon, available, used, cash, opening }: any) => (
    <div className="bg-[#1a1a1a] border border-[#333333] rounded flex flex-col">
      <div className="p-4 border-b border-[#333333] flex justify-between items-center">
        <div className="flex items-center gap-2 text-[20px] font-semibold text-[#f7ddd2]">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
          {title}
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#3b82f6]">
          <a className="flex items-center gap-1 hover:underline" href="#">
            <span className="material-symbols-outlined text-[14px]">visibility</span> View statement
          </a>
          <a className="flex items-center gap-1 hover:underline" href="#">
            <span className="material-symbols-outlined text-[14px]">help</span> Help
          </a>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4 border-b border-[#333333] pb-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#e2bfb0] uppercase tracking-wider">Available margin</span>
            <span className="text-[28px] font-bold text-[#3b82f6] text-right font-mono">{fmtCcy(available)}</span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-[#333333] pl-4">
            <span className="text-[11px] font-semibold text-[#e2bfb0] uppercase tracking-wider">Used margin</span>
            <span className="text-[28px] font-bold text-[#f7ddd2] text-right font-mono">{fmtCcy(used)}</span>
          </div>
        </div>
        {/* Available Cash */}
        <div className="flex justify-between items-center border-b border-[#333333] pb-5">
          <span className="text-[13px] text-[#e2bfb0]">Available cash</span>
          <span className="text-[20px] font-semibold text-[#f7ddd2] font-mono">{fmtCcy(cash)}</span>
        </div>
        {/* Line Items */}
        <div className="flex flex-col">
          <div className="flex justify-between py-2 hover:bg-[#0d0d0d] transition-colors group px-1 rounded">
            <span className="text-[13px] text-[#e2bfb0] group-hover:text-[#f7ddd2]">Opening balance</span>
            <span className="font-mono text-[13px] text-[#f7ddd2]">{fmtCcy(opening)}</span>
          </div>
          {ROW_ITEMS.slice(1).map(label => (
            <div key={label} className="flex justify-between py-2 hover:bg-[#0d0d0d] transition-colors group px-1 rounded">
              <span className="text-[13px] text-[#e2bfb0] group-hover:text-[#f7ddd2]">{label}</span>
              <span className="font-mono text-[13px] text-[#f7ddd2]">0.00</span>
            </div>
          ))}
          {title === 'Equity' && (
            <>
              <div className="mt-4" />
              {COLLATERAL_ITEMS.map(label => (
                <div key={label} className="flex justify-between py-2 hover:bg-[#0d0d0d] transition-colors group px-1 rounded">
                  <span className="text-[13px] text-[#e2bfb0] group-hover:text-[#f7ddd2]">{label}</span>
                  <span className="font-mono text-[13px] text-[#f7ddd2]">0.00</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar p-6 space-y-6">
      {/* Warning */}
      <div className="bg-[#1a1300] border border-[#4d3a00] rounded text-[13px] text-[#e6ac00] p-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]">warning</span>
        <span>This is a demo platform with dummy data. <a className="text-primary hover:underline font-bold" href="#">Signup now</a> to access the live platform.</span>
      </div>

      {/* Header Actions */}
      <div className="flex justify-end items-center gap-4">
        <span className="text-[12px] text-[#e2bfb0] italic">Instant, zero-cost fund transfers with UPI</span>
        <button className="bg-[#02c953] hover:bg-[#02b049] transition-colors text-white text-[11px] font-bold px-6 py-2 rounded">Add funds</button>
        <button className="bg-[#1a56db] hover:bg-[#1e40af] transition-colors text-white text-[11px] font-bold px-6 py-2 rounded">Withdraw</button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12">
        <FundCard
          title="Equity"
          icon="pie_chart"
          available={availableMargin}
          used={usedMargin}
          cash={availableCash}
          opening={openingBalance}
        />
        <FundCard
          title="Commodity"
          icon="water_drop"
          available={50000}
          used={0}
          cash={50000}
          opening={50000}
        />
      </div>
    </div>
  );
}
