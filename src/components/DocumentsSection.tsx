import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, FileText, Shield, Database, Server, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AccessAttempt {
  user_email: string;
  timestamp: string;
  success: boolean;
  ip_address?: string;
}

export default function DocumentsSection() {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const CORRECT_PASSWORD = '140126';
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_HOURS = 24;

  useEffect(() => {
    checkLockoutStatus();
  }, [user]);

  async function checkLockoutStatus() {
    if (!user) return;

    try {
      const attemptsQuery = query(
        collection(db, 'document_access_attempts'),
        where('user_email', '==', user.email),
        where('success', '==', false),
        orderBy('timestamp', 'desc'),
        limit(MAX_ATTEMPTS)
      );

      const snapshot = await getDocs(attemptsQuery);

      if (snapshot.docs.length >= MAX_ATTEMPTS) {
        const recentAttempts = snapshot.docs.map(doc => doc.data());
        const lastAttempt = new Date(recentAttempts[0].timestamp);
        const lockoutEnd = new Date(lastAttempt.getTime() + LOCKOUT_HOURS * 60 * 60 * 1000);

        if (new Date() < lockoutEnd) {
          setLockedUntil(lockoutEnd);
          setAttempts(MAX_ATTEMPTS);
        } else {
          setAttempts(0);
        }
      }
    } catch (error) {
      console.error('Error checking lockout status:', error);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (lockedUntil && new Date() < lockedUntil) {
      setError(`Cuenta bloqueada hasta ${lockedUntil.toLocaleString('es-ES')}`);
      return;
    }

    const isCorrect = password === CORRECT_PASSWORD;

    try {
      await addDoc(collection(db, 'document_access_attempts'), {
        user_email: user?.email || 'unknown',
        timestamp: new Date().toISOString(),
        success: isCorrect,
        user_id: user?.uid || null,
      });

      if (isCorrect) {
        setIsUnlocked(true);
        setError('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutEnd = new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000);
          setLockedUntil(lockoutEnd);
          setError(`Demasiados intentos fallidos. Bloqueado por 24 horas hasta ${lockoutEnd.toLocaleString('es-ES')}`);

          await addDoc(collection(db, 'announces'), {
            type: 'minor',
            title: 'Intento de acceso no autorizado a Documentos',
            message: `El usuario ${user?.email} ha excedido el número de intentos permitidos para acceder a la sección de Documentos.`,
            active: true,
            start_date: new Date().toISOString(),
            resolution_date: lockoutEnd.toISOString(),
            created_at: new Date().toISOString(),
            created_by: 'system',
          });
        } else {
          setError(`Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}`);
        }
      }
    } catch (error) {
      console.error('Error logging access attempt:', error);
      setError('Error al procesar la solicitud');
    }

    setPassword('');
  }

  const documents = [
    {
      id: 'terms',
      title: 'Términos y Condiciones',
      icon: FileText,
      content: `
# Términos y Condiciones del Sistema POS

**Última actualización:** ${new Date().toLocaleDateString('es-ES')}

## 1. Aceptación de los Términos

Al utilizar este sistema POS (Punto de Venta), aceptas cumplir con estos términos y condiciones.

## 2. Uso del Sistema

- El sistema está diseñado exclusivamente para la gestión de ventas, inventario y operaciones comerciales.
- Cada usuario es responsable de mantener la confidencialidad de sus credenciales.
- Está prohibido compartir cuentas de usuario o credenciales de acceso.

## 3. Responsabilidades del Usuario

- Mantener la información actualizada y precisa
- Reportar cualquier problema o anomalía del sistema
- No intentar acceder a funcionalidades no autorizadas
- Seguir los procedimientos establecidos para transacciones

## 4. Propiedad Intelectual

Todo el contenido, código y funcionalidades del sistema son propiedad exclusiva y están protegidos por leyes de propiedad intelectual.

## 5. Limitación de Responsabilidad

El sistema se proporciona "tal cual" sin garantías de ningún tipo. No nos hacemos responsables por pérdidas de datos debido a uso inadecuado.

## 6. Modificaciones

Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación.

## 7. Terminación

Podemos suspender o terminar el acceso al sistema en caso de incumplimiento de estos términos.
      `
    },
    {
      id: 'privacy',
      title: 'Aviso de Privacidad',
      icon: Shield,
      content: `
# Aviso de Privacidad

**Última actualización:** ${new Date().toLocaleDateString('es-ES')}

## 1. Información que Recopilamos

### Datos Personales:
- Nombre completo
- Correo electrónico
- Número de teléfono
- Información de perfil

### Datos de Uso:
- Historial de transacciones
- Actividad en el sistema
- Logs de acceso
- Intentos de autenticación

## 2. Uso de la Información

Utilizamos tu información para:
- Gestionar tu cuenta de usuario
- Procesar transacciones
- Mejorar nuestros servicios
- Comunicaciones importantes del sistema
- Auditoría y seguridad

## 3. Almacenamiento de Datos

- Todos los datos se almacenan en Firebase/Firestore
- Utilizamos encriptación para datos sensibles
- Copias de seguridad automáticas diarias
- Retención de datos según requisitos legales

## 4. Compartir Información

NO compartimos tu información personal con terceros, excepto:
- Cuando sea requerido por ley
- Para proteger nuestros derechos legales
- Con tu consentimiento explícito

## 5. Seguridad

Implementamos medidas de seguridad incluyendo:
- Autenticación de usuarios
- Control de acceso basado en roles
- Logs de auditoría
- Monitoreo de actividad sospechosa

## 6. Tus Derechos

Tienes derecho a:
- Acceder a tus datos personales
- Solicitar corrección de datos incorrectos
- Solicitar eliminación de datos (sujeto a requisitos legales)
- Revocar consentimientos otorgados

## 7. Cookies y Tecnologías Similares

Utilizamos localStorage para:
- Mantener sesión activa
- Preferencias de usuario
- Datos de caché temporal

## 8. Contacto

Para consultas sobre privacidad, contacta al administrador del sistema.
      `
    },
    {
      id: 'data-handling',
      title: 'Manejo de Datos',
      icon: Database,
      content: `
# Manejo de Datos

**Última actualización:** ${new Date().toLocaleDateString('es-ES')}

## 1. Arquitectura de Datos

### Base de Datos Principal: Firebase Firestore

Firestore es una base de datos NoSQL en tiempo real que proporciona:
- Sincronización en tiempo real
- Escalabilidad automática
- Seguridad mediante reglas
- Consultas eficientes

### Colecciones Principales:

**profiles** - Perfiles de usuario
- Datos personales
- Configuraciones
- Estado de cuenta

**products** - Catálogo de productos
- Información del producto
- Precios
- Categorías

**product_variants** - Variantes de productos
- Tallas y colores
- Códigos de barras
- SKUs

**inventory** - Control de inventario
- Stock por tienda
- Movimientos
- Alertas de stock bajo

**sales** - Registro de ventas
- Transacciones completas
- Métodos de pago
- Estado de venta

**customers** - Base de clientes
- Información de contacto
- Historial de compras
- Programas de lealtad

**cash_sessions** - Sesiones de caja
- Apertura y cierre
- Totales por turno
- Conciliación

## 2. Seguridad de Datos

### Autenticación:
- Firebase Authentication
- Tokens JWT
- Sesiones seguras

### Autorización:
- Row Level Security (RLS)
- Control basado en roles
- Permisos granulares

### Reglas de Firestore:
- Validación de datos en escritura
- Restricción de lectura por usuario
- Prevención de operaciones no autorizadas

## 3. Backup y Recuperación

### Copias de Seguridad:
- Automáticas diarias en Firebase
- Retención de 30 días
- Exportación manual disponible

### Recuperación ante Desastres:
- Plan de contingencia establecido
- Tiempo de recuperación < 4 horas
- Pérdida de datos < 24 horas

## 4. Rendimiento

### Optimizaciones:
- Índices en campos consultados frecuentemente
- Caché en cliente para datos estáticos
- Paginación en listas grandes
- Lazy loading de imágenes

### Monitoreo:
- Firebase Performance Monitoring
- Análisis de consultas lentas
- Alertas de errores

## 5. Cumplimiento

- Cumplimiento con leyes de protección de datos
- Auditorías de seguridad periódicas
- Documentación de procesos
- Capacitación de personal
      `
    },
    {
      id: 'backend',
      title: 'Backend y Arquitectura',
      icon: Server,
      content: `
# Backend y Arquitectura del Sistema

**Última actualización:** ${new Date().toLocaleDateString('es-ES')}

## 1. Arquitectura General

### Stack Tecnológico:

**Frontend:**
- React 18 con TypeScript
- Vite como build tool
- Tailwind CSS para estilos
- Lucide React para iconos

**Backend:**
- Firebase Authentication
- Cloud Firestore (base de datos)
- Firebase Storage (archivos)
- Firebase Hosting (opcional)

**Despliegue:**
- Cloudflare Pages
- Git para control de versiones
- CI/CD automático

## 2. Estructura del Proyecto

\`\`\`
/src
  /components     - Componentes reutilizables
  /contexts       - Context API (Auth, etc.)
  /hooks          - Custom hooks
  /lib            - Configuraciones (Firebase)
  /pages          - Páginas principales
  /types          - Definiciones TypeScript
  /utils          - Utilidades y helpers
\`\`\`

## 3. Flujo de Autenticación

1. Usuario ingresa credenciales
2. Firebase Authentication valida
3. Se obtiene token JWT
4. Se cargan datos de perfil y roles
5. Se establecen permisos de sesión
6. Se aplican reglas de Firestore

## 4. Gestión de Estado

### Context API:
- AuthContext: Estado de autenticación global
- Acceso a user, profile, roles
- Funciones de login/logout

### Local State:
- useState para estado de componentes
- useEffect para side effects
- Custom hooks para lógica reutilizable

## 5. Comunicación con Firebase

### Operaciones CRUD:
\`\`\`typescript
// Create
addDoc(collection(db, 'products'), data)

// Read
getDocs(query(collection(db, 'products')))

// Update
updateDoc(doc(db, 'products', id), data)

// Delete
deleteDoc(doc(db, 'products', id))
\`\`\`

### Tiempo Real:
\`\`\`typescript
onSnapshot(query, (snapshot) => {
  // Actualización automática
})
\`\`\`

## 6. Seguridad

### Firestore Rules:
- Autenticación obligatoria
- Validación de datos
- Control de acceso por rol
- Prevención de escalación de privilegios

### Frontend:
- Sanitización de inputs
- Validación de formularios
- Protección contra XSS
- HTTPS obligatorio

## 7. Manejo de Errores

### Estrategia:
- Try-catch en operaciones async
- Logs en consola (desarrollo)
- Mensajes amigables al usuario
- Registro de errores críticos

### Recuperación:
- Reintentos automáticos en fallos de red
- Fallbacks para datos no disponibles
- Estado de loading apropiado

## 8. Optimización

### Performance:
- Code splitting
- Lazy loading de rutas
- Memoización de cálculos costosos
- Debounce en búsquedas

### Bundle:
- Tree shaking automático
- Minificación en producción
- Compresión gzip
- CDN para assets estáticos

## 9. Escalabilidad

### Horizontal:
- Firestore escala automáticamente
- Sin límite de usuarios concurrentes
- Distribución geográfica

### Vertical:
- Optimización de consultas
- Índices apropiados
- Caché estratégico

## 10. Monitoreo y Analytics

### Métricas:
- Usuarios activos
- Transacciones por día
- Errores y excepciones
- Tiempo de respuesta

### Herramientas:
- Firebase Analytics
- Firebase Performance Monitoring
- Cloudflare Analytics
- Custom logging
      `
    }
  ];

  if (lockedUntil && new Date() < lockedUntil) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Acceso Bloqueado</h3>
          <p className="text-slate-600 mb-4">
            Has excedido el número máximo de intentos permitidos.
          </p>
          <p className="text-sm text-slate-500">
            Podrás intentar nuevamente el: <br />
            <strong className="text-slate-900">{lockedUntil.toLocaleString('es-ES')}</strong>
          </p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Documentación Protegida</h3>
            <p className="text-slate-600">
              Esta sección contiene información sensible del sistema. Ingresa el código de acceso para continuar.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Código de Acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Ingresa el código"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Intentos restantes: {MAX_ATTEMPTS - attempts}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800">
          Acceso concedido a la documentación del sistema
        </p>
      </div>

      {!selectedDoc ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => {
            const Icon = doc.icon;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{doc.title}</h3>
                    <p className="text-sm text-slate-600">
                      Click para ver la documentación completa
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {documents.find(d => d.id === selectedDoc)?.title}
            </h3>
            <button
              onClick={() => setSelectedDoc(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
          <div className="p-6 prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
              {documents.find(d => d.id === selectedDoc)?.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
