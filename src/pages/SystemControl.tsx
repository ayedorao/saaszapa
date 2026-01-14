import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { AlertCircle, Info, AlertTriangle, AlertOctagon, Bell, Plus, X, Calendar } from 'lucide-react';

interface Announcement {
  id: string;
  type: 'info' | 'minor' | 'critical' | 'update';
  title: string;
  message: string;
  active: boolean;
  start_date?: string;
  resolution_date?: string;
  created_at: string;
  created_by: string;
}

export default function SystemControl() {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'info' as 'info' | 'minor' | 'critical' | 'update',
    title: '',
    message: '',
    start_date: '',
    resolution_date: '',
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const q = query(collection(db, 'announces'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title || !formData.message) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if ((formData.type === 'minor' || formData.type === 'critical') && (!formData.start_date || !formData.resolution_date)) {
      alert('Las alertas leves y graves requieren fechas de inicio y resolución');
      return;
    }

    try {
      const newAnnouncement = {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        active: true,
        ...(formData.start_date && { start_date: formData.start_date }),
        ...(formData.resolution_date && { resolution_date: formData.resolution_date }),
        created_at: new Date().toISOString(),
        created_by: user?.email || 'unknown',
      };

      await addDoc(collection(db, 'announces'), newAnnouncement);
      alert('Anuncio creado exitosamente');
      setShowModal(false);
      setFormData({
        type: 'info',
        title: '',
        message: '',
        start_date: '',
        resolution_date: '',
      });
      loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error al crear el anuncio');
    }
  }

  async function toggleAnnouncementStatus(announcement: Announcement) {
    try {
      await updateDoc(doc(db, 'announces', announcement.id), {
        active: !announcement.active,
      });
      loadAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Error al actualizar el anuncio');
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'minor':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <AlertOctagon className="w-5 h-5" />;
      case 'update':
        return <Bell className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      info: 'Información',
      minor: 'Leve',
      critical: 'Grave',
      update: 'Actualización',
    };
    return labels[type] || type;
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800 border-blue-300',
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
      update: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[type] || 'bg-slate-100 text-slate-800 border-slate-300';
  }

  if (profile?.email !== 'crisdoraodxb@gmail.com') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600">Solo la cuenta master puede acceder a esta sección</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Control de Sistema</h1>
          <p className="text-slate-600 mt-1">Gestiona anuncios y alertas del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Anuncio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {announcements.map(announcement => (
          <div
            key={announcement.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getTypeColor(announcement.type)}`}>
                {getTypeIcon(announcement.type)}
                <span>{getTypeLabel(announcement.type)}</span>
              </div>
              <button
                onClick={() => toggleAnnouncementStatus(announcement)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  announcement.active
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {announcement.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">{announcement.title}</h3>
            <p className="text-slate-600 mb-4">{announcement.message}</p>

            {(announcement.start_date || announcement.resolution_date) && (
              <div className="space-y-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                {announcement.start_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Inicio: {new Date(announcement.start_date).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
                {announcement.resolution_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Resolución: {new Date(announcement.resolution_date).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
              Creado por {announcement.created_by} el {new Date(announcement.created_at).toLocaleString('es-ES')}
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No hay anuncios en el sistema</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">Crear Anuncio</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Anuncio *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['info', 'minor', 'critical', 'update'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === type
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(type).split(' ')[0]}`}>
                          {getTypeIcon(type)}
                        </div>
                        <span className="font-medium text-slate-900">{getTypeLabel(type)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Título del anuncio"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Describe el anuncio..."
                  rows={4}
                  required
                />
              </div>

              {(formData.type === 'minor' || formData.type === 'critical') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de Inicio del Incidente *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de Posible Resolución *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.resolution_date}
                      onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Los anuncios de tipo Información y Actualización pueden desactivarse manualmente.
                  Los de tipo Leve y Grave requieren fechas de inicio y resolución.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  Crear Anuncio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
