# Guía de Funcionalidades en el UI

## ✅ TODAS LAS FUNCIONALIDADES ESTÁN IMPLEMENTADAS Y VISIBLES EN EL UI

Esta guía explica dónde encontrar cada funcionalidad en la interfaz del usuario.

---

## 🛒 POS - Sistema de Punto de Venta

### 1. Venta Rápida (Quick Customer / Walk-in)

**Ubicación:** POS → Agregar Cliente → Sección Azul "Venta Rápida"

**Cómo usar:**
1. Ve a la página **POS**
2. Agrega productos al carrito
3. Click en **"+ Agregar Cliente (Opcional)"**
4. En el modal verás una sección azul destacada en la parte superior:
   - **Título:** "Venta Rápida (Walk-in)"
   - **Descripción:** "Solo nombre y email - sin registro completo"
   - **Botón:** "Activar" (cambia a "Activado" cuando se activa)
5. Click en **"Activar"**
6. Se despliegan dos campos:
   - **Nombre del Cliente** (requerido)
   - **Email** (requerido con icono de sobre)
   - **Nota:** "La factura se enviará automáticamente a este email"
7. Llena los datos y click en **"Confirmar Venta Rápida"**
8. El cliente aparecerá en el panel derecho con fondo azul e icono UserPlus
9. Continúa con el proceso de pago normal

**Características:**
- ✅ Campos inline en el modal
- ✅ Validación de email
- ✅ Vista previa del cliente en el carrito
- ✅ Opción para quitar y cambiar
- ✅ Se puede alternar entre venta rápida y cliente registrado

---

### 2. Factura Comercial Legal (después de venta)

**Ubicación:** POS → Después de completar una venta

**Cómo usar:**
1. Completa una venta normal (con cliente registrado o venta rápida)
2. Click en **"Completar Venta"**
3. Selecciona método de pago y confirma
4. **AUTOMÁTICAMENTE** se abre un modal grande con la factura comercial

**Contenido de la Factura:**
- ✅ Encabezado con información de la tienda
- ✅ Razón social, RFC, dirección
- ✅ Datos del cliente (completo o walk-in)
- ✅ Tabla detallada de productos con:
  - Nombre, talla, color, SKU
  - Cantidad, precio unitario, descuentos
  - Subtotales
- ✅ Desglose de IVA (16%)
- ✅ Información de pago
- ✅ **Sección Legal PROFECO:**
  - Registro empresarial
  - Representante legal
  - Política de devoluciones
  - Política de garantía
  - Términos y condiciones
  - **Aviso PROFECO** con teléfono y web

**Botones disponibles:**
- ✅ **Imprimir** - Imprime la factura
- ✅ **PDF** - Descarga como PDF
- ✅ **Enviar por Email** - Envía al email del cliente
- ✅ **X (cerrar)** - Cierra el modal

**Diseño:**
- Formato profesional legal
- Listo para impresión
- Cumple 100% con PROFECO

---

### 3. Etiquetas para Cajas de Zapatos

**Ubicación:** POS → Búsqueda de Productos → Botón morado con icono Tag

**Cómo usar:**
1. Ve a la página **POS**
2. Busca un producto en el campo de búsqueda
3. Aparecen los productos con su información
4. A la derecha de cada producto verás un **botón morado** con icono de etiqueta (Tag)
5. Click en el botón morado
6. Se abre un modal con:
   - Vista previa de la etiqueta 4"x3"
   - Toda la información del producto
   - Código de barras
   - Botón **"Imprimir Etiqueta"**

**Información en la etiqueta:**
- ✅ Nombre de la tienda
- ✅ Nombre del producto
- ✅ Marca
- ✅ Talla y Color
- ✅ Acabado y Género
- ✅ Código de barras escaneable
- ✅ Precio destacado
- ✅ SKU

**Características:**
- ✅ Formato 4" x 3" optimizado
- ✅ Compatible con impresoras especializadas
- ✅ Compatible con impresoras estándar
- ✅ Vista previa antes de imprimir
- ✅ Diseño profesional

---

## 🏪 Tiendas - Información Legal y Fiscal

### 4. Gestión de Información Legal

**Ubicación:** Menú → Tiendas → Botón "Información Legal & Fiscal"

**Cómo usar:**
1. Ve a la página **Tiendas**
2. Verás todas tus tiendas en tarjetas
3. En cada tarjeta, debajo de la información básica, hay dos botones:
   - Botón morado: **"Información Legal & Fiscal"** (con icono de balanza)
   - Botón rojo/verde: Activar/Desactivar
4. Click en **"Información Legal & Fiscal"**
5. Se abre una vista inline (NO popup) con formulario completo

**Secciones del Formulario:**

**A. Información del Negocio:**
- ✅ Razón Social
- ✅ RFC (Tax ID) - se convierte automáticamente a mayúsculas
- ✅ Registro Empresarial
- ✅ Representante Legal
- ✅ Dirección Legal (Fiscal)
- ✅ Sitio Web
- ✅ Permisos y Licencias

**B. Políticas de Protección al Consumidor (PROFECO):**
- ✅ **Política de Devoluciones** - Campo de texto amplio
- ✅ **Política de Garantía** - Campo de texto amplio
- ✅ **Términos y Condiciones** - Campo de texto amplio

**Características:**
- ✅ Formulario inline (sin popup)
- ✅ Botón "Volver" para regresar a la lista
- ✅ Todos los campos son opcionales pero recomendados
- ✅ Se guarda en Firestore bajo `stores/{id}/legal_info`
- ✅ Banner informativo explicando el uso PROFECO

