import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { Sale, Store, SaleItem } from '../types/database';
import CommercialInvoice from '../components/CommercialInvoice';
import {
  ShoppingCart,
  Search,
  Eye,
  Printer,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  FileText,
  Filter
} from 'lucide-react';

export default function Sales() {
  const { user } = useAuth();
  const { profile, isAdmin } = useUserRole();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const [viewingInvoice, setViewingInvoice] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile, selectedStore, startDate, endDate, paymentFilter]);

  async function loadData() {
    setLoading(true);
    try {
      let salesQuery;

      if (!isAdmin && profile?.storeId) {
        salesQuery = query(
          collection(db, 'sales'),
          where('store_id', '==', profile.storeId),
          where('status', '==', 'completed'),
          orderBy('created_at', 'desc')
        );
      } else if (selectedStore !== 'all') {
        salesQuery = query(
          collection(db, 'sales'),
          where('store_id', '==', selectedStore),
          where('status', '==', 'completed'),
          orderBy('created_at', 'desc')
        );
      } else {
        salesQuery = query(
          collection(db, 'sales'),
          where('status', '==', 'completed'),
          orderBy('created_at', 'desc')
        );
      }

      const [salesSnap, storesSnap, itemsSnap, paymentsSnap] = await Promise.all([
        getDocs(salesQuery),
        getDocs(query(collection(db, 'stores'), where('active', '==', true))),
        getDocs(collection(db, 'sale_items')),
        getDocs(collection(db, 'payments'))
      ]);

      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
      setStores(storesData);

      const itemsMap = new Map<string, SaleItem[]>();
      itemsSnap.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as SaleItem;
        if (!itemsMap.has(item.sale_id)) {
          itemsMap.set(item.sale_id, []);
        }
        itemsMap.get(item.sale_id)!.push(item);
      });

      const paymentsMap = new Map<string, any[]>();
      paymentsSnap.docs.forEach(doc => {
        const payment = { id: doc.id, ...doc.data() };
        if (!paymentsMap.has(payment.sale_id)) {
          paymentsMap.set(payment.sale_id, []);
        }
        paymentsMap.get(payment.sale_id)!.push(payment);
      });

      let salesData = salesSnap.docs.map(doc => {
        const saleData = { id: doc.id, ...doc.data() } as Sale;
        return {
          ...saleData,
          items: itemsMap.get(saleData.id) || [],
          payments: paymentsMap.get(saleData.id) || [],
          store: storesData.find(s => s.id === saleData.store_id)
        };
      });

      if (startDate) {
        const startTimestamp = new Date(startDate).getTime();
        salesData = salesData.filter(sale => new Date(sale.created_at).getTime() >= startTimestamp);
      }

      if (endDate) {
        const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
        salesData = salesData.filter(sale => new Date(sale.created_at).getTime() <= endTimestamp);
      }

      if (paymentFilter !== 'all') {
        salesData = salesData.filter(sale =>
          sale.payments?.some(p => p.method === paymentFilter)
        );
      }

      setSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewInvoice(sale: Sale) {
    try {
      const variantsSnap = await getDocs(collection(db, 'product_variants'));
      const variantsMap = new Map(variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(v => [v.id, v]));

      const productsSnap = await getDocs(collection(db, 'products'));
      const productsMap = new Map(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(p => [p.id, p]));

      const sizesSnap = await getDocs(collection(db, 'sizes'));
      const sizesMap = new Map(sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(s => [s.id, s]));

      const colorsSnap = await getDocs(collection(db, 'colors'));
      const colorsMap = new Map(colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(c => [c.id, c]));

      const enrichedItems = sale.items?.map(item => {
        const variant = variantsMap.get(item.variant_id);
        const product = variant ? productsMap.get(variant.product_id as any) : null;
        const size = variant ? sizesMap.get(variant.size_id as any) : null;
        const color = variant ? colorsMap.get(variant.color_id as any) : null;

        return {
          ...item,
          variant: variant ? {
            ...variant,
            product,
            size,
            color
          } : undefined
        };
      });

      setSelectedSale({
        ...sale,
        items: enrichedItems
      });
      setViewingInvoice(true);
    } catch (error) {
      console.error('Error loading invoice data:', error);
      alert('Error al cargar los detalles de la factura');
    }
  }

  const filteredSales = sales.filter(sale => {
    const searchLower = searchTerm.toLowerCase();
    const customerName = sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name}`.toLowerCase()
      : sale.quick_customer?.name?.toLowerCase() || 'cliente general';

    return (
      sale.sale_number.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower)
    );
  });

  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const cashSales = filteredSales.filter(s => s.payments?.some(p => p.method === 'cash')).length;
  const cardSales = filteredSales.filter(s => s.payments?.some(p => p.method === 'card')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 p-3 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Historial de Ventas</h1>
            <p className="text-sm text-slate-600">Registro completo de todas las transacciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Ventas</p>
              <p className="text-2xl font-bold text-slate-900">{totalSales}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Ingreso Total</p>
              <p className="text-2xl font-bold text-green-700">${totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Efectivo</p>
              <p className="text-2xl font-bold text-slate-900">{cashSales}</p>
            </div>
            <DollarSign className="w-8 h-8 text-slate-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Tarjeta</p>
              <p className="text-2xl font-bold text-slate-900">{cardSales}</p>
            </div>
            <CreditCard className="w-8 h-8 text-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar venta o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {isAdmin && (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">Todas las tiendas</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            placeholder="Fecha inicio"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            placeholder="Fecha fin"
          />

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">No. Venta</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
                {isAdmin && <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tienda</th>}
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Método Pago</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-500">
                    No se encontraron ventas
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const customerName = sale.customer
                    ? `${sale.customer.first_name} ${sale.customer.last_name}`
                    : sale.quick_customer?.name || 'Cliente General';

                  const paymentMethods = sale.payments?.map(p => {
                    switch (p.method) {
                      case 'cash': return 'Efectivo';
                      case 'card': return 'Tarjeta';
                      case 'transfer': return 'Transferencia';
                      default: return p.method;
                    }
                  }).join(', ') || 'N/A';

                  return (
                    <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{sale.sale_number}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(sale.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{customerName}</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {sale.store?.name || 'N/A'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-slate-600">{paymentMethods}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900">${sale.total.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewInvoice(sale)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Factura"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              handleViewInvoice(sale);
                              setTimeout(() => window.print(), 500);
                            }}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Imprimir"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingInvoice && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CommercialInvoice
              sale={selectedSale}
              store={selectedSale.store || stores[0]}
              onClose={() => {
                setViewingInvoice(false);
                setSelectedSale(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
