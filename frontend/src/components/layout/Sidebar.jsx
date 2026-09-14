import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Truck, 
  Users, 
  BarChart3, 
  Bot, 
  Settings,
  Store,
  Sparkles
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Billing / POS', path: '/billing', icon: Receipt },
  { name: 'Suppliers', path: '/suppliers', icon: Truck },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Sales Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot, isAIFeature: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm shadow-indigo-500/20">
          <Store size={20} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide">SMART RETAIL</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">AI-Powered POS</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                <span>{item.name}</span>
              </div>
              {item.isAIFeature && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Sparkles size={10} /> AI
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <p className="text-xs font-medium text-slate-200">Local Store Online</p>
            <p className="text-[10px] text-slate-500">FastAPI & SQLite Sync</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;