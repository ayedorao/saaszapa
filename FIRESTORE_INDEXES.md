# Índices Requeridos en Firestore

Para que el sistema funcione correctamente, necesitas crear los siguientes índices en Firestore:

## Índice 1: profiles - uid
**Colección:** `profiles`
**Campo:** `uid`
**Tipo:** Ascendente

Este índice es necesario para buscar perfiles de usuario por su UID de autenticación.

## Índice 2: products - store_id
**Colección:** `products`
**Campo:** `store_id`
**Tipo:** Ascendente

Este índice permite filtrar productos por tienda asignada.

## Cómo Crear los Índices

### Opción 1: Mediante la Consola de Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a Firestore Database → Indexes
4. Haz clic en "Create Index"
5. Selecciona la colección y agrega los campos según se especifica arriba

### Opción 2: Automáticamente
Firestore creará los índices automáticamente cuando ejecutes las consultas por primera vez. Verás un error con un enlace directo para crear el índice.

## Estado de Índices

- [ ] profiles.uid
- [ ] products.store_id

Marca cada índice cuando lo hayas creado.
