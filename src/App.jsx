// ============================================================
// App.jsx — Main application shell
// Handles: tab navigation, global state, localStorage sync
// All data lives here and is passed down to each tab as props
// ============================================================

import { useState, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, LineChart, CreditCard, Settings, Menu, X } from 'lucide-react';

import { loadAllData, saveData, STORAGE_KEYS } from './utils/storage';

// Tab components (built one by one)
import Dashboard   from './components/Dashboard/index';
import Income      from './components/Income/index';
import Investments from './components/Investments/index';
import Expenses    from './components/Expenses/index';
import SettingsTab from './components/Settings/index';

// ── Tab configuration ────────────────────────────────────────
const TABS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'income',      label: 'Income',       icon: TrendingUp      },
  { id: 'investments', label: 'Investments',  icon: LineChart       },
  { id: 'expenses',    label: 'Expenses',     icon: CreditCard      },
  { id: 'settings',    label: 'Settings',     icon: Settings        },
];

export default function App() {
  // ── Active tab ─────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState('dashboard');
  const [menuOpen,   setMenuOpen]   = useState(false);   // mobile nav

  // ── Global data state — loaded from localStorage on startup ─
  const [data, setData] = useState(() => loadAllData());

  // ── Generic updater — saves to localStorage and updates state
  // Usage: updateData('income', updatedArray)
  const updateData = useCallback((key, newValue) => {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    if (storageKey) saveData(storageKey, newValue);
    setData(prev => ({ ...prev, [key]: newValue }));
  }, []);

  // ── Shortcut updaters passed down as props ─────────────────
  const setIncome      = useCallback(v => updateData('income',      v), [updateData]);
  const setInvestments = useCallback(v => updateData('investments', v), [updateData]);
  const setExpenses    = useCallback(v => updateData('expenses',    v), [updateData]);
  const setBudgets     = useCallback(v => updateData('budgets',     v), [updateData]);
  const setSettings    = useCallback(v => updateData('settings',    v), [updateData]);

  // ── Render active tab ──────────────────────────────────────
  const renderTab = () => {
    const shared = { data, setIncome, setInvestments, setExpenses, setBudgets, setSettings };
    switch (activeTab) {
      case 'dashboard':   return <Dashboard   {...shared} />;
      case 'income':      return <Income      {...shared} />;
      case 'investments': return <Investments {...shared} />;
      case 'expenses':    return <Expenses    {...shared} />;
      case 'settings':    return <SettingsTab {...shared} setData={setData} />;
      default:            return <Dashboard   {...shared} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A', color: '#F1F5F9' }}>

      {/* ── TOP NAVIGATION BAR ─────────────────────────────── */}
      <nav style={{ backgroundColor: '#1E293B', borderBottom: '1px solid #334155' }}
           className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: '#06B6D4' }}>
                <span className="text-white font-bold text-sm">₿</span>
              </div>
              <span className="font-bold text-lg" style={{ color: '#F1F5F9' }}>
                FinanceTracker
              </span>
            </div>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map(tab => {
                const Icon    = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: isActive ? '#06B6D4' : 'transparent',
                      color:           isActive ? '#ffffff' : '#94A3B8',
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: '#94A3B8' }}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-3 flex flex-col gap-1"
               style={{ borderTop: '1px solid #334155' }}>
            {TABS.map(tab => {
              const Icon    = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left"
                  style={{
                    backgroundColor: isActive ? '#06B6D4' : 'transparent',
                    color:           isActive ? '#ffffff' : '#94A3B8',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTab()}
      </main>

    </div>
  );
}
