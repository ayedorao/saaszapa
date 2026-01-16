import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserRole } from '../hooks/useUserRole';
import { Store as StoreData, StoreLegalInfo } from '../types/database';
import { Store, Plus, Edit2, MapPin, Phone, Mail, Building, X, FileText, Scale } from 'lucide-react';

type View = 'list' | 'edit' | 'legal';

export default function Stores() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const [legalFormData, setLegalFormData] = useState<StoreLegalInfo>({
    business_name: '',
    tax_id: '',
    business_registration: '',
    legal_address: '',
    legal_representative: '',
    permits_licenses: '',
    return_policy: '',
    warranty_policy: '',
    terms_conditions: '',
    website: '',
  });

  useEffect(() => {
    if (isAdmin) {
      loadStores();
    }
  }, [isAdmin]);

  async function loadStores() {
    try {
      const snapshot = await getDocs(collection(db, 'stores'));
      const storesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as StoreData[];
      storesData.sort((a, b) => a.name.localeCompare(b.name));
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre de la tienda es requerido');
      return;
    }

    setLoading(true);
    try {
      if (selectedStore) {
        await updateDoc(doc(db, 'stores', selectedStore.id), {
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          updated_at: new Date().toISOString(),
        });
        alert('Tienda actualizada exitosamente');
      } else {
        const storeId = `STORE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await addDoc(collection(db, 'stores'), {
          storeId,
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        alert('Tienda creada exitosamente');
      }

      setCurrentView('list');
      resetForm();
      loadStores();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Error al guardar la tienda');
    } finally {
      setLoading(false);
    }
  }

  async function handleLegalSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedStore) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'stores', selectedStore.id), {
        legal_info: legalFormData,
        updated_at: new Date().toISOString(),
      });
      alert('Información legal actualizada exitosamente');
      setCurrentView('list');
      resetForm();
      loadStores();
    } catch (error) {
      console.error('Error saving legal info:', error);
      alert('Error al guardar la información legal');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStoreStatus(store: StoreData) {
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        active: !store.active,
        updated_at: new Date().toISOString(),
      });
      loadStores();
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Error al actualizar tienda');
    }
  }

  function editStore(store: StoreData) {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
    });
    setCurrentView('edit');
  }

  function editLegalInfo(store: StoreData) {
    setSelectedStore(store);
    setLegalFormData({
      business_name: store.legal_info?.business_name || '',
      tax_id: store.legal_info?.tax_id || '',
      business_registration: store.legal_info?.business_registration || '',
      legal_address: store.legal_info?.legal_address || '',
      legal_representative: store.legal_info?.legal_representative || '',
      permits_licenses: store.legal_info?.permits_licenses || '',
      return_policy: store.legal_info?.return_policy || '',
      warranty_policy: store.legal_info?.warranty_policy || '',
      terms_conditions: store.legal_info?.terms_conditions || '',
      website: store.legal_info?.website || '',
    });
    setCurrentView('legal');
  }

  function resetForm() {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setLegalFormData({
      business_name: '',
      tax_id: '',
      business_registration: '',
      legal_address: '',
      legal_representative: '',
      permits_licenses: '',
      return_policy: '',
      warranty_policy: '',
      terms_conditions: '',
      website: '',
    });
    setSelectedStore(null);
  }

  function backToList() {
    setCurrentView('list');
    resetForm();
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <h1 className="text-3xl font-bold text-slate-800">
              {currentView === 'list' ? 'Gestión de Tiendas' : currentView === 'edit' ? (selectedStore ? 'Editar Tienda' : 'Nueva Tienda') : 'Información Legal y Fiscal'}
            </h1>
            <p className="text-slate-600 mt-1">
              {currentView === 'list' ? 'Administra las tiendas de tu negocio' : currentView === 'legal' ? 'Información para cumplimiento de Ley de Protección al Consumidor' : ''}
            </p>
          </div>
        </div>
        {currentView === 'list' && (
          <button
            onClick={() => {
              resetForm();
              setCurrentView('edit');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Tienda</span>
          </button>
        )}
      </div>

      {/* List View */}
      {currentView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`bg-white rounded-xl shadow-sm border ${
                store.active ? 'border-slate-200' : 'border-red-200 bg-red-50'
              } p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    store.active ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-slate-400'
                  }`}>
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{store.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      store.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {store.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => editStore(store)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {store.address && (
                  <div className="flex items-start space-x-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{store.phone}</span>
                  </div>
                )}
                {store.email && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{store.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <button
                  onClick={() => editLegalInfo(store)}
                  className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium text-sm hover:bg-purple-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <Scale className="w-4 h-4" />
                  <span>Información Legal & Fiscal</span>
                </button>
                <button
                  onClick={() => toggleStoreStatus(store)}
                  className={`w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    store.active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {store.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}

          {stores.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay tiendas registradas</h3>
              <p className="text-slate-500 mb-4">Crea tu primera tienda para comenzar</p>
              <button
                onClick={() => {
                  resetForm();
                  setCurrentView('edit');
                }}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Tienda</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Store View */}
      {currentView === 'edit' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-300">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Nombre de la Tienda *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tienda Principal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Dirección</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Calle Principal #123, Ciudad"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Teléfono</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tienda@ejemplo.com"
                />
              </div>
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
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Guardando...' : selectedStore ? 'Actualizar' : 'Crear Tienda'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Legal Information View */}
      {currentView === 'legal' && selectedStore && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-300">
          <div className="bg-purple-50 border-b border-purple-200 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Scale className="w-5 h-5 text-purple-700" />
              <h3 className="text-lg font-bold text-purple-900">Información Legal y Fiscal</h3>
            </div>
            <p className="text-sm text-purple-800">
              Esta información se mostrará en las facturas comerciales y es requerida por la Ley Federal de Protección al Consumidor (PROFECO)
            </p>
          </div>

          <form onSubmit={handleLegalSubmit} className="p-6 space-y-6">
            {/* Business Information */}
            <div className="border-b border-slate-200 pb-4">
              <h4 className="font-semibold text-slate-900 mb-3">Información del Negocio</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={legalFormData.business_name}
                    onChange={(e) => setLegalFormData({ ...legalFormData, business_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Empresa S.A. de C.V."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    RFC (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={legalFormData.tax_id}
                    onChange={(e) => setLegalFormData({ ...legalFormData, tax_id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ABC123456XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Registro Empresarial
                  </label>
                  <input
                    type="text"
                    value={legalFormData.business_registration}
                    onChange={(e) => setLegalFormData({ ...legalFormData, business_registration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="No. de registro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Representante Legal
                  </label>
                  <input
                    type="text"
                    value={legalFormData.legal_representative}
                    onChange={(e) => setLegalFormData({ ...legalFormData, legal_representative: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dirección Legal (Fiscal)
                  </label>
                  <textarea
                    value={legalFormData.legal_address}
                    onChange={(e) => setLegalFormData({ ...legalFormData, legal_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Dirección fiscal completa"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    value={legalFormData.website}
                    onChange={(e) => setLegalFormData({ ...legalFormData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://www.ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Permisos y Licencias
                  </label>
                  <input
                    type="text"
                    value={legalFormData.permits_licenses}
                    onChange={(e) => setLegalFormData({ ...legalFormData, permits_licenses: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Números de licencias"
                  />
                </div>
              </div>
            </div>

            {/* Consumer Protection Policies */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Políticas de Protección al Consumidor</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Política de Devoluciones
                  </label>
                  <textarea
                    value={legalFormData.return_policy}
                    onChange={(e) => setLegalFormData({ ...legalFormData, return_policy: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ejemplo: Aceptamos devoluciones dentro de 30 días con ticket original..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Política de Garantía
                  </label>
                  <textarea
                    value={legalFormData.warranty_policy}
                    onChange={(e) => setLegalFormData({ ...legalFormData, warranty_policy: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ejemplo: Todos nuestros productos cuentan con garantía de fábrica de 6 meses..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Términos y Condiciones
                  </label>
                  <textarea
                    value={legalFormData.terms_conditions}
                    onChange={(e) => setLegalFormData({ ...legalFormData, terms_conditions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Términos y condiciones generales de venta..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-slate-200">
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
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Guardando...' : 'Guardar Información Legal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
