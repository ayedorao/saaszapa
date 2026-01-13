import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProductVariant, InventoryMovement, Product, Size, Color, Inventory } from '../types/database';
import { Search, Plus, Minus, AlertTriangle, Package, History, Printer, Store, RefreshCw } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

interface VariantWithDetails extends ProductVariant {
  product?: Product;
  size?: Size;
  color?: Color;
  inventory?: Inventory;
}

interface Store {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [variants, setVariants] = useState<VariantWithDetails[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantWithDetails | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInventory();
    loadStores();
  }, [selectedStore]);

  async function loadStores() {
    try {
      const storesQuery = query(collection(db, 'stores'), where('active', '==', true));
      const storesSnapshot = await getDocs(storesQuery);
      const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];

      if (storesData.length === 0) {
        const mainStore = {
          name: 'Tienda Principal',
          address: '',
          active: true,
          created_at: new Date().toISOString(),
        };
        const mainStoreRef = await addDoc(collection(db, 'stores'), mainStore);
        storesData.push({ id: mainStoreRef.id, ...mainStore });
      }

      setStores(storesData);
      console.log(`Loaded ${storesData.length} stores`);
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  }

  async function loadInventory() {
    setDataLoading(true);
    try {
      const startTime = performance.now();

      const [variantsSnapshot, productsSnapshot, sizesSnapshot, colorsSnapshot, inventorySnapshot] = await Promise.all([
        getDocs(query(collection(db, 'product_variants'), where('active', '==', true))),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
        getDocs(collection(db, 'inventory')),
      ]);

      const productsMap = new Map<string, Product>();
      productsSnapshot.docs.forEach(doc => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
      });

      const sizesMap = new Map<string, Size>();
      sizesSnapshot.docs.forEach(doc => {
        sizesMap.set(doc.id, { id: doc.id, ...doc.data() } as Size);
      });

      const colorsMap = new Map<string, Color>();
      colorsSnapshot.docs.forEach(doc => {
        colorsMap.set(doc.id, { id: doc.id, ...doc.data() } as Color);
      });

      const inventoryByVariant = new Map<string, Inventory[]>();
      inventorySnapshot.docs.forEach(doc => {
        const inv = { id: doc.id, ...doc.data() } as Inventory;
        if (!inventoryByVariant.has(inv.variant_id)) {
          inventoryByVariant.set(inv.variant_id, []);
        }
        inventoryByVariant.get(inv.variant_id)!.push(inv);
      });

      const variantsData = variantsSnapshot.docs.map(doc => {
        const variant = { id: doc.id, ...doc.data() } as VariantWithDetails;

        variant.product = productsMap.get(variant.product_id);
        variant.size = sizesMap.get(variant.size_id);
        variant.color = colorsMap.get(variant.color_id);

        const inventories = inventoryByVariant.get(variant.id) || [];
        if (inventories.length > 0) {
          if (selectedStore === 'all') {
            const totalQty = inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
            variant.inventory = {
              ...inventories[0],
              quantity: totalQty,
            };
          } else {
            const storeInventory = inventories.find(inv => inv.store_id === selectedStore);
            variant.inventory = storeInventory || { quantity: 0, min_stock: 5 } as Inventory;
          }
        } else {
          variant.inventory = { quantity: 0, min_stock: 5 } as Inventory;
        }

        return variant;
      });

      const endTime = performance.now();
      console.log(`✅ Loaded ${variantsData.length} variants in ${(endTime - startTime).toFixed(0)}ms`);

      setVariants(variantsData);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleAdjustment(type: 'add' | 'remove') {
    if (!user || !selectedVariant || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor ingrese una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      const currentQty = selectedVariant.inventory?.quantity || 0;
      const newQty = type === 'add' ? currentQty + qty : currentQty - qty;

      if (newQty < 0) {
        alert('No se puede reducir el stock por debajo de 0');
        setLoading(false);
        return;
      }

      const inventoryId = selectedVariant.inventory?.id;
      if (!inventoryId) {
        alert('Registro de inventario no encontrado');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'inventory', inventoryId), {
        quantity: newQty,
        updated_at: new Date().toISOString(),
      });

      await addDoc(collection(db, 'inventory_movements'), {
        variant_id: selectedVariant.id,
        movement_type: type === 'add' ? 'adjustment_in' : 'adjustment_out',
        quantity: qty,
        quantity_before: currentQty,
        quantity_after: newQty,
        reference_type: 'manual_adjustment',
        reason: adjustmentReason || null,
        created_by: user.uid,
        created_at: new Date().toISOString(),
      });

      alert(`Stock ${type === 'add' ? 'agregado' : 'removido'} exitosamente`);
      setShowAdjustModal(false);
      setAdjustmentQty('');
      setAdjustmentReason('');
      loadInventory();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Error al ajustar inventario');
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements(variantId: string) {
    const q = query(
      collection(db, 'inventory_movements'),
      where('variant_id', '==', variantId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryMovement[];
    setMovements(data);
  }

  function openAdjustModal(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    setShowAdjustModal(true);
  }

  async function openMovementsModal(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    await loadMovements(variant.id);
    setShowMovementsModal(true);
  }

  function openLabelModal(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    setShowLabelModal(true);
  }

  function toggleProductExpansion(productId: string) {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  }

  function printLabel() {
    const printContent = document.getElementById('printable-label');
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Etiqueta</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      @page { size: 4in 2in; margin: 0; }
      body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
      .label { width: 4in; height: 2in; display: flex; flex-direction: column; justify-content: space-between; }
      .label-header { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
      .label-row { display: flex; justify-content: space-between; font-size: 8px; margin: 2px 0; }
      .label-barcode { text-align: center; margin: 6px 0; }
      .label-sku { text-align: center; font-size: 7px; font-weight: bold; margin-top: 4px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  const variantsByProduct = new Map<string, VariantWithDetails[]>();
  variants.forEach(variant => {
    if (!variant.product_id) return;
    if (!variantsByProduct.has(variant.product_id)) {
      variantsByProduct.set(variant.product_id, []);
    }
    variantsByProduct.get(variant.product_id)!.push(variant);
  });

  const productsList = Array.from(variantsByProduct.entries()).map(([productId, productVariants]) => {
    const product = productVariants[0]?.product;
    return { product, variants: productVariants };
  });

  const filteredProducts = productsList.filter(item => {
    const matchesSearch = item.variants.some(v =>
      v.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesLowStock = !showLowStock || item.variants.some(v =>
      v.inventory && v.inventory.quantity <= (v.inventory.min_stock || 0)
    );

    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = variants.filter(v =>
    v.inventory && v.inventory.quantity <= (v.inventory.min_stock || 0)
  ).length;

  if (dataLoading) {
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Gestión de Inventario</h1>
        <p className="text-slate-600">Monitorear y ajustar niveles de stock</p>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Alerta de Stock Bajo</p>
              <p className="text-sm text-amber-700">
                {lowStockCount} {lowStockCount === 1 ? 'artículo' : 'artículos'} con stock bajo
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por SKU o nombre de producto..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="relative">
            <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent appearance-none"
            >
              <option value="all">Todas las Tiendas</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-slate-700">Solo stock bajo</span>
          </label>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay productos en inventario</h3>
          <p className="text-slate-600">Los productos aparecerán aquí una vez agregados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(({ product, variants: productVariants }) => {
            if (!product) return null;

            const isExpanded = expandedProducts.has(product.id);
            const variantsByColor = new Map<string, VariantWithDetails[]>();
            productVariants.forEach(variant => {
              const colorId = variant.color_id;
              if (!variantsByColor.has(colorId)) {
                variantsByColor.set(colorId, []);
              }
              variantsByColor.get(colorId)!.push(variant);
            });

            const allColors = Array.from(variantsByColor.keys())
              .map(colorId => {
                const variant = productVariants.find(v => v.color_id === colorId);
                return variant?.color;
              })
              .filter(Boolean);

            const totalStock = productVariants.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0);
            const hasLowStock = productVariants.some(v =>
              v.inventory && v.inventory.quantity <= (v.inventory.min_stock || 0)
            );

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  hasLowStock ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    hasLowStock ? 'bg-amber-50 hover:bg-amber-100' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                  onClick={() => toggleProductExpansion(product.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-slate-900">{product.brand} - {product.name}</h3>
                        {hasLowStock && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Stock Bajo
                          </span>
                        )}
                        <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {product.finish} | Código: {product.code}
                      </p>
                    </div>

                    {!isExpanded && (
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-xs text-slate-600">Stock Total</p>
                          <p className="text-xl font-bold text-slate-900">{totalStock}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {allColors.slice(0, 3).map((color, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700"
                            >
                              {color?.name}
                            </span>
                          ))}
                          {allColors.length > 3 && (
                            <span className="text-xs text-slate-500">+{allColors.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-slate-200">
                    <div className="space-y-4">
                    {Array.from(variantsByColor.entries()).map(([colorId, colorVariants]) => {
                      const color = colorVariants[0]?.color;
                      const sortedVariants = colorVariants.sort((a, b) => {
                        const sizeA = a.size?.sort_order || 0;
                        const sizeB = b.size?.sort_order || 0;
                        return sizeA - sizeB;
                      });

                      return (
                        <div key={colorId} className="border border-slate-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Color: {color?.name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sortedVariants.map(variant => {
                              const stock = variant.inventory?.quantity || 0;
                              const minStock = variant.inventory?.min_stock || 0;
                              const isLowStock = stock <= minStock;

                              return (
                                <div
                                  key={variant.id}
                                  className={`flex flex-col p-4 rounded-lg border-2 transition-all ${
                                    isLowStock
                                      ? 'bg-amber-50 border-amber-300'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-slate-700">
                                      Talla {variant.size?.name}
                                    </span>
                                    {isLowStock && (
                                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-500">Stock:</span>
                                    <span className={`text-lg font-bold ${
                                      isLowStock ? 'text-amber-600' : 'text-green-600'
                                    }`}>
                                      {stock}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-500">Mín:</span>
                                    <span className="text-sm font-medium text-slate-600">{minStock}</span>
                                  </div>

                                  <div className="text-xs font-mono text-slate-400 mb-3 truncate" title={variant.sku}>
                                    {variant.sku}
                                  </div>

                                  <div className="flex flex-col space-y-2 mt-auto">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAdjustModal(variant);
                                      }}
                                      className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
                                    >
                                      Ajustar Stock
                                    </button>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openLabelModal(variant);
                                        }}
                                        className="flex-1 p-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                        title="Imprimir etiqueta"
                                      >
                                        <Printer className="w-3 h-3 mx-auto text-slate-600" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openMovementsModal(variant);
                                        }}
                                        className="flex-1 p-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                        title="Ver historial"
                                      >
                                        <History className="w-3 h-3 mx-auto text-slate-600" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdjustModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Ajustar Stock</h3>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 mb-1">{selectedVariant.product?.name}</p>
              <p className="text-sm font-medium text-slate-900 mb-2">{selectedVariant.sku}</p>
              <p className="text-lg font-bold text-slate-900">
                Stock Actual: {selectedVariant.inventory?.quantity || 0}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Ingrese cantidad"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Razón (Opcional)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={3}
                  placeholder="ej. Mercancía dañada, Ajuste de inventario"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleAdjustment('add')}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span>Agregar</span>
              </button>
              <button
                onClick={() => handleAdjustment('remove')}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Minus className="w-5 h-5" />
                <span>Quitar</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowAdjustModal(false);
                setAdjustmentQty('');
                setAdjustmentReason('');
              }}
              className="w-full mt-3 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showMovementsModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Historial de Movimientos</h3>
                <p className="text-sm text-slate-600">{selectedVariant.sku}</p>
              </div>
              <button
                onClick={() => {
                  setShowMovementsModal(false);
                  setMovements([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Antes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Después</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Razón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          movement.movement_type.includes('in') || movement.movement_type === 'return'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {movement.movement_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {movement.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {movement.quantity_before}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {movement.quantity_after}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {movement.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showLabelModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Etiqueta del Producto</h3>
              <button
                onClick={() => setShowLabelModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div id="printable-label" className="border-2 border-slate-300 rounded-lg p-6 bg-white mb-4">
              <div className="label">
                <div className="label-header text-center mb-2">
                  <div className="text-lg font-bold">{selectedVariant.product?.brand}</div>
                  <div className="text-sm">{selectedVariant.product?.name}</div>
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <div className="label-row flex justify-between">
                    <span className="text-slate-600">Talla:</span>
                    <span className="font-semibold">{selectedVariant.size?.name}</span>
                  </div>
                  <div className="label-row flex justify-between">
                    <span className="text-slate-600">Color:</span>
                    <span className="font-semibold">{selectedVariant.color?.name}</span>
                  </div>
                  <div className="label-row flex justify-between">
                    <span className="text-slate-600">Material:</span>
                    <span className="font-semibold">{selectedVariant.product?.finish}</span>
                  </div>
                </div>

                <div className="label-barcode border-t border-b border-slate-200 py-3 mb-2">
                  <div className="flex justify-center">
                    {selectedVariant.barcode && selectedVariant.barcode.length > 0 ? (
                      <Barcode
                        value={selectedVariant.barcode}
                        format="CODE128"
                        width={1.5}
                        height={60}
                        displayValue={false}
                      />
                    ) : (
                      <Barcode
                        value={selectedVariant.sku}
                        format="CODE128"
                        width={1.5}
                        height={60}
                        displayValue={false}
                      />
                    )}
                  </div>
                </div>

                <div className="label-sku text-center">
                  <div className="text-xs font-mono">{selectedVariant.sku}</div>
                  <div className="text-xs text-slate-500 mt-1">${selectedVariant.price.toFixed(2)}</div>
                </div>

                <div className="flex justify-center mt-3">
                  <QRCodeSVG value={selectedVariant.sku} size={60} />
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={printLabel}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