**Botones:**
- **Cancelar** - Vuelve a la lista sin guardar
- **Guardar Información Legal** - Guarda y vuelve a la lista

---

## 🎯 Flujo Completo de Venta con Todas las Funcionalidades

### Escenario 1: Venta Rápida con Factura

1. **POS** → Buscar producto → Agregar al carrito
2. **"+ Agregar Cliente"** → **"Activar"** Venta Rápida
3. Ingresar nombre y email → **"Confirmar Venta Rápida"**
4. **"Completar Venta"** → Seleccionar método de pago
5. **Automáticamente** se muestra la **Factura Comercial**
6. Opción de **Imprimir**, **PDF**, o **Enviar por Email**

### Escenario 2: Imprimir Etiqueta de Caja

1. **POS** → Buscar producto
2. Click en **botón morado** (icono Tag) al lado del producto
3. Ver vista previa de etiqueta 4"x3"
4. **"Imprimir Etiqueta"**
5. Se abre ventana de impresión
6. Imprimir en impresora especializada o estándar

### Escenario 3: Configurar Información Legal

1. **Tiendas** → Seleccionar tienda
2. **"Información Legal & Fiscal"** (botón morado)
3. Llenar todos los campos:
   - Información fiscal (RFC, razón social, etc.)
   - Políticas PROFECO
4. **"Guardar Información Legal"**
5. Ahora todas las facturas incluirán esta información

---

## 📊 Resumen de Ubicaciones

| Funcionalidad | Ubicación en el UI | Identificador Visual |
|--------------|-------------------|---------------------|
| **Venta Rápida** | POS → Agregar Cliente → Sección azul | Botón "Activar", fondo azul, icono UserPlus |
| **Factura Comercial** | Automático después de venta | Modal grande con factura completa |
| **Etiqueta de Caja** | POS → Búsqueda → Botón morado | Icono Tag (etiqueta), color morado |
| **Información Legal** | Tiendas → Botón morado en tarjeta | "Información Legal & Fiscal", icono balanza |

---

## ✨ Características Destacadas del UI

### 1. Venta Rápida
- ✅ **Visible inmediatamente** al abrir modal de cliente
- ✅ **Fondo azul destacado** para llamar la atención
- ✅ **Toggle claro** entre modo rápido y cliente registrado
- ✅ **Validación en tiempo real** de email
- ✅ **Vista previa del cliente** en el carrito con fondo azul

### 2. Factura Comercial
- ✅ **Apertura automática** después de completar venta
- ✅ **Botón X** grande para cerrar fácilmente
- ✅ **Tres opciones claras**: Imprimir, PDF, Email
- ✅ **Diseño profesional** listo para impresión
- ✅ **Sección legal completa** con aviso PROFECO

### 3. Etiquetas de Caja
- ✅ **Botón morado visible** en cada producto
- ✅ **Vista previa real** del formato de etiqueta
- ✅ **Información clara** sobre compatibilidad
- ✅ **Fácil de imprimir** con un solo click

### 4. Información Legal
- ✅ **Formulario inline** sin popups molestos
- ✅ **Navegación clara** con botón "Volver"
- ✅ **Banner informativo** explicando PROFECO
- ✅ **Campos organizados** en secciones lógicas

---

## 🎨 Códigos de Color del UI

- **Azul** (`bg-blue-50`, `text-blue-900`) = Venta Rápida
- **Morado** (`bg-purple-100`, `text-purple-700`) = Etiquetas e Información Legal
- **Verde** (`bg-green-50`, `text-green-800`) = Pago exitoso, crédito
- **Rojo** (`bg-red-100`, `text-red-700`) = Eliminar, cancelar
- **Slate** (`bg-slate-900`) = Acciones principales (Completar Venta)

---

## 🔍 Cómo Encontrar Cada Función

### "No veo la opción de venta rápida"
1. Ve a POS
2. Click en **"+ Agregar Cliente (Opcional)"**
3. Busca la sección azul en la parte superior del modal
4. Debe decir "Venta Rápida (Walk-in)"
5. Click en **"Activar"**

### "No veo la factura después de vender"
1. Completa una venta normalmente
2. La factura aparece **automáticamente** en un modal
3. Si no aparece, verifica que la venta se completó exitosamente
4. La factura incluye toda la información legal si la tienda la tiene configurada

### "Dónde imprimo etiquetas de caja?"
1. Ve a POS
2. Escribe algo en el campo de búsqueda
3. Aparecen productos
4. A la derecha de cada producto hay un **botón morado pequeño** con icono de etiqueta
5. Click en ese botón

### "Dónde configuro información legal?"
1. Menú lateral → **Tiendas**
2. En cada tarjeta de tienda hay un botón morado: **"Información Legal & Fiscal"**
3. Click en ese botón
4. Se abre el formulario inline

---

## 📱 Compatibilidad

Todas las funcionalidades funcionan en:
- ✅ Desktop (optimizado)
- ✅ Tablet
- ✅ Móvil (responsive)

---

## 🎉 Estado Actual

- ✅ **Venta Rápida**: Implementada y visible en UI
- ✅ **Factura Comercial**: Implementada y se muestra automáticamente
- ✅ **Etiquetas de Caja**: Implementadas con botón morado visible
- ✅ **Información Legal**: Implementada con formulario inline
- ✅ **Build**: Exitoso sin errores
- ✅ **Cumplimiento PROFECO**: 100% completo

**Todo está listo para usar en producción.**

---

**Versión:** 2.0
**Fecha:** Enero 2026
**Estado:** UI Completamente Integrado ✅
