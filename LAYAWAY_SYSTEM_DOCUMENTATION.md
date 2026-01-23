# Sistema de Apartados - Documentación Completa

## Descripción General

El sistema de apartados permite a los clientes reservar productos mediante pagos parciales (abonos). El producto se mantiene apartado hasta que el cliente complete el pago total, momento en el cual se marca como "pagado" y queda listo para entrega.

## Características Principales

### 1. **Gestión de Apartados**
- Crear nuevos apartados con información del cliente y producto
- Selección de producto con verificación de disponibilidad en inventario
- Registro de pago inicial opcional
- Estados del apartado: Activo, Pagado, Entregado, Cancelado
- Tracking completo del historial de pagos

### 2. **Sistema de Abonos (Pagos Parciales)**
- Registro de abonos con múltiples métodos de pago:
  - Efectivo
  - Tarjeta
  - Transferencia
  - Crédito de Tienda
- Validación automática de montos
- Actualización automática del saldo pendiente
- Prevención de abonos que excedan el saldo

### 3. **Generación Automática de Comprobantes**
- Comprobante detallado por cada abono registrado
- Información incluida en el comprobante:
  - Número de apartado
  - Fecha y hora del abono
  - Datos del cliente
  - Información del producto (marca, nombre, talla, color)
  - Monto del abono actual
  - Total pagado acumulado
  - Saldo restante
  - Método de pago utilizado
  - Número de referencia (si aplica)
- Funcionalidad de impresión directa

### 4. **Panel de Seguimiento**
- Vista completa de todos los apartados
- Estadísticas en tiempo real:
  - Apartados activos
  - Apartados pagados
  - Apartados entregados
  - Saldo pendiente total
- Filtros por estado (Activo, Pagado, Entregado, Cancelado)
- Búsqueda por número de apartado, cliente o producto
- Vista detallada del historial de pagos

### 5. **Control de Estados**
- **Activo**: Apartado en proceso con pagos pendientes
- **Pagado**: Saldo completado, listo para entrega
- **Entregado**: Producto entregado al cliente
- **Cancelado**: Apartado cancelado con registro de motivo

## Estructura de Base de Datos

### Colección: `layaways`
```typescript
{
  id: string;
  layaway_number: string;         // AP240123-001
  customer_id: string;
  variant_id: string;
  store_id: string;
  status: 'active' | 'paid' | 'delivered' | 'cancelled';
  total_price: number;
  amount_paid: number;
  balance: number;
  initial_payment?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_by?: string;
}
```

### Colección: `layaway_payments`
```typescript
{
  id: string;
  layaway_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'store_credit';
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}
```

## Flujo de Trabajo

### 1. Crear Nuevo Apartado

**Paso 1**: Hacer clic en "Nuevo Apartado"

**Paso 2**: Llenar el formulario:
- Seleccionar cliente (debe estar registrado previamente)
- Seleccionar producto (solo productos con inventario disponible)
- Seleccionar tienda
- Ingresar pago inicial (opcional)
- Agregar notas (opcional)

**Paso 3**: El sistema automáticamente:
- Genera un número único de apartado (formato: AP[AAMMDD]-[XXX])
- Calcula el saldo pendiente (total - pago inicial)
- Establece el estado inicial (Activo o Pagado si el pago inicial cubre el total)
- Registra el pago inicial en el historial si se proporcionó

### 2. Registrar Abonos

**Paso 1**: En la lista de apartados, hacer clic en el ícono de dólar ($) en apartados activos

**Paso 2**: Llenar el formulario de abono:
- Ingresar monto del abono (validado contra el saldo pendiente)
- Seleccionar método de pago
- Agregar número de referencia (opcional, recomendado para tarjeta/transferencia)
- Agregar notas (opcional)

**Paso 3**: El sistema automáticamente:
- Actualiza el monto pagado
- Calcula y actualiza el saldo pendiente
- Cambia el estado a "Pagado" si el saldo llega a cero
- Genera un comprobante de abono
- Muestra el comprobante para revisión e impresión

### 3. Entregar Producto

**Requisito**: El apartado debe estar en estado "Pagado"

**Paso 1**: Hacer clic en el ícono de camión (Truck) en apartados pagados

**Paso 2**: Confirmar la entrega

**Resultado**: El sistema marca el apartado como "Entregado" y registra la fecha de entrega

### 4. Cancelar Apartado

**Aplicable a**: Apartados en estado "Activo" o "Pagado"

**Paso 1**: Hacer clic en el ícono de cancelación (X roja)

**Paso 2**: Ingresar el motivo de la cancelación

**Resultado**: El sistema marca el apartado como "Cancelado" y registra el motivo

**Nota**: Los apartados entregados NO pueden ser cancelados

## Validaciones Implementadas

### Validaciones de Creación
- ✓ Cliente, producto y tienda son campos obligatorios
- ✓ El pago inicial no puede ser negativo
- ✓ El pago inicial no puede exceder el precio total
- ✓ Solo se muestran productos con inventario disponible
- ✓ Solo se muestran clientes activos

### Validaciones de Abonos
- ✓ El monto del abono debe ser mayor a cero
- ✓ El monto del abono no puede exceder el saldo pendiente
- ✓ Solo se pueden agregar abonos a apartados en estado "Activo"
- ✓ Todos los campos requeridos deben estar completos

