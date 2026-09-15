import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle2, Lock, Unlock, KeyRound, X } from 'lucide-react';
import api from '../../services/api';

function TopNav() {
  const [dbStatus, setDbStatus] = useState({ connected: false, products: 0 });
  const [isManager, setIsManager] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    // Check if a stored PIN is still valid by asking the server, instead of
    // comparing it to a hardcoded value on the client.
    const storedPin = localStorage.getItem('smart_retail_manager_pin');
    if (storedPin) {
      api.post('/api/auth/verify-pin')
        .then(() => setIsManager(true))
        .catch(() => {
          localStorage.removeItem('smart_retail_manager_pin');
          setIsManager(false);
        });
    }

    api.get('/api/health/db')
      .then((res) => {
        if (res.data.status === 'connected') {
          setDbStatus({
            connected: true,
            products: res.data.records?.products || 0
          });
        }
      })
      .catch(() => {
        setDbStatus({ connected: false, products: 0 });
      });
  }, []);

  const handleUnlockClick = () => {
    if (isManager) {
      // Lock manager mode back to cashier
      localStorage.removeItem('smart_retail_manager_pin');
      setIsManager(false);
      window.location.reload();
    } else {
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    const candidate = pinInput.trim();
    try {
      // Ask the server to validate the PIN rather than checking it client-side.
      await api.post('/api/auth/verify-pin', null, {
        headers: { 'X-Manager-PIN': candidate }
      });
      localStorage.setItem('smart_retail_manager_pin', candidate);
      setIsManager(true);
      setShowPinModal(false);
      setPinError('');
      window.location.reload();
    } catch (err) {
      setPinError('Invalid Manager PIN.');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="relative w-72 md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input
          type="text"
          placeholder="Global search (products, orders, customers)..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Database Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          dbStatus.connected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {dbStatus.connected ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{dbStatus.connected ? `DB Live (${dbStatus.products} SKUs)` : 'DB Disconnected'}</span>
        </div>

        {/* Manager Mode Toggle Button */}
        <button
          onClick={handleUnlockClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
            isManager
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
          title={isManager ? "Click to lock to Cashier Mode" : "Click to authenticate as Manager"}
        >
          {isManager ? <Unlock size={14} className="text-amber-600" /> : <Lock size={14} />}
          <span>{isManager ? "Manager Mode" : "Cashier Mode"}</span>
        </button>

        {/* User Identity Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            isManager ? 'bg-amber-500 text-white' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isManager ? 'MGR' : 'POS'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Jaipur Retail Store</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {isManager ? "Store Admin (Full Access)" : "Cashier Terminal"}
            </p>
          </div>
        </div>
      </div>

      {/* Manager PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Manager Access</h3>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="pt-4 space-y-3">
              <p className="text-xs text-slate-500">
                Enter your 4-digit Manager PIN to unlock catalog modifications, deletions, and wholesale costs.
              </p>

              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="Demo PIN: 1234"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center tracking-widest font-mono text-base px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {pinError && <p className="text-[11px] text-rose-600 mt-1.5 font-medium">{pinError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

export default TopNav;