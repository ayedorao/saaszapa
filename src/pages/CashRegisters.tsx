import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserRole } from '../hooks/useUserRole';
import { DollarSign, Plus, Edit2, Power } from 'lucide-react';

interface CashRegisterData {
  id: string;
  name: string;
  store_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreData {
  id: string;
  name: string;
}

export default function CashRegisters() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [registers, setRegisters] = useState<CashRegisterData[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<CashRegisterData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    store_id: '',
  });

  useEffect(() => {
    if (isAdmin) {
      loadRegisters();
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
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  async function loadRegisters() {
    try {
      const snapshot = await getDocs(collection(db, 'cash_registers'));
      const registersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CashRegisterData[];
      registersData.sort((a, b) => a.name.localeCompare(b.name));
      setRegisters(registersData);
    } catch (error) {
      console.error('Error loading registers:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre de la caja es requerido');
      return;
    }

    setLoading(true);
    try {
      if (selectedRegister) {
        await updateDoc(doc(db, 'cash_registers', selectedRegister.id), {
          name: formData.name,
          store_id: formData.store_id || null,
          updated_at: new Date().toISOString(),
        });
        alert('Caja registradora actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'cash_registers'), {
          name: formData.name,
          store_id: formData.store_id || null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        alert('Caja registradora creada exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadRegisters();
    } catch (error) {
      console.error('Error saving register:', error);
      alert('Error al guardar la caja');
    } finally {
      setLoading(false);
    }
  }

  async function toggleRegisterStatus(register: CashRegisterData) {
    try {
      await updateDoc(doc(db, 'cash_registers', register.id), {
        active: !register.active,
        updated_at: new Date().toISOString(),
      });
      loadRegisters();
    } catch (error) {
      console.error('Error updating register:', error);
      alert('Error al actualizar caja');
    }
  }

  function editRegister(register: CashRegisterData) {
    setSelectedRegister(register);
    setFormData({
      name: register.name,
      store_id: register.store_id || '',
    });
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      store_id: '',
    });
    setSelectedRegister(null);
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
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
          <h1 className="text-3xl font-bold text-slate-800">Cajas Registradoras</h1>
          <p className="text-slate-600 mt-1">Gestiona las cajas registradoras del sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Caja</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registers.map((register) => {
          const store = stores.find(s => s.id === register.store_id);

          return (
            <div
              key={register.id}
              className={`bg-white rounded-xl shadow-sm border ${
                register.active ? 'border-slate-200' : 'border-red-200 bg-red-50'
              } p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    register.active ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-slate-400'
                  }`}>
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{register.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      register.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {register.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => editRegister(register)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              {store && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Tienda</p>
                  <p className="text-sm font-medium text-slate-700">{store.name}</p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => toggleRegisterStatus(register)}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2 ${
                    register.active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{register.active ? 'Desactivar' : 'Activar'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {registers.length === 0 && (
          <div className="col-span-full text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay cajas registradas</h3>
            <p className="text-slate-500 mb-4">Crea tu primera caja registradora para comenzar</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Caja</span>
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRegister ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
              </h2>
              <p className="text-slate-600 mt-1">
                {selectedRegister ? 'Actualiza la información de la caja' : 'Crea una nueva caja registradora'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Nombre de la Caja *</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Caja Principal, Caja 1, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tienda (Opcional)
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin tienda asignada</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Asigna esta caja a una tienda específica
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Guardando...' : selectedRegister ? 'Actualizar' : 'Crear Caja'}
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
