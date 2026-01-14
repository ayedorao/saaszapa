# Guía de Despliegue en Cloudflare Pages

Este documento describe cómo desplegar el sistema POS de Zapatería en Cloudflare Pages.

## Requisitos Previos

1. Cuenta de Cloudflare
2. Repositorio Git (GitHub, GitLab, o Bitbucket)
3. Variables de entorno configuradas en Firebase

## Configuración de Cloudflare Pages

### Paso 1: Conectar tu Repositorio

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecciona **Pages** en el menú lateral
3. Haz clic en **Create a project**
4. Conecta tu cuenta de Git (GitHub, GitLab, o Bitbucket)
5. Selecciona el repositorio de tu proyecto

### Paso 2: Configurar el Build

En la configuración del proyecto, usa los siguientes valores:

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (o la ruta raíz de tu proyecto)
- **Node version**: 18 o superior

### Paso 3: Variables de Entorno

Añade las siguientes variables de entorno en Cloudflare Pages:

```
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

**Nota:** Puedes encontrar estos valores en tu archivo `.env` local o en la [Consola de Firebase](https://console.firebase.google.com/) en la configuración del proyecto.

### Paso 4: Desplegar

1. Haz clic en **Save and Deploy**
2. Cloudflare Pages comenzará el proceso de build y despliegue
3. Una vez completado, recibirás una URL de producción (ejemplo: `https://tu-proyecto.pages.dev`)

## Configuración de Dominio Personalizado (Opcional)

Si deseas usar un dominio personalizado:

1. Ve a tu proyecto en Cloudflare Pages
2. Selecciona **Custom domains**
3. Haz clic en **Set up a custom domain**
4. Sigue las instrucciones para configurar tu dominio

## Despliegues Automáticos

Cloudflare Pages se despliega automáticamente cuando:
- Haces push a la rama principal (main/master)
- Creas un Pull Request (crea un preview deployment)

## Archivos de Configuración Incluidos

### `public/_redirects`
Redirige todas las rutas a `index.html` para que funcione el enrutamiento de React.

### `public/_headers`
Configura headers de seguridad para tu aplicación:
- **X-Frame-Options**: Previene clickjacking
- **X-Content-Type-Options**: Previene MIME sniffing
- **Referrer-Policy**: Controla información del referrer
- **Permissions-Policy**: Controla permisos del navegador

## Verificación Post-Despliegue

Después del despliegue, verifica:

1. ✅ La aplicación carga correctamente
2. ✅ El login funciona con Firebase Authentication
3. ✅ Los datos se cargan desde Firestore
4. ✅ Las rutas funcionan correctamente (sin 404)
5. ✅ Los anuncios del sistema son visibles

## Solución de Problemas

### Error: "Missing or insufficient permissions"
- Verifica que las reglas de Firestore estén desplegadas
- Ejecuta: `firebase deploy --only firestore:rules`

### Error: Variables de entorno no definidas
- Asegúrate de que todas las variables `VITE_*` estén configuradas en Cloudflare Pages
- Las variables deben estar en la sección **Settings** > **Environment variables**

### Error: Página 404 en rutas
- Verifica que el archivo `public/_redirects` esté presente
- Asegúrate de que el archivo se copie al directorio `dist` durante el build

## Monitoreo

Cloudflare Pages proporciona:
- Analytics de tráfico
- Logs de despliegue
- Métricas de rendimiento

Accede a estas herramientas desde el dashboard de tu proyecto.

## Recursos Adicionales

- [Documentación de Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Firebase](https://firebase.google.com/docs)

## Notas de Seguridad

1. **NUNCA** hagas commit de tu archivo `.env` al repositorio
2. Mantén las variables de entorno solo en Cloudflare Pages
3. Revisa regularmente las reglas de seguridad de Firestore
4. Habilita autenticación de dos factores en tu cuenta de Cloudflare

## Soporte

Para problemas específicos de Cloudflare Pages, consulta:
- [Cloudflare Community](https://community.cloudflare.com/)
- [Discord de Cloudflare Developers](https://discord.gg/cloudflaredev)
