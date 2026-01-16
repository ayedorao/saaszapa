# Sistema de Seguridad de Pagos a Proveedores

## 🔒 Protección Contra Fraudes

El sistema ahora incluye una capa de seguridad con contraseña para confirmar pagos y prevenir fraudes.

---

## 📋 Flujo Completo del Sistema

### 1️⃣ Registro de Entrada de Productos

#### Al Hacer una Entrada Masiva de Productos:

**Ubicación:** Productos → "Entrada Masiva"

**Toggle de Estado de Pago:**
- ⚪ **PAGO PENDIENTE** (predeterminado) → Deuda con proveedor
- 🟢 **ENTRADA PAGADA** → Ya pagado

**Campos que se Guardan:**

```javascript
// En Productos
{
  code: "SKU001",
  name: "Zapato Deportivo",
  statusPago: false,  // ← NUEVO CAMPO
  // ... otros campos
}

// En Factura (purchase_invoices)
{
  invoice_number: "FINV-1234567890",
  supplier_id: "supplier_abc",
  status: "draft",           // draft = pendiente, confirmed = pagado
  statusPago: false,          // ← NUEVO CAMPO
  subtotal: 10000,
  tax_amount: 1600,
  total: 11600,
  created_at: "2024-01-16T10:30:00.000Z",
  confirmed_at: null,         // Se llena cuando se paga
  confirmed_by: null,         // Se llena cuando se paga
  payment_confirmed_date: null,
  payment_confirmed_by: null
}
```

---

### 2️⃣ Visualización en Tarjetas de Proveedores

**Proveedor CON Deuda Pendiente:**
```
┌─────────────────────────────────────────┐
│ 🔴 [TARJETA ROJA - Fondo Rojo]         │
│                                          │
│  ⚠️  Distribuidora XYZ                  │
│      PROV001                             │
│                                          │
│  💵 Pago Pendiente: $11,600.00          │
│  ✅ Total Pagado: $25,000.00            │
│                                          │
│  [Ver Detalles] [✏️] [🗑️]              │
└──────────────────────────────────────────┘
```

**Proveedor SIN Deuda:**
```
┌─────────────────────────────────────────┐
│ ⚪ [TARJETA NORMAL - Fondo Blanco]      │
│                                          │
│  ✅  Distribuidora ABC                  │
│      PROV002                             │
│                                          │
│  ✅ Sin Pagos Pendientes                │
│  ✅ Total Pagado: $50,000.00            │
│                                          │
│  [Ver Detalles] [✏️] [🗑️]              │
└──────────────────────────────────────────┘
```

---

### 3️⃣ Historial de Facturas

**Click en "Ver Detalles" del Proveedor:**

#### Factura PENDIENTE (statusPago = false):
```
┌──────────────────────────────────────────────┐
│ 🔴 [BORDE ROJO - Fondo Rojo Claro]          │
│                                              │
│ FINV-1234567890  [Pendiente de Pago] 🔴     │
│ Fecha: 16/01/2024                            │
│                                              │
│                             $11,600.00       │
│                                              │
│      [📄 Ver Factura]                       │
│      [🔒 Registrar Pago]  ← CON CANDADO     │
└──────────────────────────────────────────────┘
```

#### Factura PAGADA (statusPago = true):
```
┌──────────────────────────────────────────────┐
│ 🟢 [BORDE VERDE - Fondo Verde Claro]        │
│                                              │
│ FINV-9876543210  [Pagado] ✅                │
│ Fecha: 10/01/2024                            │
│ Pagado: 12/01/2024 10:30:45                  │
│                                              │
│                             $25,000.00       │
│                                              │
│      [📄 Ver Factura]                       │
│      (Sin botón de pago - ya está pagado)    │
└──────────────────────────────────────────────┘
```

---

## 🔐 Proceso de Registro de Pago SEGURO

### Paso a Paso:

#### 1. Usuario hace click en "🔒 Registrar Pago"

