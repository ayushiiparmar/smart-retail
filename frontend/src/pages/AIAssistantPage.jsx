import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  Truck, 
  TrendingUp, 
  Package, 
  ArrowRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { getReorderRecommendations, sendAIChatMessage } from '../services/aiApi';

export default function AIAssistantPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, CRITICAL, REORDER, DEAD

  // Chatbot State
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AI Inventory Copilot. I'm actively monitoring your sales velocity, supplier lead times, and runout risks. Ask me anything about stock health, reorder quantities, or capital risks!"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const res = await getReorderRecommendations();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend = userInput) => {
    const text = textToSend.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setUserInput('');
    setChatLoading(true);

    try {
      const res = await sendAIChatMessage(text);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: "Sorry, I had trouble evaluating that query. Ensure backend is running." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredRecommendations = (data?.recommendations || []).filter((r) => {
    if (filterTab === 'CRITICAL') return r.status === 'CRITICAL' || r.status === 'OUT_OF_STOCK';
    if (filterTab === 'REORDER') return r.status === 'REORDER_NOW';
    if (filterTab === 'DEAD') return r.status === 'DEAD_STOCK';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Inventory Copilot</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles size={11} /> Level 1 Deterministic Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time Reorder Point (ROP), Days-to-Stockout velocity models, and intelligent chat.
          </p>
        </div>

        <button
          onClick={fetchAIInsights}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
          <span>Re-calculate Models</span>
        </button>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical Runouts</span>
              <ShieldAlert size={18} className="text-rose-600" />
            </div>
            <p className="text-2xl font-extrabold text-rose-950 mt-1">{data.summary.critical_count}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Runout ≤ 3 days or depleted</p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Reorders Needed</span>
              <Truck size={18} className="text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-950 mt-1">{data.summary.reorder_needed_count}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Current stock ≤ ROP</p>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Capital at Risk</span>
              <TrendingUp size={18} className="text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-950 mt-1">₹{data.summary.total_capital_at_risk}</p>
            <p className="text-[11px] text-indigo-600 mt-0.5">{data.summary.dead_stock_count} stagnant items</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Healthy Margins</span>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-950 mt-1">{data.summary.healthy_count}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Adequate supply buffers</p>
          </div>
        </div>
      )}

      {/* Dual Pane Grid: Reorder Recommendations Table (7 cols) + AI Chat Terminal (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reorder Suggestions Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Predictive Replenishment Engine</h3>
              <p className="text-xs text-slate-500">Formulated via $V_d$, Lead Times, and Safety Buffers</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
              {['ALL', 'CRITICAL', 'REORDER', 'DEAD'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterTab === tab ? 'bg-white text-slate-900 font-bold shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Evaluating consumption velocities...
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No items match the selected filter criteria.
              </div>
            ) : (
              filteredRecommendations.map((item) => {
                let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                if (item.status === 'OUT_OF_STOCK') badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
                if (item.status === 'CRITICAL') badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                if (item.status === 'REORDER_NOW') badgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
                if (item.status === 'DEAD_STOCK') badgeClass = "bg-purple-100 text-purple-800 border-purple-200";

                return (
                  <div
                    key={item.product_id}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5">{item.product_name}</h4>
                        <p className="text-[11px] text-slate-500">
                          Supplier: <span className="font-semibold text-slate-700">{item.supplier_company}</span> ({item.supplier_phone})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {item.current_stock} on hand
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {item.days_to_stockout >= 900 ? "∞ days" : `Runout: ${item.days_to_stockout}d`}
                        </p>
                      </div>
                    </div>

                    {/* Operational Metrics Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Velocity</span>
                        <span className="font-mono font-bold text-slate-700">{item.daily_velocity} /day</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Reorder Pt</span>
                        <span className="font-mono font-bold text-slate-700">{item.reorder_point} units</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Lead Time</span>
                        <span className="font-mono font-bold text-slate-700">{item.lead_time_days} days</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Order Qty</span>
                        <span className="font-mono font-bold text-indigo-600">
                          {item.recommended_reorder_qty > 0 ? `+${item.recommended_reorder_qty}` : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: AI Interactive Terminal (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[670px]">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Retail Intelligence Copilot</h3>
              <p className="text-[10px] text-slate-500 font-medium">Deterministic Context Q&A</p>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-slate-100">
            {[
              "Which items are critical?",
              "What should I reorder?",
              "Show dead stock",
              "Amul Milk status"
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-full text-slate-600 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs whitespace-pre-line'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs py-1">
                <Sparkles size={13} className="animate-spin text-indigo-600" />
                <span>Analyzing inventory database...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="pt-3 border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask copilot about runout or reorders..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || chatLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}