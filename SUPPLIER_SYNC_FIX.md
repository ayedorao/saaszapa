# Correcciones del Sistema de Proveedores - Sincronización Completa

## Problemas Corregidos

### 1. Campo de Proveedor No Permitía Escritura

**Problema Original:**
- El campo de texto para escribir nuevos proveedores estaba deshabilitado o no respondía a la entrada del usuario
- Se utilizaba `updateRow()` que no actualizaba correctamente el estado de las filas

**Solución Implementada:**
- Reemplazado el uso de `updateRow()` con `setRows()` directamente en el `onChange`
- Agregado `bg-white` a las clases CSS para asegurar que el input sea visible y clickeable
- Implementada lógica de limpieza automática: cuando escribes un nombre, el dropdown se limpia, y viceversa

**Código Corregido:**
```typescript
<input
  type="text"
  value={row.supplier_name}
  onChange={(e) => {
    const newSupplierName = e.target.value;
    setRows(rows.map(r => {
      if (r.id === row.id) {
        return {
          ...r,
          supplier_name: newSupplierName,
          supplier_id: newSupplierName ? '' : r.supplier_id
        };
      }
      return r;
    }));
  }}
  placeholder="O escribir nuevo"
  className="w-32 px-2 py-1 border border-slate-300 rounded text-xs italic bg-white"
  disabled={!!row.supplier_id}
/>
```

### 2. Sincronización de Datos con Proveedores

**Problema Original:**
- Los proveedores se creaban dentro de un batch de Firestore junto con productos
- Si el batch fallaba, los proveedores no se creaban
- Los IDs de proveedores no se asignaban correctamente a las facturas e items
- La capitalización del nombre no se preservaba

**Solución Implementada:**

#### A. Creación Separada de Proveedores
Los proveedores ahora se crean **ANTES** del batch principal:

```typescript
// PASO 1: Crear proveedores únicos primero
const supplierMap = new Map<string, string>();
const uniqueSupplierNames = new Set<string>();

// Recopilar nombres únicos
for (const row of rows) {
  if (row.supplier_name && !row.supplier_id) {
    uniqueSupplierNames.add(row.supplier_name.toLowerCase());
  }
}

// Preservar capitalización original
const supplierNameMap = new Map<string, string>();
for (const row of rows) {
  if (row.supplier_name) {
    supplierNameMap.set(row.supplier_name.toLowerCase(), row.supplier_name);
  }
}

// PASO 2: Crear cada proveedor único
for (const supplierNameLower of uniqueSupplierNames) {
  const existingSupplier = suppliers.find(
    s => s.name.toLowerCase() === supplierNameLower
  );

  if (existingSupplier) {
    supplierMap.set(supplierNameLower, existingSupplier.id);
  } else {
    const originalName = supplierNameMap.get(supplierNameLower) || supplierNameLower;
    const newSupplierRef = await addDoc(collection(db, 'suppliers'), {
      code: `PROV${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
      name: originalName,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.uid
    });
    supplierMap.set(supplierNameLower, newSupplierRef.id);
  }
}

// PASO 3: Ahora crear productos, variantes e inventario con IDs válidos
```

#### B. Asignación Correcta de IDs

```typescript
// Para cada item de factura
const finalSupplierId = row.supplier_id ||
  (row.supplier_name ? supplierMap.get(row.supplier_name.toLowerCase()) : null) ||
  null;

// Guardar item con supplier_id correcto
invoiceItems.push({
  invoice_id: invoiceRef.id,
  variant_id: variantRef.id,
  product_name: `${row.brand} ${row.name} - ${size?.name} ${color?.name}`,
  supplier_id: finalSupplierId,  // ✅ ID correcto asignado
  cost_price: parseFloat(row.base_cost),
  quantity: quantity,
  subtotal: itemSubtotal,
  created_at: new Date().toISOString(),
});
```

#### C. Factura Principal con Proveedor

```typescript
const primarySupplierId = rows[0]?.supplier_id ||
  (rows[0]?.supplier_name ? supplierMap.get(rows[0].supplier_name.toLowerCase()) : null) ||
  null;

batch.set(invoiceRef, {
  invoice_number: invoiceNumber,
  supplier_id: primarySupplierId,  // ✅ Proveedor principal asignado
  status: 'draft',
  subtotal: invoiceSubtotal,
  tax_amount: taxAmount,
  total: total,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: user.uid,
});
```

### 3. Mejoras en Página de Proveedores

**Agregados:**
- Logs de consola para debugging
- Manejo de errores mejorado con mensajes específicos
- Recarga automática de datos cuando se confirman pagos
- Cálculo correcto de totales basado en facturas confirmadas vs. pendientes

```typescript
console.log('Proveedores cargados:', suppliersData.length);
console.log('Facturas cargadas:', invoicesData.length);
console.log('Items de factura cargados:', itemsData.length);

