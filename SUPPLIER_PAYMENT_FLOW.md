# Flujo de Pagos a Proveedores - Sistema Actualizado

## 🎯 Resumen de Cambios

Se ha implementado un sistema completo de gestión de pagos a proveedores con las siguientes mejoras:

### ✅ Nuevo: Toggle de Estado de Pago en Entrada de Productos

Al hacer una entrada masiva de productos, ahora puedes indicar **inmediatamente** si la entrada fue:
- **PAGO PENDIENTE** (predeterminado) - Genera deuda con el proveedor
- **ENTRADA PAGADA** - Marca la entrada como ya pagada al proveedor

### ✅ Visualización Correcta de Deudas

- Los proveedores con deuda aparecen en **tarjetas rojas** con alerta
- Los proveedores al corriente aparecen en **tarjetas normales**
- El historial de facturas muestra claramente qué está pendiente y qué está pagado

### ✅ Botones de Acciones Completos

- **Ver Factura** - Abre la factura comercial completa con todos los detalles
- **Marcar como Pagado** - Para facturas pendientes
- **Imprimir/Descargar** - Desde la vista de factura

---

## 📋 Nuevo Flujo de Trabajo

### Opción 1: Entrada NO Pagada (Generar Deuda)

Usa esta opción cuando haces una entrada de productos pero **NO has pagado** al proveedor todavía.

**Pasos:**

1. **Hacer Entrada de Productos**
   - Ve a Productos → Click en "Entrada Masiva"
   - Llena la información de los productos
   - **IMPORTANTE:** Deja el toggle en **"PAGO PENDIENTE"** (está desactivado por defecto)
   - Click en "Guardar y Generar Factura"

2. **Resultado Inmediato**
   - ✅ Productos agregados al inventario
   - ✅ Factura creada con status `draft` (pendiente)
   - ✅ Proveedor aparece con deuda en **tarjeta roja**
   - ✅ Monto aparece en "Pago Pendiente"

3. **Cuando Pagues al Proveedor**
   - Ve a Proveedores
   - Busca el proveedor con tarjeta roja
   - Click en "Ver Detalles"
   - En el historial, encuentra la factura pendiente (roja)
   - Click en "Marcar como Pagado"
   - Confirma la acción

4. **Resultado del Pago**
   - ✅ Factura cambia a status `confirmed` (pagada)
   - ✅ Se registra fecha y usuario del pago
   - ✅ Tarjeta del proveedor se actualiza
   - ✅ Monto pasa de "Pendiente" a "Total Pagado"

---

### Opción 2: Entrada Pagada al Momento (Sin Deuda)

Usa esta opción cuando pagas al proveedor **al momento** de recibir los productos (pago de contado).

**Pasos:**

1. **Hacer Entrada de Productos**
   - Ve a Productos → Click en "Entrada Masiva"
   - Llena la información de los productos
   - **IMPORTANTE:** Activa el toggle a **"ENTRADA PAGADA"** (se pone verde)
   - Click en "Guardar y Generar Factura"

2. **Resultado Inmediato**
   - ✅ Productos agregados al inventario
   - ✅ Factura creada con status `confirmed` (pagada)
   - ✅ Se registra fecha y usuario del pago
   - ✅ Proveedor aparece **SIN deuda** (tarjeta normal)
   - ✅ Monto aparece en "Total Pagado"

3. **Ya No Hay Más Pasos**
   - No necesitas marcar nada como pagado después
   - La factura ya está registrada como pagada desde el inicio

---

## 🎨 Visualización del Toggle

