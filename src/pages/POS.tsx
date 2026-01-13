import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProductVariant, Customer, CashSession, Promotion } from '../types/database';
import POSTerminalSettings from '../components/POSTerminalSettings';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  DollarSign,
  CreditCard,
  Smartphone,
  Tag,
  Settings,
  Wifi,
  Wallet,
} from 'lucide-react';

interface CartItem {
  variant: ProductVariant;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function POS() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPOSSettings, setShowPOSSettings] = useState(false);

  useEffect(() => {
    loadVariants();
    loadCustomers();
    loadPromotions();
    loadCurrentSession();
  }, [user]);

  async function loadCurrentSession() {
    if (!user) return;

    const q = query(
      collection(db, 'cash_sessions'),
      where('user_id', '==', user.uid),
      where('status', '==', 'open')
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setCurrentSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CashSession);
    }
  }

  async function loadVariants() {
    const startTime = performance.now();

    const [variantsSnapshot, productsSnapshot, sizesSnapshot, colorsSnapshot, inventorySnapshot] = await Promise.all([
      getDocs(query(collection(db, 'product_variants'), where('active', '==', true))),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'sizes')),
      getDocs(collection(db, 'colors')),
      getDocs(collection(db, 'inventory')),
    ]);

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

    const inventoryByVariant = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const inv = { id: doc.id, ...doc.data() };
      if (!inventoryByVariant.has(inv.variant_id)) {
        inventoryByVariant.set(inv.variant_id, []);
      }
      inventoryByVariant.get(inv.variant_id).push(inv);
    });

    const variantsData = variantsSnapshot.docs.map(doc => {
      const variant = { id: doc.id, ...doc.data() } as ProductVariant;

      variant.product = productsMap.get(variant.product_id);
      variant.size = sizesMap.get(variant.size_id);
      variant.color = colorsMap.get(variant.color_id);

      const inventories = inventoryByVariant.get(variant.id) || [];
      if (inventories.length > 0) {
        const totalQty = inventories.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        variant.inventory = {
          ...inventories[0],
          quantity: totalQty,
        };
      } else {
        variant.inventory = { quantity: 0 } as any;
      }

      return variant;
    });

    const endTime = performance.now();
    console.log(`✅ Loaded ${variantsData.length} variants for POS in ${(endTime - startTime).toFixed(0)}ms`);

    setVariants(variantsData);
  }

  async function loadCustomers() {
    const q = query(collection(db, 'customers'), where('active', '==', true));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
    setCustomers(data);
  }

  async function loadPromotions() {
    const q = query(collection(db, 'promotions'), where('active', '==', true));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Promotion[];
    setPromotions(data);
  }

  function addToCart(variant: ProductVariant) {
    const stockQuantity = variant.inventory?.quantity || 0;
    const currentInCart = cart.find(item => item.variant.id === variant.id)?.quantity || 0;

    if (currentInCart >= stockQuantity) {
      alert('Stock insuficiente');
      return;
    }

    const existingItem = cart.find(item => item.variant.id === variant.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.variant.id === variant.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price,
            }
          : item
      ));
    } else {
      setCart([...cart, {
        variant,
        quantity: 1,
        price: variant.price,
        subtotal: variant.price,
      }]);
    }
  }

  function updateCartItemQuantity(variantId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    const variant = variants.find(v => v.id === variantId);
    const stockQuantity = variant?.inventory?.quantity || 0;

    if (newQuantity > stockQuantity) {
      alert('Stock insuficiente');
      return;
    }

    setCart(cart.map(item =>
      item.variant.id === variantId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price,
          }
        : item
    ));
  }

  function removeFromCart(variantId: string) {
    setCart(cart.filter(item => item.variant.id !== variantId));
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomer(null);
    setAppliedPromotion(null);
    setPaymentMethod('cash');
    setPaymentAmount('');
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  let discount = 0;

  if (appliedPromotion) {
    if (appliedPromotion.type === 'percentage') {
      discount = subtotal * (appliedPromotion.value / 100);
    } else if (appliedPromotion.type === 'fixed_amount') {
      discount = appliedPromotion.value;
    }
  }

  const total = Math.max(0, subtotal - discount);

  async function processSale() {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        alert('Selecciona un cliente para usar crédito');
        return;
      }
      if ((selectedCustomer.store_credit || 0) < total) {
        alert('Crédito insuficiente');
        return;
      }
    } else {
      if (!paymentAmount || parseFloat(paymentAmount) < total) {
        alert('Por favor ingrese un monto de pago válido');
        return;
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const saleNumber = `SALE-${Date.now()}`;

      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, {
        sale_number: saleNumber,
        customer_id: selectedCustomer?.id || null,
        user_id: user?.uid,
        session_id: currentSession?.id || null,
        subtotal,
        discount,
        total,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      for (const item of cart) {
        const saleItemRef = doc(collection(db, 'sale_items'));
        batch.set(saleItemRef, {
          sale_id: saleRef.id,
          variant_id: item.variant.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.subtotal,
          created_at: new Date().toISOString(),
        });

        const invDoc = await getDoc(doc(db, 'inventory', item.variant.inventory!.id));
        if (invDoc.exists()) {
          const currentQty = invDoc.data().quantity;
          const newQty = currentQty - item.quantity;

          batch.update(doc(db, 'inventory', item.variant.inventory!.id), {
            quantity: newQty,
            updated_at: new Date().toISOString(),
          });

          const movementRef = doc(collection(db, 'inventory_movements'));
          batch.set(movementRef, {
            variant_id: item.variant.id,
            movement_type: 'sale',
            quantity: item.quantity,
            quantity_before: currentQty,
            quantity_after: newQty,
            reference_type: 'sale',
            reference_id: saleRef.id,
            created_by: user?.uid,
            created_at: new Date().toISOString(),
          });
        }
      }

      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        sale_id: saleRef.id,
        method: paymentMethod,
        amount: total,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      if (paymentMethod === 'credit' && selectedCustomer) {
        const newCredit = (selectedCustomer.store_credit || 0) - total;
        batch.update(doc(db, 'customers', selectedCustomer.id), {
          store_credit: newCredit,
          updated_at: new Date().toISOString(),
        });
      }

      await batch.commit();

      let confirmMessage = `Venta completada!\nVenta #${saleNumber}\nTotal: $${total.toFixed(2)}`;

      if (paymentMethod === 'credit') {
        const newCredit = (selectedCustomer!.store_credit || 0) - total;
        confirmMessage += `\nPagado con crédito\nCrédito restante: $${newCredit.toFixed(2)}`;
      } else {
        const change = parseFloat(paymentAmount) - total;
        confirmMessage += `\nPagado: $${parseFloat(paymentAmount).toFixed(2)}\nCambio: $${change.toFixed(2)}`;
      }

      alert(confirmMessage);

      setShowPaymentModal(false);
      clearCart();
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  }

  const filteredVariants = variants.filter(v =>
    v.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      <button
        onClick={() => setShowPOSSettings(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-40"
        title="Configurar Terminal POS"
      >
        <Settings className="w-6 h-6" />
      </button>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos por nombre, SKU o código de barras..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>

        {searchTerm.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-h-96 overflow-y-auto">
            {filteredVariants.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {filteredVariants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => {
                      addToCart(variant);
                      setSearchTerm('');
                    }}
                    disabled={(variant.inventory?.quantity || 0) === 0}
                    className="w-full p-4 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1">
                        {variant.product?.name}
                      </h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-600">
                        <span>SKU: {variant.sku}</span>
                        <span>•</span>
                        <span>Talla: {variant.size?.name}</span>
                        <span>•</span>
                        <span>Color: {variant.color?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-bold text-slate-900">${variant.price.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        (variant.inventory?.quantity || 0) > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Stock: {variant.inventory?.quantity || 0}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No se encontraron productos
              </div>
            )}
          </div>
        )}

        {searchTerm.length === 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Busca un producto para comenzar
            </h3>
            <p className="text-slate-500 text-sm">
              Escribe el nombre, SKU o código de barras del producto
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Venta Actual</h2>

        {selectedCustomer ? (
          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomerModal(true)}
            className="w-full mb-4 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors"
          >
            + Agregar Cliente (Opcional)
          </button>
        )}

        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {cart.map((item) => (
            <div key={item.variant.id} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 text-sm">
                    {item.variant.product?.name}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {item.variant.size?.name} | {item.variant.color?.name}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.variant.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateCartItemQuantity(item.variant.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded hover:bg-slate-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateCartItemQuantity(item.variant.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded hover:bg-slate-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-bold text-slate-900">${item.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <>
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Descuento:</span>
                  <span className="font-medium text-red-600">-${discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Completar Venta
              </button>
              <button
                onClick={clearCart}
                className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors"
              >
                Limpiar Carrito
              </button>
            </div>
          </>
        )}
      </div>

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Seleccionar Cliente</h3>

            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                  className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-900">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-slate-600">{customer.email || customer.phone}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomerModal(false)}
              className="w-full px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Completar Pago</h3>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between text-2xl font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <DollarSign className="w-6 h-6" />
                    <span className="text-xs font-medium">Efectivo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-xs font-medium">Tarjeta</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'transfer'
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-xs font-medium">Transferencia</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('credit')}
                    disabled={!selectedCustomer || (selectedCustomer.store_credit || 0) < total}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'credit'
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={!selectedCustomer ? 'Selecciona un cliente primero' : (selectedCustomer.store_credit || 0) < total ? 'Crédito insuficiente' : ''}
                  >
                    <Wallet className="w-6 h-6" />
                    <span className="text-xs font-medium">Crédito</span>
                    {selectedCustomer && (
                      <span className="text-xs text-green-600 font-bold">
                        ${(selectedCustomer.store_credit || 0).toFixed(2)}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {paymentMethod !== 'credit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Monto Recibido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {paymentAmount && parseFloat(paymentAmount) >= total && (
                    <p className="mt-2 text-sm text-green-600">
                      Cambio: ${(parseFloat(paymentAmount) - total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === 'credit' && selectedCustomer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium mb-2">Pago con Crédito</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Crédito actual:</span>
                      <span className="font-bold text-green-900">${(selectedCustomer.store_credit || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Total a pagar:</span>
                      <span className="font-bold text-green-900">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                      <span className="text-green-700">Crédito restante:</span>
                      <span className="font-bold text-green-900">${((selectedCustomer.store_credit || 0) - total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={processSale}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Completar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPOSSettings && (
        <POSTerminalSettings onClose={() => setShowPOSSettings(false)} />
      )}
    </div>
  );
}
