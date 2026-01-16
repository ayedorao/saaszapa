import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ProductTour from '../ProductTour';
import AnnouncementBanner from '../AnnouncementBanner';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  RotateCcw,
  Tag,
  Boxes,
  UserCircle,
  Shield,
  Store,
  MessageCircle,
  Bell,
  Truck,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof ShoppingCart;
  permission?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, permission: 'sales' },
  { id: 'products', label: 'Productos', icon: ShoppingBag, permission: 'products' },
  { id: 'inventory', label: 'Inventario', icon: Boxes, permission: 'inventory' },
  { id: 'customers', label: 'Clientes', icon: Users, permission: 'customers' },
  { id: 'suppliers', label: 'Proveedores', icon: Truck, permission: 'products' },
  { id: 'returns', label: 'Devoluciones', icon: RotateCcw, permission: 'sales' },
  { id: 'promotions', label: 'Promociones', icon: Tag, permission: 'sales' },
  { id: 'cash', label: 'Caja Registradora', icon: DollarSign, permission: 'cash_control' },
  { id: 'reports', label: 'Reportes', icon: BarChart3, permission: 'reports' },
  { id: 'chat', label: 'Chat Tiendas', icon: MessageCircle },
  { id: 'system-control', label: 'Control de Sistema', icon: Bell, adminOnly: true },
  { id: 'users', label: 'Usuarios', icon: Shield, adminOnly: true },
  { id: 'stores', label: 'Tiendas', icon: Store, adminOnly: true },
  { id: 'registers', label: 'Cajas', icon: DollarSign, adminOnly: true },
  { id: 'chat-audit', label: 'Auditoría Chat', icon: MessageCircle, adminOnly: true },
];

export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { profile, isAdmin } = useUserRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkTutorialStatus();
  }, [user]);

  useEffect(() => {
    const handleShowTutorial = () => {
      setShowTutorial(true);
    };
    window.addEventListener('showTutorial', handleShowTutorial);
    return () => window.removeEventListener('showTutorial', handleShowTutorial);
  }, []);

  async function checkTutorialStatus() {
    if (!user) return;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        if (!data.tutorial_completed) {
          setShowTutorial(true);
        }
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  }

  async function handleCompleteTutorial() {
    if (!user) return;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        tutorial_completed: true,
        tutorial_completed_at: new Date().toISOString()
      });
      setShowTutorial(false);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  }

  function handleCloseTutorial() {
    setShowTutorial(false);
  }

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <Package className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Zapatería</h1>
                <p className="text-xs text-slate-400">Sistema POS</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  data-tour={item.id}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('navigate', { detail: item.id }));
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <button
              data-tour="profile"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
                setSidebarOpen(false);
              }}
              className="w-full mb-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {profile?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.displayName || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <UserCircle className="w-5 h-5 text-slate-400" />
              </div>
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40">
          <AnnouncementBanner />
          <header className="bg-white border-b border-slate-200">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {sidebarOpen ? (
                    <X className="w-6 h-6 text-slate-900" />
                  ) : (
                    <Menu className="w-6 h-6 text-slate-900" />
                  )}
                </button>
                <h2 className="text-xl font-semibold text-slate-900">
                  {navItems.find(item => item.id === currentPage)?.label || 'Panel de Control'}
                </h2>
              </div>
            </div>
          </header>
        </div>

        <main className="p-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showTutorial && (
        <ProductTour
          onComplete={handleCompleteTutorial}
          onClose={handleCloseTutorial}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