console.log(`Proveedor ${supplier.name}:`, {
  facturas: supplierInvoices.length,
  items: supplierItems.length,
  totalPaid,
  pendingPayment,
  totalOwed
});
```

## Flujo Completo de Datos

### Al Crear una Entrada:

1. ✅ Usuario escribe nombre de proveedor en el campo de texto
2. ✅ Sistema verifica si el proveedor ya existe (case-insensitive)
3. ✅ Si no existe, lo crea en Firebase con el nombre capitalizado original
4. ✅ Sistema obtiene el ID del proveedor (existente o nuevo)
5. ✅ Crea productos, variantes e inventario
6. ✅ Crea factura de compra con `supplier_id` correcto
7. ✅ Crea items de factura, cada uno con su `supplier_id`
8. ✅ Todos los registros están vinculados correctamente

### Al Visualizar Proveedores:

1. ✅ Sistema carga todos los proveedores activos
2. ✅ Carga todas las facturas de compra
3. ✅ Carga todos los items de facturas
4. ✅ Agrupa facturas por proveedor usando `supplier_id`
5. ✅ Calcula totales:
   - **Total Pagado**: Suma de facturas confirmadas
   - **Pago Pendiente**: Suma de facturas en draft
   - **Total Adeudado**: Pagado + Pendiente
6. ✅ Muestra tarjetas rojas para proveedores con deudas
7. ✅ Ordena proveedores con deudas primero

## Logs de Debugging

Para verificar el funcionamiento correcto, revisa la consola del navegador:

```javascript
// Al crear entrada:
"Proveedor existente encontrado: Proveedor ABC ID: abc123"
// O
"Proveedor creado: Proveedor XYZ con ID: xyz789"

"Item con supplier_id: xyz789 para producto: Zapato Deportivo"
"Factura con supplier_id principal: xyz789"
"Productos creados exitosamente: 5"
"Items de factura: 5"

// Al cargar proveedores:
"Proveedores cargados: 10"
"Facturas cargadas: 25"
"Items de factura cargados: 150"

"Proveedor ABC: {
  facturas: 3,
  items: 15,
  totalPaid: 5000,
  pendingPayment: 2000,
  totalOwed: 7000
}"
```

## Verificación de Datos

Para verificar que todo funciona correctamente:

### 1. Crear Nueva Entrada
```
1. Ir a "Productos" → Click "Entrada"
2. Escribir nombre de proveedor en el campo de texto (ej: "Proveedor ABC")
3. Llenar resto de campos (producto, talla, color, cantidad, costo)
4. Click "Guardar y Generar Factura"
5. ✅ Verificar alerta de éxito
6. ✅ Verificar en consola los logs de creación
```

### 2. Verificar en Proveedores
```
1. Ir a "Proveedores"
2. ✅ El nuevo proveedor debe aparecer en la lista
3. ✅ Debe mostrar 1 factura
4. ✅ Debe tener pago pendiente (tarjeta roja)
5. ✅ Click "Ver Detalles"
6. ✅ Ver factura en el historial con estado "Pendiente"
7. ✅ El total debe coincidir con el costo de la entrada
```

### 3. Marcar como Pagado
```
1. En el modal de detalles, click "Marcar como Pagado"
2. ✅ La factura cambia de rojo a verde
3. ✅ Total Pagado se actualiza
4. ✅ Pago Pendiente se reduce a $0
5. ✅ Tarjeta del proveedor cambia de roja a normal
```

## Archivos Modificados

1. `/src/components/BulkProductEntry.tsx`:
   - Corregido campo de entrada de proveedor
   - Separada creación de proveedores del batch principal
   - Preservación de capitalización
   - Asignación correcta de IDs
   - Logs de debugging

2. `/src/pages/Suppliers.tsx`:
   - Agregados logs de debugging
   - Mejorado manejo de errores
   - Clarificados cálculos de totales

## Notas Importantes

1. **Case-Insensitive**: Los nombres de proveedores se comparan sin importar mayúsculas/minúsculas para evitar duplicados
2. **Preservación de Formato**: El nombre se guarda exactamente como el usuario lo escribió
3. **IDs Únicos**: Cada proveedor obtiene un código único `PROVXXXXXX`
4. **Transacciones Separadas**: Los proveedores se crean ANTES del batch para garantizar que tengan IDs válidos
5. **Estado Draft**: Las facturas nuevas siempre se crean en estado "draft" (pendiente de pago)

## Próximos Pasos Sugeridos

1. Agregar fecha de vencimiento para pagos
2. Notificaciones para pagos vencidos
3. Historial de pagos parciales
4. Notas en cada pago
5. Exportar reporte de proveedores a PDF/Excel
