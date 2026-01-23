# Sistema de Apartados - Ejemplos de Uso

## Casos de Uso Prácticos

### Caso 1: Apartado Simple con Pago Inicial

**Escenario**: Un cliente quiere apartar unos tenis que cuestan $1,500 y da un pago inicial de $500.

**Pasos**:
1. Ir a la sección "Apartados"
2. Hacer clic en "Nuevo Apartado"
3. Seleccionar el cliente: "Juan Pérez"
4. Seleccionar el producto: "Nike Air Max - Talla 8.5 - Color Negro - $1,500.00"
5. Seleccionar la tienda: "Tienda Principal"
6. Ingresar pago inicial: $500
7. Hacer clic en "Crear Apartado"

**Resultado**:
- Se crea el apartado AP240123-001
- Estado: Activo
- Total: $1,500.00
- Pagado: $500.00
- Saldo: $1,000.00
- Se genera comprobante del pago inicial

---

### Caso 2: Apartado Sin Pago Inicial

**Escenario**: Un cliente quiere apartar unos zapatos pero no tiene dinero en ese momento.

**Pasos**:
1. Ir a "Apartados" > "Nuevo Apartado"
2. Seleccionar el cliente: "María González"
3. Seleccionar el producto: "Clarks Casual - Talla 7 - Color Café - $900.00"
4. Seleccionar la tienda: "Tienda Principal"
5. Dejar el pago inicial vacío
6. Hacer clic en "Crear Apartado"

**Resultado**:
- Se crea el apartado AP240123-002
- Estado: Activo
- Total: $900.00
- Pagado: $0.00
- Saldo: $900.00

---

### Caso 3: Registro de Múltiples Abonos

**Escenario**: El cliente Juan Pérez (del Caso 1) viene a realizar abonos semanales.

#### Semana 1 - Primer Abono Adicional
1. En la lista de apartados, buscar AP240123-001
2. Hacer clic en el ícono de dólar ($)
3. Ingresar monto: $300
4. Seleccionar método: "Efectivo"
5. Hacer clic en "Registrar Abono"

**Resultado**:
- Pagado: $800.00 ($500 inicial + $300)
- Saldo: $700.00
- Se genera comprobante del abono

#### Semana 2 - Segundo Abono
1. Repetir proceso para AP240123-001
2. Ingresar monto: $300
3. Seleccionar método: "Tarjeta"
4. Ingresar referencia: "AUTH-987654"
5. Hacer clic en "Registrar Abono"

**Resultado**:
- Pagado: $1,100.00
- Saldo: $400.00
- Se genera comprobante del abono

#### Semana 3 - Pago Final
1. Repetir proceso para AP240123-001
2. Ingresar monto: $400
3. Seleccionar método: "Efectivo"
4. Hacer clic en "Registrar Abono"

**Resultado**:
- Estado cambia automáticamente a: **Pagado**
- Pagado: $1,500.00
- Saldo: $0.00
- Listo para entrega

---

### Caso 4: Entrega de Producto

**Escenario**: El cliente Juan Pérez viene a recoger sus tenis completamente pagados.

**Pasos**:
1. En la lista de apartados, buscar AP240123-001
2. Verificar que el estado sea "Pagado"
3. Hacer clic en el ícono de camión (Truck)
4. Confirmar la entrega

**Resultado**:
- Estado cambia a: **Entregado**
- Se registra la fecha de entrega
- Ya no se pueden realizar más cambios al apartado

---

### Caso 5: Cancelación de Apartado

**Escenario**: El cliente María González (Caso 2) decide no querer el producto.

**Pasos**:
1. En la lista de apartados, buscar AP240123-002
2. Hacer clic en el ícono X rojo
3. Ingresar motivo: "Cliente cambió de opinión"
4. Confirmar cancelación

**Resultado**:
- Estado cambia a: **Cancelado**
- Se registra el motivo de cancelación
- Se registra la fecha de cancelación
- El producto vuelve a estar disponible en inventario

---

### Caso 6: Pago con Transferencia

**Escenario**: Un cliente realiza un abono mediante transferencia bancaria.

**Pasos**:
1. Localizar el apartado correspondiente
2. Hacer clic en el ícono de dólar ($)
3. Ingresar monto: $250
4. Seleccionar método: "Transferencia"
5. Ingresar referencia: "TRANSFER-123456789"
6. Agregar notas: "Transferencia BBVA"
7. Hacer clic en "Registrar Abono"

**Resultado**:
- El abono se registra con todos los detalles
- El comprobante muestra el método y la referencia
- El saldo se actualiza correctamente

---

### Caso 7: Uso de Crédito de Tienda

**Escenario**: Un cliente tiene crédito de tienda por una devolución anterior y lo usa para abonar.

**Pasos**:
1. Localizar el apartado correspondiente
2. Hacer clic en el ícono de dólar ($)
3. Ingresar monto: $150
4. Seleccionar método: "Crédito de Tienda"
5. Agregar notas: "Aplicado de crédito por devolución"
6. Hacer clic en "Registrar Abono"

**Resultado**:
- El abono se registra correctamente
- El saldo del apartado se reduce
- El comprobante indica que se usó crédito de tienda

---

## Flujos de Trabajo Completos

