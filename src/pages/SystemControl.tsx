import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { AlertCircle, Info, AlertTriangle, AlertOctagon, Bell, Plus, X, Calendar, Shield, FileText, CheckCircle, XCircle, Database, Trash2, Lock, Activity, LogIn } from 'lucide-react';
import { cleanupDuplicateInventory } from '../utils/cleanupInventory';

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

interface AccessAttempt {
  id: string;
  user_email: string;
  timestamp: string;
  success: boolean;
  user_id?: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  affected_module: string;
  steps_to_reproduce: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_by: string;
  reported_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface ActionLog {
  id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  module: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface LoginLog {
  id: string;
  user_id: string;
  user_email: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

export default function SystemControl() {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [accessAttempts, setAccessAttempts] = useState<AccessAttempt[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'announcements' | 'attempts' | 'incidents' | 'actions' | 'logins'>('announcements');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [cleaningInventory, setCleaningInventory] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearLogsPassword, setClearLogsPassword] = useState('');
  const [clearingLogs, setClearingLogs] = useState(false);
  const [formData, setFormData] = useState({
    type: 'info' as 'info' | 'minor' | 'critical' | 'update',
    title: '',
    message: '',
    start_date: '',
    resolution_date: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      await Promise.all([
        loadAnnouncements(),
        loadAccessAttempts(),
        loadIncidents(),
        loadActionLogs(),
        loadLoginLogs(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadActionLogs() {
    try {
      const q = query(collection(db, 'action_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActionLog[];
      setActionLogs(data);
    } catch (error) {
      console.error('Error loading action logs:', error);
    }
  }

  async function loadLoginLogs() {
    try {
      const q = query(collection(db, 'login_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoginLog[];
      setLoginLogs(data);
    } catch (error) {
      console.error('Error loading login logs:', error);
    }
  }

  async function clearAllLogs() {
    if (clearLogsPassword !== '140126') {
      alert('Contraseña incorrecta');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los registros de acciones e inicios de sesión?')) {
      return;
    }

    setClearingLogs(true);
    try {
      const collectionsToDelete = ['action_logs', 'login_logs'];

      for (const collectionName of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Colección ${collectionName} limpiada`);
      }

      await loadActionLogs();
      await loadLoginLogs();

      alert('Registros eliminados exitosamente');
      setShowClearLogsModal(false);
      setClearLogsPassword('');
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Error al eliminar registros');
    } finally {
      setClearingLogs(false);
    }
  }

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
    }
  }

  async function loadAccessAttempts() {
    try {
      const q = query(collection(db, 'document_access_attempts'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AccessAttempt[];
      setAccessAttempts(data);
    } catch (error) {
      console.error('Error loading access attempts:', error);
    }
  }

  async function loadIncidents() {
    try {
      const q = query(collection(db, 'system_incidents'), orderBy('reported_at', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incident[];
      setIncidents(data);
    } catch (error) {
      console.error('Error loading incidents:', error);
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

  async function updateIncidentStatus(incident: Incident, newStatus: string) {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      await updateDoc(doc(db, 'system_incidents', incident.id), updateData);
      loadIncidents();
      alert('Estado del incidente actualizado');
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Error al actualizar el incidente');
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

  async function handleCleanupInventory() {
    if (!confirm('¿Estás seguro de que deseas limpiar los inventarios duplicados? Esta acción consolidará todos los inventarios duplicados en un solo registro por variante.')) {
      return;
    }

    setCleaningInventory(true);
    try {
      const result = await cleanupDuplicateInventory();
      alert(`Limpieza completada:\n- ${result.duplicatesFound} variantes con duplicados\n- ${result.duplicatesFixed} duplicados corregidos`);
    } catch (error) {
      console.error('Error durante la limpieza:', error);
      alert('Error durante la limpieza del inventario. Revisa la consola para más detalles.');
    } finally {
      setCleaningInventory(false);
    }
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

  function getSeverityColor(severity: string) {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[severity] || 'bg-slate-100 text-slate-800 border-slate-300';
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      open: 'bg-red-100 text-red-800 border-red-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-slate-100 text-slate-800 border-slate-300',
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-300';
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
          <p className="text-slate-600 mt-1">Gestiona anuncios, seguridad e incidentes del sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCleanupInventory}
            disabled={cleaningInventory}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
            title="Limpiar inventarios duplicados"
          >
            <Database className="w-5 h-5" />
            <span>{cleaningInventory ? 'Limpiando...' : 'Limpiar Inventario'}</span>
          </button>
          {activeTab === 'announcements' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Anuncio</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'announcements'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Anuncios ({announcements.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'attempts'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Intentos de Acceso ({accessAttempts.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'incidents'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Incidentes ({incidents.filter(i => i.status !== 'closed').length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'actions'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Registro de Acciones ({actionLogs.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logins')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'logins'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <LogIn className="w-5 h-5" />
                <span>Inicios de Sesión ({loginLogs.length})</span>
              </div>
            </button>
          </nav>
          {(activeTab === 'actions' || activeTab === 'logins') && (
            <div className="mt-4">
              <button
                onClick={() => setShowClearLogsModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpiar Registros</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'announcements' && (
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
          )}

          {activeTab === 'attempts' && (
            <div className="space-y-4">
              {accessAttempts.map(attempt => (
                <div
                  key={attempt.id}
                  className={`p-4 rounded-lg border-2 ${
                    attempt.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {attempt.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {attempt.success ? 'Acceso exitoso' : 'Intento fallido'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Usuario: <span className="font-medium">{attempt.user_email}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(attempt.timestamp).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {accessAttempts.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No hay intentos de acceso registrados</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {incidents.map(incident => (
                <div
                  key={incident.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(incident.status)}`}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <select
                      value={incident.status}
                      onChange={(e) => updateIncidentStatus(incident, e.target.value)}
                      className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{incident.title}</h3>
                  <p className="text-slate-600 mb-3">{incident.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Categoría</p>
                      <p className="text-sm font-medium text-slate-900">{incident.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Módulo Afectado</p>
                      <p className="text-sm font-medium text-slate-900">{incident.affected_module || 'N/A'}</p>
                    </div>
                  </div>

                  {incident.steps_to_reproduce && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-slate-700 mb-1">Pasos para reproducir:</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{incident.steps_to_reproduce}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                    Reportado por {incident.reported_by} el {new Date(incident.reported_at).toLocaleString('es-ES')}
                    {incident.resolved_at && (
                      <span className="ml-2">• Resuelto el {new Date(incident.resolved_at).toLocaleString('es-ES')}</span>
                    )}
                  </div>
                </div>
              ))}

              {incidents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No hay incidentes registrados</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {actionLogs.map(log => (
                <div
                  key={log.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">{log.action_type}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {log.module}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{log.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>{log.user_email}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {actionLogs.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No hay acciones registradas</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logins' && (
            <div className="space-y-3">
              {loginLogs.map(log => (
                <div
                  key={log.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <LogIn className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-slate-900">Inicio de Sesión</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-700">
                        <span>{log.user_email}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                      </div>
                      {log.ip_address && (
                        <p className="text-xs text-slate-500 mt-1">IP: {log.ip_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loginLogs.length === 0 && (
                <div className="text-center py-12">
                  <LogIn className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No hay inicios de sesión registrados</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showClearLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-4 text-center">ADVERTENCIA</h3>
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold mb-3 text-center">Esta acción eliminará:</p>
              <ul className="space-y-2 text-red-700 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="font-bold">•</span>
                  <span>TODOS los registros de acciones realizadas</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">•</span>
                  <span>TODOS los registros de inicios de sesión</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">•</span>
                  <span className="font-bold text-red-900">NO SE PUEDE DESHACER</span>
                </li>
              </ul>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Ingresa la contraseña de administrador:
              </label>
              <input
                type="password"
                value={clearLogsPassword}
                onChange={(e) => setClearLogsPassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowClearLogsModal(false);
                  setClearLogsPassword('');
                }}
                disabled={clearingLogs}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={clearAllLogs}
                disabled={clearingLogs || !clearLogsPassword}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingLogs ? 'Limpiando...' : 'Limpiar Registros'}
              </button>
            </div>
          </div>
        </div>
      )}

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