#### 2. Aparece ventana de seguridad:
```
┌─────────────────────────────────────────────┐
│  🔒 SEGURIDAD                               │
│                                             │
│  Ingrese la contraseña para confirmar       │
│  el pago                                    │
│                                             │
│  (Capa de protección contra fraudes)       │
│                                             │
│  Contraseña: [__________]                  │
│                                             │
│           [Cancelar] [Aceptar]             │
└─────────────────────────────────────────────┘
```

#### 3. Usuario ingresa contraseña: `140126`

#### 4A. Si la contraseña es CORRECTA:

```javascript
// Se actualiza la factura en Firebase:
{
  status: "confirmed",
  statusPago: true,
  confirmed_at: "2024-01-16T10:45:30.000Z",
  confirmed_by: "user_uid_abc123",
  payment_confirmed_date: "2024-01-16T10:45:30.000Z",
  payment_confirmed_by: "user_uid_abc123",
  updated_at: "2024-01-16T10:45:30.000Z"
}
```

**Mensaje de Confirmación:**
```
┌─────────────────────────────────────────────┐
│  ✅ Pago registrado exitosamente            │
│                                             │
│  Fecha y hora:                              │
│  16 de enero de 2024, 10:45:30             │
│                                             │
│  Registrado por: admin@empresa.com          │
│                                             │
│              [Aceptar]                      │
└─────────────────────────────────────────────┘
```

**Resultado:**
- ✅ La factura cambia de ROJA a VERDE
- ✅ Badge cambia de "Pendiente de Pago" a "Pagado"
- ✅ Se muestra la fecha y hora del pago
- ✅ El botón "🔒 Registrar Pago" DESAPARECE
- ✅ Solo queda el botón "📄 Ver Factura"
- ✅ La tarjeta del proveedor se actualiza automáticamente
- ✅ El monto pasa de "Pendiente" a "Total Pagado"

#### 4B. Si la contraseña es INCORRECTA:

**Mensaje de Error:**
```
┌─────────────────────────────────────────────┐
│  ❌ Contraseña incorrecta                   │
│                                             │
│  No se puede confirmar el pago.             │
│                                             │
│              [Aceptar]                      │
└─────────────────────────────────────────────┘
```

**Resultado:**
- ❌ NO se registra el pago
- ❌ La factura permanece PENDIENTE
- ❌ El proveedor sigue con deuda

#### 4C. Si el usuario cancela:

**Resultado:**
- ❌ NO se registra el pago
- ❌ La factura permanece PENDIENTE
- ❌ Se cierra la ventana sin cambios

---

## 🔑 Contraseña de Seguridad

### Contraseña Actual: `140126`

**Importante:**
- Solo personal autorizado debe conocer esta contraseña
- La contraseña protege contra registros de pago accidentales o fraudulentos
- Cada confirmación de pago queda registrada con:
  - ✅ Fecha y hora exacta
  - ✅ Usuario que confirmó el pago
  - ✅ Email del usuario

**Cambiar la Contraseña:**

Para cambiar la contraseña, edita el archivo:
`src/pages/Suppliers.tsx`

Busca la línea:
```javascript
if (password !== '140126') {
```

Y cambia `'140126'` por tu nueva contraseña.

---

## 📊 Estados del Sistema

### Estado 1: Factura Pendiente
```javascript
{
  status: "draft",
  statusPago: false,
  confirmed_at: null,
  confirmed_by: null
}
```
**Visualización:**
- 🔴 Tarjeta roja
- Badge "Pendiente de Pago"
- Botones: "Ver Factura" y "🔒 Registrar Pago"
- Cuenta en "Pago Pendiente"

---

### Estado 2: Factura Pagada
```javascript
{
  status: "confirmed",
  statusPago: true,
  confirmed_at: "2024-01-16T10:45:30.000Z",
  confirmed_by: "user_abc",
  payment_confirmed_date: "2024-01-16T10:45:30.000Z",
  payment_confirmed_by: "user_abc"
}
```
**Visualización:**
- 🟢 Tarjeta verde
- Badge "Pagado"
- Fecha de pago mostrada
- Botón: SOLO "Ver Factura"
- Cuenta en "Total Pagado"