```
┌─────────────────────────────────────────────────────────┐
│  [Productos listados en tabla]                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  5 productos en la lista                                │
│                                                          │
│  ⚪───────○  PAGO PENDIENTE                             │
│           Deuda pendiente con el proveedor              │
│                                                          │
│           [Cancelar]  [Guardar y Generar Factura]       │
└─────────────────────────────────────────────────────────┘

Cuando activas el toggle:

┌─────────────────────────────────────────────────────────┐
│  5 productos en la lista                                │
│                                                          │
│  ○───────⚪  ENTRADA PAGADA  ← (Verde)                  │
│           Productos pagados al proveedor                │
│                                                          │
│           [Cancelar]  [Guardar y Generar Factura]       │
└─────────────────────────────────────────────────────────┘
```

---

## 🏪 Visualización en Tarjetas de Proveedores

### Proveedor CON Deuda (Rojo)

```
┌─────────────────────────────────────────┐
│ 🔴 [BORDE ROJO - Fondo Rojo Claro]     │
│                                          │
│  ⚠️  Distribuidora XYZ                  │
│      Código: PROV001                    │
│      Contacto: Juan Pérez                │
├──────────────────────────────────────────┤
│  📦 Facturas Totales: 3                  │
│  📅 Última Compra: 15/01/2024           │
│  ✅ Total Pagado: $15,000.00            │
│                                          │
│  🔴 Pago Pendiente:                     │
│      💵 $8,500.00                       │
├──────────────────────────────────────────┤
│  [Ver Detalles] [✏️] [🗑️]              │
└──────────────────────────────────────────┘
```

### Proveedor SIN Deuda (Normal)

```
┌─────────────────────────────────────────┐
│ 🔵 [BORDE GRIS - Fondo Blanco]         │
│                                          │
│  ✅  Distribuidora ABC                  │
│      Código: PROV002                    │
│      Contacto: María López               │
├──────────────────────────────────────────┤
│  📦 Facturas Totales: 5                  │
│  📅 Última Compra: 14/01/2024           │
│  ✅ Total Pagado: $25,000.00            │
│                                          │
│  ✅ Sin Pagos Pendientes                │
├──────────────────────────────────────────┤
│  [Ver Detalles] [✏️] [🗑️]              │
└──────────────────────────────────────────┘
```

---

## 📊 Modal de Detalles del Proveedor

Cuando haces click en "Ver Detalles" de un proveedor:

```
┌──────────────────────────────────────────────────────────┐
│  Distribuidora XYZ                    [❌ Cerrar]        │
│  Código: PROV001                                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ 📦 3       │  │ ✅ $15K    │  │ 🔴 $8.5K   │        │
│  │ Facturas   │  │ Pagado     │  │ Pendiente  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                          │
│  Historial de Facturas                                  │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ 🔴 [BORDE ROJO]                              │      │
│  │                                              │      │
│  │ FINV-1234567890  [Pendiente de Pago]       │      │
│  │ Fecha: 15/01/2024                            │      │
│  │                              $8,500.00       │      │
│  │                                              │      │
│  │           [📄 Ver Factura]                  │      │
│  │           [✅ Marcar como Pagado]           │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ 🟢 [BORDE VERDE]                             │      │
│  │                                              │      │
│  │ FINV-9876543210  [Pagado]                   │      │
│  │ Fecha: 10/01/2024                            │      │
│  │ Pagado: 12/01/2024                           │      │
│  │                              $15,000.00      │      │
│  │                                              │      │
│  │           [📄 Ver Factura]                  │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🧾 Vista de Factura Comercial

Al hacer click en "Ver Factura":

- Se abre una ventana modal con la factura comercial completa
- Incluye toda la información fiscal y bancaria
- Muestra lista detallada de productos
- Tiene botones de imprimir y descargar
- Formato profesional listo para enviar al proveedor

**Botones disponibles:**
- 🖨️ **Imprimir** - Imprime la factura
- 💾 **Descargar PDF** - Descarga como PDF (si el navegador lo soporta)
- ❌ **Cerrar** - Cierra la vista

---

## 📈 Banner de Alerta

Si hay proveedores con pagos pendientes, aparece un banner rojo en la parte superior:

```
┌──────────────────────────────────────────────────────────┐
│ 🔴 [BANNER ROJO - ALERTA]                                │
│                                                          │
│  ⚠️  Pagos Pendientes                                   │
│                                                          │
│  Hay 2 proveedores con pagos pendientes                 │
│                                                          │
│  💵 $15,250.00 total pendiente                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Herramientas de Diagnóstico

