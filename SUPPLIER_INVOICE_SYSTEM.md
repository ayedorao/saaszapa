# Sistema Completo de Facturación de Proveedores

## Resumen de Cambios Implementados

### 1. Corrección de Lógica de Pagos

**Problema Original:**
- La lógica estaba invertida: las facturas con estado `draft` (borrador) se contaban como pagadas
- Las facturas `confirmed` se trataban como pendientes

**Solución Implementada:**
- **Estado `draft`**: Representa facturas PENDIENTES DE PAGO (deuda con el proveedor)
- **Estado `confirmed`**: Representa facturas PAGADAS (ya se realizó el pago al proveedor)

**Flujo Correcto:**
```
Entrada de Productos → Factura creada con status='draft' (Pendiente de Pago)
                     ↓
            Tarjeta ROJA del proveedor (tiene deuda)
                     ↓
            Click "Marcar como Pagado"
                     ↓
            Factura cambia a status='confirmed' (Pagada)
                     ↓
            Tarjeta VERDE/Normal del proveedor
```

### 2. Componente de Factura Comercial

**Archivo Creado:** `/src/components/SupplierInvoiceView.tsx`

#### Características:

**A. Formato Profesional de Factura**
- Header con número de factura destacado
- Estado visual claro (Pendiente/Pagado/Cancelado)
- Fechas de creación y pago
- Diseño profesional listo para imprimir

**B. Información del Proveedor**
- Nombre comercial y razón social
- RFC / Tax ID
- Dirección completa
- Teléfono y email
- Términos de pago

**C. Información Bancaria**
- Nombre del banco
- Número de cuenta/CLABE
- Notas contables específicas

**D. Detalle Completo de Productos**
Tabla con:
- Nombre del producto
- Talla
- Color
- Cantidad
- Costo unitario
- Subtotal por item

**E. Resumen Financiero**
- Subtotal
- IVA (16%)
- Total a pagar (destacado)

**F. Funcionalidades**
- Botón "Imprimir" (abre diálogo de impresión)
- Botón "PDF" (actualmente usa impresión, puede extenderse con jsPDF)
- Diseño optimizado para impresión
- Estilos CSS específicos para @media print

### 3. Campos Fiscales en Proveedor

**Nuevos Campos Agregados:**

#### Información Fiscal:
1. **Razón Social** (`company_name`)
   - Nombre legal/fiscal completo de la empresa
   - Para facturas oficiales

2. **RFC / Tax ID** (`tax_id`)
   - Identificación fiscal
   - Se convierte automáticamente a mayúsculas

#### Información Bancaria:
3. **Banco** (`bank_name`)
   - Nombre de la institución bancaria

4. **Cuenta Bancaria** (`bank_account`)
   - Número de cuenta o CLABE interbancaria

#### Términos Comerciales:
5. **Términos de Pago** (`payment_terms`)
   - Ejemplo: "30 días", "Contado", "15-30-45 días"
   - Condiciones acordadas con el proveedor

#### Notas Contables:
6. **Notas Contables** (`account_notes`)
   - Información específica para el contador
   - Códigos contables, categorías, etc.

**Formulario Actualizado:**
- Sección dedicada "Información Fiscal y Contable"
- Diseño en grid de 2 columnas para mejor visualización
- Campos separados de las notas generales

### 4. Integración Completa en Página de Proveedores

**A. Vista de Tarjetas de Proveedor**

Cada tarjeta muestra:
- ✅ **Total de Facturas**: Cantidad de compras realizadas
- ✅ **Última Compra**: Fecha de la entrada más reciente
- ✅ **Total Pagado**: Suma de facturas confirmadas (verde)
- ✅ **Pago Pendiente**: Suma de facturas draft (rojo destacado)
- ✅ **Indicador Visual**: Tarjeta roja si tiene pagos pendientes

**B. Modal de Detalles del Proveedor**

Secciones:
1. **Resumen de Estadísticas** (3 cards):
   - Total de facturas
   - Total pagado (verde)
   - Pendiente de pago (rojo si aplica)

2. **Historial de Facturas**:
   - Lista completa de todas las facturas
   - Color rojo para pendientes
   - Color verde para pagadas
   - Estado claro: "Pendiente de Pago" / "Pagado"
   - Fechas de creación y pago

