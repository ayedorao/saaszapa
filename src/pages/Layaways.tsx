import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Layaway, LayawayPayment, Customer, ProductVariant, Store, Product, Size, Color } from '../types/database';
import { Plus, Search, Package, DollarSign, Calendar, User, CheckCircle, XCircle, Clock, Truck, Eye, FileText } from 'lucide-react';

interface LayawayWithDetails extends Layaway {
  customer?: Customer;
  variant?: ProductVariant & {
    product?: Product;
    size?: Size;
    color?: Color;
  };
  payments?: LayawayPayment[];
}

export default function Layaways() {
  const { user } = useAuth();
  const [layaways, setLayaways] = useState<LayawayWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState<LayawayWithDetails | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<LayawayPayment | null>(null);
  const [loading, setLoading] = useState(false);

  const [newLayawayForm, setNewLayawayForm] = useState({
    customer_id: '',
    variant_id: '',
    store_id: '',
    initial_payment: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'card' | 'transfer' | 'store_credit',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      await Promise.all([
        loadLayaways(),
        loadCustomers(),
        loadVariants(),
        loadStores(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLayaways() {
    try {
      const [layawaysSnap, paymentsSnap, customersSnap, variantsSnap, productsSnap, sizesSnap, colorsSnap] = await Promise.all([
        getDocs(query(collection(db, 'layaways'), orderBy('created_at', 'desc'))),
        getDocs(collection(db, 'layaway_payments')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
      ]);

      const layawaysData = layawaysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Layaway[];
      const paymentsData = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LayawayPayment[];
      const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
      const variantsData = variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
      const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      const sizesData = sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Size[];
      const colorsData = colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Color[];

      const customersMap = new Map(customersData.map(c => [c.id, c]));
      const variantsMap = new Map(variantsData.map(v => [v.id, v]));
      const productsMap = new Map(productsData.map(p => [p.id, p]));
      const sizesMap = new Map(sizesData.map(s => [s.id, s]));
      const colorsMap = new Map(colorsData.map(c => [c.id, c]));
      const paymentsByLayaway = new Map<string, LayawayPayment[]>();

      paymentsData.forEach(payment => {
        if (!paymentsByLayaway.has(payment.layaway_id)) {
          paymentsByLayaway.set(payment.layaway_id, []);
        }
        paymentsByLayaway.get(payment.layaway_id)!.push(payment);
      });

      const enrichedLayaways = layawaysData.map(layaway => {
        const customer = customersMap.get(layaway.customer_id);
        const variant = variantsMap.get(layaway.variant_id);
        const payments = paymentsByLayaway.get(layaway.id) || [];

        let enrichedVariant = variant;
        if (variant) {
          const product = productsMap.get(variant.product_id);
          const size = sizesMap.get(variant.size_id);
          const color = colorsMap.get(variant.color_id);
          enrichedVariant = { ...variant, product, size, color };
        }

        return {
          ...layaway,
          customer,
          variant: enrichedVariant,
          payments,
        };
      });

      setLayaways(enrichedLayaways);
    } catch (error) {
      console.error('Error loading layaways:', error);
      throw error;
    }
  }

  async function loadCustomers() {
    try {
      const customersSnap = await getDocs(query(collection(db, 'customers'), where('active', '==', true)));
      const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
  }

  async function loadVariants() {
    try {
      const [variantsSnap, productsSnap, sizesSnap, colorsSnap, inventorySnap] = await Promise.all([
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
        getDocs(collection(db, 'inventory')),
      ]);

      const variantsData = variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
      const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      const sizesData = sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Size[];
      const colorsData = colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Color[];
      const inventoryData = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const productsMap = new Map(productsData.map(p => [p.id, p]));
      const sizesMap = new Map(sizesData.map(s => [s.id, s]));
      const colorsMap = new Map(colorsData.map(c => [c.id, c]));

      const inventoryByVariant = new Map();
      inventoryData.forEach((inv: any) => {
        if (!inventoryByVariant.has(inv.variant_id)) {
          inventoryByVariant.set(inv.variant_id, 0);
        }
        inventoryByVariant.set(inv.variant_id, inventoryByVariant.get(inv.variant_id) + (inv.quantity || 0));
      });

      const enrichedVariants = variantsData
        .filter(v => {
          const stock = inventoryByVariant.get(v.id) || 0;
          return stock > 0;
        })
        .map(variant => ({
          ...variant,
          product: productsMap.get(variant.product_id),
          size: sizesMap.get(variant.size_id),
          color: colorsMap.get(variant.color_id),
        }));

      setVariants(enrichedVariants);
    } catch (error) {
      console.error('Error loading variants:', error);
      throw error;
    }
  }

  async function loadStores() {
    try {
      const storesSnap = await getDocs(query(collection(db, 'stores'), where('active', '==', true)));
      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
      setStores(storesData);
      if (storesData.length > 0 && !newLayawayForm.store_id) {
        setNewLayawayForm(prev => ({ ...prev, store_id: storesData[0].id }));
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      throw error;
    }
  }

  const filteredLayaways = useMemo(() => {
    return layaways.filter(layaway => {
      const matchesSearch =
        layaway.layaway_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        layaway.customer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        layaway.customer?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        layaway.variant?.product?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || layaway.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [layaways, searchTerm, statusFilter]);

  async function generateLayawayNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const prefix = `AP${year}${month}${day}`;

    const existingLayaways = await getDocs(
      query(collection(db, 'layaways'), where('layaway_number', '>=', prefix), where('layaway_number', '<', prefix + '\uf8ff'))
    );

    const sequence = existingLayaways.size + 1;
    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  async function handleCreateLayaway(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!newLayawayForm.customer_id || !newLayawayForm.variant_id || !newLayawayForm.store_id) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const selectedVariant = variants.find(v => v.id === newLayawayForm.variant_id);
    if (!selectedVariant) {
      alert('Variante no encontrada');
      return;
    }

    const initialPayment = parseFloat(newLayawayForm.initial_payment) || 0;
    const totalPrice = selectedVariant.price;

    if (initialPayment < 0) {
      alert('El pago inicial no puede ser negativo');
      return;
    }

    if (initialPayment > totalPrice) {
      alert('El pago inicial no puede ser mayor al precio total');
      return;
    }

    setLoading(true);
    try {
      const layawayNumber = await generateLayawayNumber();
      const balance = totalPrice - initialPayment;

      const layawayData: Omit<Layaway, 'id'> = {
        layaway_number: layawayNumber,
        customer_id: newLayawayForm.customer_id,
        variant_id: newLayawayForm.variant_id,
        store_id: newLayawayForm.store_id,
        status: balance <= 0 ? 'paid' : 'active',
        total_price: totalPrice,
        amount_paid: initialPayment,
        balance: balance,
        initial_payment: initialPayment,
        notes: newLayawayForm.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        paid_at: balance <= 0 ? new Date().toISOString() : undefined,
        created_by: user.uid,
      };

      const layawayRef = await addDoc(collection(db, 'layaways'), layawayData);

      if (initialPayment > 0) {
        const paymentData = {
          layaway_id: layawayRef.id,
          amount: initialPayment,
          payment_method: 'cash',
          notes: 'Pago inicial',
          created_at: new Date().toISOString(),
          created_by: user.uid,
        };
        await addDoc(collection(db, 'layaway_payments'), paymentData);
      }

      alert(`Apartado ${layawayNumber} creado exitosamente`);
      setShowNewModal(false);
      resetNewLayawayForm();
      await loadAllData();
    } catch (error) {
      console.error('Error creating layaway:', error);
      alert('Error al crear el apartado');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedLayaway) return;

    const paymentAmount = parseFloat(paymentForm.amount);
    if (paymentAmount <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }

    if (paymentAmount > selectedLayaway.balance) {
      alert(`El monto no puede exceder el saldo pendiente de $${selectedLayaway.balance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const newBalance = selectedLayaway.balance - paymentAmount;
      const newAmountPaid = selectedLayaway.amount_paid + paymentAmount;
      const isPaid = newBalance <= 0;

      const paymentData = {
        layaway_id: selectedLayaway.id,
        amount: paymentAmount,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
        created_at: new Date().toISOString(),
        created_by: user.uid,
      };

      const paymentRef = await addDoc(collection(db, 'layaway_payments'), paymentData);

      await updateDoc(doc(db, 'layaways', selectedLayaway.id), {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: isPaid ? 'paid' : 'active',
        paid_at: isPaid ? new Date().toISOString() : selectedLayaway.paid_at,
        updated_at: new Date().toISOString(),
      });

      const newPayment = {
        id: paymentRef.id,
        ...paymentData,
      };
      setSelectedPayment(newPayment);

      alert('Abono registrado exitosamente');
      setShowPaymentModal(false);
      resetPaymentForm();
      await loadAllData();
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error al registrar el abono');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsDelivered(layaway: LayawayWithDetails) {
    if (layaway.status !== 'paid') {
      alert('El apartado debe estar completamente pagado antes de ser entregado');
      return;
    }

    if (!confirm('¿Confirmar entrega del producto al cliente?')) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'layaways', layaway.id), {
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      alert('Apartado marcado como entregado');
      await loadAllData();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Error al marcar como entregado');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelLayaway(layaway: LayawayWithDetails) {
    if (layaway.status === 'delivered') {
      alert('No se puede cancelar un apartado ya entregado');
      return;
    }

    const reason = prompt('Ingresa el motivo de la cancelación:');
    if (!reason) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'layaways', layaway.id), {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      });

      alert('Apartado cancelado');
      await loadAllData();
    } catch (error) {
      console.error('Error cancelling layaway:', error);
      alert('Error al cancelar el apartado');
    } finally {
      setLoading(false);
    }
  }

  function resetNewLayawayForm() {
    setNewLayawayForm({
      customer_id: '',
      variant_id: '',
      store_id: stores.length > 0 ? stores[0].id : '',
      initial_payment: '',
      notes: '',
    });
  }

  function resetPaymentForm() {
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
  }

  function openPaymentModal(layaway: LayawayWithDetails) {
    if (layaway.status !== 'active') {
      alert('Solo se pueden agregar abonos a apartados activos');
      return;
    }
    setSelectedLayaway(layaway);
    setShowPaymentModal(true);
  }

  function printReceipt() {
    window.print();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">En Proceso</span>;
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Pagado</span>;
      case 'delivered':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Entregado</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Cancelado</span>;
      default:
        return null;
    }
  }

  function getPaymentMethodLabel(method: string) {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'store_credit': return 'Crédito de Tienda';
      default: return method;
    }
  }

  const stats = useMemo(() => {
    const active = layaways.filter(l => l.status === 'active').length;
    const paid = layaways.filter(l => l.status === 'paid').length;
    const delivered = layaways.filter(l => l.status === 'delivered').length;
    const totalBalance = layaways
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + l.balance, 0);

    return { active, paid, delivered, totalBalance };
  }, [layaways]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Apartados</h1>
          <p className="text-slate-600 mt-1">Gestión de apartados con pagos parciales</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Apartado</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          <p className="text-sm text-slate-600">Apartados Activos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.paid}</p>
          <p className="text-sm text-slate-600">Pagados</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Truck className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.delivered}</p>
          <p className="text-sm text-slate-600">Entregados</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">${stats.totalBalance.toFixed(2)}</p>
          <p className="text-sm text-slate-600">Saldo Pendiente</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, cliente o producto..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">En Proceso</option>
              <option value="paid">Pagado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pagado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLayaways.map(layaway => (
                <tr key={layaway.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold">{layaway.layaway_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {layaway.customer?.first_name} {layaway.customer?.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{layaway.customer?.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {layaway.variant?.product?.brand} {layaway.variant?.product?.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        Talla: {layaway.variant?.size?.name} | Color: {layaway.variant?.color?.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">${layaway.total_price.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600 font-semibold">${layaway.amount_paid.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${layaway.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ${layaway.balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(layaway.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {new Date(layaway.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {layaway.status === 'active' && (
                        <button
                          onClick={() => openPaymentModal(layaway)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Agregar Abono"
                        >
                          <DollarSign className="w-5 h-5" />
                        </button>
                      )}
                      {layaway.status === 'paid' && (
                        <button
                          onClick={() => handleMarkAsDelivered(layaway)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como Entregado"
                        >
                          <Truck className="w-5 h-5" />
                        </button>
                      )}
                      {(layaway.status === 'active' || layaway.status === 'paid') && (
                        <button
                          onClick={() => handleCancelLayaway(layaway)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancelar Apartado"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLayaway(layaway);
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLayaways.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay apartados</h3>
            <p className="text-slate-600">Comienza creando un nuevo apartado</p>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Nuevo Apartado</h2>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  resetNewLayawayForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateLayaway} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cliente *</label>
                <select
                  required
                  value={newLayawayForm.customer_id}
                  onChange={(e) => setNewLayawayForm({ ...newLayawayForm, customer_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Producto *</label>
                <select
                  required
                  value={newLayawayForm.variant_id}
                  onChange={(e) => setNewLayawayForm({ ...newLayawayForm, variant_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Seleccionar producto...</option>
                  {variants.map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.product?.brand} {variant.product?.name} - Talla: {variant.size?.name} - Color: {variant.color?.name} - ${variant.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tienda *</label>
                <select
                  required
                  value={newLayawayForm.store_id}
                  onChange={(e) => setNewLayawayForm({ ...newLayawayForm, store_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Seleccionar tienda...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pago Inicial (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newLayawayForm.initial_payment}
                  onChange={(e) => setNewLayawayForm({ ...newLayawayForm, initial_payment: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {newLayawayForm.variant_id && variants.find(v => v.id === newLayawayForm.variant_id) && (
                    <>Precio total: ${variants.find(v => v.id === newLayawayForm.variant_id)?.price.toFixed(2)}</>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
                <textarea
                  value={newLayawayForm.notes}
                  onChange={(e) => setNewLayawayForm({ ...newLayawayForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    resetNewLayawayForm();
                  }}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Apartado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedLayaway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Registrar Abono</h2>
                <p className="text-sm text-slate-600 mt-1">Apartado: {selectedLayaway.layaway_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedLayaway(null);
                  resetPaymentForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total</p>
                  <p className="text-xl font-bold text-slate-900">${selectedLayaway.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Pagado</p>
                  <p className="text-xl font-bold text-green-600">${selectedLayaway.amount_paid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-orange-600">${selectedLayaway.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monto del Abono *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedLayaway.balance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Método de Pago *</label>
                <select
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="store_credit">Crédito de Tienda</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Número de Referencia</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Número de autorización, folio, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedLayaway(null);
                    resetPaymentForm();
                  }}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Registrando...' : 'Registrar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiptModal && selectedLayaway && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 print:hidden">
              <h2 className="text-2xl font-bold text-slate-900">Comprobante de Abono</h2>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedLayaway(null);
                  setSelectedPayment(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8" id="receipt-content">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">COMPROBANTE DE ABONO</h1>
                <p className="text-slate-600">Apartado #{selectedLayaway.layaway_number}</p>
                <p className="text-sm text-slate-500">
                  Fecha: {new Date(selectedPayment.created_at).toLocaleString()}
                </p>
              </div>

              <div className="border-t border-b border-slate-300 py-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-semibold">
                    {selectedLayaway.customer?.first_name} {selectedLayaway.customer?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Producto:</span>
                  <span className="font-semibold">
                    {selectedLayaway.variant?.product?.brand} {selectedLayaway.variant?.product?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Talla / Color:</span>
                  <span className="font-semibold">
                    {selectedLayaway.variant?.size?.name} / {selectedLayaway.variant?.color?.name}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Precio Total:</span>
                  <span className="font-bold">${selectedLayaway.total_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Abono Actual:</span>
                  <span className="font-bold text-green-600">${selectedPayment.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Total Pagado:</span>
                  <span className="font-bold">${selectedLayaway.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl border-t pt-3">
                  <span className="font-semibold text-slate-900">Saldo Restante:</span>
                  <span className={`font-bold ${selectedLayaway.balance - selectedPayment.amount <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    ${(selectedLayaway.balance - selectedPayment.amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Método de Pago:</span>
                  <span className="font-semibold">{getPaymentMethodLabel(selectedPayment.payment_method)}</span>
                </div>
                {selectedPayment.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Referencia:</span>
                    <span className="font-mono">{selectedPayment.reference_number}</span>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div>
                    <p className="text-slate-600 mb-1">Notas:</p>
                    <p className="text-slate-900">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-300 text-center text-sm text-slate-600">
                <p>Gracias por su preferencia</p>
                <p className="mt-2">Este comprobante es válido como constancia de pago</p>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-slate-200 print:hidden">
              <button
                onClick={printReceipt}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span>Imprimir Comprobante</span>
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedLayaway(null);
                  setSelectedPayment(null);
                }}
                className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
