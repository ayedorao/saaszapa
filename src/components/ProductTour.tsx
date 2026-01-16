import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  navigateTo?: string;
}

interface ProductTourProps {
  onComplete: () => void;
  onClose: () => void;
  isAdmin?: boolean;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="pos"]',
    title: '🛒 Punto de Venta (POS)',
    description: 'El corazón de tu tienda. Aquí realizas ventas rápidas y eficientes. El sistema soporta: búsqueda por código de barras (escanea o escribe), búsqueda manual por nombre o SKU, selección de variantes (tallas/colores), cálculo automático de precios con IVA, aplicación de descuentos, registro de clientes para puntos de lealtad, múltiples métodos de pago (efectivo, tarjeta, transferencia), y generación automática de recibos con toda la información fiscal.',
    placement: 'right',
    navigateTo: 'pos'
  },
  {
    target: '[data-tour="sales"]',
    title: '💰 Historial de Ventas',
    description: 'Consulta todas las ventas realizadas en tu tienda. Puedes ver detalles completos de cada transacción: productos vendidos, cantidades, precios, descuentos aplicados, método de pago, cliente (si se registró), fecha y hora exacta, cajero que realizó la venta. También puedes filtrar por fechas, buscar por número de venta, y exportar reportes. Cada venta muestra el desglose de IVA y el total con impuestos incluidos.',
    placement: 'right',
    navigateTo: 'sales'
  },
  {
    target: '[data-tour="products"]',
    title: '👟 Catálogo de Productos',
    description: 'Gestiona tu inventario de productos completo. Características principales: crear productos con múltiples variantes (cada combinación de talla/color es única), asignar códigos de barras automáticos o personalizados, establecer precios de compra y venta, definir precios mayorista y menudeo, agregar fotos de productos, categorizar por tipo, marca, género, añadir descripciones detalladas. El sistema calcula automáticamente márgenes de ganancia y te alerta cuando el stock está bajo.',
    placement: 'right',
    navigateTo: 'products'
  },
  {
    target: 'main',
    title: '➕ Crear Nuevo Producto',
    description: 'Al hacer clic en "Nuevo Producto" puedes agregar artículos uno por uno o usar "Entrada Masiva" para registrar múltiples productos a la vez. El formulario incluye: nombre del producto, SKU (opcional), descripción, marca, categoría, género, precios (compra, venta, mayorista, menudeo), IVA (16% por defecto), y la opción de agregar múltiples variantes con sus tallas, colores, cantidades y códigos de barras únicos.',
    placement: 'top',
    navigateTo: 'products'
  },
  {
    target: 'main',
    title: '🏷️ Sistema de Códigos de Barras',
    description: 'Cada variante de producto tiene un código de barras único. Puedes: generar códigos automáticamente usando el formato EAN-13, ingresar códigos existentes manualmente, imprimir etiquetas con código de barras (3 estilos disponibles: profesional con logo, etiqueta simple, y etiqueta para caja de zapatos), imprimir etiquetas individuales o masivas. Las etiquetas incluyen: código de barras escaneables, nombre del producto, precio, talla, color, y SKU.',
    placement: 'top',
    navigateTo: 'products'
  },
  {
    target: 'main',
    title: '🖨️ Impresión de Etiquetas',
    description: 'El sistema ofrece tres tipos de etiquetas profesionales: 1) Etiqueta Profesional: diseño elegante con logo, ideal para productos premium. 2) Etiqueta Simple: diseño minimalista y claro para uso general. 3) Etiqueta Caja de Zapatos: formato optimizado para cajas con información visible. Puedes imprimir etiquetas individuales desde cada producto o usar la función de impresión masiva para generar múltiples etiquetas a la vez.',
    placement: 'top',
    navigateTo: 'products'
  },
  {
    target: '[data-tour="inventory"]',
    title: '📦 Control de Inventario',
    description: 'Monitorea el stock en tiempo real de todas tus variantes. El sistema te muestra: cantidad actual disponible, ubicación del producto, movimientos de entrada y salida, historial completo de cambios, alertas de stock bajo, valor total del inventario. Puedes realizar ajustes manuales (con justificación obligatoria), registrar entradas por compras a proveedores, y ver estadísticas de rotación de productos.',
    placement: 'right',
    navigateTo: 'inventory'
  },
  {
    target: 'main',
    title: '📊 Movimientos de Inventario',
    description: 'Cada cambio en el inventario queda registrado automáticamente: ventas (reducción de stock), devoluciones (aumento de stock), ajustes manuales (con razón), recepciones de proveedores, traslados entre tiendas. Para cada movimiento se guarda: fecha y hora exacta, usuario que lo realizó, tipo de movimiento, cantidad afectada, variante específica, y referencias asociadas (número de venta, factura de proveedor, etc.).',
    placement: 'top',
    navigateTo: 'inventory'
  },
  {
    target: '[data-tour="customers"]',
    title: '👥 Base de Clientes',
    description: 'Administra tu cartera de clientes y programa de lealtad. Para cada cliente registras: nombre completo, teléfono, email (opcional), dirección, fecha de registro, historial completo de compras, puntos de lealtad acumulados. Los clientes ganan puntos automáticamente con cada compra y pueden canjearlos por descuentos. El sistema calcula lifetime value, frecuencia de compra, y preferencias de productos.',
    placement: 'right',
    navigateTo: 'customers'
  },
  {
    target: 'main',
    title: '🎁 Programa de Puntos',
    description: 'Sistema de lealtad integrado: los clientes acumulan 1 punto por cada $10 de compra. Los puntos se pueden canjear por descuentos en futuras compras (1 punto = $1 de descuento). El sistema valida automáticamente que el cliente tenga suficientes puntos, aplica el descuento, y deduce los puntos utilizados. Los clientes pueden ver su balance de puntos en cualquier momento y el historial de uso.',
    placement: 'top',
    navigateTo: 'customers'
  },
  {
    target: '[data-tour="suppliers"]',
    title: '🚚 Gestión de Proveedores',
    description: 'Administra tus proveedores y relaciones comerciales. Registra: nombre comercial y razón social, RFC y datos fiscales completos, contactos (teléfono, email, dirección), condiciones de pago (contado, crédito 15/30/60 días), productos que suministran, historial de compras, facturas pendientes y pagadas, saldo pendiente total. El sistema te alerta sobre pagos próximos a vencer y genera reportes de compras por proveedor.',
    placement: 'right',
    navigateTo: 'suppliers'
  },
  {
    target: 'main',
    title: '📋 Facturas de Compra',
    description: 'Registra cada compra a proveedores con factura detallada: número de factura, fecha de emisión, fecha de vencimiento, productos comprados (con cantidades, precios unitarios, subtotales), cálculo automático de IVA (16%), total de la factura, condiciones de pago, método de pago. Cuando registras una factura, el sistema actualiza automáticamente el inventario sumando las cantidades recibidas.',
    placement: 'top',
    navigateTo: 'suppliers'
  },
  {
    target: 'main',
    title: '💳 Control de Pagos a Proveedores',
    description: 'Gestiona los pagos a tus proveedores de forma organizada: visualiza facturas pendientes con semáforo (verde: al corriente, amarillo: próximo a vencer, rojo: vencido), registra pagos parciales o totales, especifica método de pago (efectivo, transferencia, cheque), agrega referencias bancarias, el sistema calcula automáticamente saldos pendientes, genera comprobantes de pago, y mantiene un historial completo de todos los pagos realizados.',
    placement: 'top',
    navigateTo: 'suppliers'
  },
  {
    target: '[data-tour="returns"]',
    title: '🔄 Devoluciones y Cambios',
    description: 'Procesa devoluciones de productos y cambios de manera simple y organizada. Tipos de operaciones: 1) Devolución: el cliente regresa el producto y recibe reembolso (efectivo, vale o nota de crédito). 2) Cambio: el cliente cambia por otra talla/color/modelo, se calcula diferencia de precio si aplica. El sistema registra: venta original, productos devueltos/cambiados, razón de la devolución, condición del producto, y actualiza automáticamente inventario y estadísticas.',
    placement: 'right',
    navigateTo: 'returns'
  },
  {
    target: 'main',
    title: '📝 Proceso de Devolución',
    description: 'Para procesar una devolución: 1) Busca la venta original por número o fecha. 2) Selecciona los productos a devolver (puedes devolver solo algunos artículos de la venta). 3) Indica la razón (defecto, talla incorrecta, no gustó, etc.). 4) Especifica la condición del producto (nuevo, usado, dañado). 5) Elige el tipo de reembolso (efectivo, vale, nota de crédito). El sistema calcula automáticamente el monto a devolver y actualiza el inventario.',
    placement: 'top',
    navigateTo: 'returns'
  },
  {
    target: 'main',
    title: '🔁 Proceso de Cambio',
    description: 'Para procesar un cambio: 1) Localiza la venta original. 2) Selecciona el producto a cambiar. 3) Elige el nuevo producto (puede ser diferente modelo). 4) El sistema calcula la diferencia de precio automáticamente. 5) Si el nuevo producto es más caro, cobra la diferencia. 6) Si es más barato, genera un vale o devuelve efectivo. 7) Actualiza inventario: suma el producto devuelto, resta el nuevo producto entregado.',
    placement: 'top',
    navigateTo: 'returns'
  },
  {
    target: '[data-tour="promotions"]',
    title: '🏷️ Promociones y Descuentos',
    description: 'Crea campañas promocionales para aumentar ventas. Tipos de promociones: 1) Descuento por producto específico (ejemplo: 20% en zapatos deportivos). 2) Descuento por categoría (ejemplo: 15% en toda la línea de dama). 3) Descuento general en tienda (ejemplo: 10% en toda la tienda). Configura: porcentaje o monto fijo de descuento, fecha de inicio y fin, productos aplicables, estado activo/inactivo. Las promociones se aplican automáticamente en el POS.',
    placement: 'right',
    navigateTo: 'promotions'
  },
  {
    target: 'main',
    title: '🎯 Configuración de Promociones',
    description: 'Al crear una promoción define: nombre descriptivo (ejemplo: "Black Friday 2024"), descripción completa para el cliente, tipo de descuento (porcentaje o monto fijo), valor del descuento (ejemplo: 25% o $500), fechas de vigencia (inicio y fin), productos incluidos (selecciona productos específicos), estado (activa o pausada). Puedes tener múltiples promociones activas simultáneamente, el sistema aplicará la que dé mayor beneficio al cliente.',
    placement: 'top',
    navigateTo: 'promotions'
  },
  {
    target: '[data-tour="cash"]',
    title: '💵 Caja Registradora',
    description: 'Gestiona el flujo de efectivo de tu caja diariamente. Funciones principales: abrir turno (registrar efectivo inicial), cerrar turno (hacer arqueo y comparar con ventas), registrar ingresos adicionales (depósitos), registrar egresos (gastos, pagos a proveedores), ver historial de movimientos del turno, generar reporte de cierre con desglose de ventas por método de pago. Cada operación requiere justificación y queda registrada con fecha, hora y usuario.',
    placement: 'right',
    navigateTo: 'cash'
  },
  {
    target: 'main',
    title: '🔓 Apertura de Caja',
    description: 'Para iniciar operaciones del día: 1) Selecciona la caja que vas a operar. 2) Cuenta y registra el efectivo inicial (billetes y monedas). 3) El sistema crea un nuevo turno con fecha/hora de apertura. 4) Queda registrado el usuario responsable. Durante el turno se registran automáticamente todas las ventas en efectivo, entradas, y salidas. Solo puedes tener un turno abierto a la vez por caja.',
    placement: 'top',
    navigateTo: 'cash'
  },
  {
    target: 'main',
    title: '🔒 Cierre de Caja',
    description: 'Para cerrar tu turno al final del día: 1) Cuenta físicamente todo el efectivo en caja. 2) Registra el total contado. 3) El sistema calcula el efectivo esperado (inicial + ventas en efectivo - egresos). 4) Muestra diferencia (faltante o sobrante). 5) Requiere justificación si hay diferencia. 6) Genera reporte detallado con: ventas totales, desglose por método de pago, ingresos adicionales, egresos, efectivo esperado vs contado. 7) Cierra el turno y ya no se pueden registrar más operaciones.',
    placement: 'top',
    navigateTo: 'cash'
  },
  {
    target: 'main',
    title: '💸 Ingresos y Egresos',
    description: 'Durante el turno puedes registrar movimientos adicionales: INGRESOS: depósitos de clientes, abonos, anticipos, otros ingresos (especifica concepto). EGRESOS: pagos a proveedores, gastos operativos (luz, agua, renta), compra de insumos, retiros, otros gastos (especifica concepto). Cada movimiento requiere: monto, concepto detallado, categoría. Todos los movimientos se reflejan en el reporte de cierre y en los reportes contables.',
    placement: 'top',
    navigateTo: 'cash'
  },
  {
    target: '[data-tour="reports"]',
    title: '📊 Reportes y Análisis',
    description: 'Centro de inteligencia de negocio con reportes completos: VENTAS: totales por período, comparativas mes a mes, ventas por producto/categoría, análisis de cajeros. INVENTARIO: productos más vendidos, productos con bajo stock, valor del inventario, rotación de productos. FINANCIEROS: ingresos vs egresos, márgenes de ganancia, cuentas por cobrar/pagar. CLIENTES: clientes frecuentes, lifetime value, productos preferidos. Todos los reportes son exportables a PDF y Excel.',
    placement: 'right',
    navigateTo: 'reports'
  },
  {
    target: 'main',
    title: '📈 Dashboard de Ventas',
    description: 'Visualiza el desempeño de tu negocio en tiempo real: tarjetas con KPIs principales (ventas del día/mes, ticket promedio, productos vendidos, nuevos clientes), gráficas de ventas por período (últimos 7 días, mes actual, año), top 10 productos más vendidos con unidades y monto, comparativa con períodos anteriores (% de crecimiento o decrecimiento), métodos de pago más utilizados, horarios pico de venta. Todo actualizado en tiempo real.',
    placement: 'top',
    navigateTo: 'reports'
  },
  {
    target: 'main',
    title: '📉 Análisis de Inventario',
    description: 'Reportes detallados de inventario: valor total del inventario actual (costo vs precio de venta), productos con stock bajo (alertas automáticas), productos sin movimiento (estancados más de 60 días), productos más rentables (mayor margen), análisis ABC (productos A: alta rotación/valor, B: media, C: baja), sugerencias de reorden (qué productos comprar basado en ventas históricas), pérdidas y mermas registradas.',
    placement: 'top',
    navigateTo: 'reports'
  },
  {
    target: '[data-tour="chat"]',
    title: '💬 Chat entre Tiendas',
    description: 'Sistema de mensajería en tiempo real para comunicación entre sucursales. Funcionalidades: conversaciones por tienda (selecciona con qué tienda hablar), mensajes instantáneos con confirmación de entrega y lectura, historial completo de conversaciones, búsqueda de mensajes antiguos, notificaciones de mensajes nuevos. Ideal para: consultar disponibilidad de productos, coordinar traslados, compartir información de clientes, resolver dudas operativas.',
    placement: 'right',
    navigateTo: 'chat'
  },
  {
    target: 'main',
    title: '📱 Uso del Chat',
    description: 'Para comunicarte con otra tienda: 1) Selecciona la tienda destino de la lista. 2) Escribe tu mensaje en el área de texto. 3) Opcionalmente adjunta información relevante (SKU de productos, número de cliente). 4) Envía el mensaje (Enter o botón enviar). 5) Recibirás respuesta en tiempo real. Los mensajes se marcan como "entregado" y "leído". El historial se mantiene para consultas futuras. Puedes buscar mensajes antiguos por palabra clave.',
    placement: 'top',
    navigateTo: 'chat'
  },
  {
    target: '[data-tour="system-control"]',
    title: '🔔 Control de Sistema (Admin)',
    description: 'Panel de administración central del sistema. Solo accesible para administradores. Funciones: crear y gestionar anuncios/notificaciones para todas las tiendas, monitorear incidentes reportados por usuarios, revisar logs del sistema, gestionar configuraciones globales, ver estadísticas de uso del sistema, administrar accesos y permisos. Los anuncios se muestran como banner en la parte superior de todas las pantallas y pueden incluir alertas importantes o información operativa.',
    placement: 'right',
    navigateTo: 'system-control'
  },
  {
    target: 'main',
    title: '📢 Crear Anuncios',
    description: 'Los administradores pueden crear anuncios para comunicarse con todo el personal: define título claro y conciso, escribe mensaje detallado con toda la información necesaria, selecciona tipo de anuncio (info, advertencia, error, éxito), establece prioridad (alta, media, baja), elige si el anuncio es obligatorio de leer, define fecha de inicio y fin de publicación. Los anuncios aparecen automáticamente en todas las tiendas como banner superior visible y pueden ser cerrados por el usuario (a menos que sean obligatorios).',
    placement: 'top',
    navigateTo: 'system-control'
  },
  {
    target: 'main',
    title: '🚨 Gestión de Incidentes',
    description: 'Monitorea y resuelve incidentes reportados: visualiza todos los incidentes abiertos con detalles (descripción, captura de pantalla si se adjuntó, usuario que reportó, fecha/hora, página donde ocurrió), clasifica incidentes por prioridad y categoría, asigna incidentes a responsables, añade notas y comentarios de seguimiento, marca incidentes como resueltos con descripción de la solución. El sistema envía notificaciones al usuario cuando su incidente ha sido atendido.',
    placement: 'top',
    navigateTo: 'system-control'
  },
  {
    target: '[data-tour="users"]',
    title: '👤 Gestión de Usuarios (Admin)',
    description: 'Administra todos los usuarios del sistema. Funciones: crear nuevos usuarios (empleados, gerentes, administradores), asignar roles y permisos específicos (qué módulos puede acceder cada usuario), activar o desactivar cuentas, cambiar contraseñas, asignar usuarios a tiendas específicas, ver historial de actividad y accesos, revisar sesiones activas. Los roles determinan qué puede hacer cada usuario: Cajero (solo POS y ventas), Gerente (acceso completo excepto administración), Admin (acceso total).',
    placement: 'right',
    navigateTo: 'users'
  },
  {
    target: 'main',
    title: '🔐 Roles y Permisos',
    description: 'Sistema de permisos granular por módulo: CAJERO: puede usar POS, ver productos, consultar clientes, procesar devoluciones básicas. GERENTE: todo lo del cajero más gestión de productos, inventario, reportes, promociones, caja registradora. ADMINISTRADOR: acceso total incluyendo gestión de usuarios, tiendas, configuración del sistema, auditorías. Puedes crear roles personalizados definiendo exactamente qué permisos tiene cada uno (lectura/escritura/eliminación por cada módulo).',
    placement: 'top',
    navigateTo: 'users'
  },
  {
    target: '[data-tour="stores"]',
    title: '🏪 Gestión de Tiendas (Admin)',
    description: 'Administra la red de sucursales. Para cada tienda registra: nombre comercial, código único de tienda, dirección completa (calle, número, colonia, ciudad, estado, CP), datos de contacto (teléfono, email), horarios de operación, gerente responsable, fecha de apertura, estado (activa/inactiva/en mantenimiento). Controla qué usuarios tienen acceso a cada tienda, visualiza estadísticas por tienda (ventas, inventario), genera reportes comparativos entre sucursales.',
    placement: 'right',
    navigateTo: 'stores'
  },
  {
    target: 'main',
    title: '📍 Configuración de Tiendas',
    description: 'Al crear o editar una tienda especifica: datos generales (nombre, código), ubicación física completa, información de contacto, configuración de operación (horarios, días laborales), integración con sistemas de pago (terminales POS autorizadas), configuración de impuestos locales si aplica, usuarios asignados a esta ubicación, cajas registradoras disponibles. Puedes desactivar temporalmente una tienda (por remodelación, por ejemplo) sin perder datos históricos.',
    placement: 'top',
    navigateTo: 'stores'
  },
  {
    target: '[data-tour="registers"]',
    title: '💰 Administración de Cajas (Admin)',
    description: 'Gestiona todas las cajas registradoras del sistema. Para cada caja: nombre o identificador único, tienda a la que pertenece, código de terminal (si aplica), estado (activa/inactiva/en mantenimiento), usuarios autorizados para operarla, configuración de periféricos (impresora de tickets, cajón de dinero, escáner), límites de efectivo (monto máximo antes de requerir corte), configuración de turnos (simple/doble turno). Visualiza turnos abiertos actualmente y su responsable.',
    placement: 'right',
    navigateTo: 'registers'
  },
  {
    target: 'main',
    title: '⚙️ Configuración de Cajas',
    description: 'Configuración detallada por caja registradora: datos básicos (nombre, código, ubicación física en tienda), hardware conectado (impresora térmica modelo X, cajón de dinero automático, escáner código de barras), configuración de impresión (tamaño de papel 80mm, logo en tickets, información fiscal), límites operativos (efectivo máximo $10,000, requiere corte parcial si se excede), permisos especiales (permitir descuentos hasta X%, devoluciones sin supervisor). Prueba de hardware integrada.',
    placement: 'top',
    navigateTo: 'registers'
  },
  {
    target: '[data-tour="chat-audit"]',
    title: '🔍 Auditoría de Chat (Admin)',
    description: 'Panel de supervisión de todas las conversaciones del sistema. Los administradores pueden: ver todas las conversaciones entre todas las tiendas (historial completo), buscar mensajes específicos por palabra clave, filtrar por tienda origen/destino, filtrar por fecha/período, revisar comunicaciones para cumplimiento de políticas, identificar uso indebido del chat, exportar conversaciones para auditoría externa. Importante: los usuarios saben que las conversaciones son monitoreables por administradores (política de privacidad).',
    placement: 'right',
    navigateTo: 'chat-audit'
  },
  {
    target: 'main',
    title: '🕵️ Herramientas de Auditoría',
    description: 'Funciones avanzadas de auditoría: búsqueda de texto completo en todos los mensajes históricos, filtros múltiples (fecha, tienda, usuario, palabras clave), línea de tiempo de conversaciones, estadísticas de uso (mensajes por día/tienda/usuario), detección de patrones inusuales, exportación de reportes en PDF, marcado de conversaciones para seguimiento. Útil para: investigación de incidentes, evaluación de comunicación entre equipos, auditorías de cumplimiento, capacitación basada en comunicaciones reales.',
    placement: 'top',
    navigateTo: 'chat-audit'
  },
  {
    target: '[data-tour="profile"]',
    title: '👤 Tu Perfil Personal',
    description: 'Personaliza tu cuenta y accede a funciones adicionales. En tu perfil puedes: actualizar tu información personal (nombre, email, teléfono), cambiar tu foto de perfil, modificar tu contraseña, configurar preferencias de notificaciones, consultar tu actividad reciente, ver tus permisos actuales, acceder a documentación del sistema, reportar errores o problemas, reiniciar este tutorial cuando lo necesites.',
    placement: 'right',
    navigateTo: 'profile'
  },
  {
    target: 'main',
    title: '📸 Foto de Perfil',
    description: 'Personaliza tu cuenta con una foto: haz clic en tu avatar actual, selecciona una imagen de tu dispositivo (formatos JPG, PNG, WebP), ajusta el encuadre si es necesario, guarda los cambios. La foto aparecerá en: tu perfil, sidebar de navegación, registros de actividad (ventas, movimientos de inventario, etc.), chat (si tu tienda usa el sistema de mensajería). Requisitos: imagen cuadrada o que pueda recortarse, peso máximo 2MB, resolución recomendada 400x400px.',
    placement: 'bottom',
    navigateTo: 'profile'
  },
  {
    target: 'main',
    title: '🔒 Cambio de Contraseña',
    description: 'Actualiza tu contraseña por seguridad: ingresa tu contraseña actual para verificar identidad, escribe la nueva contraseña (mínimo 8 caracteres, combinar letras, números y símbolos), confirma la nueva contraseña, guarda cambios. Recomendaciones de seguridad: cambiar contraseña cada 90 días, no reutilizar contraseñas anteriores, no compartir contraseñas con otros usuarios, usar contraseñas únicas que no uses en otros sitios. Si olvidas tu contraseña, contacta al administrador.',
    placement: 'bottom',
    navigateTo: 'profile'
  },
  {
    target: 'main',
    title: '📚 Documentación del Sistema',
    description: 'Accede a toda la documentación técnica y legal del sistema (protegida con código de acceso): Términos y Condiciones de Uso, Aviso de Privacidad y manejo de datos personales, Arquitectura del Sistema y tecnologías utilizadas (Firebase, Firestore, arquitectura de la aplicación), Guías de usuario detalladas por módulo, Políticas de seguridad y respaldo de datos, Información de contacto con soporte técnico. El código de acceso lo proporciona el administrador del sistema a usuarios autorizados.',
    placement: 'bottom',
    navigateTo: 'profile'
  },
  {
    target: 'main',
    title: '🐛 Reportar Incidentes',
    description: 'Si encuentras un error o problema en el sistema, repórtalo desde tu perfil: describe detalladamente el problema (qué intentabas hacer, qué pasó, qué esperabas que pasara), indica en qué página o módulo ocurrió el error, especifica si es problema recurrente o sucedió una sola vez, opcionalmente adjunta una captura de pantalla del error, agrega cualquier información adicional relevante. Los incidentes son revisados por administradores en Control de Sistema y recibirás notificación cuando se resuelva.',
    placement: 'bottom',
    navigateTo: 'profile'
  },
  {
    target: 'main',
    title: '🎓 Tutorial del Sistema',
    description: 'Puedes reiniciar este tutorial en cualquier momento desde tu perfil haciendo clic en "Iniciar Tutorial". El tutorial te guía paso a paso por todas las funcionalidades del sistema, explicando cada módulo, botón y característica. Es especialmente útil para: nuevos usuarios que se unen al equipo, refrescar conocimientos de funciones que no usas frecuentemente, descubrir características nuevas que se agregaron al sistema, capacitación de personal.',
    placement: 'bottom',
    navigateTo: 'profile'
  },
  {
    target: '[data-tour="pos"]',
    title: '✅ ¡Tutorial Completado!',
    description: 'Has completado el recorrido completo por el sistema de Punto de Venta. Ahora conoces todas las funcionalidades: POS para ventas rápidas, gestión completa de productos e inventario, administración de clientes y programa de lealtad, manejo de proveedores y facturas, devoluciones y cambios, promociones y descuentos, control de caja registradora, reportes y análisis, chat entre tiendas, y todas las funciones administrativas. Puedes reiniciar este tutorial cuando quieras desde tu perfil. ¡Comienza a usar el sistema con confianza!',
    placement: 'right',
    navigateTo: 'pos'
  }
];