3. **Acciones por Factura**:
   - **Botón "Ver Factura"**: Abre vista comercial completa
   - **Botón "Marcar como Pagado"**: Solo en facturas pendientes
   - Confirmación antes de marcar como pagado

**C. Flujo de Trabajo**

```
Usuario → Productos → Entrada
                    ↓
        Escribe nombre de proveedor
                    ↓
        Sistema crea/encuentra proveedor
                    ↓
        Factura generada con status='draft'
                    ↓
Usuario → Proveedores
                    ↓
        Ve tarjeta ROJA con monto pendiente
                    ↓
        Click "Ver Detalles"
                    ↓
        Ve historial de facturas
                    ↓
        Click "Ver Factura" → Factura comercial completa
                    ↓
        Click "Marcar como Pagado" → Confirma pago
                    ↓
        Factura cambia a verde
        Tarjeta del proveedor se actualiza
```

## Archivos Modificados

### 1. `/src/pages/Suppliers.tsx`
**Cambios:**
- Corrección de lógica de cálculo de pagos
- Agregados campos fiscales al formulario
- Agregados estados para vista de factura
- Función `viewInvoice()` para abrir modal de factura
- Confirmación en `markInvoiceAsPaid()`
- Botón "Ver Factura" en cada item del historial
- Importación del componente `SupplierInvoiceView`
- Logs de consola para debugging

### 2. `/src/components/SupplierInvoiceView.tsx`
**Archivo Nuevo:**
- Componente completo de vista de factura comercial
- Carga de datos de factura, proveedor, items y variantes
- Diseño profesional con información fiscal
- Botones de impresión y descarga PDF
- Estilos optimizados para impresión
- Detalle completo de productos con tallas y colores

### 3. `/src/components/BulkProductEntry.tsx`
**Mantiene:**
- Auto-creación de proveedores
- Generación de facturas con supplier_id correcto
- Estado 'draft' para nuevas facturas

## Estructura de Datos

### Base de Datos Firebase

#### Colección: `suppliers`
```typescript
{
  id: string
  code: string  // Ej: "PROV123456"
  name: string  // Nombre comercial
  company_name?: string  // Razón social
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string  // RFC
  payment_terms?: string  // Ej: "30 días"
  bank_name?: string
  bank_account?: string  // Cuenta/CLABE
  account_notes?: string  // Notas contables
  notes?: string  // Notas generales
  active: boolean
  created_at: string
  updated_at: string
  created_by: string
}
```

#### Colección: `purchase_invoices`
```typescript
{
  id: string
  invoice_number: string  // Ej: "FINV-1234567890"
  supplier_id: string  // ID del proveedor
  status: 'draft' | 'confirmed' | 'cancelled'
    // draft = Pendiente de pago (DEUDA)
    // confirmed = Pagado
  subtotal: number
  tax_amount: number  // IVA 16%
  total: number
  notes?: string
  created_at: string
  updated_at: string
  confirmed_at?: string  // Fecha de pago
  confirmed_by?: string  // Usuario que confirmó
  created_by: string
}
```

#### Colección: `purchase_invoice_items`
```typescript
{
  id: string
  invoice_id: string
  variant_id: string
  product_name: string
  supplier_id: string  // ID del proveedor
  cost_price: number
  quantity: number
  subtotal: number
  created_at: string
}
```

## Casos de Uso

### Caso 1: Nueva Entrada de Productos

1. Usuario va a "Productos" → Click "Entrada"
2. Escribe nombre de proveedor: "Distribuidora XYZ"
3. Completa datos de productos
4. Click "Guardar y Generar Factura"
5. Sistema:
   - Crea proveedor "Distribuidora XYZ" si no existe
   - Crea productos y variantes
   - Genera factura con status='draft'
   - Asocia todo correctamente

### Caso 2: Ver Estado de Proveedor

1. Usuario va a "Proveedores"
2. Ve tarjeta roja de "Distribuidora XYZ"
3. Tarjeta muestra:
   - 1 Factura
   - $0.00 pagado
   - $15,000.00 pendiente (rojo)
4. Click "Ver Detalles"
5. Ve factura FINV-XXX con estado "Pendiente de Pago"

### Caso 3: Ver Factura Comercial

1. En modal de detalles del proveedor
2. Click "Ver Factura" en cualquier entrada
3. Se abre modal con:
   - Datos completos del proveedor (fiscal y bancarios)
   - Detalle de todos los productos
   - Tallas, colores, cantidades, costos
   - Total a pagar destacado
   - Botones de imprimir/PDF

