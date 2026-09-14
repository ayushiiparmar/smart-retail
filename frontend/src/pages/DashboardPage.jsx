import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  Receipt, 
  Clock, 
  Sparkles, 
  RefreshCw,
  ShoppingBag,
  Users,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getDashboardSummary } from '../services/analyticsApi';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardSummary();
      setData(res);
    } catch (err) {
      setError('Unable to load dashboard analytics from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <RefreshCw className="animate-spin mx-auto text-indigo-600" size={32} />
          <p className="text-sm font-medium text-slate-500">Loading store analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
        <AlertTriangle className="mx-auto text-rose-600" size={32} />
        <h3 className="text-base font-semibold text-rose-900">{error || 'Something went wrong.'}</h3>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { kpis, revenue_trend, top_selling_products, urgent_stock, recent_transactions } = data;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Store Executive Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time revenue, stock alerts, and sales performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <RefreshCw size={14} />
            <span>Refresh Stats</span>
          </button>
          <Link
            to="/billing"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Receipt size={15} />
            <span>Open POS Register</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{kpis.today_revenue.toFixed(2)}
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {kpis.today_orders} orders
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Total gross intake for current date</p>
        </div>

        {/* Card 2: Lifetime Sales Revenue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{kpis.lifetime_revenue.toFixed(2)}
            </h3>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {kpis.total_sales_count} bills
            </span>
          </div>
          <p className="text-[11px] text-slate-400">All recorded transactions</p>
        </div>

        {/* Card 3: Stockout Risk */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Alerts</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900">
              {kpis.low_stock_count + kpis.out_of_stock_count}
            </h3>
            <div className="flex gap-1 text-[10px] font-semibold">
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                {kpis.low_stock_count} low
              </span>
              <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                {kpis.out_of_stock_count} out
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">SKUs requiring immediate reorder</p>
        </div>

        {/* Card 4: Catalog SKUs */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SKUs</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-slate-900">
              {kpis.total_products}
            </h3>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {kpis.total_customers} clients
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Items active in catalog</p>
        </div>
      </div>

      {/* AI Recommendation Banner Preview */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
            <Sparkles size={22} className="text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm tracking-wide">AI Store Intelligence Insight</h4>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-400/30 rounded-full font-mono uppercase">Phase 10 Preview</span>
            </div>
            <p className="text-xs text-indigo-100 mt-1">
              {urgent_stock.length > 0
                ? `Restock recommendation: "${urgent_stock[0].name}" is currently at ${urgent_stock[0].current_stock} units (below safety limit of ${urgent_stock[0].min_stock_level}). Order immediately to prevent lost sales.`
                : 'All inventory levels are operating within optimal safety margins.'}
            </p>
          </div>
        </div>
        <Link
          to="/ai-assistant"
          className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold shrink-0 transition"
        >
          Open AI Copilot
        </Link>
      </div>

      {/* Middle Row: 7-Day Trend Chart & Top Selling Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Revenue Area Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">7-Day Revenue Trend</h3>
              <p className="text-xs text-slate-500">Gross sales across the preceding week</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-600">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']}
                  labelFormatter={(label, items) => items[0]?.payload ? `${items[0].payload.date} (${label})` : label}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top-Selling Products</h3>
              <p className="text-xs text-slate-500">Highest volume SKUs</p>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              View All <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {top_selling_products.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No sales recorded yet.</p>
            ) : (
              top_selling_products.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">₹{item.selling_price.toFixed(2)}/unit</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900 font-mono">{item.units_sold} sold</p>
                    <p className="text-[10px] text-emerald-600 font-semibold font-mono">₹{item.total_sales.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Restock Warnings & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Urgent Restock Alerts Table (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Urgent Restock Action Items</h3>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline">
              Inventory Table
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {urgent_stock.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">All items have healthy stock levels.</p>
            ) : (
              urgent_stock.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.category} • Barcode: {p.barcode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.current_stock} left (Min: {p.min_stock_level})
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Store Invoices</h3>
            </div>
            <Link to="/billing" className="text-xs font-semibold text-indigo-600 hover:underline">
              New Bill
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recent_transactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No transactions found.</p>
            ) : (
              recent_transactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{tx.invoice_number}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                        {tx.payment_method}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{tx.customer_name} • {tx.time}</p>
                  </div>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    ₹{tx.grand_total.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}