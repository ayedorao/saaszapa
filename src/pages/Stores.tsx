import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserRole } from '../hooks/useUserRole';
import { Store, Plus, Edit2, MapPin, Phone, Mail, Building } from 'lucide-react';

interface StoreData {
  id: string;
  storeId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Stores() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
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

      setShowModal(false);
      resetForm();
      loadStores();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Error al guardar la tienda');
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
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setSelectedStore(null);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Tiendas</h1>
          <p className="text-slate-600 mt-1">Administra las tiendas de tu negocio</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Tienda</span>
        </button>
      </div>

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

            <div className="mt-4 pt-4 border-t border-slate-200">
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
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Tienda</span>
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedStore ? 'Editar Tienda' : 'Nueva Tienda'}
              </h2>
              <p className="text-slate-600 mt-1">
                {selectedStore ? 'Actualiza la información de la tienda' : 'Crea una nueva tienda en el sistema'}
              </p>
            </div>

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

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Guardando...' : selectedStore ? 'Actualizar' : 'Crear Tienda'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
