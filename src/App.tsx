import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/Layout/DashboardLayout';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Returns from './pages/Returns';
import Promotions from './pages/Promotions';
import CashRegister from './pages/CashRegister';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Stores from './pages/Stores';
import CashRegisters from './pages/CashRegisters';
import Chat from './pages/Chat';
import ChatAudit from './pages/ChatAudit';
import SystemControl from './pages/SystemControl';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('pos');

  useEffect(() => {
    function handleNavigate(e: Event) {
      const customEvent = e as CustomEvent;
      setCurrentPage(customEvent.detail);
    }

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'pos':
        return <POS />;
      case 'products':
        return <Products />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'returns':
        return <Returns />;
      case 'promotions':
        return <Promotions />;
      case 'cash':
        return <CashRegister />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <Users />;
      case 'stores':
        return <Stores />;
      case 'registers':
        return <CashRegisters />;
      case 'chat':
        return <Chat />;
      case 'chat-audit':
        return <ChatAudit />;
      case 'system-control':
        return <SystemControl />;
      case 'profile':
        return <Profile />;
      default:
        return <POS />;
    }
  }

  return (
    <DashboardLayout currentPage={currentPage}>
      {renderPage()}
    </DashboardLayout>
  );
}

export default App;
