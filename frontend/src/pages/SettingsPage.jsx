import React, { useState, useEffect } from 'react';
import { 
  Store, 
  KeyRound, 
  Database, 
  Save, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle,
  Percent,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

export default function SettingsPage() {
  const [notification, setNotification] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [resetting, setResetting] = useState(false);

  const [settings, setSettings] = useState({
    storeName: localStorage.getItem('store_name') || 'Jaipur Central Mart',
    storeAddress: localStorage.getItem('store_address') || 'MI Road, Jaipur, Rajasthan',
    storePhone: localStorage.getItem('store_phone') || '+91 98290 12345',
    taxRate: localStorage.getItem('store_tax_rate') || '5',
    managerPin: localStorage.getItem('smart_retail_manager_pin') || '1234'
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchHealth = () => {
    api.get('/api/health/db')
      .then(res => setDbStatus(res.data))
      .catch(() => setDbStatus({ status: 'disconnected', records: {} }));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('store_name', settings.storeName);
    localStorage.setItem('store_address', settings.storeAddress);
    localStorage.setItem('store_phone', settings.storePhone);
    localStorage.setItem('store_tax_rate', settings.taxRate);
    localStorage.setItem('smart_retail_manager_pin', settings.managerPin);
    showToast('Store settings saved successfully!');
  };

  const handleResetStock = async () => {
    if (!window.confirm("Restore default demo stock numbers? This ensures all ROP and low-stock alerts reset to their original demonstration state.")) return;
    
    setResetting(true);
    try {
      await api.post('/api/admin/reset-stock');
      showToast('Demo stock levels restored to original values!');
      fetchHealth();
    } catch (err) {
      showToast('Failed to reset demo stock.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
          notification.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {notification.message}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Configuration</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage store identifiers, tax rates, manager credentials, and database health.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900 text-sm">Store Profile & Receipt Branding</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Store Name</label>
              <input
                type="text"
                required
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={settings.storePhone}
                onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Physical Address</label>
              <input
                type="text"
                required
                value={settings.storeAddress}
                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Security & Financial Rules */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="text-amber-600" size={20} />
            <h3 className="font-bold text-slate-900 text-sm">Security & Tax Rules</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Manager PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={settings.managerPin}
                onChange={(e) => setSettings({ ...settings, managerPin: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default PIN: 1234. Used to unmask wholesale costs and delete items.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                step="0.5"
                required
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used during POS billing calculations.</p>
            </div>
          </div>
        </div>

        {/* System & Database Health */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="text-emerald-600" size={20} />
              <h3 className="font-bold text-slate-900 text-sm">Database & Demo Health</h3>
            </div>
            <button
              type="button"
              onClick={handleResetStock}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
              <span>Reset Demo Stock</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">Engine</span>
              <span className="font-bold text-slate-800 font-mono">SQLite (3NF)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">Active SKUs</span>
              <span className="font-bold text-slate-800 font-mono">{dbStatus?.records?.products ?? '...'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">Total Invoices</span>
              <span className="font-bold text-slate-800 font-mono">{dbStatus?.records?.sales ?? '...'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">Status</span>
              <span className="font-bold text-emerald-600 font-semibold">{dbStatus?.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
          >
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}