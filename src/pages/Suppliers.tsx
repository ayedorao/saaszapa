import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Supplier, PurchaseInvoice, PurchaseInvoiceItem } from '../types/database';
import SupplierInvoiceView from '../components/SupplierInvoiceView';
import PurchaseInvoiceEditor from '../components/PurchaseInvoiceEditor';
import BulkProductEntry from '../components/BulkProductEntry';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  TrendingUp,
  Calendar,
  FileText,
  Lock,
  Edit,
  PackagePlus
} from 'lucide-react';

interface SupplierWithPaymentInfo extends Supplier {
  totalOwed: number;
  totalPaid: number;
  pendingPayment: number;
  invoiceCount: number;
  lastPurchaseDate?: string;
  hasPendingPayment: boolean;
}

type View = 'list' | 'edit' | 'detail' | 'invoice' | 'editInvoice' | 'bulkEntry';

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierWithPaymentInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithPaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [supplierInvoices, setSupplierInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    notes: '',
    company_name: '',
    payment_terms: '',
    bank_account: '',
    bank_name: '',
    account_notes: '',
  });

  useEffect(() => {
    loadSuppliers();
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const storesSnap = await getDocs(query(collection(db, 'stores'), where('active', '==', true)));
      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storesData);
      if (storesData.length > 0) {
        setSelectedStoreId(storesData[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  async function loadSuppliers() {
    setDataLoading(true);
    try {
      const [suppliersSnap, invoicesSnap, itemsSnap] = await Promise.all([
        getDocs(query(collection(db, 'suppliers'), where('active', '==', true))),
        getDocs(collection(db, 'purchase_invoices')),
        getDocs(collection(db, 'purchase_invoice_items'))
      ]);

      const suppliersData = suppliersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supplier[];

      const invoicesData = invoicesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseInvoice[];

      const itemsData = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseInvoiceItem[];

      console.log('Proveedores cargados:', suppliersData.length);
      console.log('Facturas cargadas:', invoicesData.length);
      console.log('Items de factura cargados:', itemsData.length);

      const invoicesBySupplier = new Map<string, PurchaseInvoice[]>();
      invoicesData.forEach(invoice => {
        if (invoice.supplier_id) {
          if (!invoicesBySupplier.has(invoice.supplier_id)) {
            invoicesBySupplier.set(invoice.supplier_id, []);
          }
          invoicesBySupplier.get(invoice.supplier_id)!.push(invoice);
        }
      });

      const itemsBySupplier = new Map<string, PurchaseInvoiceItem[]>();
      itemsData.forEach(item => {
        if (item.supplier_id) {
          if (!itemsBySupplier.has(item.supplier_id)) {
            itemsBySupplier.set(item.supplier_id, []);
          }
          itemsBySupplier.get(item.supplier_id)!.push(item);
        }
      });

      const enrichedSuppliers = suppliersData.map(supplier => {
        const supplierInvoices = invoicesBySupplier.get(supplier.id) || [];
        const supplierItems = itemsBySupplier.get(supplier.id) || [];

        const paidInvoices = supplierInvoices.filter(inv => {
          const invoiceData = inv as any;
          return invoiceData.statusPago === true;
        });
        const unpaidInvoices = supplierInvoices.filter(inv => {
          const invoiceData = inv as any;
          return invoiceData.statusPago === false || invoiceData.statusPago === undefined;
        });

        const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const pendingPayment = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalOwed = totalPaid + pendingPayment;

        const dates = supplierInvoices.map(inv => new Date(inv.created_at));
        const lastPurchaseDate = dates.length > 0
          ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
          : undefined;

        console.log(`📊 Proveedor ${supplier.name}:`, {
          facturas: supplierInvoices.length,
          pagadas: paidInvoices.length,
          pendientes: unpaidInvoices.length,
          totalPaid: totalPaid,
          pendingPayment: pendingPayment,
          totalOwed: totalOwed,
          hasPendingPayment: pendingPayment > 0
        });

        supplierInvoices.forEach(inv => {
          const invData = inv as any;
          console.log(`  📄 ${inv.invoice_number}:`, {
            statusPago: invData.statusPago,
            status: inv.status,
            isPaid: invData.statusPago === true,
            total: inv.total
          });
        });

        return {
          ...supplier,
          totalOwed,
          totalPaid,
          pendingPayment,
          invoiceCount: supplierInvoices.length,
          lastPurchaseDate,
          hasPendingPayment: pendingPayment > 0
        };
      });

      enrichedSuppliers.sort((a, b) => {
        if (a.hasPendingPayment && !b.hasPendingPayment) return -1;
        if (!a.hasPendingPayment && b.hasPendingPayment) return 1;
        return b.pendingPayment - a.pendingPayment;
      });

      setSuppliers(enrichedSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      alert('Error al cargar proveedores: ' + (error as Error).message);
    } finally {
      setDataLoading(false);
    }
  }

  async function loadSupplierDetails(supplierId: string) {
    try {
      const invoicesSnap = await getDocs(
        query(
          collection(db, 'purchase_invoices'),
          where('supplier_id', '==', supplierId)
        )
      );

      const invoices = invoicesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseInvoice[];

      const sortedInvoices = invoices.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log(`📋 Facturas del proveedor ${supplierId}:`, sortedInvoices.length);
      sortedInvoices.forEach(inv => {
        const invData = inv as any;
        console.log(`  - ${inv.invoice_number}:`, {
          statusPago: invData.statusPago,
          status: inv.status,
          total: inv.total,
          confirmed_at: inv.confirmed_at
        });
      });

      setSupplierInvoices(sortedInvoices);
    } catch (error) {
      console.error('Error loading supplier details:', error);
    }
  }

  function openDetailView(supplier: SupplierWithPaymentInfo) {
    setSelectedSupplier(supplier);
    loadSupplierDetails(supplier.id);
    setCurrentView('detail');
  }

  function openEditView(supplier?: SupplierWithPaymentInfo) {
    if (supplier) {
      setSelectedSupplier(supplier);
      const supplierData = supplier as any;
      setFormData({
        code: supplier.code,
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        tax_id: supplier.tax_id || '',
        notes: supplier.notes || '',
        company_name: supplierData.company_name || '',
        payment_terms: supplierData.payment_terms || '',
        bank_account: supplierData.bank_account || '',
        bank_name: supplierData.bank_name || '',
        account_notes: supplierData.account_notes || '',
      });
    } else {
      setSelectedSupplier(null);
      resetForm();
    }
    setCurrentView('edit');
  }

  function backToList() {
    setCurrentView('list');
    setSelectedSupplier(null);
    setSelectedInvoiceId(null);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!formData.name || !formData.code) {
      alert('El nombre y código del proveedor son requeridos');
      return;
    }

    setLoading(true);
    try {
      if (selectedSupplier) {
        await updateDoc(doc(db, 'suppliers', selectedSupplier.id), {
          ...formData,
          updated_at: new Date().toISOString()
        });
        alert('Proveedor actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...formData,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.uid
        });
        alert('Proveedor creado exitosamente');
      }
      setCurrentView('list');
      resetForm();
      await loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  }

  async function deleteSupplier(supplier: SupplierWithPaymentInfo) {
    if (!confirm(`¿Está seguro que desea eliminar al proveedor "${supplier.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        active: false,
        updated_at: new Date().toISOString()
      });
      alert('Proveedor eliminado exitosamente');
      await loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error al eliminar el proveedor');
    } finally {
      setLoading(false);
    }
  }

  async function markInvoiceAsPaid(invoiceId: string) {
    if (!user) return;

    const password = prompt('🔒 SEGURIDAD: Ingrese la contraseña para confirmar el pago\n\n(Capa de protección contra fraudes)');

    if (!password) {
      return;
    }

    if (password !== '140126') {
      alert('❌ Contraseña incorrecta. No se puede confirmar el pago.');
      return;
    }

    try {
      const now = new Date().toISOString();

      console.log('💰 Registrando pago para factura:', invoiceId);
      console.log('📝 Datos que se actualizarán:', {
        status: 'confirmed',
        statusPago: true,
        confirmed_at: now,
        confirmed_by: user.uid
      });

      await updateDoc(doc(db, 'purchase_invoices', invoiceId), {
        status: 'confirmed',
        statusPago: true,
        confirmed_at: now,
        confirmed_by: user.uid,
        updated_at: now,
        payment_confirmed_date: now,
        payment_confirmed_by: user.uid
      });

      console.log('✅ Factura actualizada en Firebase');

      if (selectedSupplier) {
        console.log('🔄 Recargando detalles del proveedor...');
        await loadSupplierDetails(selectedSupplier.id);
      }
      console.log('🔄 Recargando lista de proveedores...');
      await loadSuppliers();

      const confirmationDate = new Date(now).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      alert(`✅ Pago registrado exitosamente\n\nFecha y hora: ${confirmationDate}\nRegistrado por: ${user.email}`);
    } catch (error) {
      console.error('❌ Error marking invoice as paid:', error);
      alert('❌ Error al registrar el pago: ' + (error as Error).message);
    }
  }

  function viewInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setCurrentView('invoice');
  }

  function editInvoice(invoiceId: string) {
    if (!selectedStoreId) {
      alert('Por favor selecciona una tienda primero');
      return;
    }
    setSelectedInvoiceId(invoiceId);
    setCurrentView('bulkEntry');
  }

  function handleInvoiceEdited() {
    loadSuppliers();
    if (selectedSupplier) {
      loadSupplierDetails(selectedSupplier.id);
    }
    setCurrentView('detail');
  }

  function openBulkEntry() {
    if (!selectedStoreId) {
      alert('Por favor selecciona una tienda primero');
      return;
    }
    setCurrentView('bulkEntry');
  }

  function handleBulkEntrySuccess(invoiceId: string, products: any[]) {
    loadSuppliers();
    if (selectedSupplier) {
      loadSupplierDetails(selectedSupplier.id);
    }
    setCurrentView('detail');
    alert('Productos ingresados exitosamente');
  }

  function resetForm() {
    setFormData({
      code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      notes: '',
      company_name: '',
      payment_terms: '',
      bank_account: '',
      bank_name: '',
      account_notes: '',
    });
    setSelectedSupplier(null);
  }

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendingPayments = suppliers.reduce((sum, s) => sum + s.pendingPayment, 0);
  const suppliersWithPending = suppliers.filter(s => s.hasPendingPayment).length;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
          <p className="text-slate-600">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentView === 'invoice' && selectedInvoiceId && (
        <SupplierInvoiceView
          invoiceId={selectedInvoiceId}
          onClose={backToList}
        />
      )}

      {currentView === 'editInvoice' && selectedInvoiceId && (
        <PurchaseInvoiceEditor
          invoiceId={selectedInvoiceId}
          onClose={backToList}
          onConfirmed={handleInvoiceEdited}
        />
      )}

      {currentView === 'bulkEntry' && selectedStoreId && (
        <BulkProductEntry
          onClose={backToList}
          onSuccess={handleBulkEntrySuccess}
          storeId={selectedStoreId}
          editInvoiceId={selectedInvoiceId || undefined}
        />
      )}

      {currentView !== 'invoice' && currentView !== 'editInvoice' && currentView !== 'bulkEntry' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentView !== 'list' && (
                <button
                  onClick={backToList}
                  className="inline-flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  <X className="w-5 h-5 mr-2" />
                  Volver
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {currentView === 'list' ? 'Proveedores' : currentView === 'edit' ? (selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor') : 'Detalles del Proveedor'}
                </h1>
                <p className="text-slate-600 mt-1">
                  {currentView === 'list' ? 'Gestión de proveedores y pagos pendientes' : ''}
                </p>
              </div>
            </div>
            {currentView === 'list' && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadSuppliers}
                  disabled={dataLoading}
                  className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button
                  onClick={() => openEditView()}
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nuevo Proveedor
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {currentView === 'list' && (
        <>
          {suppliersWithPending > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">Pagos Pendientes</h3>
                  <p className="text-red-700 mb-3">
                    Hay {suppliersWithPending} {suppliersWithPending === 1 ? 'proveedor' : 'proveedores'} con pagos pendientes
                  </p>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-red-700" />
                    <span className="text-2xl font-bold text-red-900">
                      ${totalPendingPayments.toFixed(2)}
                    </span>
                    <span className="text-red-700">total pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar proveedores por nombre, código o contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
            <div
              key={supplier.id}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-lg ${
                supplier.hasPendingPayment
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200'
              }`}
            >
              <div className={`p-4 ${supplier.hasPendingPayment ? 'bg-red-100' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{supplier.name}</h3>
                    <p className="text-sm text-slate-600">Código: {supplier.code}</p>
                  </div>
                  {supplier.hasPendingPayment ? (
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  )}
                </div>

                {supplier.contact_person && (
                  <p className="text-sm text-slate-600 mt-1">
                    Contacto: {supplier.contact_person}
                  </p>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-600">Facturas Totales:</span>
                  <div className="flex items-center space-x-1">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-900">{supplier.invoiceCount}</span>
                  </div>
                </div>

                {supplier.lastPurchaseDate && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Última Compra:</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {new Date(supplier.lastPurchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-600">Total Pagado:</span>
                  <span className="font-semibold text-green-700">
                    ${supplier.totalPaid.toFixed(2)}
                  </span>
                </div>

                <div className={`flex items-center justify-between py-2 ${
                  supplier.hasPendingPayment ? 'bg-red-100 -mx-4 px-4 rounded-lg' : ''
                }`}>
                  <span className={`text-sm font-semibold ${
                    supplier.hasPendingPayment ? 'text-red-900' : 'text-slate-600'
                  }`}>
                    {supplier.hasPendingPayment ? 'Pago Pendiente:' : 'Sin Pagos Pendientes'}
                  </span>
                  {supplier.hasPendingPayment && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-5 h-5 text-red-700" />
                      <span className="text-lg font-bold text-red-900">
                        ${supplier.pendingPayment.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between space-x-2">
                <button
                  onClick={() => openDetailView(supplier)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Ver Detalles
                </button>
                <button
                  onClick={() => openEditView(supplier)}
                  className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteSupplier(supplier)}
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay proveedores</h3>
          <p className="text-slate-600 mb-4">Comienza agregando tu primer proveedor</p>
          <button
            onClick={() => openEditView()}
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Crear Primer Proveedor
          </button>
        </div>
      )}
        </>
      )}

      {currentView === 'edit' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-300">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="PROV001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Nombre del proveedor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Nombre del contacto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Dirección completa"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Información Fiscal y Contable</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Razón Social Completa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      RFC / Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="RFC123456789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Nombre del banco"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cuenta Bancaria
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Número de cuenta o CLABE"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Términos de Pago
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Ej: 30 días, Contado, 15-30-45 días, etc."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notas Contables
                  </label>
                  <textarea
                    value={formData.account_notes}
                    onChange={(e) => setFormData({ ...formData, account_notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Información importante para contabilidad..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas Generales
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={backToList}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : selectedSupplier ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
        </div>
      )}

      {currentView === 'detail' && selectedSupplier && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-300">

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-600">Total Facturas</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{selectedSupplier.invoiceCount}</span>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">Total Pagado</span>
                  </div>
                  <span className="text-2xl font-bold text-green-900">${selectedSupplier.totalPaid.toFixed(2)}</span>
                </div>

                <div className={`rounded-lg p-4 border ${
                  selectedSupplier.hasPendingPayment
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {selectedSupplier.hasPendingPayment ? (
                      <>
                        <Clock className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-700">Pendiente</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-slate-600" />
                        <span className="text-sm text-slate-600">Al Corriente</span>
                      </>
                    )}
                  </div>
                  <span className={`text-2xl font-bold ${
                    selectedSupplier.hasPendingPayment ? 'text-red-900' : 'text-slate-900'
                  }`}>
                    ${selectedSupplier.pendingPayment.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Selecciona Tienda para Entrada de Productos:
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">Selecciona una tienda...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={openBulkEntry}
                  disabled={!selectedStoreId}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PackagePlus className="w-5 h-5 mr-2" />
                  Entrada
                </button>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial de Facturas</h3>
                {supplierInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {supplierInvoices.map(invoice => (
                      <div
                        key={invoice.id}
                        className={`border-2 rounded-lg p-4 ${
                          (invoice as any).statusPago === true
                            ? 'border-green-300 bg-green-50'
                            : 'border-red-300 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-mono font-semibold text-slate-900">
                                {invoice.invoice_number}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                (invoice as any).statusPago === true
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {(invoice as any).statusPago === true ? 'Pagado' : 'Pendiente de Pago'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              Fecha: {new Date(invoice.created_at).toLocaleDateString()}
                            </p>
                            {invoice.confirmed_at && (
                              <p className="text-sm text-green-700">
                                Pagado: {new Date(invoice.confirmed_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900 mb-2">
                              ${invoice.total.toFixed(2)}
                            </div>
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => viewInvoice(invoice.id)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center justify-center"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Factura
                              </button>
                              <button
                                onClick={() => editInvoice(invoice.id)}
                                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors font-medium inline-flex items-center justify-center"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Factura
                              </button>
                              {(invoice as any).statusPago !== true && (
                                <button
                                  onClick={() => markInvoiceAsPaid(invoice.id)}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center justify-center"
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Registrar Pago
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No hay facturas para este proveedor</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
