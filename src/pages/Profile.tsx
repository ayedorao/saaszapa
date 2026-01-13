import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { Camera, Save, Mail, Phone, User, Shield, Building } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const { profile, reload } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    storeId: '',
  });
  const [photoURL, setPhotoURL] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        storeId: profile.storeId || '',
      });
      setPhotoURL(profile.photoURL || '');
    }
    loadStores();
  }, [profile]);

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

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 400;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          while (dataUrl.length > 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          if (dataUrl.length > 1024 * 1024) {
            reject(new Error('No se pudo comprimir la imagen por debajo de 1MB'));
            return;
          }

          resolve(dataUrl);
        };

        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    setImageLoading(true);
    try {
      const compressedImage = await compressImage(file);
      setPhotoURL(compressedImage);

      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          await updateDoc(profileRef, {
            photoURL: compressedImage,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(profileRef, {
            uid: user.uid,
            email: user.email,
            photoURL: compressedImage,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }

        alert('Foto de perfil actualizada exitosamente');
        reload();
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Error al subir la imagen');
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user || !formData.displayName) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileDoc = await getDoc(profileRef);

      const updateData = {
        displayName: formData.displayName,
        phone: formData.phone,
        storeId: formData.storeId || null,
        updatedAt: new Date().toISOString(),
      };

      if (profileDoc.exists()) {
        await updateDoc(profileRef, updateData);
      } else {
        await setDoc(profileRef, {
          ...updateData,
          uid: user.uid,
          email: user.email,
          role: 'cashier',
          active: true,
          createdAt: new Date().toISOString(),
        });
      }

      alert('Perfil actualizado exitosamente');
      reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  }

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      inventory: 'Inventario',
      cashier: 'Cajero',
    };
    return labels[role] || role;
  }

  function getRoleBadgeColor(role: string): string {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 border-purple-300',
      manager: 'bg-blue-100 text-blue-800 border-blue-300',
      inventory: 'bg-green-100 text-green-800 border-green-300',
      cashier: 'bg-slate-100 text-slate-800 border-slate-300',
    };
    return colors[role] || 'bg-slate-100 text-slate-800 border-slate-300';
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Debes iniciar sesión</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-slate-600 mt-1">Gestiona tu información personal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{formData.displayName.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageLoading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {imageLoading && (
              <div className="mt-3 text-sm text-blue-600">Comprimiendo imagen...</div>
            )}

            <h2 className="mt-4 text-xl font-bold text-slate-800 text-center">
              {formData.displayName || 'Usuario'}
            </h2>
            <p className="text-slate-600 text-sm flex items-center space-x-1 mt-1">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </p>

            {profile && (
              <div className={`mt-3 px-4 py-2 rounded-full text-sm font-medium border ${getRoleBadgeColor(profile.role)}`}>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>{getRoleLabel(profile.role)}</span>
                </div>
              </div>
            )}

            {profile?.email === 'crisdoraodxb@gmail.com' && (
              <div className="mt-2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold shadow-lg">
                CUENTA MASTER
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Información Personal</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu nombre completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">El correo no se puede modificar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tienda Asignada
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Todas las tiendas</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Información de la Foto</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>La imagen se comprime automáticamente para optimizar el almacenamiento</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Tamaño máximo: 1MB (se ajusta automáticamente)</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Formatos aceptados: JPG, PNG, GIF, WebP</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Recomendado: Imagen cuadrada para mejor visualización</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
