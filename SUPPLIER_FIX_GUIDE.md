# Guía de Diagnóstico y Corrección de Proveedores

## Problema Reportado

La página de proveedores no está mostrando correctamente las deudas pendientes y los pagos realizados.

## Causa del Problema

Es probable que las facturas existentes en la base de datos tengan estados incorrectos:
- Facturas que deberían estar en estado `draft` (pendiente de pago) podrían estar en estado `confirmed`
- Facturas que no tienen fecha de pago pero están marcadas como confirmadas

## Cómo Funciona la Lógica Correcta

### Estados de Facturas

**Estado `draft`** = DEUDA / PENDIENTE DE PAGO
- Cuando se hace una entrada de productos, se genera una factura con status `draft`
- Esta factura representa dinero que DEBEMOS al proveedor
- La tarjeta del proveedor debe aparecer en ROJO
- Se cuenta en "Pago Pendiente"

**Estado `confirmed`** = PAGADO
- Solo cuando marcamos manualmente la factura como pagada
- Se registra fecha de pago (`confirmed_at`) y usuario que confirmó (`confirmed_by`)
- La tarjeta del proveedor aparece normal (verde o gris)
- Se cuenta en "Total Pagado"

### Flujo de Trabajo Correcto

```
1. Usuario hace entrada de productos
   ↓
2. Sistema crea factura con status='draft'
   ↓
3. Proveedor aparece con DEUDA en rojo
   ↓
4. Usuario marca factura como pagada
   ↓
5. Factura cambia a status='confirmed'
   ↓
6. Se registra fecha y usuario de pago
   ↓
7. Proveedor ya no tiene deuda
```

## Herramientas de Diagnóstico

He agregado dos botones nuevos en la página de proveedores:

### 1. Botón "Debug" (Azul)

**Qué hace:**
- Muestra información detallada en la consola del navegador
- Lista todos los proveedores con sus facturas
- Muestra claramente qué facturas están pendientes y cuáles pagadas
- Calcula los montos correctos

**Cómo usarlo:**
1. Ve a la página de Proveedores
2. Haz clic en el botón "Debug" (azul con ícono de bug)
3. Abre la consola del navegador (presiona F12)
4. Revisa la información mostrada

**Ejemplo de salida:**
```
🔍 DEBUG: Estado actual de proveedores

📦 Total proveedores: 3
📋 Total facturas: 5
📦 Total items: 15

🏪 Proveedor: Distribuidora XYZ (PROV123456)
   📋 Total facturas: 2
   ❌ Pendientes de pago (draft): 1 = $5000.00
   ✅ Pagadas (confirmed): 1 = $3000.00
   🔴 TIENE DEUDA: $5000.00
      ❌ FINV-1234567890 - PENDIENTE - $5000.00
      ✅ FINV-9876543210 - PAGADO - $3000.00
```

### 2. Botón "Corregir" (Naranja)

**Qué hace:**
- Busca todas las facturas con estado `confirmed` que NO tienen fecha de pago
- Las cambia automáticamente a estado `draft` (pendiente)
- Esto corrige facturas que fueron marcadas incorrectamente

**Cómo usarlo:**
1. PRIMERO usa el botón "Debug" para ver qué facturas están mal
2. Haz clic en el botón "Corregir" (naranja con ícono de llave)
3. Confirma la acción
4. Espera a que se complete
5. Revisa el resumen mostrado
6. Haz clic en "Actualizar" para recargar los datos

**Ejemplo de resultado:**
```
Corrección completada:

✅ Facturas correctas: 3
🔧 Facturas corregidas: 2
📋 Total: 5

Revisa la consola para más detalles.
```

## Proceso Completo de Diagnóstico y Corrección

### Paso 1: Verificar el Problema

1. Abre la página de Proveedores
2. Observa si los proveedores muestran información incorrecta
3. Abre la consola del navegador (F12)
4. Haz clic en "Debug"
5. Revisa la información mostrada

**Busca:**
- ¿Hay proveedores con facturas "Pagadas" que no deberían estarlo?
- ¿Hay facturas con status `confirmed` pero sin fecha de pago?
- ¿Los montos pendientes son incorrectos?

### Paso 2: Corregir las Facturas

1. Haz clic en "Corregir"
2. Lee el mensaje de confirmación
3. Confirma la acción
4. Espera el mensaje de resultado
5. Haz clic en "Actualizar"

### Paso 3: Verificar la Corrección

1. Haz clic en "Debug" nuevamente
2. Verifica que ahora las facturas tengan el estado correcto
3. Revisa que las tarjetas de proveedores muestren:
   - Proveedores con deuda = ROJO
   - Proveedores al corriente = VERDE/GRIS
4. Verifica los montos en cada tarjeta

### Paso 4: Prueba el Flujo Completo

1. Crea una nueva entrada de productos con un proveedor existente
2. Ve a Proveedores
3. Verifica que el proveedor muestre la nueva deuda en rojo
4. Haz clic en "Ver Detalles"
5. Encuentra la factura nueva (debe decir "Pendiente de Pago")
6. Haz clic en "Ver Factura" para ver el documento completo
7. Haz clic en "Marcar como Pagado"
8. Confirma el pago
9. Verifica que la factura cambie a verde "Pagado"
10. Verifica que la tarjeta del proveedor se actualice

## Estructura de Datos en Firestore

### Colección: purchase_invoices