### Validaciones de Estado
- ✓ Solo apartados "Pagados" pueden ser marcados como "Entregados"
- ✓ Solo apartados "Activos" o "Pagados" pueden ser cancelados
- ✓ Apartados "Entregados" no pueden ser modificados
- ✓ El estado cambia automáticamente a "Pagado" cuando el saldo llega a cero

## Interfaz de Usuario

### Panel Principal
- **Tarjetas de Estadísticas**: Muestra métricas clave en tiempo real
- **Barra de Búsqueda**: Búsqueda rápida por múltiples criterios
- **Filtro de Estado**: Filtra apartados por su estado actual
- **Tabla de Apartados**: Lista completa con toda la información relevante

### Acciones Disponibles (según estado)
- **Apartados Activos**:
  - Agregar Abono (ícono $)
  - Cancelar (ícono X)
  - Ver Detalles (ícono ojo)

- **Apartados Pagados**:
  - Marcar como Entregado (ícono camión)
  - Cancelar (ícono X)
  - Ver Detalles (ícono ojo)

- **Apartados Entregados**:
  - Ver Detalles (ícono ojo)

- **Apartados Cancelados**:
  - Ver Detalles (ícono ojo)

### Comprobante de Abono
- Diseño profesional y limpio
- Información completa del apartado y el abono
- Botón de impresión integrado
- Compatible con impresoras térmicas y estándar

## Permisos y Seguridad

### Permisos Requeridos
- **Crear Apartados**: Permiso 'sales'
- **Registrar Abonos**: Permiso 'sales'
- **Marcar como Entregado**: Permiso 'sales'
- **Cancelar Apartados**: Permiso 'sales'
- **Ver Apartados**: Permiso 'sales'

### Auditoría
- Todos los apartados registran el usuario que los creó
- Todos los pagos registran el usuario que los realizó
- Las cancelaciones registran el motivo
- Todas las acciones incluyen marcas de tiempo

## Números de Apartado

### Formato
`AP[AA][MM][DD]-[XXX]`

Donde:
- **AP**: Prefijo para "Apartado"
- **AA**: Últimos 2 dígitos del año
- **MM**: Mes (01-12)
- **DD**: Día (01-31)
- **XXX**: Número secuencial del día (001-999)

### Ejemplos
- `AP240123-001`: Primer apartado del 23 de enero de 2024
- `AP240123-015`: Décimo quinto apartado del 23 de enero de 2024

## Reportes y Análisis

### Métricas Disponibles
1. **Apartados Activos**: Cantidad de apartados en proceso
2. **Apartados Pagados**: Cantidad de apartados listos para entrega
3. **Apartados Entregados**: Total de apartados completados
4. **Saldo Pendiente Total**: Suma de todos los saldos pendientes

### Análisis Recomendados
- Tasa de conversión (Pagados vs Cancelados)
- Tiempo promedio para completar pagos
- Productos más apartados
- Clientes frecuentes de apartados
- Monto promedio de apartados

## Mejores Prácticas

### Para Vendedores
1. Verificar la disponibilidad del producto antes de crear el apartado
2. Explicar claramente al cliente los términos del apartado
3. Registrar el pago inicial si el cliente lo realiza
4. Agregar notas relevantes sobre el apartado o el cliente
5. Proporcionar el comprobante al cliente en cada abono
6. Mantener al cliente informado sobre su saldo pendiente

### Para Administradores
1. Revisar regularmente los apartados activos antiguos
2. Seguir políticas claras de cancelación
3. Contactar a clientes con pagos pendientes
4. Mantener el inventario actualizado
5. Revisar las métricas semanalmente
6. Definir políticas de tiempo límite para apartados

### Para Clientes
1. Guardar todos los comprobantes de abono
2. Realizar pagos regulares según acordado
3. Comunicar cualquier problema o cambio de planes
4. Recoger el producto puntualmente una vez pagado

## Solución de Problemas

### Problema: No aparecen productos para apartar
**Solución**: Verificar que haya productos con inventario disponible en la tienda seleccionada

### Problema: No se puede agregar un abono
**Solución**: Verificar que el apartado esté en estado "Activo" y que el monto no exceda el saldo

### Problema: No se puede marcar como entregado
**Solución**: El apartado debe estar en estado "Pagado" (saldo = 0)

### Problema: Error al generar comprobante
**Solución**: Verificar la configuración de la impresora y el navegador

### Problema: El saldo no se actualiza correctamente
**Solución**: Recargar la página y verificar que todos los abonos se hayan registrado

## Extensiones Futuras

### Funcionalidades Propuestas
1. Notificaciones automáticas a clientes
2. Recordatorios de pagos pendientes
3. Políticas de cancelación automática
4. Integración con sistema de mensajería
5. Reportes detallados de apartados
6. Dashboard de métricas avanzadas
7. Exportación de datos
8. Historial de apartados por cliente
9. Apartado de múltiples productos
10. Sistema de reserva con tiempo límite

## Soporte Técnico

Para problemas técnicos o preguntas sobre el sistema de apartados:
1. Consultar esta documentación
2. Revisar los logs del sistema
3. Contactar al administrador del sistema
4. Reportar bugs o sugerencias de mejora

---

**Última actualización**: Enero 2024
**Versión del Sistema**: 1.0.0
**Autor**: Sistema POS Zapatería