### Flujo A: Apartado Rápido (Mismo Día)

**Situación**: Cliente compra inmediatamente después de apartar

1. **10:00 AM** - Crear apartado con pago inicial de $800 (total $2,000)
2. **10:05 AM** - Cliente decide llevárselo y paga los $1,200 restantes
3. **10:10 AM** - Se marca como pagado automáticamente
4. **10:15 AM** - Se entrega el producto
5. **10:15 AM** - Apartado completado en 15 minutos

---

### Flujo B: Apartado a Plazos (Un Mes)

**Situación**: Cliente paga en 4 semanas

1. **Semana 1** - Apartado creado, pago inicial $600 (total $2,400)
2. **Semana 2** - Primer abono $600 (acumulado $1,200, saldo $1,200)
3. **Semana 3** - Segundo abono $600 (acumulado $1,800, saldo $600)
4. **Semana 4** - Pago final $600 (acumulado $2,400, saldo $0)
5. **Semana 4** - Entrega del producto
6. Apartado completado en 1 mes

---

### Flujo C: Apartado Cancelado

**Situación**: Cliente no puede completar el pago

1. **Día 1** - Apartado creado, pago inicial $300 (total $1,200)
2. **Día 7** - Primer abono $200 (acumulado $500, saldo $700)
3. **Día 14** - Cliente no puede continuar pagando
4. **Día 14** - Se cancela el apartado con motivo registrado
5. **Día 14** - Producto disponible nuevamente para venta

**Nota**: Según las políticas de la tienda, los pagos pueden o no ser reembolsables.

---

## Escenarios de Validación

### ✓ Validación 1: Abono Excesivo
**Intento**: Abonar $1,000 cuando el saldo es $800
**Resultado**: Sistema muestra error y no permite el registro
**Mensaje**: "El monto no puede exceder el saldo pendiente de $800.00"

### ✓ Validación 2: Abono Negativo
**Intento**: Ingresar monto negativo o cero
**Resultado**: Sistema muestra error y no permite el registro
**Mensaje**: "El monto debe ser mayor a cero"

### ✓ Validación 3: Entrega Anticipada
**Intento**: Marcar como entregado un apartado con saldo pendiente
**Resultado**: Botón de entrega no disponible
**Mensaje**: "El apartado debe estar completamente pagado antes de ser entregado"

### ✓ Validación 4: Pago en Apartado Cancelado
**Intento**: Intentar agregar abono a apartado cancelado
**Resultado**: Botón de abono no disponible
**Mensaje**: "Solo se pueden agregar abonos a apartados activos"

### ✓ Validación 5: Producto Sin Inventario
**Intento**: Crear apartado de producto sin inventario
**Resultado**: Producto no aparece en la lista de selección
**Comportamiento**: Solo se muestran productos con stock disponible

---

## Consejos de Uso

### Para Maximizar la Eficiencia

1. **Filtros**: Use los filtros de estado para encontrar apartados rápidamente
   - "Activos" para ver quiénes deben abonar
   - "Pagados" para ver qué productos están listos para entrega

2. **Búsqueda**: Use la barra de búsqueda para encontrar apartados por:
   - Número de apartado (AP240123-001)
   - Nombre del cliente
   - Nombre del producto

3. **Comprobantes**: Siempre imprima el comprobante al recibir un abono
   - Entregue una copia al cliente
   - Conserve una copia para sus registros

4. **Notas**: Use el campo de notas para:
   - Acuerdos especiales con el cliente
   - Fechas acordadas para pagos
   - Observaciones importantes

5. **Seguimiento**: Revise regularmente las estadísticas:
   - Saldo pendiente total indica cuánto dinero está "apartado"
   - Apartados activos antiguos pueden requerir seguimiento

---

## Casos Especiales

### Caso Especial 1: Cliente Regular
**Situación**: Cliente tiene buen historial de pagos

**Recomendación**:
- Permitir apartados sin pago inicial
- Confiar en su compromiso de pago
- Documentar en notas: "Cliente preferente"

### Caso Especial 2: Producto de Alta Demanda
**Situación**: Zapatos que se venden rápido

**Recomendación**:
- Solicitar pago inicial mayor (50%+)
- Establecer tiempo límite para completar pago
- Documentar en notas el acuerdo de tiempo

### Caso Especial 3: Promoción Especial
**Situación**: Apartado durante una promoción

**Recomendación**:
- Registrar el precio promocional en el apartado
- Documentar en notas: "Precio de promoción [fecha]"
- Respetar el precio aunque la promoción termine

---

## Checklist de Operación Diaria

### Al Abrir la Tienda
- [ ] Revisar apartados activos del día
- [ ] Verificar apartados con pagos pendientes
- [ ] Preparar productos pagados para posible entrega

### Durante el Día
- [ ] Registrar todos los abonos recibidos
- [ ] Imprimir y entregar comprobantes
- [ ] Actualizar notas según conversaciones con clientes
- [ ] Marcar entregas realizadas

### Al Cerrar la Tienda
- [ ] Revisar estadísticas del día
- [ ] Verificar que todos los abonos estén registrados
- [ ] Planear seguimientos para el día siguiente
- [ ] Archivar comprobantes del día

---

**Última actualización**: Enero 2024