---

## 🎯 Casos de Uso

### Caso 1: Entrada de Productos a Crédito

**Escenario:** Recibes productos pero pagarás después

**Pasos:**
1. Productos → "Entrada Masiva"
2. Llena los productos
3. **Deja el toggle en "PAGO PENDIENTE"** ⚪
4. Guarda
5. El proveedor aparece con tarjeta ROJA 🔴
6. Cuando pagues:
   - Ve a Proveedores
   - Click en "Ver Detalles"
   - Busca la factura ROJA
   - Click en "🔒 Registrar Pago"
   - Ingresa contraseña: `140126`
   - Confirma
7. ✅ Pago registrado con fecha, hora y usuario

---

### Caso 2: Entrada de Productos de Contado

**Escenario:** Pagas al recibir los productos

**Pasos:**
1. Productos → "Entrada Masiva"
2. Llena los productos
3. **Activa el toggle a "ENTRADA PAGADA"** 🟢
4. Guarda
5. ✅ El proveedor NO aparece con deuda
6. ✅ La factura ya está marcada como pagada
7. ✅ NO necesitas registrar pago después

---

### Caso 3: Pago Parcial

**Escenario:** Das un anticipo pero queda saldo pendiente

**Opción A - Dos Entradas:**
1. Primera entrada (anticipo): Toggle en "ENTRADA PAGADA" 🟢
2. Segunda entrada (pendiente): Toggle en "PAGO PENDIENTE" ⚪
3. Cuando pagues el resto: "🔒 Registrar Pago" con contraseña

**Opción B - Una Entrada:**
1. Entrada completa: Toggle en "PAGO PENDIENTE" ⚪
2. Cuando pagues: "🔒 Registrar Pago" con contraseña
3. (El sistema actualmente no soporta pagos parciales, solo completo)

---

## 🛡️ Seguridad y Auditoría

### Información que se Registra en Cada Pago:

```javascript
{
  // Fecha y hora exacta del pago
  confirmed_at: "2024-01-16T10:45:30.123Z",
  payment_confirmed_date: "2024-01-16T10:45:30.123Z",

  // Usuario que registró el pago
  confirmed_by: "user_uid_abc123",
  payment_confirmed_by: "user_uid_abc123",

  // Estado actualizado
  status: "confirmed",
  statusPago: true
}
```

### Para Ver el Historial de Auditoría:

1. **En la Consola del Navegador (F12):**
   - Ve a Proveedores
   - Click en "Debug" (botón azul)
   - Revisa todas las facturas con sus estados

2. **En Firebase Console:**
   - Ve a Firestore Database
   - Collection: `purchase_invoices`
   - Busca la factura específica
   - Revisa los campos `confirmed_by` y `payment_confirmed_date`

3. **En el Usuario:**
   - Ve a Proveedores
   - Click en "Ver Detalles" del proveedor
   - Busca la factura pagada (verde)
   - Verás "Pagado: [fecha]"

---

## ⚠️ Ventajas del Sistema de Contraseña

### ✅ Protección Contra:

1. **Clicks Accidentales**
   - No se puede marcar como pagado por error
   - Se requiere confirmación consciente

2. **Fraude Interno**
   - Solo personal autorizado tiene la contraseña
   - Cada pago queda registrado con usuario y fecha
   - Auditoría completa disponible

3. **Errores de Usuario**
   - El prompt de contraseña hace que el usuario piense dos veces
   - Descripción clara de que es "protección contra fraudes"

4. **Disputas**
   - Registro completo de quién y cuándo se registró cada pago
   - Timestamps precisos con milisegundos
   - Usuario autenticado registrado

---

## 🔍 Diagnóstico y Troubleshooting

### Problema: "Las facturas se guardan como pagadas cuando deberían ser pendientes"

**Verificación:**

