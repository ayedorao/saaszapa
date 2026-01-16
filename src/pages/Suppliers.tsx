import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Supplier, PurchaseInvoice, PurchaseInvoiceItem } from '../types/database';
import SupplierInvoiceView from '../components/SupplierInvoiceView';
import { fixSupplierInvoices, showSuppliersDebugInfo } from '../utils/fixSupplierInvoices';
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
  Bug,
  Wrench
} from 'lucide-react';

interface SupplierWithPaymentInfo extends Supplier {
  totalOwed: number;
  totalPaid: number;
  pendingPayment: number;
  invoiceCount: number;
  lastPurchaseDate?: string;
  hasPendingPayment: boolean;
}

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierWithPaymentInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithPaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState<PurchaseInvoice[]>([]);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
  }, []);

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

        const paidInvoices = supplierInvoices.filter(inv => inv.status === 'confirmed');
        const unpaidInvoices = supplierInvoices.filter(inv => inv.status === 'draft');

        const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const pendingPayment = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalOwed = totalPaid + pendingPayment;

        const dates = supplierInvoices.map(inv => new Date(inv.created_at));
        const lastPurchaseDate = dates.length > 0
          ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
          : undefined;

        console.log(`Proveedor ${supplier.name}:`, {
          facturas: supplierInvoices.length,
          items: supplierItems.length,
          totalPaid: totalPaid,
          pendingPayment: pendingPayment,
          totalOwed: totalOwed,
          hasPendingPayment: pendingPayment > 0
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
          where('supplier_id', '==', supplierId),
          orderBy('created_at', 'desc')
        )
      );

      const invoices = invoicesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseInvoice[];

      setSupplierInvoices(invoices);
    } catch (error) {
      console.error('Error loading supplier details:', error);
    }
  }

  function openDetailModal(supplier: SupplierWithPaymentInfo) {
    setSelectedSupplier(supplier);
    loadSupplierDetails(supplier.id);
    setShowDetailModal(true);
  }

  function openEditModal(supplier?: SupplierWithPaymentInfo) {
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
    setShowModal(true);
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
      setShowModal(false);
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

    if (!confirm('¿Confirmar que se realizó el pago de esta factura?')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'purchase_invoices', invoiceId), {
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.uid,
        updated_at: new Date().toISOString()
      });

      if (selectedSupplier) {
        await loadSupplierDetails(selectedSupplier.id);
      }
      await loadSuppliers();
      alert('Factura marcada como pagada');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Error al marcar la factura como pagada');
    }
  }

  function viewInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setShowInvoiceView(true);
  }

  async function runDebugInfo() {
    console.clear();
    console.log('🔍 Ejecutando información de debug...\n');
    await showSuppliersDebugInfo();
    alert('Información de debug mostrada en la consola del navegador (F12)');
  }

  async function runFixInvoices() {
    if (!confirm('¿Deseas corregir las facturas con estados incorrectos?\n\nEsto cambiará todas las facturas sin fecha de pago a estado "draft" (pendiente de pago).')) {
      return;
    }

    try {
      setLoading(true);
      const result = await fixSupplierInvoices();
      await loadSuppliers();
      alert(`Corrección completada:\n\n✅ Facturas correctas: ${result.alreadyCorrect}\n🔧 Facturas corregidas: ${result.corrected}\n📋 Total: ${result.total}\n\nRevisa la consola para más detalles.`);
    } catch (error) {
      console.error('Error al corregir facturas:', error);
      alert('Error al corregir facturas. Revisa la consola.');
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-slate-600 mt-1">Gestión de proveedores y pagos pendientes</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={runDebugInfo}
            className="inline-flex items-center px-4 py-2 bg-blue-100 border-2 border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
            title="Ver información de debug en consola"
          >
            <Bug className="w-5 h-5 mr-2" />
            Debug
          </button>
          <button
            onClick={runFixInvoices}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-orange-100 border-2 border-orange-300 text-orange-700 rounded-lg font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50"
            title="Corregir facturas con estados incorrectos"
          >
            <Wrench className="w-5 h-5 mr-2" />
            Corregir
          </button>
          <button
            onClick={loadSuppliers}
            disabled={dataLoading}
            className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => openEditModal()}
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

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
                  onClick={() => openDetailModal(supplier)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Ver Detalles
                </button>
                <button
                  onClick={() => openEditModal(supplier)}
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
            onClick={() => openEditModal()}
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Crear Primer Proveedor
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
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
                  {loading ? 'Guardando...' : selectedSupplier ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedSupplier.name}</h2>
                <p className="text-sm text-slate-600">Código: {selectedSupplier.code}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial de Facturas</h3>
                {supplierInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {supplierInvoices.map(invoice => (
                      <div
                        key={invoice.id}
                        className={`border-2 rounded-lg p-4 ${
                          invoice.status === 'draft'
                            ? 'border-red-300 bg-red-50'
                            : invoice.status === 'confirmed'
                            ? 'border-green-300 bg-green-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-mono font-semibold text-slate-900">
                                {invoice.invoice_number}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                invoice.status === 'draft'
                                  ? 'bg-red-200 text-red-800'
                                  : invoice.status === 'confirmed'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}>
                                {invoice.status === 'draft' ? 'Pendiente de Pago' : invoice.status === 'confirmed' ? 'Pagado' : 'Cancelado'}
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
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => markInvoiceAsPaid(invoice.id)}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                  Marcar como Pagado
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
        </div>
      )}

      {showInvoiceView && selectedInvoiceId && (
        <SupplierInvoiceView
          invoiceId={selectedInvoiceId}
          onClose={() => {
            setShowInvoiceView(false);
            setSelectedInvoiceId(null);
          }}
        />
      )}
    </div>
  );
}