### Caso 4: Registrar Pago

1. En modal de detalles
2. Click "Marcar como Pagado" en factura pendiente
3. Sistema pide confirmación
4. Al confirmar:
   - Factura cambia de rojo a verde
   - Estado cambia a "Pagado"
   - Se registra fecha y usuario de pago
   - Tarjeta del proveedor se actualiza
   - Pago pendiente disminuye
   - Total pagado aumenta

### Caso 5: Editar Información Fiscal

1. En página de proveedores
2. Click botón "Editar" (lápiz) en tarjeta del proveedor
3. Modal con formulario completo
4. Completar sección "Información Fiscal y Contable":
   - Razón Social
   - RFC
   - Banco
   - Cuenta bancaria
   - Términos de pago
   - Notas contables
5. Click "Actualizar"
6. Información visible en facturas futuras

## Validaciones y Seguridad

### Validaciones Implementadas:
- ✅ Confirmación antes de marcar factura como pagada
- ✅ Usuario autenticado requerido para todas las operaciones
- ✅ RFC se convierte automáticamente a mayúsculas
- ✅ Validación de datos requeridos (código y nombre)

### Permisos Firebase:
- ✅ `suppliers`: read/write para usuarios autenticados
- ✅ `purchase_invoices`: read/write para usuarios autenticados
- ✅ `purchase_invoice_items`: read/write para usuarios autenticados

## Próximas Mejoras Sugeridas

### A. Exportación PDF Real
- Implementar jsPDF o react-pdf
- Generar PDFs descargables con logo de empresa
- Incluir códigos de barras de productos

### B. Pagos Parciales
- Permitir pagos parciales de facturas
- Historial de pagos por factura
- Saldo pendiente actualizable

### C. Notas de Crédito
- Sistema de devoluciones a proveedor
- Ajustes de facturas
- Notas de crédito aplicables

### D. Reportes Contables
- Reporte de cuentas por pagar
- Antigüedad de saldos
- Proveedores top por monto
- Exportación a Excel para contador

### E. Alertas y Recordatorios
- Notificaciones de pagos próximos a vencer
- Recordatorios por términos de pago
- Dashboard de vencimientos

### F. Multi-moneda
- Soporte para USD, EUR, etc.
- Tipos de cambio
- Conversión automática

### G. Adjuntos
- Subir facturas escaneadas
- Comprobantes de pago
- Documentos relacionados

## Testing Recomendado

### Pruebas Funcionales:
1. ✅ Crear entrada con proveedor nuevo
2. ✅ Verificar que aparezca en proveedores con deuda
3. ✅ Ver factura comercial completa
4. ✅ Marcar como pagado y verificar cambios
5. ✅ Editar información fiscal del proveedor
6. ✅ Crear segunda entrada con mismo proveedor
7. ✅ Verificar suma correcta de totales

### Pruebas de Impresión:
1. ✅ Abrir factura y click "Imprimir"
2. ✅ Verificar que solo se imprima el contenido de la factura
3. ✅ Verificar formato profesional
4. ✅ Verificar todos los datos presentes

### Pruebas de Datos:
1. ✅ Logs de consola muestran información correcta
2. ✅ Cálculos de totales son precisos
3. ✅ Fechas se muestran en formato correcto
4. ✅ IVA calculado correctamente (16%)

## Soporte

Si encuentras problemas:

1. **Revisa los logs de consola del navegador**
   - Información de proveedores cargados
   - IDs asignados correctamente
   - Cálculos de totales

2. **Verifica Firestore Rules**
   - Permisos correctos para las colecciones
   - Usuario autenticado

3. **Confirma estructura de datos**
   - supplier_id presente en facturas e items
   - status correcto ('draft' o 'confirmed')
   - Totales calculados correctamente

## Conclusión

El sistema ahora está completamente funcional con:
- ✅ Lógica de pagos correcta (draft = deuda, confirmed = pagado)
- ✅ Facturas comerciales profesionales con toda la información
- ✅ Campos fiscales completos para el contador
- ✅ Vista e impresión de facturas
- ✅ Seguimiento completo de pagos pendientes
- ✅ Sincronización total entre entradas y proveedores

El flujo está optimizado para uso real en una zapatería con necesidades contables y fiscales profesionales.
