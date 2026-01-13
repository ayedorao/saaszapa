import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sale } from '../types/database';
import { Search, RotateCcw, ArrowLeftRight, Calendar, DollarSign, User } from 'lucide-react';

export default function Returns() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSales(sales);
    } else {
      const filtered = sales.filter((sale: any) =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSales(filtered);
    }
  }, [searchTerm, sales]);

  async function loadSales() {
    setLoading(true);
    try {
      const [salesSnapshot, customersSnapshot, saleItemsSnapshot, variantsSnapshot, productsSnapshot, sizesSnapshot, colorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'sale_items')),
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
      ]);

      const customersMap = new Map();
      customersSnapshot.docs.forEach(doc => {
        customersMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const variantsMap = new Map();
      variantsSnapshot.docs.forEach(doc => {
        variantsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const productsMap = new Map();
      productsSnapshot.docs.forEach(doc => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const sizesMap = new Map();
      sizesSnapshot.docs.forEach(doc => {
        sizesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const colorsMap = new Map();
      colorsSnapshot.docs.forEach(doc => {
        colorsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const itemsBySale = new Map();
      saleItemsSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() };
        if (!itemsBySale.has(item.sale_id)) {
          itemsBySale.set(item.sale_id, []);
        }
        itemsBySale.get(item.sale_id).push(item);
      });

      const salesData = salesSnapshot.docs.map(doc => {
        const sale = { id: doc.id, ...doc.data() } as any;

        if (sale.customer_id) {
          sale.customer = customersMap.get(sale.customer_id);
        }

        const saleItems = itemsBySale.get(sale.id) || [];
        sale.items = saleItems.map((item: any) => {
          const variant = variantsMap.get(item.variant_id);
          if (variant) {
            variant.product = productsMap.get(variant.product_id);
            variant.size = sizesMap.get(variant.size_id);
            variant.color = colorsMap.get(variant.color_id);
            item.variant = variant;
          }
          return item;
        });

        return sale;
      });

      salesData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSales(salesData);
      setFilteredSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  }

  function selectSale(sale: Sale) {
    setSelectedSale(sale);
    setShowReturnModal(true);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Devoluciones e Intercambios</h1>
        <p className="text-slate-600">Selecciona una venta para procesar devoluciones</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número de venta, cliente..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando ventas...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Venta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">#{sale.id.slice(0, 8)}</div>
                        {sale.sale_number && (
                          <div className="text-sm text-slate-500">{sale.sale_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(sale.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sale.customer ? (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {sale.customer.first_name} {sale.customer.last_name}
                              </div>
                              <div className="text-xs text-slate-500">{sale.customer.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Sin cliente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">${(sale.total || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {sale.status === 'completed' ? 'Completada' :
                           sale.status === 'pending' ? 'Pendiente' : sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => selectSale(sale)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Devolver
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      {searchTerm ? 'No se encontraron ventas' : 'No hay ventas registradas'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showReturnModal && selectedSale && (
        <ReturnModal
          sale={selectedSale}
          userId={user?.uid || ''}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedSale(null);
            loadSales();
          }}
        />
      )}
    </div>
  );
}

function ReturnModal({ sale, userId, onClose }: { sale: Sale; userId: string; onClose: () => void }) {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);

  function toggleItem(itemId: string, maxQuantity: number) {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.set(itemId, maxQuantity);
    }
    setSelectedItems(newSelected);
  }

  function updateQuantity(itemId: string, quantity: number) {
    const newSelected = new Map(selectedItems);
    if (quantity > 0) {
      newSelected.set(itemId, quantity);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  }

  async function processReturn() {
    if (selectedItems.size === 0) {
      alert('Selecciona al menos un producto para devolver');
      return;
    }

    if (!returnReason.trim()) {
      alert('Ingresa el motivo de la devolución');
      return;
    }

    setProcessing(true);
    try {
      const batch = writeBatch(db);

      const returnData = {
        sale_id: sale.id,
        user_id: userId,
        reason: returnReason,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const returnRef = await addDoc(collection(db, 'returns'), returnData);

      let totalRefund = 0;

      for (const [itemId, quantity] of selectedItems.entries()) {
        const item: any = sale.items?.find((i: any) => i.id === itemId);
        if (!item) continue;

        const unitPrice = item.unit_price || item.price || 0;
        const refundAmount = unitPrice * quantity;
        totalRefund += refundAmount;

        const returnItemData = {
          return_id: returnRef.id,
          sale_item_id: itemId,
          variant_id: item.variant_id,
          quantity: quantity,
          price: unitPrice,
          subtotal: refundAmount,
          created_at: new Date().toISOString(),
        };

        await addDoc(collection(db, 'return_items'), returnItemData);

        const inventoryQuery = await getDocs(collection(db, 'inventory'));
        let inventoryUpdated = false;

        for (const invDoc of inventoryQuery.docs) {
          const invData: any = invDoc.data();
          if (invData.variant_id === item.variant_id) {
            batch.update(doc(db, 'inventory', invDoc.id), {
              quantity: (invData.quantity || 0) + quantity,
              updated_at: new Date().toISOString(),
            });
            inventoryUpdated = true;
            break;
          }
        }

        if (!inventoryUpdated) {
          batch.set(doc(collection(db, 'inventory')), {
            variant_id: item.variant_id,
            location: 'main',
            quantity: quantity,
            min_quantity: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      await batch.commit();

      alert(`Devolución procesada exitosamente. Reembolso: $${totalRefund.toFixed(2)}`);
      onClose();
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error al procesar la devolución');
    } finally {
      setProcessing(false);
    }
  }

  const totalRefund = Array.from(selectedItems.entries()).reduce((sum, [itemId, quantity]) => {
    const item: any = sale.items?.find((i: any) => i.id === itemId);
    const unitPrice = item?.unit_price || item?.price || 0;
    return sum + (unitPrice * quantity);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Procesar Devolución</h2>
              <p className="text-slate-600 text-sm mt-1">Venta #{sale.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Productos de la Venta</h3>
            <div className="space-y-3">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item: any) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id, item.quantity)}
                          className="mt-1 w-5 h-5 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">
                            {item.variant?.product?.name || 'Producto'}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {item.variant?.size?.name} | {item.variant?.color?.name}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            Precio: ${(item.price || 0).toFixed(2)} | Cantidad original: {item.quantity}
                          </p>
                        </div>
                      </div>
                      {selectedItems.has(item.id) && (
                        <div className="ml-4">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Cantidad a devolver</label>
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={selectedItems.get(item.id)}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-center"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-4">No hay productos en esta venta</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motivo de la Devolución *
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Describe el motivo de la devolución..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          {selectedItems.size > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span className="text-slate-700">Total a Reembolsar:</span>
                <span className="text-green-600">${totalRefund.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={processReturn}
            disabled={processing || selectedItems.size === 0}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {processing ? 'Procesando...' : 'Procesar Devolución'}
          </button>
        </div>
      </div>
    </div>
  );
}
