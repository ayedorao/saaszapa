# Guía de Debugging: Página de Proveedores

## 🔍 Cómo Verificar que Todo Funciona Correctamente

---

## 1️⃣ Verificar el Campo `statusPago` en Firebase

### Paso 1: Ir a Firebase Console

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Firestore Database**
4. Busca la colección **`purchase_invoices`**

### Paso 2: Revisar Facturas

Cada factura debe tener estos campos:

```javascript
{
  invoice_number: "FINV-1234567890",
  supplier_id: "supplier_abc123",

  // ⚠️ CAMPO CRÍTICO: statusPago
  statusPago: false,  // false = pendiente, true = pagado

  // Otros campos importantes
  status: "draft",  // draft = pendiente, confirmed = pagado
  total: 11600,
  created_at: "2024-01-16T10:00:00.000Z",
  confirmed_at: null,  // null si no está pagado
  confirmed_by: null,  // null si no está pagado
  payment_confirmed_date: null,
  payment_confirmed_by: null
}
```

### ✅ Factura PENDIENTE debe verse así:
```javascript
{
  statusPago: false,
  status: "draft",
  confirmed_at: null,
  confirmed_by: null
}
```

### ✅ Factura PAGADA debe verse así:
```javascript
{
  statusPago: true,
  status: "confirmed",
  confirmed_at: "2024-01-16T10:45:30.000Z",
  confirmed_by: "user_uid_abc123",
  payment_confirmed_date: "2024-01-16T10:45:30.000Z",
  payment_confirmed_by: "user_uid_abc123"
}
```

---

## 2️⃣ Usar la Consola del Navegador (F12)

### Paso 1: Abrir la Consola

1. Abre tu aplicación en el navegador
2. Presiona **F12** (o Ctrl+Shift+I en Windows, Cmd+Option+I en Mac)
3. Ve a la pestaña **Console**

### Paso 2: Ir a Proveedores

1. En tu app, ve a la página de **Proveedores**
2. Observa los logs que aparecen automáticamente

### Logs que Verás:

```
📊 Proveedor Distribuidora XYZ: {
  facturas: 3,
  pagadas: 1,
  pendientes: 2,
  totalPaid: 25000,
  pendingPayment: 11600,
  totalOwed: 36600,
  hasPendingPayment: true
}

  📄 FINV-1234567890: {
    statusPago: false,
    status: "draft",
    isPaid: false,
    total: 11600
  }

  📄 FINV-0987654321: {
    statusPago: true,
    status: "confirmed",
    isPaid: true,
    total: 25000
  }
```

### Qué Significa:

- **`statusPago: false`** → La factura está PENDIENTE
- **`statusPago: true`** → La factura está PAGADA
- **`isPaid: false`** → NO está pagada (debe mostrar botón de Registrar Pago)
- **`isPaid: true`** → Está pagada (NO debe mostrar botón de Registrar Pago)

---

## 3️⃣ Ver Detalles de un Proveedor

### Paso 1: Click en "Ver Detalles"

1. En la página de Proveedores
2. Click en el botón "Ver Detalles" de cualquier proveedor

### Logs que Verás:

```
📋 Facturas del proveedor supplier_abc123: 3

  - FINV-1234567890: {
    statusPago: false,
    status: "draft",
    total: 11600,
    confirmed_at: null
  }

  - FINV-0987654321: {
    statusPago: true,
    status: "confirmed",
    total: 25000,
    confirmed_at: "2024-01-16T10:45:30.000Z"
  }
```

### Qué Verificar:

- ✅ Facturas con `statusPago: false` deben aparecer en ROJO
- ✅ Facturas con `statusPago: false` deben tener botón "🔒 Registrar Pago"
- ✅ Facturas con `statusPago: true` deben aparecer en VERDE
- ✅ Facturas con `statusPago: true` NO deben tener botón "Registrar Pago"

---

## 4️⃣ Registrar un Pago

### Paso 1: Click en "🔒 Registrar Pago"

1. En el historial de facturas
2. Click en "🔒 Registrar Pago" de una factura ROJA

### Logs que Verás:

