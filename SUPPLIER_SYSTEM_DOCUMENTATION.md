# Sistema de Gestión de Proveedores

## Resumen

Se ha implementado un sistema completo de gestión de proveedores con seguimiento de pagos, historial de entradas y alertas visuales para pagos pendientes.

## Características Implementadas

### 1. Página de Gestión de Proveedores

**Ubicación**: `src/pages/Suppliers.tsx`

La nueva página de proveedores incluye:

- **Vista de Tarjetas**: Cada proveedor se muestra en una tarjeta individual con:
  - Nombre y código del proveedor
  - Persona de contacto
  - Total de facturas
  - Fecha de última compra
  - Total pagado (en verde)
  - Pagos pendientes (destacado en rojo cuando aplica)

- **Alertas Visuales**:
  - Las tarjetas de proveedores con pagos pendientes se muestran con borde rojo y fondo rojo claro
  - Icono de advertencia para proveedores con deudas
  - Banner superior mostrando el total de pagos pendientes en el sistema
  - Los proveedores con pagos pendientes aparecen primero en la lista

- **Funcionalidades de Gestión**:
  - Crear nuevo proveedor
  - Editar información del proveedor
  - Eliminar proveedor (desactivación suave)
  - Búsqueda por nombre, código o contacto
  - Actualización de datos en tiempo real

### 2. Sistema de Pagos y Seguimiento

**Características del Sistema de Pagos**:

- **Cálculo Automático**:
  - Total adeudado se calcula automáticamente basado en todas las facturas del proveedor
  - Separación clara entre pagos completados y pendientes
  - IVA incluido en los cálculos (16%)

- **Estados de Factura**:
  - `draft`: Factura pendiente de pago (aparece en rojo)
  - `confirmed`: Factura pagada (aparece en verde)
  - `cancelled`: Factura cancelada

- **Modal de Detalles del Proveedor**:
  - Resumen de estadísticas (total facturas, pagado, pendiente)
  - Historial completo de facturas
  - Botón para marcar facturas como pagadas
  - Fechas de creación y confirmación de pagos

### 3. Auto-Guardado de Proveedores en Entradas

**Ubicación**: `src/components/BulkProductEntry.tsx`

**Funcionalidad Mejorada**:

- **Doble Opción de Selección**:
  - Dropdown con proveedores existentes
  - Campo de texto para crear nuevos proveedores sobre la marcha

- **Auto-Creación de Proveedores**:
  - Al escribir un nombre de proveedor nuevo, el sistema automáticamente:
    - Verifica si ya existe (case-insensitive)
    - Si no existe, lo crea automáticamente durante el guardado
    - Genera código automático (formato: PROVXXXXXX)
    - Asocia el proveedor con la factura de compra

- **Validación Inteligente**:
  - Si seleccionas de la lista, el campo de texto se deshabilita
  - Si escribes un nombre nuevo, el dropdown se limpia
  - Los proveedores duplicados se detectan y reutilizan automáticamente

### 4. Navegación

**Nueva Entrada en el Menú**:

- Ubicación: Entre "Clientes" y "Devoluciones"
- Icono: Camión (Truck)
- Etiqueta: "Proveedores"
- Requiere permiso: `products`

### 5. Base de Datos

**Colecciones de Firebase**:

1. **suppliers**:
   - `id`: ID único
   - `code`: Código del proveedor
   - `name`: Nombre
   - `contact_person`: Persona de contacto (opcional)
   - `email`: Email (opcional)
   - `phone`: Teléfono (opcional)
   - `address`: Dirección (opcional)
   - `tax_id`: RFC / Tax ID (opcional)
   - `notes`: Notas adicionales (opcional)
   - `active`: Estado activo/inactivo
   - `created_at`: Fecha de creación
   - `updated_at`: Fecha de actualización
   - `created_by`: Usuario que creó el registro