En la página de Proveedores hay botones de ayuda:

### 🔵 Botón "Debug"
- Muestra información detallada en la consola del navegador
- Lista todos los proveedores y sus facturas
- Identifica exactamente qué está pendiente y pagado
- Útil para resolver problemas

### 🟠 Botón "Corregir"
- Corrige facturas con estados incorrectos
- Busca facturas marcadas como pagadas pero sin fecha de pago
- Las cambia automáticamente a pendientes
- Muestra resumen de correcciones

---

## 💡 Casos de Uso Comunes

### Caso 1: Compra a Crédito

**Situación:** Recibes productos pero pagarás después (30, 60, 90 días)

**Pasos:**
1. Entrada de productos con toggle en **"PAGO PENDIENTE"**
2. El proveedor aparece con deuda (tarjeta roja)
3. Cuando pagues, ve a Proveedores → Ver Detalles → Marcar como Pagado

---

### Caso 2: Compra de Contado

**Situación:** Pagas al recibir los productos

**Pasos:**
1. Entrada de productos con toggle en **"ENTRADA PAGADA"**
2. El proveedor aparece sin deuda (tarjeta normal)
3. Ya está todo registrado correctamente

---

### Caso 3: Entrada Parcial con Anticipo

**Situación:** Das un anticipo pero quedan cosas pendientes

**Solución:**
- Para el anticipo: Entrada con toggle **"ENTRADA PAGADA"**
- Para lo pendiente: Entrada con toggle **"PAGO PENDIENTE"**
- O marca la entrada completa como pendiente y usa el botón "Marcar como Pagado" cuando termines de pagar

---

### Caso 4: Múltiples Entradas del Mismo Proveedor

**Situación:** Varias entregas en diferentes fechas

**Solución:**
- Cada entrada genera su propia factura
- El proveedor muestra el total de todas las facturas pendientes
- En "Ver Detalles" puedes ver todas las facturas
- Marca cada una como pagada según vayas pagando

---

## ⚙️ Estados de Facturas

### Estado: `draft` (Pendiente)

```javascript
{
  status: 'draft',
  confirmed_at: null,
  confirmed_by: null
}
```

**Significado:** Deuda pendiente con el proveedor

**Visualización:**
- Tarjeta de factura con borde rojo
- Badge rojo "Pendiente de Pago"
- Botón "Marcar como Pagado" visible
- Cuenta en "Pago Pendiente" del proveedor

---

### Estado: `confirmed` (Pagado)

```javascript
{
  status: 'confirmed',
  confirmed_at: '2024-01-15T10:30:00.000Z',
  confirmed_by: 'user_abc123'
}
```

**Significado:** Ya fue pagado al proveedor

**Visualización:**
- Tarjeta de factura con borde verde
- Badge verde "Pagado"
- Fecha de pago mostrada
- NO hay botón de marcar como pagado
- Cuenta en "Total Pagado" del proveedor

---

## 🎯 Ventajas del Nuevo Sistema

### ✅ Control Inmediato
- Decides al momento de la entrada si es pagado o pendiente
- No necesitas marcar como pagado después si pagaste de contado

### ✅ Visibilidad Clara
- Tarjetas rojas muestran claramente quién tiene deuda
- Banner de alerta si hay pagos pendientes
- Historial completo de todas las facturas

### ✅ Rastreabilidad
- Cada factura tiene fecha de creación
- Fecha de pago registrada cuando se marca como pagado
- Usuario que registró el pago

### ✅ Documentación Profesional
- Factura comercial completa con toda la información
- Información fiscal y bancaria del proveedor
- Lista detallada de productos
- Formato profesional listo para imprimir