export default function ProductTour({ onComplete, onClose, isAdmin = false }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const adminSteps = ['system-control', 'users', 'stores', 'registers', 'chat-audit'];
  const filteredSteps = isAdmin
    ? tourSteps
    : tourSteps.filter(step => !adminSteps.some(adminStep => step.target.includes(adminStep)));

  const step = filteredSteps[currentStep];

  useEffect(() => {
    if (step.navigateTo && !isNavigating) {
      setIsNavigating(true);
      window.dispatchEvent(new CustomEvent('navigate', { detail: step.navigateTo }));
      setTimeout(() => {
        updatePositions();
        setIsNavigating(false);
      }, 100);
    } else {
      updatePositions();
    }
  }, [currentStep, step.navigateTo]);

  useEffect(() => {
    const handleResize = () => updatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep]);

  function updatePositions() {
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });

      const placement = step.placement || 'right';
      let top = 0;
      let left = 0;

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        switch (placement) {
          case 'right':
            top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.right + window.scrollX + 20;
            break;
          case 'left':
            top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.left + window.scrollX - tooltipRect.width - 20;
            break;
          case 'top':
            top = rect.top + window.scrollY - tooltipRect.height - 20;
            left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'bottom':
            top = rect.bottom + window.scrollY + 20;
            left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
            break;
        }

        if (left + tooltipRect.width > window.innerWidth) {
          left = window.innerWidth - tooltipRect.width - 20;
        }
        if (left < 20) {
          left = 20;
        }
        if (top < 20) {
          top = 20;
        }
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
          top = window.innerHeight + window.scrollY - tooltipRect.height - 20;
        }
      }

      setTooltipPosition({ top, left });

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  function handleNext() {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      <div
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          top: `${highlightPosition.top - 8}px`,
          left: `${highlightPosition.left - 8}px`,
          width: `${highlightPosition.width + 16}px`,
          height: `${highlightPosition.height + 16}px`,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.50), 0 0 30px rgba(59, 130, 246, 0.8)',
          borderRadius: '12px',
          border: '4px solid #3b82f6',
        }}
      />

      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-2xl shadow-2xl transition-all duration-300 border-2 border-blue-500"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <div className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm font-medium text-blue-600">
                Paso {currentStep + 1} de {filteredSteps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              title="Cerrar tutorial"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex space-x-1">
              {filteredSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-slate-700 leading-relaxed text-lg">
              {step.description}
            </p>
          </div>

          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
            >
              Saltar tutorial
            </button>

            <button
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>{currentStep === filteredSteps.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
