import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  ShoppingBag, 
  CreditCard, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Package,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { getAdvancedAnalytics } from '../services/analyticsApi';

const CATEGORY_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d'); // today, 7d, 30d, all
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async (selectedPeriod = period) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdvancedAnalytics(selectedPeriod);
      setData(res);
    } catch (err) {
      setError('Unable to calculate store analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <RefreshCw className="animate-spin mx-auto text-indigo-600" size={32} />
          <p className="text-sm font-medium text-slate-500">Calculating financial metrics & trends...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
        <AlertCircle className="mx-auto text-rose-600" size={32} />
        <h3 className="text-base font-semibold text-rose-900">{error || 'Data load error.'}</h3>
        <button
          onClick={() => fetchAnalytics(period)}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const { kpis, category_distribution, payment_methods, top_movers, slow_movers } = data;

  return (
    <div className="space-y-6">
      {/* Header & Time Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sales & Profit Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit gross margins, product movement velocities, and category breakdowns.
          </p>
        </div>

        {/* Time Window Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handlePeriodChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{kpis.total_revenue.toFixed(2)}
          </h3>
          <p className="text-[11px] text-slate-400">
            {kpis.total_orders} total orders in this period
          </p>
        </div>

        {/* Gross Profit */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-600 font-mono">
            ₹{kpis.gross_profit.toFixed(2)}
          </h3>
          <p className="text-[11px] text-slate-400">
            Revenue minus ₹{kpis.cogs.toFixed(2)} wholesale cost
          </p>
        </div>

        {/* Profit Margin */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profit Margin</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Percent size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
            {kpis.profit_margin}%
          </h3>
          <p className="text-[11px] text-slate-400">
            Net return rate on retail inventory
          </p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Order Value (AOV)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShoppingBag size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{kpis.aov.toFixed(2)}
          </h3>
          <p className="text-[11px] text-slate-400">
            {kpis.total_units_sold} total item units dispensed
          </p>
        </div>
      </div>

      {/* Charts Section: Category Revenue Donut + Payment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Revenue Distribution (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Category Revenue Contribution</h3>
              <p className="text-xs text-slate-500">Sales intake partitioned by department</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-600">
              Department Share
            </span>
          </div>

          <div className="h-64 w-full">
            {category_distribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categorical sales recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Channels (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Payment Methods Breakdown</h3>
            <p className="text-xs text-slate-500">Intake grouped by tender type (UPI, Cash, Card)</p>
          </div>

          <div className="h-64 w-full">
            {payment_methods.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment transactions recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payment_methods} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="method" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val) => [`₹${val.toFixed(2)}`, 'Collected']}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Movement Velocity: Fast Movers vs. Stagnant / Slow-Moving Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Fast Movers (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Top-Performing SKUs</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Velocity</span>
          </div>

          <div className="divide-y divide-slate-100">
            {top_movers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No SKU velocity recorded.</p>
            ) : (
              top_movers.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 font-mono">{item.units_sold} units</p>
                    <p className="text-[10px] font-semibold text-emerald-600 font-mono">₹{item.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slow-Moving / Dead Stock (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Stagnant / Dead Stock Risk</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase">0 Sales in Period</span>
          </div>

          <div className="divide-y divide-slate-100">
            {slow_movers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No stagnant inventory detected.</p>
            ) : (
              slow_movers.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.category} • {item.stock} units sitting on shelf
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      ₹{item.capital_locked.toFixed(2)} locked
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}