```
💰 Registrando pago para factura: invoice_xyz789

📝 Datos que se actualizarán: {
  status: "confirmed",
  statusPago: true,
  confirmed_at: "2024-01-16T10:45:30.123Z",
  confirmed_by: "user_abc123"
}

✅ Factura actualizada en Firebase

🔄 Recargando detalles del proveedor...

📋 Facturas del proveedor supplier_abc123: 3

  - FINV-1234567890: {
    statusPago: true,  ← CAMBIÓ A TRUE
    status: "confirmed",
    total: 11600,
    confirmed_at: "2024-01-16T10:45:30.123Z"
  }

🔄 Recargando lista de proveedores...

📊 Proveedor Distribuidora XYZ: {
  facturas: 3,
  pagadas: 2,  ← AUMENTÓ
  pendientes: 1,  ← DISMINUYÓ
  totalPaid: 36600,  ← AUMENTÓ
  pendingPayment: 0,  ← DISMINUYÓ
  totalOwed: 36600,
  hasPendingPayment: false  ← CAMBIÓ A FALSE
}
```

### Qué Debe Pasar:

1. ✅ Aparece prompt pidiendo contraseña
2. ✅ Ingresas `140126`
3. ✅ Se actualizan los datos en Firebase
4. ✅ La factura cambia de ROJA a VERDE
5. ✅ El botón "🔒 Registrar Pago" DESAPARECE
6. ✅ Aparece mensaje de confirmación
7. ✅ La tarjeta del proveedor se actualiza (si ya no tiene deudas, deja de ser roja)

---

## 5️⃣ Problemas Comunes y Soluciones

### ❌ Problema 1: El botón "Registrar Pago" aparece en facturas pagadas

**Causa:** La factura no tiene el campo `statusPago` o está mal configurado

**Solución:**

1. Ve a Firebase Console → `purchase_invoices`
2. Busca la factura problemática
3. Verifica que tenga `statusPago: true`
4. Si NO tiene el campo, agrégalo manualmente:
   - Click en la factura
   - Click en "Add field"
   - Field name: `statusPago`
   - Type: `boolean`
   - Value: `true`
   - Save

---

### ❌ Problema 2: Factura muestra "Pagado" pero el botón sigue apareciendo

**Causa:** El badge usa `status` pero el botón ahora usa `statusPago`

**Verificación:**

1. Abre la consola (F12)
2. Busca los logs de la factura
3. Verifica:
   ```javascript
   {
     statusPago: ???,  // ← Debe ser true
     status: "confirmed",
     isPaid: ???  // ← Debe ser true
   }
   ```

**Solución:** Si `statusPago` no es `true`, actualiza la factura en Firebase.

---

### ❌ Problema 3: Al registrar pago no cambia nada

**Causa:** La actualización no se está guardando o no se está recargando

**Verificación:**

1. Abre la consola (F12)
2. Registra un pago
3. Busca estos logs:
   ```
   💰 Registrando pago para factura: [id]
   ✅ Factura actualizada en Firebase
   🔄 Recargando detalles del proveedor...
   🔄 Recargando lista de proveedores...
   ```

**Si NO ves los logs:**
- Hay un error en JavaScript (revisa la consola en rojo)
- La función no se está ejecutando

**Si SÍ ves los logs pero no cambia:**
- Refresca la página (F5)
- Ve a Firebase Console y verifica manualmente la factura

---

### ❌ Problema 4: Facturas antiguas no tienen `statusPago`

**Causa:** Las facturas fueron creadas antes de agregar el campo

**Solución Rápida:**

1. Ve a Firebase Console → `purchase_invoices`
2. Para cada factura sin `statusPago`:
   - Si `status === "confirmed"` → Agrega `statusPago: true`
   - Si `status === "draft"` → Agrega `statusPago: false`

**Solución Automática (Script):**

Crea una función para migrar facturas antiguas:

```javascript
async function migrarFacturasAntiguas() {
  const snapshot = await getDocs(collection(db, 'purchase_invoices'));

  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    const data = doc.data();

    // Si no tiene statusPago
    if (data.statusPago === undefined) {
      const statusPago = data.status === 'confirmed';
      batch.update(doc.ref, { statusPago });
      console.log(`Migrando ${doc.id}: statusPago = ${statusPago}`);
    }
  });

  await batch.commit();
  console.log('✅ Migración completada');
}
```

---

## 6️⃣ Checklist de Verificación

Usa este checklist para asegurar que todo funciona:

### ✅ Al Crear una Nueva Entrada:

- [ ] Toggle en "PAGO PENDIENTE" → Factura tiene `statusPago: false`
- [ ] Toggle en "ENTRADA PAGADA" → Factura tiene `statusPago: true`
- [ ] Consola muestra: "Estado del toggle isPaid: [true/false]"
- [ ] Consola muestra: "Datos de factura que se guardarán: {statusPago: ...}"

