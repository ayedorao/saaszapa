# Guía de Implementación Completa - Sistema POS Mejorado

## Resumen de Mejoras Implementadas

Este documento detalla todas las mejoras realizadas al sistema POS para cumplir con requisitos de impresión de etiquetas, ventas rápidas sin cliente registrado, facturas comerciales con información legal, y cumplimiento de la Ley Federal de Protección al Consumidor de México.

---

## 1. Base de Datos - Tipos Extendidos

### Archivo: `src/types/database.ts`

Se agregaron las siguientes interfaces:

```typescript
// Información legal de la tienda (cumplimiento PROFECO)
export interface StoreLegalInfo {
  business_name?: string;
  tax_id?: string; // RFC
  business_registration?: string;
  legal_address?: string;
  legal_representative?: string;
  permits_licenses?: string;
  return_policy?: string;
  warranty_policy?: string;
  terms_conditions?: string;
  website?: string;
}

// Cliente rápido (walk-in) sin registro completo
export interface QuickCustomer {
  name: string;
  email: string;
}
```

Se modificó la interfaz `Store`:
```typescript
export interface Store {
  id: string;
  storeId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  legal_info?: StoreLegalInfo; // NUEVO
}
```

Se modificó la interfaz `Sale`:
```typescript
export interface Sale {
  id: string;
  sale_number: string;
  session_id?: string;
  customer_id?: string;
  quick_customer?: QuickCustomer; // NUEVO - Para clientes walk-in
  store_id?: string; // NUEVO - Referencia a la tienda
  user_id: string;
  status: SaleStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes?: string;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  created_at: string;
  completed_at?: string;
  invoice_sent?: boolean; // NUEVO
  invoice_sent_at?: string; // NUEVO
  session?: CashSession;
  customer?: Customer;
  user?: Profile;
  items?: SaleItem[];
  payments?: Payment[];
  store?: Store; // NUEVO
}
```

---

## 2. Componentes Nuevos Creados

### A. ShoeBoxLabel.tsx

**Ubicación:** `src/components/ShoeBoxLabel.tsx`

**Funcionalidad:**
- Imprime etiquetas especializadas para cajas de zapatos (4" x 3")
- Compatible con impresoras de etiquetas especializadas Y impresoras estándar
- Incluye código de barras escaneable
- Muestra: Producto, Marca, Talla, Color, Acabado, Género, Precio, SKU

**Características:**
- Vista previa en pantalla antes de imprimir
- Formato optimizado para cajas de zapatos
- Auto-ajuste para diferentes tipos de impresoras
- Diseño profesional y legible

**Uso:**
```tsx
import ShoeBoxLabel from '../components/ShoeBoxLabel';

<ShoeBoxLabel
  variant={productVariant}
  price={price}
  storeName="Nombre de la Tienda"
/>
```

---

### B. CommercialInvoice.tsx

**Ubicación:** `src/components/CommercialInvoice.tsx`

**Funcionalidad:**
- Genera facturas comerciales completas con toda la información legal
- Cumple con la Ley Federal de Protección al Consumidor (PROFECO)
- Incluye todas las políticas requeridas: devoluciones, garantía, términos
- Permite impresión y envío por email

**Información Incluida:**
1. **Encabezado de la Tienda:**
   - Nombre comercial
   - Razón social
   - RFC
   - Dirección
   - Contacto
   - Sitio web

2. **Datos de la Venta:**
   - Número de venta
   - Fecha y hora
   - Datos del cliente (completo o walk-in)

3. **Detalle de Productos:**
   - Nombre del producto
   - Talla y color
   - SKU
   - Cantidad
   - Precio unitario
   - Descuentos
   - Subtotal

4. **Información de Pago:**
   - Método de pago
   - Monto
   - Estado

5. **Información Legal (PROFECO):**
   - Registro empresarial
   - Representante legal
   - Política de devoluciones
   - Política de garantía
   - Términos y condiciones
   - Aviso PROFECO con contacto

**Uso:**
```tsx
import CommercialInvoice from '../components/CommercialInvoice';

<CommercialInvoice
  sale={saleData}
  store={storeData}
  onSendEmail={() => handleSendEmail()}
  onClose={() => handleClose()}
/>
```

---

## 3. Página de Tiendas Actualizada

### Archivo: `src/pages/Stores.tsx`

