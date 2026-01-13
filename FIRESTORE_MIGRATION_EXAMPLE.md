# Firestore Migration Example

This document shows how to migrate a component from Supabase to Firestore.

## Example: Migrating a Simple Query

### Before (Supabase)
```typescript
import { supabase } from '../lib/supabase';

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error loading products:', error);
    return;
  }

  setProducts(data);
}
```

### After (Firestore)
```typescript
import { getDocuments } from '../lib/firestore';

async function loadProducts() {
  try {
    const data = await getDocuments('products', {
      where: [{ field: 'active', operator: '==', value: true }],
      orderBy: { field: 'name', direction: 'asc' }
    });

    setProducts(data);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}
```

## Example: Migrating a Query with Joins

### Before (Supabase)
```typescript
const { data } = await supabase
  .from('product_variants')
  .select(`
    *,
    product:products(*),
    size:sizes(*),
    color:colors(*),
    inventory(*)
  `)
  .eq('active', true);
```

### After (Firestore)
```typescript
// Firestore doesn't support joins, so you need to:
// 1. Query the main collection
// 2. Manually fetch related documents

const variants = await getDocuments('product_variants', {
  where: [{ field: 'active', operator: '==', value: true }]
});

// Fetch related data for each variant
const variantsWithRelations = await Promise.all(
  variants.map(async (variant) => {
    const [product, size, color, inventory] = await Promise.all([
      getDocument('products', variant.product_id),
      getDocument('sizes', variant.size_id),
      getDocument('colors', variant.color_id),
      getDocuments('inventory', {
        where: [{ field: 'variant_id', operator: '==', value: variant.id }]
      }).then(inv => inv[0] || null)
    ]);

    return {
      ...variant,
      product,
      size,
      color,
      inventory
    };
  })
);

setVariants(variantsWithRelations);
```

## Example: Creating Related Documents

### Before (Supabase)
```typescript
// Supabase with foreign keys handles relationships automatically
const { data: sale, error } = await supabase
  .from('sales')
  .insert({
    user_id: user.id,
    total: 100,
    status: 'completed'
  })
  .select()
  .single();

if (!error && sale) {
  await supabase
    .from('sale_items')
    .insert([
      { sale_id: sale.id, product_id: 'p1', quantity: 1 },
      { sale_id: sale.id, product_id: 'p2', quantity: 2 }
    ]);
}
```

### After (Firestore)
```typescript
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Use a batch write for atomic operations
const batch = writeBatch(db);

// Create sale document
const saleRef = doc(collection(db, 'sales'));
batch.set(saleRef, {
  user_id: user.uid,
  total: 100,
  status: 'completed',
  created_at: new Date().toISOString()
});

// Create sale items
const item1Ref = doc(collection(db, 'sale_items'));
batch.set(item1Ref, {
  sale_id: saleRef.id,
  product_id: 'p1',
  quantity: 1,
  created_at: new Date().toISOString()
});

const item2Ref = doc(collection(db, 'sale_items'));
batch.set(item2Ref, {
  sale_id: saleRef.id,
  product_id: 'p2',
  quantity: 2,
  created_at: new Date().toISOString()
});

// Commit the batch
await batch.commit();
```

## Example: Inventory Updates (Using Transactions)

### Before (Supabase)
```typescript
// PostgreSQL handles concurrency automatically
await supabase
  .from('inventory')
  .update({ quantity: newQuantity })
  .eq('variant_id', variantId);
```

### After (Firestore)
```typescript
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Use transactions to prevent race conditions
await runTransaction(db, async (transaction) => {
  const inventoryRef = doc(db, 'inventory', inventoryId);
  const inventoryDoc = await transaction.get(inventoryRef);

  if (!inventoryDoc.exists()) {
    throw new Error('Inventory not found');
  }

  const currentQty = inventoryDoc.data().quantity;
  const newQty = currentQty - soldQty;

  if (newQty < 0) {
    throw new Error('Insufficient inventory');
  }

  transaction.update(inventoryRef, {
    quantity: newQty,
    updated_at: new Date().toISOString()
  });
});
```

## Example: Search Queries

### Before (Supabase)
```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  .eq('active', true);
```

### After (Firestore)
```typescript
// Firestore doesn't support OR queries or LIKE searches
// You need to:
// 1. Fetch all documents
// 2. Filter in memory

const allProducts = await getDocuments('products', {
  where: [{ field: 'active', operator: '==', value: true }]
});

const filtered = allProducts.filter(product => {
  const searchLower = search.toLowerCase();
  return (
    product.name.toLowerCase().includes(searchLower) ||
    product.code.toLowerCase().includes(searchLower)
  );
});

setProducts(filtered);

// For better performance with large datasets, consider:
// - Using Algolia or similar search service
// - Implementing compound queries
// - Using Cloud Functions for complex searches
```

## Example: Aggregations

### Before (Supabase)
```typescript
// Get sum of sales
const { data } = await supabase
  .from('sales')
  .select('total.sum()')
  .eq('status', 'completed');
```

### After (Firestore)
```typescript
// Firestore doesn't support aggregations
// You need to calculate in memory or use Cloud Functions

const sales = await getDocuments('sales', {
  where: [{ field: 'status', operator: '==', value: 'completed' }]
});

const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

// Or use Firestore's count() and sum() aggregation queries (newer feature)
import { getAggregateFromServer, sum, collection, query, where } from 'firebase/firestore';

const salesRef = collection(db, 'sales');
const q = query(salesRef, where('status', '==', 'completed'));

const snapshot = await getAggregateFromServer(q, {
  totalAmount: sum('total')
});

const totalSales = snapshot.data().totalAmount;
```

## Tips for Migration

1. **Start Small**: Migrate one component at a time
2. **Test Thoroughly**: Firestore behaves differently than PostgreSQL
3. **Use Transactions**: For operations that must be atomic
4. **Denormalize Data**: Store frequently accessed data together
5. **Use Batch Writes**: For multiple updates at once
6. **Consider Cloud Functions**: For complex server-side operations
7. **Handle Errors**: Firestore errors are different from Supabase
8. **Index Your Queries**: Firestore will prompt you to create indexes
9. **Monitor Costs**: Firestore charges per read/write
10. **Use Realtime Updates**: Take advantage of Firestore's realtime features where appropriate

## When to Use Cloud Functions

Consider using Cloud Functions for:
- Generating sequential numbers (like sale numbers)
- Complex data validation
- Maintaining data integrity
- Background processing
- Scheduled tasks
- Aggregating data
- Sending notifications

Example Cloud Function:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateSaleNumber = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const db = admin.firestore();
  const counterRef = db.collection('counters').doc('sales');

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentCount = counterDoc.exists ? counterDoc.data()!.count : 0;
    const newCount = currentCount + 1;

    transaction.set(counterRef, { count: newCount });

    return `SALE-${String(newCount).padStart(8, '0')}`;
  });
});
```