```javascript
{
  id: "abc123",
  invoice_number: "FINV-1234567890",
  supplier_id: "supplier_xyz",
  status: "draft",  // ← "draft" = PENDIENTE, "confirmed" = PAGADO
  subtotal: 10000,
  tax_amount: 1600,
  total: 11600,
  notes: "",
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z",
  confirmed_at: null,  // ← NULL si está pendiente
  confirmed_by: null,  // ← NULL si está pendiente
  created_by: "user_123"
}
```

**Cuando se marca como pagado:**
```javascript
{
  // ... otros campos igual
  status: "confirmed",  // ← Cambia a confirmed
  confirmed_at: "2024-01-20T15:30:00.000Z",  // ← Se agrega fecha
  confirmed_by: "user_123",  // ← Se agrega usuario
  updated_at: "2024-01-20T15:30:00.000Z"  // ← Se actualiza
}
```

## Códigos de la Lógica

### Cálculo de Totales (Suppliers.tsx:118-123)

```typescript
const paidInvoices = supplierInvoices.filter(inv => inv.status === 'confirmed');
const unpaidInvoices = supplierInvoices.filter(inv => inv.status === 'draft');

const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
const pendingPayment = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
const totalOwed = totalPaid + pendingPayment;
```

### Visualización en Tarjetas (Suppliers.tsx:461-484)

```typescript
<div className="flex items-center justify-between py-2 border-b border-slate-200">
  <span className="text-sm text-slate-600">Total Pagado:</span>
  <span className="font-semibold text-green-700">
    ${supplier.totalPaid.toFixed(2)}
  </span>
</div>

<div className={`flex items-center justify-between py-2 ${
  supplier.hasPendingPayment ? 'bg-red-100 -mx-4 px-4 rounded-lg' : ''
}`}>
  <span className={`text-sm font-semibold ${
    supplier.hasPendingPayment ? 'text-red-900' : 'text-slate-600'
  }`}>
    {supplier.hasPendingPayment ? 'Pago Pendiente:' : 'Sin Pagos Pendientes'}
  </span>
  {supplier.hasPendingPayment && (
    <div className="flex items-center space-x-1">
      <DollarSign className="w-5 h-5 text-red-700" />
      <span className="text-lg font-bold text-red-900">
        ${supplier.pendingPayment.toFixed(2)}
      </span>
    </div>
  )}
</div>
```

## Preguntas Frecuentes

### ¿Por qué las entradas no se muestran como deuda?

**R:** Probablemente las facturas se crearon con estado `confirmed` en lugar de `draft`. Usa el botón "Corregir" para arreglarlo.

### ¿Qué pasa si marco una factura como pagada por error?

**R:** Puedes ir manualmente a Firestore y cambiar:
- `status`: de `confirmed` a `draft`
- `confirmed_at`: eliminar el valor (null)
- `confirmed_by`: eliminar el valor (null)

### ¿Cómo puedo ver los logs en la consola?

**R:**
1. En Chrome/Edge: Presiona F12 o clic derecho → Inspeccionar → pestaña "Console"
2. En Firefox: Presiona F12 → pestaña "Consola"
3. En Safari: Desarrollador → Mostrar Consola JavaScript

### ¿Los cambios afectan las facturas existentes?

**R:** El botón "Corregir" solo cambia facturas que tienen estado incorrecto (confirmed sin fecha de pago). Las facturas correctas no se modifican.

### ¿Puedo deshacer la corrección?

**R:** No hay un botón de deshacer, pero puedes ver en la consola qué facturas fueron modificadas y cambiarlas manualmente en Firestore si es necesario.

## Archivos Involucrados

1. **`/src/pages/Suppliers.tsx`**
   - Lógica principal de proveedores
   - Cálculos de totales
   - Visualización de tarjetas
   - Botones de debug y corrección

2. **`/src/utils/fixSupplierInvoices.ts`**
   - Función `fixSupplierInvoices()` - Corrige estados
   - Función `showSuppliersDebugInfo()` - Muestra debug

3. **`/src/components/SupplierInvoiceView.tsx`**
   - Vista de factura comercial completa
   - Información fiscal y bancaria
   - Impresión y descarga

4. **`/src/components/BulkProductEntry.tsx`**
   - Crea facturas con status `draft`
   - Genera supplier_id correcto

## Soporte Adicional

Si después de seguir estos pasos el problema persiste:

1. **Revisa Firestore directamente:**
   - Ve a Firebase Console
   - Abre Firestore Database
   - Revisa la colección `purchase_invoices`
   - Verifica los campos `status`, `confirmed_at`, `supplier_id`

2. **Verifica logs de consola:**
   - Busca errores en rojo
   - Revisa los logs de cada proveedor
   - Verifica que supplier_id exista en las facturas

3. **Limpia caché del navegador:**
   - Presiona Ctrl+Shift+Delete
   - Limpia caché e imágenes
   - Recarga la página (Ctrl+F5)

4. **Verifica permisos de Firestore:**
   - Asegúrate de que tu usuario puede leer/escribir en las colecciones
   - Revisa las reglas de Firestore

## Conclusión

Con estas herramientas puedes:
- ✅ Diagnosticar exactamente qué está mal
- ✅ Corregir automáticamente facturas con estados incorrectos
- ✅ Verificar que la corrección funcionó
- ✅ Entender la lógica correcta del sistema

La lógica ahora está correcta en el código. Si hay problemas, son datos históricos con estados incorrectos que se pueden corregir fácilmente.
