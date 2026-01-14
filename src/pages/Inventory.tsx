import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { ProductVariant, Product, Size, Color, Inventory as InventoryType } from '../types/database';
import { Search, Filter, ArrowUpDown, AlertTriangle, Package, RefreshCw, X } from 'lucide-react';

interface VariantWithDetails extends ProductVariant {
  product?: Product;
  size?: Size;
  color?: Color;
  inventory?: InventoryType;
}

interface ProductRow {
  productId: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  finish: string;
  basePrice: number;
  baseCost: number;
  variants: VariantWithDetails[];
}

interface StoreData {
  id: string;
  name: string;
  active: boolean;
}

type SortField = 'code' | 'name' | 'brand' | 'category' | 'basePrice' | 'totalStock';
type SortDirection = 'asc' | 'desc';

export default function Inventory() {
  const { user } = useAuth();
  const { profile, isAdmin } = useUserRole();
  const [variants, setVariants] = useState<VariantWithDetails[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantWithDetails | null>(null);
  const [newStock, setNewStock] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (profile && profile.storeId && !isAdmin) {
      setSelectedStore(profile.storeId);
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [selectedStore, profile]);

  async function loadData() {
    setLoading(true);
    try {
      let productsQuery;
      if (!isAdmin && profile?.storeId) {
        productsQuery = query(
          collection(db, 'products'),
          where('store_id', '==', profile.storeId)
        );
      } else if (!isAdmin) {
        productsQuery = query(
          collection(db, 'products'),
          where('store_id', '==', null)
        );
      } else {
        productsQuery = collection(db, 'products');
      }

      const [productsSnap, variantsSnap, sizesSnap, colorsSnap, inventorySnap, storesSnap] = await Promise.all([
        getDocs(productsQuery),
        getDocs(query(collection(db, 'product_variants'), where('active', '==', true))),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
        getDocs(collection(db, 'inventory')),
        getDocs(query(collection(db, 'stores'), where('active', '==', true))),
      ]);

      const productsMap = new Map<string, Product>();
      productsSnap.docs.forEach(doc => {
        const product = { id: doc.id, ...doc.data() } as Product;
        if (isAdmin || !profile?.storeId || product.store_id === profile.storeId || !product.store_id) {
          productsMap.set(doc.id, product);
        }
      });

      const sizesMap = new Map<string, Size>();
      sizesSnap.docs.forEach(doc => {
        sizesMap.set(doc.id, { id: doc.id, ...doc.data() } as Size);
      });

      const colorsMap = new Map<string, Color>();
      colorsSnap.docs.forEach(doc => {
        colorsMap.set(doc.id, { id: doc.id, ...doc.data() } as Color);
      });

      const inventoryByVariant = new Map<string, InventoryType[]>();
      inventorySnap.docs.forEach(doc => {
        const inv = { id: doc.id, ...doc.data() } as InventoryType;
        if (!inventoryByVariant.has(inv.variant_id)) {
          inventoryByVariant.set(inv.variant_id, []);
        }
        inventoryByVariant.get(inv.variant_id)!.push(inv);
      });

      const variantsData = variantsSnap.docs.map(doc => {
        const variant = { id: doc.id, ...doc.data() } as VariantWithDetails;
        variant.product = productsMap.get(variant.product_id);
        variant.size = sizesMap.get(variant.size_id);
        variant.color = colorsMap.get(variant.color_id);

        const inventories = inventoryByVariant.get(variant.id) || [];
        if (inventories.length > 0) {
          if (selectedStore === 'all') {
            const totalQty = inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
            const minStockSum = inventories.reduce((sum, inv) => sum + (inv.min_stock || 0), 0);
            variant.inventory = {
              ...inventories[0],
              quantity: totalQty,
              min_stock: minStockSum,
            };
          } else {
            const storeInventory = inventories.find(inv => inv.store_id === selectedStore);
            if (storeInventory) {
              variant.inventory = storeInventory;
            } else {
              variant.inventory = {
                quantity: 0,
                min_stock: 0,
                store_id: selectedStore,
              } as InventoryType;
            }
          }
        } else {
          variant.inventory = {
            quantity: 0,
            min_stock: 0,
            store_id: selectedStore === 'all' ? '' : selectedStore,
          } as InventoryType;
        }

        return variant;
      });

      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StoreData[];
      if (storesData.length === 0) {
        const mainStore = {
          name: 'Tienda Principal',
          address: '',
          active: true,
          created_at: new Date().toISOString(),
        };
        const mainStoreRef = await addDoc(collection(db, 'stores'), mainStore);
        storesData.push({ id: mainStoreRef.id, name: mainStore.name, active: true });
      }

      setStores(storesData);
      setVariants(variantsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const productRows = useMemo(() => {
    const rowsMap = new Map<string, ProductRow>();

    variants.forEach(variant => {
      if (!variant.product) return;

      const productId = variant.product.id;
      if (!rowsMap.has(productId)) {
        rowsMap.set(productId, {
          productId,
          code: variant.product.code,
          name: variant.product.name,
          brand: variant.product.brand,
          category: variant.product.category || '',
          finish: variant.product.finish,
          basePrice: variant.product.base_price,
          baseCost: variant.product.base_cost,
          variants: [],
        });
      }
      rowsMap.get(productId)!.variants.push(variant);
    });

    return Array.from(rowsMap.values());
  }, [variants]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = productRows;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.code.toLowerCase().includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.brand.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(row => row.category === categoryFilter);
    }

    if (brandFilter !== 'all') {
      filtered = filtered.filter(row => row.brand === brandFilter);
    }

    if (showLowStockOnly) {
      filtered = filtered.filter(row =>
        row.variants.some(v => {
          const stock = v.inventory?.quantity || 0;
          const minStock = v.inventory?.min_stock || 0;
          return minStock > 0 && stock <= minStock;
        })
      );
    }

    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'totalStock':
          aVal = a.variants.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0);
          bVal = b.variants.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0);
          break;
        case 'basePrice':
          aVal = a.basePrice;
          bVal = b.basePrice;
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [productRows, searchTerm, categoryFilter, brandFilter, showLowStockOnly, sortField, sortDirection]);

  const categories = useMemo(() => {
    const cats = new Set(productRows.map(r => r.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [productRows]);

  const brands = useMemo(() => {
    const brds = new Set(productRows.map(r => r.brand).filter(Boolean));
    return Array.from(brds).sort();
  }, [productRows]);

  const lowStockCount = useMemo(() => {
    return variants.filter(v => {
      const stock = v.inventory?.quantity || 0;
      const minStock = v.inventory?.min_stock || 0;
      return minStock > 0 && stock <= minStock;
    }).length;
  }, [variants]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function openStockModal(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    setNewStock((variant.inventory?.quantity || 0).toString());
    setAdjustmentReason('');
    setShowStockModal(true);
  }

  async function updateStock() {
    if (!selectedVariant || !user) return;

    const qty = parseInt(newStock);
    if (isNaN(qty) || qty < 0) {
      alert('Por favor ingrese una cantidad válida (mayor o igual a 0)');
      return;
    }

    setUpdating(true);
    try {
      const currentQty = selectedVariant.inventory?.quantity || 0;
      const inventoryId = selectedVariant.inventory?.id;
      const storeId = selectedVariant.inventory?.store_id || selectedStore;

      if (!inventoryId) {
        const newInventoryRef = await addDoc(collection(db, 'inventory'), {
          variant_id: selectedVariant.id,
          store_id: storeId === 'all' ? stores[0]?.id : storeId,
          quantity: qty,
          min_stock: 5,
          updated_at: new Date().toISOString(),
        });

        await addDoc(collection(db, 'inventory_movements'), {
          variant_id: selectedVariant.id,
          movement_type: 'adjustment_in',
          quantity: qty,
          quantity_before: 0,
          quantity_after: qty,
          reference_type: 'manual_adjustment',
          reason: adjustmentReason || 'Inventario inicial para esta tienda',
          created_by: user.uid,
          created_at: new Date().toISOString(),
        });
      } else {
        await updateDoc(doc(db, 'inventory', inventoryId), {
          quantity: qty,
          updated_at: new Date().toISOString(),
        });

        await addDoc(collection(db, 'inventory_movements'), {
          variant_id: selectedVariant.id,
          movement_type: qty > currentQty ? 'adjustment_in' : 'adjustment_out',
          quantity: Math.abs(qty - currentQty),
          quantity_before: currentQty,
          quantity_after: qty,
          reference_type: 'manual_adjustment',
          reason: adjustmentReason || null,
          created_by: user.uid,
          created_at: new Date().toISOString(),
        });
      }

      setShowStockModal(false);
      await loadData();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error al actualizar el stock');
    } finally {
      setUpdating(false);
    }
  }

  function getSizeGroups(variants: VariantWithDetails[]) {
    const groups = new Map<string, VariantWithDetails[]>();
    variants.forEach(v => {
      const colorKey = `${v.color?.name || 'Sin color'}`;
      if (!groups.has(colorKey)) {
        groups.set(colorKey, []);
      }
      groups.get(colorKey)!.push(v);
    });

    Array.from(groups.values()).forEach(group => {
      group.sort((a, b) => (a.size?.sort_order || 0) - (b.size?.sort_order || 0));
    });

    return groups;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-400 animate-pulse" />
          <p className="text-slate-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventario</h1>
          <p className="text-slate-600 mt-1">Gestión de stock por producto y talla</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Alerta de Stock Bajo</p>
              <p className="text-sm text-amber-700">
                {lowStockCount} {lowStockCount === 1 ? 'variante' : 'variantes'} con stock bajo o agotado
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            disabled={!isAdmin && profile?.storeId}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            {isAdmin && <option value="all">Todas las Tiendas</option>}
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">Todas las Marcas</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="lowStock"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="lowStock" className="text-sm font-medium text-slate-700 cursor-pointer">
            Mostrar solo productos con stock bajo
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort('code')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Código</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('brand')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Marca</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nombre</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Categoría</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Acabado
                </th>
                <th
                  onClick={() => handleSort('basePrice')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Precio</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tallas y Stock
                </th>
                <th
                  onClick={() => handleSort('totalStock')}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock Total</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No se encontraron productos</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map(row => {
                  const totalStock = row.variants.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0);
                  const hasLowStock = row.variants.some(v => {
                    const stock = v.inventory?.quantity || 0;
                    const minStock = v.inventory?.min_stock || 0;
                    return minStock > 0 && stock <= minStock;
                  });
                  const sizeGroups = getSizeGroups(row.variants);

                  return (
                    <tr key={row.productId} className={`hover:bg-slate-50 transition-colors ${hasLowStock ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {row.brand}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.category || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.finish}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        ${row.basePrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {Array.from(sizeGroups.entries()).map(([colorName, colorVariants]) => (
                            <div key={colorName} className="space-y-1">
                              <div className="text-xs font-medium text-slate-600">{colorName}</div>
                              <div className="flex flex-wrap gap-1">
                                {colorVariants.map(variant => {
                                  const stock = variant.inventory?.quantity || 0;
                                  const minStock = variant.inventory?.min_stock || 0;
                                  const isLowStock = minStock > 0 && stock <= minStock;
                                  const isOutOfStock = minStock > 0 && stock === 0;

                                  return (
                                    <button
                                      key={variant.id}
                                      onClick={() => openStockModal(variant)}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all hover:scale-105 ${
                                        isOutOfStock
                                          ? 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
                                          : isLowStock
                                          ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                                          : stock === 0
                                          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                                          : 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                                      }`}
                                      title={`${variant.size?.name} - Stock: ${stock} - Clic para ajustar`}
                                    >
                                      {variant.size?.name}
                                      <span className="ml-1.5 font-bold">({stock})</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          hasLowStock && totalStock === 0
                            ? 'bg-red-100 text-red-800'
                            : hasLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : totalStock === 0
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {totalStock}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showStockModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Ajustar Stock</h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Producto:</span>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedVariant.product?.brand} - {selectedVariant.product?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Color:</span>
                <span className="text-sm font-semibold text-slate-900">{selectedVariant.color?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Talla:</span>
                <span className="text-sm font-semibold text-slate-900">{selectedVariant.size?.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 mt-2">
                <span className="text-sm text-slate-600">Stock Actual:</span>
                <span className="text-lg font-bold text-slate-900">{selectedVariant.inventory?.quantity || 0}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nuevo Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-lg font-semibold"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Razón del Ajuste (Opcional)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={3}
                  placeholder="Ej: Reconteo físico, corrección de error, etc."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={updateStock}
                disabled={updating}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {updating ? 'Actualizando...' : 'Actualizar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
