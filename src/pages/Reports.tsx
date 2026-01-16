import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarChart3, TrendingUp, DollarSign, Users, CreditCard, Banknote, Wallet } from 'lucide-react';

const IVA_RATE = 0.16;

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [includeIVA, setIncludeIVA] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    topProducts: [] as any[],
    paymentMethods: {
      cash: 0,
      card: 0,
      transfer: 0,
      credit: 0,
    },
    recentSales: [] as any[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo]);

  function calculateWithoutIVA(amount: number): number {
    return amount / (1 + IVA_RATE);
  }

  function getDisplayAmount(amount: number): number {
    return includeIVA ? amount : calculateWithoutIVA(amount);
  }

  async function loadReports() {
    setLoading(true);
    try {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      const [salesSnapshot, paymentsSnapshot, customersSnapshot, saleItemsSnapshot, variantsSnapshot, productsSnapshot] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'sale_items')),
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'products')),
      ]);

      const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const saleItems = saleItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const variantsMap = new Map();
      variantsSnapshot.docs.forEach(doc => {
        variantsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const productsMap = new Map();
      productsSnapshot.docs.forEach(doc => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const filteredSales = sales.filter((s: any) => {
        const saleDate = new Date(s.created_at);
        return saleDate >= fromDate && saleDate <= toDate;
      });

      const filteredPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= fromDate && paymentDate <= toDate;
      });

      const filteredCustomers = customers.filter((c: any) => {
        const customerDate = new Date(c.created_at);
        return customerDate >= fromDate && customerDate <= toDate;
      });

      const totalSales = filteredSales.length;
      const totalRevenue = filteredSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const totalCustomers = filteredCustomers.length;

      const saleIds = filteredSales.map(s => s.id);
      const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

      const filteredSaleItems = saleItems.filter((item: any) => saleIds.includes(item.sale_id));

      for (const item of filteredSaleItems) {
        const variantId = item.variant_id;
        const variant = variantsMap.get(variantId);
        const product = variant?.product_id ? productsMap.get(variant.product_id) : null;
        const productName = product?.name || variant?.sku || 'Producto';

        if (productSales.has(variantId)) {
          const existing = productSales.get(variantId)!;
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSales.set(variantId, {
            name: productName,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      }

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const paymentMethods = {
        cash: 0,
        card: 0,
        transfer: 0,
        credit: 0,
      };

      filteredPayments.forEach((payment: any) => {
        if (payment.method === 'cash') paymentMethods.cash += payment.amount || 0;
        else if (payment.method === 'card') paymentMethods.card += payment.amount || 0;
        else if (payment.method === 'transfer') paymentMethods.transfer += payment.amount || 0;
        else if (payment.method === 'credit') paymentMethods.credit += payment.amount || 0;
      });

      const recentSales = filteredSales
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setStats({
        totalSales,
        totalRevenue,
        totalCustomers,
        topProducts,
        paymentMethods,
        recentSales,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reportes y Análisis</h1>
        <p className="text-slate-600">Ver rendimiento de ventas e información del negocio</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
            <label className="text-sm font-medium text-slate-700">Vista de Precios:</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIncludeIVA(false)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  !includeIVA
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Sin IVA
              </button>
              <button
                onClick={() => setIncludeIVA(true)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  includeIVA
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Con IVA
              </button>
            </div>
            <div className="text-xs text-slate-500 ml-2">
              IVA: 16%
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Cargando reportes...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Total Ventas</p>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalSales}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Ingresos Totales {!includeIVA && '(Sin IVA)'}</p>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">${getDisplayAmount(stats.totalRevenue).toFixed(2)} MXN</p>
              {!includeIVA && (
                <p className="text-xs text-slate-500 mt-1">Con IVA: ${stats.totalRevenue.toFixed(2)} MXN</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Nuevos Clientes</p>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalCustomers}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Métodos de Pago</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Efectivo</p>
                      <p className="text-sm text-slate-600">Pagos en efectivo</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">${getDisplayAmount(stats.paymentMethods.cash).toFixed(2)} MXN</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Tarjeta</p>
                      <p className="text-sm text-slate-600">Pagos con tarjeta</p>
                    </div>
                  </div>
                  <span className="font-bold text-blue-600">${getDisplayAmount(stats.paymentMethods.card).toFixed(2)} MXN</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Transferencia</p>
                      <p className="text-sm text-slate-600">Pagos por transferencia</p>
                    </div>
                  </div>
                  <span className="font-bold text-purple-600">${getDisplayAmount(stats.paymentMethods.transfer).toFixed(2)} MXN</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Crédito</p>
                      <p className="text-sm text-slate-600">Pagos con crédito de tienda</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600">${getDisplayAmount(stats.paymentMethods.credit).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Ventas Recientes</span>
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats.recentSales.length > 0 ? (
                  stats.recentSales.map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Venta #{sale.id.slice(0, 8)}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="font-bold text-green-600">${getDisplayAmount(sale.total || 0).toFixed(2)} MXN</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-600 py-4">Sin ventas recientes</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Productos Más Vendidos</span>
            </h3>
            <div className="space-y-3">
              {stats.topProducts.length > 0 ? (
                stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-600">{product.quantity} unidades vendidas</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">${getDisplayAmount(product.revenue).toFixed(2)} MXN</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-600 py-4">Sin datos de ventas para este periodo</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