### ✅ Herramientas de Diagnóstico
- Botón de debug para ver toda la información
- Botón de corrección para arreglar datos incorrectos
- Logs detallados en consola

---

## 📝 Notas Importantes

1. **El toggle es CRUCIAL:**
   - Si lo dejas desactivado (PAGO PENDIENTE) → Genera deuda
   - Si lo activas (ENTRADA PAGADA) → No genera deuda

2. **Las tarjetas rojas significan deuda:**
   - Siempre revisa los proveedores con tarjetas rojas
   - El banner superior te alerta si hay pagos pendientes

3. **El historial está en "Ver Detalles":**
   - No en la tarjeta principal
   - Click en "Ver Detalles" para ver todas las facturas

4. **Puedes ver la factura comercial:**
   - Botón "Ver Factura" en cada factura del historial
   - Formato profesional listo para compartir

5. **Herramientas de ayuda disponibles:**
   - Botón "Debug" para diagnosticar problemas
   - Botón "Corregir" para arreglar datos incorrectos
   - Logs en consola para más detalles

---

## 🚀 Flujo Recomendado

### Todos los Días

1. **Al recibir productos:**
   - Haz la entrada con el toggle correcto
   - Verifica que el proveedor refleje el estado correcto

2. **Revisa el banner superior:**
   - Si hay alerta roja, tienes pagos pendientes
   - Planifica los pagos según necesites

### Cada Semana

1. **Revisa proveedores con tarjetas rojas:**
   - Ve a "Ver Detalles" de cada uno
   - Revisa las facturas pendientes
   - Planifica los pagos

2. **Marca como pagado cuando pagues:**
   - No olvides marcar las facturas como pagadas
   - Esto mantiene el sistema actualizado

### Cada Mes

1. **Revisa el total pagado a cada proveedor:**
   - Aparece en cada tarjeta
   - Útil para presupuesto y análisis

2. **Verifica que no haya facturas antiguas pendientes:**
   - El historial muestra todas las fechas
   - Identifica pagos atrasados

---

## ❓ Preguntas Frecuentes

### ¿Puedo cambiar una factura de pagada a pendiente?

**R:** No hay botón directo, pero puedes:
1. Usar el botón "Corregir" si fue marcada incorrectamente
2. O modificar manualmente en Firestore cambiando:
   - `status`: 'confirmed' → 'draft'
   - `confirmed_at`: eliminar valor
   - `confirmed_by`: eliminar valor

### ¿Qué pasa si olvido activar el toggle?

**R:** La entrada se registrará como pendiente de pago. Simplemente ve a Proveedores, busca el proveedor, abre "Ver Detalles" y marca la factura como pagada.

### ¿Puedo ver todas las facturas de todos los proveedores juntas?

**R:** Por ahora no, pero puedes:
- Ir proveedor por proveedor viendo "Ver Detalles"
- Usar el botón "Debug" para ver un resumen en consola

### ¿Las facturas se envían por email automáticamente?

**R:** No, el sistema solo genera la factura. Puedes:
1. Abrir "Ver Factura"
2. Imprimirla o descargarla como PDF
3. Enviarla manualmente al proveedor

### ¿Puedo agregar notas a las facturas?

**R:** Por ahora no hay campo de notas en las facturas, pero puedes agregar notas en:
- El proveedor (campo "Notas")
- Los productos individuales

---

## 🎓 Conclusión

El nuevo sistema de pagos a proveedores te da:

- ✅ **Control total** sobre el estado de pagos
- ✅ **Visibilidad clara** de deudas pendientes
- ✅ **Documentación profesional** con facturas comerciales
- ✅ **Herramientas de diagnóstico** para resolver problemas
- ✅ **Flujo flexible** para pagos de contado o crédito

La clave está en el **toggle al hacer entradas** y en **revisar regularmente** las tarjetas rojas de proveedores con deuda.
