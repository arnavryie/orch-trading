import { useState, useEffect } from 'react';
import { api } from '../api/client';

const DEMO_OPEN = [
  { time: '13:39:12', type: 'SELL', instrument: 'PNB', exchange: 'NSE', product: 'CO', qty: '0 / 1', ltp: '49.30', price: '0.00 / 48.50 trg.' },
  { time: '13:39:12', type: 'BUY',  instrument: 'INFY', exchange: 'NSE', product: 'CO', qty: '0 / 1', ltp: '49.30', price: '49.50 / 48.50 trg.' },
  { time: '13:35:15', type: 'BUY',  instrument: 'USDINR 23MAY FUT', exchange: 'CDS', product: 'NRML', qty: '0 / 3', ltp: '82.4225', price: '81.0000' },
  { time: '13:34:15', type: 'BUY',  instrument: 'USDINR 23MAY FUT', exchange: 'CDS', product: 'MIS', qty: '0 / 1', ltp: '82.4225', price: '81.0000' },
  { time: '13:32:12', type: 'BUY',  instrument: 'SBIN', exchange: 'BSE', product: 'MIS', qty: '0 / 1', ltp: '586.50', price: '585.00 / 585.00 trg.' },
];
const DEMO_EXEC = [
  { time: '13:45:09', type: 'BUY', instrument: '11th w 23MAY 18300 CE', exchange: 'NFO', product: 'MIS', qty: '0 / 50', avg: '0.00', status: 'REJECTED' },
  { time: '13:44:50', type: 'BUY', instrument: '11th w 23MAY 18300 CE', exchange: 'NFO', product: 'NRML', qty: '0 / 50', avg: '0.00', status: 'REJECTED' },
  { time: '13:39:08', type: 'SELL', instrument: 'PNB', exchange: 'NSE', product: 'CNC', qty: '0 / 1', avg: '51.20', status: 'CANCELLED' },
  { time: '13:37:34', type: 'BUY', instrument: 'INFY', exchange: 'NSE', product: 'CNC', qty: '1 / 1', avg: '50.75', status: 'COMPLETE' },
  { time: '13:28:52', type: 'BUY', instrument: 'VEDL', exchange: 'NSE', product: 'MIS', qty: '1 / 1', avg: '283.40', status: 'COMPLETE' },
];

