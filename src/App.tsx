import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Categories from './pages/Categories';
import Cleanup from './pages/Cleanup';
import Rules from './pages/Rules';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Accounts from './pages/Accounts';
import { useStore } from './store';

export default function App() {
  const { loadAccounts, loadSettings, loadCategories } = useStore();

  useEffect(() => {
    // Load initial data
    loadAccounts();
    loadSettings();
    loadCategories();
  }, [loadAccounts, loadSettings, loadCategories]);

  return (
    <div className="h-screen flex flex-col bg-surface-950 gradient-mesh">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="categories" element={<Categories />} />
          <Route path="cleanup" element={<Cleanup />} />
          <Route path="rules" element={<Rules />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="accounts" element={<Accounts />} />
        </Route>
      </Routes>
    </div>
  );
}

