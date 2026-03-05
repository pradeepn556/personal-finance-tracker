// ============================================================
// App.jsx — Main application shell
// Handles: tab navigation, global state, localStorage sync
// All data lives here and is passed down to each tab as props
// ============================================================

import { useState, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, LineChart, CreditCard, Settings, Menu, X } from 'lucide-react';

import { loadAllData, saveData, STORAGE_KEYS } from './utils/storage';

// Tab components
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [data,      setData]      = useState(() => loadAllData());

  const updateData = useCallback((key, newValue) => {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    if (storageKey) saveData(storageKey, newValue);
    setData(prev => ({ ...prev, [key]: newValue }));
  }, []);

  const setIncome      = useCallback(v => updateData('income',      v), [updateData]);
  const setInvestments = useCallback(v => updateData('investments', v), [updateData]);
  const setExpenses    = useCallback(v => updateData('expenses',    v), [updateData]);
  const setBudgets     = useCallback(v => updateData('budgets',     v), [updateData]);
  const setSettings    = useCallback(v => updateData('settings',    v), [updateData]);

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

  // Today label for header
  const todayLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A', color: '#F1F5F9' }}>

      {/* ── TOP NAVIGATION BAR ───────────────────────────── */}
      <nav style={{ backgroundColor: '#0B1120', borderBottom: '2px solid #1E293B' }}
           className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between" style={{ height: '64px' }}>

            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                   style={{ backgroundColor: '#06B6D4' }}>
                <span className="text-white font-black" style={{ fontSize: '18px' }}>₿</span>
              </div>
              <div>
                <span className="font-black tracking-tight" style={{ fontSize: '18px', color: '#F1F5F9' }}>
                  FinanceTracker
                </span>
                <div className="hidden lg:block text-xs" style={{ color: '#475569', marginTop: '-2px' }}>
                  Personal Finance Dashboard
                </div>
              </div>
            </div>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map(tab => {
                const Icon     = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-label={tab.label}
                    style={{
                      height: '44px',
                      padding: '0 18px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: isActive ? '700' : '500',
                      backgroundColor: isActive ? '#06B6D4' : 'transparent',
                      color: isActive ? '#ffffff' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right side: date + mobile menu */}
            <div className="flex items-center gap-3">
              <span className="hidden lg:block text-xs font-mono" style={{ color: '#475569' }}>
                {todayLabel}
              </span>
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
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-1"
               style={{ borderTop: '1px solid #1E293B', backgroundColor: '#0B1120' }}>
            {TABS.map(tab => {
              const Icon     = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left transition-all"
                  style={{
                    backgroundColor: isActive ? '#06B6D4' : 'transparent',
                    color:           isActive ? '#ffffff' : '#CBD5E1',
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

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto" style={{ padding: '24px' }}>
        {renderTab()}
      </main>

    </div>
  );
}
