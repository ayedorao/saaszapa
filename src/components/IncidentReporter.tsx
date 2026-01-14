import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, FileText, X } from 'lucide-react';

interface IncidentReporterProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function IncidentReporter({ onClose, onSuccess }: IncidentReporterProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
    category: 'bug' as 'bug' | 'performance' | 'security' | 'data' | 'ui' | 'other',
    affected_module: '',
    steps_to_reproduce: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'system_incidents'), {
        ...formData,
        status: 'open',
        reported_by: user?.email || 'unknown',
        reported_by_uid: user?.uid || null,
        reported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null,
        resolution_notes: null,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reporting incident:', error);
      alert('Error al reportar el incidente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Reportar Incidente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Título del Incidente *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Resumen breve del problema"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Severidad *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="bug">Error/Bug</option>
                <option value="performance">Rendimiento</option>
                <option value="security">Seguridad</option>
                <option value="data">Datos</option>
                <option value="ui">Interfaz</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Módulo Afectado
            </label>
            <input
              type="text"
              value={formData.affected_module}
              onChange={(e) => setFormData({ ...formData, affected_module: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Ej: Punto de Venta, Inventario, Reportes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción del Problema *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Describe detalladamente el problema encontrado..."
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pasos para Reproducir
            </label>
            <textarea
              value={formData.steps_to_reproduce}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="1. Ir a...&#10;2. Hacer click en...&#10;3. Observar que..."
              rows={4}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Información importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sé lo más específico posible en la descripción</li>
                  <li>Incluye capturas de pantalla si es posible</li>
                  <li>Indica si el problema es recurrente o aislado</li>
                  <li>Los incidentes críticos tendrán prioridad máxima</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Reportar Incidente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
