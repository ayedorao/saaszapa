import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Promotion } from '../types/database';
import { Tag, Plus, Edit2 } from 'lucide-react';

export default function Promotions() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'second_item_discount',
    value: '',
    min_quantity: '1',
    priority: '0',
    stackable: false,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  async function loadPromotions() {
    const q = query(collection(db, 'promotions'), orderBy('priority', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Promotion[];
    setPromotions(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const promotionData = {
        ...formData,
        value: parseFloat(formData.value),
        min_quantity: parseInt(formData.min_quantity),
        priority: parseInt(formData.priority),
        created_by: user.uid,
      };

      if (selectedPromotion) {
        await updateDoc(doc(db, 'promotions', selectedPromotion.id), {
          ...promotionData,
          updated_at: new Date().toISOString(),
        });
        alert('Promoción actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...promotionData,
          active: true,
          created_at: new Date().toISOString(),
        });
        alert('Promoción creada exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Error al guardar promoción');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      min_quantity: '1',
      priority: '0',
      stackable: false,
      start_date: '',
      end_date: '',
    });
    setSelectedPromotion(null);
  }

  function openEditModal(promotion: Promotion) {
    setSelectedPromotion(promotion);
    setFormData({
      code: promotion.code,
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      value: promotion.value.toString(),
      min_quantity: promotion.min_quantity.toString(),
      priority: promotion.priority.toString(),
      stackable: promotion.stackable,
      start_date: promotion.start_date || '',
      end_date: promotion.end_date || '',
    });
    setShowModal(true);
  }

  async function toggleActive(promotion: Promotion) {
    await updateDoc(doc(db, 'promotions', promotion.id), {
      active: !promotion.active,
      updated_at: new Date().toISOString(),
    });
    loadPromotions();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Promociones</h1>
          <p className="text-slate-600">Administrar descuentos y campañas promocionales</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Agregar Promoción</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promotion) => (
          <div
            key={promotion.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
              promotion.active ? 'border-green-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">{promotion.name}</h3>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  promotion.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {promotion.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <p className="text-sm text-slate-600 mb-4">{promotion.description}</p>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Código:</span>
                <span className="font-medium">{promotion.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tipo:</span>
                <span className="font-medium">{promotion.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Valor:</span>
                <span className="font-medium">
                  {promotion.type === 'percentage' ? `${promotion.value}%` : `$${promotion.value}`}
                </span>
              </div>
              {promotion.start_date && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Inicia:</span>
                  <span className="font-medium">{new Date(promotion.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {promotion.end_date && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Termina:</span>
                  <span className="font-medium">{new Date(promotion.end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => toggleActive(promotion)}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                {promotion.active ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => openEditModal(promotion)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {selectedPromotion ? 'Editar Promoción' : 'Agregar Nueva Promoción'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed_amount">Monto Fijo</option>
                    <option value="buy_x_get_y">Compre X Lleve Y</option>
                    <option value="second_item_discount">Descuento 2do Artículo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cant. Mínima</label>
                  <input
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Inicio</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Fin</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : selectedPromotion ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
