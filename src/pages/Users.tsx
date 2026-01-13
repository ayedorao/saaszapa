import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole, UserProfile, UserRole } from '../hooks/useUserRole';
import { Users as UsersIcon, Plus, Shield, Edit2, Lock, Unlock, Mail, Phone, Store } from 'lucide-react';

export default function Users() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'cashier' as UserRole,
    storeId: '',
    phone: '',
  });

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadStores();
    }
  }, [isAdmin]);

  async function loadUsers() {
    try {
      let snapshot;
      try {
        const usersQuery = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
        snapshot = await getDocs(usersQuery);
      } catch (indexError) {
        console.log('Ordenamiento no disponible, cargando sin orden');
        snapshot = await getDocs(collection(db, 'profiles'));
      }

      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];

      usersData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setUsers(usersData);
      console.log('Usuarios cargados:', usersData.length);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error al cargar usuarios: ' + (error as any).message);
    }
  }

  async function loadStores() {
    try {
      const snapshot = await getDocs(collection(db, 'stores'));
      const storesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.displayName) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    let tempApp;
    try {
      tempApp = initializeApp(firebaseConfig, 'tempApp-' + Date.now());
      const tempAuth = getAuth(tempApp);

      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        formData.email,
        formData.password
      );

      const newProfile: Omit<UserProfile, 'id'> = {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        storeId: formData.storeId || undefined,
        phone: formData.phone || undefined,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'profiles'), {
        ...newProfile,
        uid: userCredential.user.uid,
      });

      console.log('Usuario creado con ID:', docRef.id);
      console.log('Datos del usuario:', { ...newProfile, uid: userCredential.user.uid });

      alert('Usuario creado exitosamente');
      setShowModal(false);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Este correo electrónico ya está en uso');
      } else {
        alert('Error al crear usuario: ' + error.message);
      }
    } finally {
      if (tempApp) {
        try {
          await tempApp.delete();
        } catch (e) {
          console.error('Error deleting temp app:', e);
        }
      }
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: UserProfile) {
    if (user.email === 'crisdoraodxb@gmail.com') {
      alert('No puedes desactivar la cuenta master');
      return;
    }

    try {
      await updateDoc(doc(db, 'profiles', user.id), {
        active: !user.active,
        updatedAt: new Date().toISOString(),
      });
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    try {
      await updateDoc(doc(db, 'profiles', userId), {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar rol');
    }
  }

  function resetForm() {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      role: 'cashier',
      storeId: '',
      phone: '',
    });
    setSelectedUser(null);
  }

  function getRoleBadgeColor(role: UserRole): string {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-300',
      manager: 'bg-blue-100 text-blue-800 border-blue-300',
      inventory: 'bg-green-100 text-green-800 border-green-300',
      cashier: 'bg-slate-100 text-slate-800 border-slate-300',
    };
    return colors[role];
  }

  function getRoleLabel(role: UserRole): string {
    const labels = {
      admin: 'Administrador',
      manager: 'Gerente',
      inventory: 'Inventario',
      cashier: 'Cajero',
    };
    return labels[role];
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
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="text-slate-600 mt-1">Administra usuarios y sus permisos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tienda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">No hay usuarios registrados</p>
                    <p className="text-slate-500 text-sm">Crea tu primer usuario haciendo clic en "Nuevo Usuario"</p>
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{user.displayName}</div>
                        <div className="text-sm text-slate-500 flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                        {user.email === 'crisdoraodxb@gmail.com' && (
                          <div className="text-xs text-purple-600 font-semibold mt-1">
                            CUENTA MASTER
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      disabled={user.email === 'crisdoraodxb@gmail.com'}
                      className={`${getRoleBadgeColor(user.role)} px-3 py-1 rounded-full text-xs font-medium border ${
                        user.email === 'crisdoraodxb@gmail.com' ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="manager">Gerente</option>
                      <option value="inventory">Inventario</option>
                      <option value="cashier">Cajero</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {user.storeId ? (
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <Store className="w-4 h-4" />
                        <span>{stores.find(s => s.id === user.storeId)?.name || 'N/A'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">Todas</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.phone ? (
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      disabled={user.email === 'crisdoraodxb@gmail.com'}
                      className={`p-2 rounded-lg transition-colors ${
                        user.email === 'crisdoraodxb@gmail.com'
                          ? 'text-slate-300 cursor-not-allowed'
                          : user.active
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={user.active ? 'Desactivar' : 'Activar'}
                    >
                      {user.active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">Nuevo Usuario</h2>
              <p className="text-slate-600 mt-1">Crea una nueva cuenta de usuario</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="cashier">Cajero</option>
                  <option value="inventory">Inventario</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tienda Asignada
                </label>
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas las tiendas</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
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