2. **purchase_invoices**:
   - `invoice_number`: Número de factura
   - `supplier_id`: ID del proveedor asociado
   - `status`: Estado (draft/confirmed/cancelled)
   - `subtotal`: Subtotal sin IVA
   - `tax_amount`: Monto de IVA
   - `total`: Total con IVA
   - `confirmed_at`: Fecha de confirmación de pago
   - `confirmed_by`: Usuario que confirmó el pago

3. **purchase_invoice_items**:
   - `invoice_id`: ID de la factura
   - `variant_id`: ID de la variante del producto
   - `supplier_id`: ID del proveedor (para items individuales)
   - `cost_price`: Precio de costo
   - `quantity`: Cantidad
   - `subtotal`: Subtotal del item

**Reglas de Seguridad**:
- Todos los usuarios autenticados tienen acceso completo a las colecciones de proveedores
- Las reglas se agregaron en `firestore.rules` para las tres colecciones

## Flujo de Trabajo

### Crear Entrada con Nuevo Proveedor:

1. Usuario va a "Productos" → Click en "Entrada"
2. En el formulario de entrada masiva:
   - Puede seleccionar un proveedor existente del dropdown, O
   - Puede escribir el nombre de un nuevo proveedor en el campo de texto
3. Al guardar, el sistema:
   - Crea automáticamente el proveedor si no existe
   - Genera la factura de compra asociada al proveedor
   - Asocia cada item con el proveedor correspondiente
   - Marca la factura como "draft" (pendiente de pago)

### Gestionar Pagos:

1. Usuario va a "Proveedores"
2. Ve tarjetas rojas para proveedores con deudas
3. Click en "Ver Detalles" de un proveedor
4. Ve listado de todas las facturas
5. Click en "Marcar como Pagado" en facturas pendientes
6. La factura cambia de rojo (draft) a verde (confirmed)
7. Los totales se actualizan automáticamente

### Buscar y Editar Proveedor:

1. Usuario va a "Proveedores"
2. Usa la barra de búsqueda para filtrar
3. Click en el botón de edición (lápiz)
4. Modifica información del proveedor
5. Guarda cambios

## Indicadores Visuales

- 🔴 **Rojo**: Pagos pendientes, facturas sin pagar
- 🟢 **Verde**: Pagos completados, proveedores al corriente
- ⚠️ **Advertencia**: Icono de alerta para llamar atención a deudas
- ✓ **Check**: Icono de completado para proveedores sin deudas

## Archivos Modificados

1. `/src/pages/Suppliers.tsx` - **NUEVO** - Página principal de gestión
2. `/src/pages/Products.tsx` - Eliminados botones innecesarios
3. `/src/components/BulkProductEntry.tsx` - Auto-guardado de proveedores
4. `/src/components/Layout/DashboardLayout.tsx` - Navegación agregada
5. `/src/App.tsx` - Routing agregado
6. `/firestore.rules` - Reglas de seguridad agregadas

## Próximos Pasos (Opcionales)

Mejoras sugeridas para futuro desarrollo:

1. **Reportes de Proveedores**:
   - Reporte de compras por proveedor
   - Análisis de costos por proveedor
   - Tendencias de precios

2. **Recordatorios de Pago**:
   - Fechas de vencimiento para facturas
   - Notificaciones automáticas
   - Términos de pago configurables

3. **Descuentos y Condiciones**:
   - Descuentos por volumen
   - Términos especiales por proveedor
   - Historial de precios negociados

4. **Exportación de Datos**:
   - Exportar lista de proveedores a Excel
   - Exportar facturas pendientes
   - Generar reportes PDF

5. **Multi-moneda**:
   - Soporte para múltiples monedas
   - Tipos de cambio automáticos
   - Conversión de pagos

## Soporte

Si encuentras algún problema o necesitas realizar ajustes, los puntos clave a revisar son:

1. **Permisos de Firebase**: Verifica las reglas en `firestore.rules`
2. **Cálculos de Totales**: Lógica en `loadSuppliers()` de `Suppliers.tsx`
3. **Auto-creación**: Lógica en `handleSubmit()` de `BulkProductEntry.tsx`