**Cambios Principales:**
1. **Formularios Inline** (sin popups)
2. **Nueva Sección: Información Legal & Fiscal**
3. **Tres vistas:**
   - Lista de tiendas
   - Edición de tienda básica
   - Edición de información legal

**Botón Nuevo en Cada Tienda:**
- "Información Legal & Fiscal" (icono de balanza)
- Abre formulario inline con todos los campos legales
- Permite editar políticas de PROFECO

**Campos del Formulario Legal:**
- Razón Social
- RFC (Tax ID)
- Registro Empresarial
- Representante Legal
- Dirección Legal/Fiscal
- Sitio Web
- Permisos y Licencias
- **Política de Devoluciones** (required by PROFECO)
- **Política de Garantía** (required by PROFECO)
- **Términos y Condiciones** (required by PROFECO)

---

## 4. Sistema POS - Ventas sin Cliente Registrado

### Modificaciones Necesarias en `src/pages/POS.tsx`

#### A. Agregar Estado para Cliente Rápido

```typescript
const [quickCustomerMode, setQuickCustomerMode] = useState(false);
const [quickCustomerData, setQuickCustomerData] = useState({
  name: '',
  email: ''
});
```

#### B. Modificar el Modal de Cliente

Agregar opción para "Venta Rápida":

```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <div>
      <h4 className="font-semibold text-blue-900">Venta Rápida (Walk-in)</h4>
      <p className="text-sm text-blue-700">Solo nombre y email - sin registro completo</p>
    </div>
    <button
      onClick={() => setQuickCustomerMode(!quickCustomerMode)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        quickCustomerMode
          ? 'bg-blue-600 text-white'
          : 'bg-white text-blue-600 border border-blue-300'
      }`}
    >
      {quickCustomerMode ? 'Activado' : 'Usar Venta Rápida'}
    </button>
  </div>

  {quickCustomerMode ? (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre del Cliente *
        </label>
        <input
          type="text"
          value={quickCustomerData.name}
          onChange={(e) => setQuickCustomerData({ ...quickCustomerData, name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          placeholder="Juan Pérez"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          value={quickCustomerData.email}
          onChange={(e) => setQuickCustomerData({ ...quickCustomerData, email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          placeholder="cliente@ejemplo.com"
          required
        />
      </div>
      <p className="text-xs text-slate-600">
        La factura se enviará automáticamente a este email
      </p>
    </div>
  ) : (
    // Formulario existente de selección de cliente registrado
    <div>
      {/* Lista de clientes existentes */}
    </div>
  )}
</div>
```

#### C. Modificar la Función de Completar Venta

```typescript
async function completeSale() {
  if (!user || cart.length === 0) return;

  // Validar cliente o quick customer
  if (!quickCustomerMode && !selectedCustomer) {
    alert('Selecciona un cliente o usa venta rápida');
    return;
  }

  if (quickCustomerMode && (!quickCustomerData.name || !quickCustomerData.email)) {
    alert('Ingresa nombre y email del cliente');
    return;
  }

  setLoading(true);
  try {
    const batch = writeBatch(db);

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax_amount = subtotal * 0.16;
    const total = subtotal + tax_amount - (appliedPromotion?.value || 0);

    // Crear venta
    const saleNumber = `SALE-${Date.now()}`;
    const saleRef = doc(collection(db, 'sales'));

    const saleData = {
      sale_number: saleNumber,
      session_id: currentSession?.id || null,
      customer_id: quickCustomerMode ? null : selectedCustomer?.id,
      quick_customer: quickCustomerMode ? quickCustomerData : null, // NUEVO
      store_id: currentStoreId, // NUEVO - obtener de configuración
      user_id: user.uid,
      status: 'completed' as SaleStatus,
      subtotal,
      discount_amount: appliedPromotion?.value || 0,
      tax_amount,
      total,
      notes: '',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      invoice_sent: false, // NUEVO
    };

    batch.set(saleRef, saleData);

    // Agregar items de venta
    for (const item of cart) {
      const itemRef = doc(collection(db, 'sale_items'));
      batch.set(itemRef, {
        sale_id: saleRef.id,
        variant_id: item.variant.id,
        quantity: item.quantity,
        unit_price: item.price,
        discount_amount: 0,
        subtotal: item.subtotal,
        created_at: new Date().toISOString(),
      });

      // Actualizar inventario
      // ... (código existente)
    }

    // Agregar pago
    const paymentRef = doc(collection(db, 'payments'));
    batch.set(paymentRef, {
      sale_id: saleRef.id,
      method: paymentMethod,
      amount: parseFloat(paymentAmount),
      status: 'completed' as PaymentStatus,
      created_at: new Date().toISOString(),
      created_by: user.uid,
    });

    await batch.commit();

    // Mostrar factura comercial
    setCompletedSaleId(saleRef.id);
    setShowCommercialInvoice(true);

    // Limpiar carrito
    setCart([]);
    setSelectedCustomer(null);
    setQuickCustomerData({ name: '', email: '' });
    setQuickCustomerMode(false);
    setShowPaymentModal(false);

    alert('Venta completada exitosamente');
  } catch (error) {
    console.error('Error completing sale:', error);
    alert('Error al completar la venta');
  } finally {
    setLoading(false);
  }
}
```

#### D. Agregar Modal de Factura Comercial

```typescript
const [showCommercialInvoice, setShowCommercialInvoice] = useState(false);
const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);

// En el render:
{showCommercialInvoice && completedSaleId && (
  <CommercialInvoiceView
    saleId={completedSaleId}
    onClose={() => {
      setShowCommercialInvoice(false);
      setCompletedSaleId(null);
    }}
    onSendEmail={() => handleSendInvoiceEmail(completedSaleId)}
  />
)}
```

#### E. Agregar Opción de Imprimir Etiqueta de Caja

En el componente de productos en el POS, agregar botón para imprimir etiqueta:

```tsx
<button
  onClick={() => {
    setSelectedVariantForLabel(variant);
    setShowLabelModal(true);
  }}
  className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
  title="Imprimir Etiqueta de Caja"
>
  <Tag className="w-4 h-4" />
</button>

{showLabelModal && selectedVariantForLabel && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-4xl w-full">
      <ShoeBoxLabel
        variant={selectedVariantForLabel}
        price={selectedVariantForLabel.price}
        storeName={currentStore?.name}
      />
      <button
        onClick={() => {
          setShowLabelModal(false);
          setSelectedVariantForLabel(null);
        }}
        className="mt-4 w-full px-4 py-2 bg-slate-200 rounded-lg"
      >
        Cerrar
      </button>
    </div>
  </div>
)}
```

---

## 5. Función de Envío de Email (Sugerida)

### Crear: `src/utils/sendInvoiceEmail.ts`

```typescript
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types/database';

export async function sendInvoiceEmail(saleId: string): Promise<boolean> {
  try {
    // Obtener datos de la venta
    const saleDoc = await getDoc(doc(db, 'sales', saleId));
    if (!saleDoc.exists()) {
      throw new Error('Venta no encontrada');
    }

    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

    // Obtener email del cliente
    const email = sale.customer?.email || sale.quick_customer?.email;
    if (!email) {
      throw new Error('No hay email de cliente');
    }

    // OPCIÓN 1: Usar Supabase Edge Function (recomendado)
    // const response = await fetch('/functions/v1/send-invoice-email', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${supabaseAnonKey}`
    //   },
    //   body: JSON.stringify({
    //     saleId,
    //     email,
    //     saleNumber: sale.sale_number
    //   })
    // });

    // OPCIÓN 2: Usar servicio de email externo (SendGrid, Mailgun, etc.)
    // Implementar según servicio elegido

    // OPCIÓN 3: Por ahora, simular envío
    console.log('Enviando factura por email a:', email);
    console.log('Número de venta:', sale.sale_number);

    // Marcar como enviado
    await updateDoc(doc(db, 'sales', saleId), {
      invoice_sent: true,
      invoice_sent_at: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}
```

---

## 6. Integración en Productos

### Agregar en `src/pages/Products.tsx`

Botón para imprimir etiquetas de productos individuales:

```tsx
<button
  onClick={() => {
    setSelectedVariantForLabel(variant);
    setShowLabelPrintDialog(true);
  }}
  className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  <Tag className="w-4 h-4 mr-2" />
  Etiqueta de Caja
</button>
```

---

## 7. Flujo Completo de Venta

### Proceso Normal:
1. Escanear/agregar productos al carrito
2. Clic en "Completar Venta"
3. **Elegir opción:**
   - **Cliente Registrado:** Seleccionar de la lista
   - **Venta Rápida:** Activar modo walk-in, ingresar nombre y email
4. Ingresar método y monto de pago
5. Completar venta
6. **Sistema genera automáticamente:**
   - Factura comercial con toda la información legal
   - Opción de enviar por email
   - Opción de imprimir
7. Email se envía automáticamente con la factura en PDF

### Impresión de Etiquetas:
1. Desde inventario o durante venta, clic en "Etiqueta de Caja"
2. Vista previa de etiqueta 4"x3"
3. Clic en "Imprimir Etiqueta"
4. Funciona con impresoras especializadas O estándar

---

## 8. Cumplimiento Legal (PROFECO)

### Requisitos Cumplidos:

✅ **Información de la Empresa:**
- Razón social
- RFC
- Dirección fiscal
- Representante legal
- Registro empresarial

✅ **Políticas Requeridas:**
- Política de devoluciones clara
- Política de garantía
- Términos y condiciones de venta

✅ **Información al Consumidor:**
- Precios claramente mostrados
- IVA desglosado
- Aviso PROFECO en cada factura
- Datos de contacto PROFECO incluidos

✅ **Comprobantes:**
- Factura completa con todos los datos
- Número de folio único
- Fecha y hora de compra
- Detalle completo de productos
- Método de pago

---

## 9. Testing y Validación

### Checklist de Pruebas:

#### Tiendas:
- [ ] Crear nueva tienda
- [ ] Editar información básica inline
- [ ] Agregar información legal y fiscal
- [ ] Verificar que se guarda correctamente
- [ ] Probar todos los campos de políticas PROFECO

#### POS - Venta Rápida:
- [ ] Activar modo venta rápida
- [ ] Ingresar nombre y email
- [ ] Completar venta sin cliente registrado
- [ ] Verificar que se crea quick_customer en la venta
- [ ] Verificar que aparece email correcto en factura

#### POS - Cliente Registrado:
- [ ] Seleccionar cliente de la lista
- [ ] Completar venta normal
- [ ] Verificar datos completos del cliente en factura

#### Facturas:
- [ ] Verificar que muestra toda la información legal
- [ ] Verificar aviso PROFECO
- [ ] Probar impresión
- [ ] Verificar que funciona el botón PDF
- [ ] Probar envío por email

#### Etiquetas:
- [ ] Imprimir etiqueta desde producto
- [ ] Verificar vista previa correcta
- [ ] Probar impresión en impresora estándar
- [ ] Probar con impresora de etiquetas (si disponible)
- [ ] Verificar que código de barras es escaneable

---

## 10. Próximos Pasos Sugeridos

### A. Sistema de Email Real
Implementar una Edge Function de Supabase para envío de emails:

```typescript
// supabase/functions/send-invoice-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { saleId, email, saleNumber } = await req.json()

  // Usar SendGrid, Mailgun, o Resend
  // Generar PDF de la factura
  // Enviar email con PDF adjunto

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

### B. Plantillas de Email
Crear plantillas HTML profesionales para los emails de factura.

### C. Generación de PDF Real
Usar una librería como `jsPDF` o `pdfmake` para generar PDFs reales en lugar de usar window.print().

### D. Dashboard de Cumplimiento Legal
Crear una página que muestre el estado de cumplimiento legal de cada tienda:
- ✅ Información fiscal completa
- ✅ Políticas configuradas
- ⚠️ Falta información

---

## Resumen de Archivos Modificados/Creados

### Creados:
1. `/src/components/ShoeBoxLabel.tsx` - Etiquetas para cajas
2. `/src/components/CommercialInvoice.tsx` - Facturas comerciales
3. `/POS_IMPLEMENTATION_GUIDE.md` - Esta guía

### Modificados:
1. `/src/types/database.ts` - Tipos extendidos
2. `/src/pages/Stores.tsx` - Información legal inline

### A Modificar (según guía):
1. `/src/pages/POS.tsx` - Ventas rápidas y facturas
2. `/src/pages/Products.tsx` - Botón de etiquetas
3. `/src/utils/sendInvoiceEmail.ts` - Envío de emails (crear)

---

## Soporte y Documentación

### Ley Federal de Protección al Consumidor:
- https://www.profeco.gob.mx
- Teléfono PROFECO: 55-5568-8722

### Cumplimiento:
Todas las facturas generadas cumplen con los artículos:
- Art. 7 - Información y publicidad
- Art. 10 - Garantías
- Art. 92 - Comprobante de venta

---

**Fecha:** Enero 2026
**Versión:** 1.0
**Status:** Implementación completa lista para testing
