import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  Tags,
  Sparkles,
  Zap,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';

const electron = (window as any).electron;

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inbox', icon: Inbox, label: 'Inbox' },
  { path: '/categories', icon: Tags, label: 'Categories' },
  { path: '/cleanup', icon: Sparkles, label: 'Cleanup' },
  { path: '/rules', icon: Zap, label: 'Rules' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const bottomNavItems = [
  { path: '/accounts', icon: Users, label: 'Accounts' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { isSyncing, syncAccounts, accounts } = useStore();

  const handleWindowControl = async (action: 'minimize' | 'maximize' | 'close') => {
    if (!electron) return;
    await electron.window[action]();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title Bar */}
      <div className="h-9 flex items-center justify-between px-3 bg-surface-950/80 border-b border-surface-800/50 drag-region">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span className="text-sm font-display font-medium text-surface-200">C-Mail Intelligence</span>
        </div>
        
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => handleWindowControl('minimize')}
            className="p-1.5 hover:bg-surface-700 rounded transition-colors"
          >
            <Minus className="w-4 h-4 text-surface-400" />
          </button>
          <button
            onClick={() => handleWindowControl('maximize')}
            className="p-1.5 hover:bg-surface-700 rounded transition-colors"
          >
            <Square className="w-3.5 h-3.5 text-surface-400" />
          </button>
          <button
            onClick={() => handleWindowControl('close')}
            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
          >
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 64 : 220 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex flex-col bg-surface-900/50 border-r border-surface-800/50 backdrop-blur-sm"
        >
          {/* Account Indicator */}
          <div className="p-3 border-b border-surface-800/50">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              {accounts.length > 0 ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {accounts[0].email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">
                        {accounts[0].name || accounts[0].email.split('@')[0]}
                      </p>
                      <p className="text-xs text-surface-500 truncate">{accounts[0].email}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={`text-center ${isCollapsed ? '' : 'flex-1'}`}>
                  <NavLink
                    to="/accounts"
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    {isCollapsed ? '+' : 'Add Account'}
                  </NavLink>
                </div>
              )}
            </div>
          </div>

          {/* Sync Button */}
          <div className="p-3">
            <button
              onClick={() => syncAccounts()}
              disabled={isSyncing || accounts.length === 0}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg 
                bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 
                transition-all duration-200 btn-press
                ${isCollapsed ? 'justify-center' : ''}
                ${isSyncing ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {!isCollapsed && (
                <span className="text-sm font-medium">
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </span>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary-500/15 text-primary-400 shadow-inner-glow'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom Navigation */}
          <div className="p-3 space-y-1 border-t border-surface-800/50">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            ))}

            {/* Collapse Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg
                text-surface-500 hover:text-surface-300 hover:bg-surface-800/50
                transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