1. **Revisar el Toggle:**
   ```
   En Entrada Masiva → Footer
   ¿El toggle está en "PAGO PENDIENTE" (⚪)?
   Si está en "ENTRADA PAGADA" (🟢) → Se guardará como pagado
   ```

2. **Revisar la Consola del Navegador (F12):**
   ```
   Al guardar, busca estos logs:
   "Estado del toggle isPaid: false"  ← Debe ser false para pendiente
   "Estado de pago que se guardará: Pendiente (draft)"
   "Datos de factura que se guardarán: {status: 'draft', statusPago: false, ...}"
   ```

3. **Revisar Firebase:**
   ```
   Firestore → purchase_invoices → [tu factura]
   Debe tener:
   status: "draft"
   statusPago: false
   confirmed_at: null
   confirmed_by: null
   ```

### Problema: "No veo el botón Registrar Pago"

**Posibles Causas:**

1. **La factura ya está pagada:**
   - Revisa el badge: ¿Dice "Pagado" (verde)?
   - Si sí, el botón no aparecerá (es correcto)

2. **El campo statusPago no existe:**
   - La factura fue creada antes de la actualización
   - Solución: El botón aparece si `status === 'draft'` O `statusPago === false`

3. **La factura está cancelada:**
   - Si `status === 'cancelled'`, no habrá botón de pago

---

## 📝 Notas Importantes

### 1. Campo statusPago es CRÍTICO

Este campo se usa para determinar si mostrar o no el botón de registro de pago:
```javascript
{(invoice.status === 'draft' || !invoice.statusPago) && (
  <button>🔒 Registrar Pago</button>
)}
```

### 2. Doble Sistema de Verificación

Por seguridad, se verifica tanto `status` como `statusPago`:
- `status: 'draft'` → Antiguo sistema
- `statusPago: false` → Nuevo sistema
- Si cualquiera indica pendiente → Mostrar botón

### 3. Fecha y Hora Precisas

Se usan timestamps ISO 8601 con zona horaria:
```javascript
"2024-01-16T10:45:30.123Z"
```

Formato mostrado al usuario en español:
```
16 de enero de 2024, 10:45:30
```

### 4. Contraseña en Código

La contraseña está en código fuente (no en base de datos) por simplicidad.

**Pros:**
- ✅ Rápido de implementar
- ✅ No requiere gestión de usuarios con permisos
- ✅ Fácil de cambiar

**Cons:**
- ❌ Cualquiera con acceso al código puede verla
- ❌ Misma contraseña para todos

**Mejora Futura:**
- Sistema de roles y permisos
- Contraseñas por usuario
- Autenticación de dos factores

---

## 🚀 Resumen del Flujo Completo

```
1. ENTRADA DE PRODUCTOS
   ↓
   Toggle: ¿Pagado o Pendiente?
   ↓
   ├─→ PENDIENTE: statusPago = false, status = 'draft'
   │   ↓
   │   Tarjeta ROJA del proveedor
   │   ↓
   │   Historial: Factura ROJA con botón "🔒 Registrar Pago"
   │   ↓
   │   Click en "🔒 Registrar Pago"
   │   ↓
   │   Prompt de contraseña: 140126
   │   ↓
   │   ├─→ Correcta: ✅ Pago registrado con fecha/hora/usuario
   │   └─→ Incorrecta: ❌ No se registra nada
   │
   └─→ PAGADA: statusPago = true, status = 'confirmed'
       ↓
       Tarjeta NORMAL del proveedor
       ↓
       Historial: Factura VERDE con SOLO "📄 Ver Factura"
```

---

## 📞 Contacto y Soporte

Si tienes problemas con el sistema de pagos:

1. **Revisar esta guía completa**
2. **Usar el botón "Debug"** en Proveedores
3. **Revisar la consola del navegador (F12)**
4. **Verificar Firebase Firestore** directamente

**Contraseña de Seguridad:** `140126`
**Ubicación del Código:** `src/pages/Suppliers.tsx`
**Colecciones de Firebase:** `purchase_invoices`, `products`