export default function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('Orders');

  const fetchOrders = () => {
    setLoading(true);
    api.broker.getOrders()
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    window.addEventListener('orders-refresh', fetchOrders);
    return () => window.removeEventListener('orders-refresh', fetchOrders);
  }, []);

  const openOrders = orders.filter(o => o.status === 'OPEN' || o.status === 'TRIGGER PENDING');
  const execOrders = orders.filter(o => o.status !== 'OPEN' && o.status !== 'TRIGGER PENDING');

  const TypeBadge = ({ type }: { type: string }) => (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
      type === 'BUY' ? 'bg-[#40e56c]/10 text-[#40e56c] border-[#40e56c]/20' : 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20'
    }`}>{type}</span>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      COMPLETE: 'text-[#40e56c]',
      REJECTED: 'text-[#ffb4ab]',
      CANCELLED: 'text-[#888]',
      OPEN: 'text-[#888] border border-[#333] px-2 py-0.5 rounded text-[10px]',
    };
    return <span className={`text-[10px] font-bold tracking-wider ${colors[status] || 'text-[#888]'}`}>{status}</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black flex flex-col custom-scrollbar">
      {/* Sub-nav */}
      <div className="border-b border-[#333333] px-6 h-12 flex items-center gap-6 shrink-0 bg-[#0d0d0d]">
        {['Orders', 'GTT', 'Baskets', 'SIP', 'Alerts'].map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`text-[11px] font-semibold tracking-wider uppercase h-full flex items-center transition-colors border-b-2 ${
              subTab === tab ? 'text-primary border-primary' : 'text-[#e2bfb0] border-transparent hover:text-[#f7ddd2]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Demo Warning */}
        <div className="bg-[#1a1500] border border-[#665200] rounded p-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ffc107] text-[18px]">warning</span>
          <p className="text-[13px] text-[#ffc107]">This is a demo platform with dummy data. <a className="text-primary hover:underline font-bold" href="#">Signup now</a> to access the live platform.</p>
        </div>

        {/* Open Orders */}
        <section className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#333333] flex justify-between items-center bg-[#0d0d0d]">
            <h2 className="text-[18px] font-semibold text-[#f7ddd2]">Open orders ({loading ? '…' : openOrders.length || DEMO_OPEN.length})</h2>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center bg-black border border-[#333333] rounded focus-within:border-primary/60 transition-colors">
                <span className="material-symbols-outlined absolute left-2 text-[#888] text-[16px]">search</span>
                <input className="w-40 bg-transparent border-none text-[13px] text-[#f7ddd2] py-1.5 pl-8 pr-2 outline-none placeholder:text-[#555]" placeholder="Search" type="text" />
              </div>
              <button className="flex items-center gap-1.5 text-primary text-[11px] font-semibold transition-colors px-2 py-1 border border-primary/30 rounded hover:border-primary/60">
                <span className="material-symbols-outlined text-[16px]">download</span>Download
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="text-[11px] font-semibold text-[#e2bfb0] border-b border-[#333333] bg-black">
                  <th className="p-3 font-normal">Time</th>
                  <th className="p-3 font-normal">Type</th>
                  <th className="p-3 font-normal">Instrument</th>
                  <th className="p-3 font-normal">Product</th>
                  <th className="p-3 font-normal text-right">Qty.</th>
                  <th className="p-3 font-normal text-right">LTP</th>
                  <th className="p-3 font-normal text-right">Price</th>
                  <th className="p-3 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {(loading || openOrders.length === 0 ? DEMO_OPEN : openOrders.map((o) => ({
                  time: new Date(o.order_timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  type: o.transaction_type,
                  instrument: o.symbol,
                  exchange: o.exchange,
                  product: o.product,
                  qty: `${o.filled_quantity || 0} / ${o.quantity}`,
                  ltp: o.last_price?.toFixed(2) || '—',
                  price: o.price?.toFixed(2) || '—',
                }))).map((o: any, idx) => (
                  <tr key={idx} className={`border-b border-[#333333]/30 hover:bg-[#252525] transition-colors ${idx % 2 === 1 ? 'bg-[#0d0d0d]' : ''}`}>
                    <td className="p-3 text-[#e2bfb0]">{o.time}</td>
                    <td className="p-3"><TypeBadge type={o.type} /></td>
                    <td className="p-3 text-[#f7ddd2]">{o.instrument} <span className="text-[10px] text-[#e2bfb0]">{o.exchange}</span></td>
                    <td className="p-3 text-[#e2bfb0]">{o.product}</td>
                    <td className="p-3 text-right text-[#f7ddd2]">{o.qty}</td>
                    <td className="p-3 text-right text-[#f7ddd2]">{o.ltp}</td>
                    <td className="p-3 text-right text-[#f7ddd2]">{o.price}</td>
                    <td className="p-3 text-right"><span className="text-[#e2bfb0] border border-[#333] px-2 py-0.5 rounded text-[10px]">OPEN</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Executed Orders */}
        <section className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden mb-12">
          <div className="p-4 border-b border-[#333333] flex justify-between items-center bg-[#0d0d0d]">
            <h2 className="text-[18px] font-semibold text-[#f7ddd2]">Executed orders ({loading ? '…' : execOrders.length || DEMO_EXEC.length})</h2>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center bg-black border border-[#333333] rounded focus-within:border-primary/60">
                <span className="material-symbols-outlined absolute left-2 text-[#888] text-[16px]">search</span>
                <input className="w-40 bg-transparent border-none text-[13px] text-[#f7ddd2] py-1.5 pl-8 pr-2 outline-none placeholder:text-[#555]" placeholder="Search" type="text" />
              </div>
              <div className="flex items-center gap-4 border-l border-[#333333] pl-4">
                {[['description', 'Contract note'], ['history', 'View history'], ['download', 'Download']].map(([icon, label]) => (
                  <button key={label} className="flex items-center gap-1.5 text-primary text-[11px] font-semibold hover:text-primary/80 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="text-[11px] font-semibold text-[#e2bfb0] border-b border-[#333333] bg-black">
                  <th className="p-3 pl-6 font-normal">Time</th>
                  <th className="p-3 font-normal">Type</th>
                  <th className="p-3 font-normal">Instrument</th>
                  <th className="p-3 font-normal">Product</th>
                  <th className="p-3 font-normal text-right">Qty.</th>
                  <th className="p-3 font-normal text-right">Avg. price</th>
                  <th className="p-3 font-normal text-right pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {(loading || execOrders.length === 0 ? DEMO_EXEC : execOrders.map((o: any) => ({
                  time: new Date(o.order_timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  type: o.transaction_type,
                  instrument: o.symbol,
                  exchange: o.exchange,
                  product: o.product,
                  qty: `${o.filled_quantity || 0} / ${o.quantity}`,
                  avg: o.average_price?.toFixed(2) || '0.00',
                  status: o.status,
                }))).map((o: any, idx) => (
                  <tr key={idx} className={`border-b border-[#333333]/30 hover:bg-[#252525] transition-colors ${idx % 2 === 1 ? 'bg-[#0d0d0d]' : ''}`}>
                    <td className="p-3 pl-6 text-[#e2bfb0]">{o.time}</td>
                    <td className="p-3"><TypeBadge type={o.type} /></td>
                    <td className="p-3 text-[#f7ddd2]">{o.instrument} <span className="text-[10px] text-[#e2bfb0]">{o.exchange}</span></td>
                    <td className="p-3 text-[#e2bfb0]">{o.product}</td>
                    <td className="p-3 text-right text-[#f7ddd2]">{o.qty}</td>
                    <td className="p-3 text-right text-[#f7ddd2]">{o.avg}</td>
                    <td className="p-3 text-right pr-6"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