### ✅ En la Página de Proveedores:

- [ ] Proveedores con deuda aparecen con fondo ROJO
- [ ] Proveedores sin deuda aparecen con fondo BLANCO
- [ ] Los totales son correctos en consola

### ✅ En el Historial de Facturas:

- [ ] Facturas pendientes (`statusPago: false`) aparecen ROJAS
- [ ] Facturas pendientes tienen botón "🔒 Registrar Pago"
- [ ] Facturas pagadas (`statusPago: true`) aparecen VERDES
- [ ] Facturas pagadas NO tienen botón de registrar pago

### ✅ Al Registrar un Pago:

- [ ] Aparece prompt de contraseña
- [ ] Contraseña correcta (`140126`) → Registra el pago
- [ ] Contraseña incorrecta → Muestra error y NO registra
- [ ] Consola muestra todos los logs de actualización
- [ ] Factura cambia de ROJO a VERDE
- [ ] Botón "Registrar Pago" desaparece
- [ ] Firebase tiene todos los campos actualizados

---

## 7️⃣ Comandos Útiles de Debugging

### En la Consola del Navegador:

```javascript
// Ver todas las facturas de un proveedor
const invoicesSnap = await getDocs(
  query(
    collection(db, 'purchase_invoices'),
    where('supplier_id', '==', 'TU_SUPPLIER_ID')
  )
);

invoicesSnap.docs.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

```javascript
// Ver una factura específica
const invoiceDoc = await getDoc(doc(db, 'purchase_invoices', 'TU_INVOICE_ID'));
console.log(invoiceDoc.data());
```

```javascript
// Contar facturas por estado
const allInvoices = await getDocs(collection(db, 'purchase_invoices'));
let pagadas = 0;
let pendientes = 0;

allInvoices.docs.forEach(doc => {
  const data = doc.data();
  if (data.statusPago === true) pagadas++;
  else pendientes++;
});

console.log('Pagadas:', pagadas, 'Pendientes:', pendientes);
```

---

## 8️⃣ Logs Esperados

### Al Cargar la Página de Proveedores:

```
🔄 Cargando proveedores...
📊 Facturas cargadas: 25
📊 Items de factura cargados: 150

📊 Proveedor Nike: {
  facturas: 8,
  pagadas: 5,
  pendientes: 3,
  totalPaid: 50000,
  pendingPayment: 15000,
  ...
}

  📄 FINV-1234567890: {
    statusPago: false,
    status: "draft",
    isPaid: false,
    total: 5000
  }
```

### Al Hacer Click en "Ver Detalles":

```
📋 Facturas del proveedor supplier_abc123: 8

  - FINV-1234567890: {
    statusPago: false,
    status: "draft",
    total: 5000,
    confirmed_at: null
  }
```

### Al Registrar un Pago:

```
💰 Registrando pago para factura: invoice_xyz789
📝 Datos que se actualizarán: {...}
✅ Factura actualizada en Firebase
🔄 Recargando detalles del proveedor...
📋 Facturas del proveedor...
🔄 Recargando lista de proveedores...
📊 Proveedor...
```

---

## 🆘 Si Nada Funciona

1. **Refresca la página completamente:** Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)

2. **Limpia el caché del navegador:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data

3. **Verifica Firebase Firestore Rules:**
   - Ve a Firebase Console → Firestore Database → Rules
   - Asegúrate de que las reglas permiten lectura y escritura

4. **Verifica que estás autenticado:**
   - La variable `user` debe existir
   - En consola: `console.log(user)`

5. **Revisa errores en la consola (F12):**
   - Si hay errores en rojo, léelos cuidadosamente
   - Los errores de Firebase suelen ser claros

6. **Verifica la conexión a Firebase:**
   - Ve a Firebase Console
   - Verifica que el proyecto esté activo
   - Verifica que Firestore esté habilitado

---

## 📞 Contacto

Si después de seguir esta guía el problema persiste:

1. **Captura de pantalla de:**
   - La página de Proveedores
   - El historial de facturas
   - La consola del navegador (F12) con todos los logs

2. **Información de Firebase:**
   - Captura de pantalla de una factura problemática en Firestore
   - Muestra todos los campos, especialmente `statusPago`

3. **Describe el comportamiento esperado vs el actual**

---

**Última actualización:** 16 de Enero de 2024
**Contraseña de seguridad:** `140126`
