import { collection, getDocs, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function cleanupDuplicateInventory() {
  console.log('Iniciando limpieza de inventarios duplicados...');

  try {
    const inventorySnap = await getDocs(collection(db, 'inventory'));
    const storesSnap = await getDocs(collection(db, 'stores'));

    const stores = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const defaultStoreId = stores[0]?.id;

    if (!defaultStoreId) {
      console.error('No hay tiendas disponibles');
      return;
    }

    const inventoryByVariant = new Map<string, Array<{ id: string; quantity: number; store_id: string; min_stock: number }>>();

    inventorySnap.docs.forEach(docSnap => {
      const inv = docSnap.data();
      const variantId = inv.variant_id;

      if (!inventoryByVariant.has(variantId)) {
        inventoryByVariant.set(variantId, []);
      }

      inventoryByVariant.get(variantId)!.push({
        id: docSnap.id,
        quantity: inv.quantity || 0,
        store_id: inv.store_id || '',
        min_stock: inv.min_stock || 5,
      });
    });

    console.log(`Encontradas ${inventoryByVariant.size} variantes únicas`);

    let duplicatesFound = 0;
    let duplicatesFixed = 0;
    const batch = writeBatch(db);
    let operationCount = 0;

    for (const [variantId, inventories] of inventoryByVariant.entries()) {
      if (inventories.length > 1) {
        duplicatesFound++;
        console.log(`Variante ${variantId} tiene ${inventories.length} registros de inventario`);

        const storeIdCounts = new Map<string, number>();
        inventories.forEach(inv => {
          if (inv.store_id) {
            storeIdCounts.set(inv.store_id, (storeIdCounts.get(inv.store_id) || 0) + 1);
          }
        });

        let targetStoreId = defaultStoreId;
        if (storeIdCounts.size > 0) {
          const [mostCommonStore] = Array.from(storeIdCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];
          targetStoreId = mostCommonStore;
        }

        const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
        const maxMinStock = Math.max(...inventories.map(inv => inv.min_stock));

        const keepInventory = inventories.find(inv => inv.store_id === targetStoreId) || inventories[0];

        batch.update(doc(db, 'inventory', keepInventory.id), {
          quantity: totalQuantity,
          store_id: targetStoreId,
          min_stock: maxMinStock,
          updated_at: new Date().toISOString(),
        });
        operationCount++;

        inventories.forEach(inv => {
          if (inv.id !== keepInventory.id) {
            batch.delete(doc(db, 'inventory', inv.id));
            operationCount++;
          }
        });

        duplicatesFixed++;

        if (operationCount >= 400) {
          await batch.commit();
          console.log(`Batch commit: ${duplicatesFixed} duplicados corregidos hasta ahora`);
          operationCount = 0;
        }
      } else if (inventories.length === 1 && !inventories[0].store_id) {
        batch.update(doc(db, 'inventory', inventories[0].id), {
          store_id: defaultStoreId,
          updated_at: new Date().toISOString(),
        });
        operationCount++;

        if (operationCount >= 400) {
          await batch.commit();
          console.log('Batch commit: actualizando inventarios sin store_id');
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Limpieza completada:`);
    console.log(`  - ${duplicatesFound} variantes con inventarios duplicados`);
    console.log(`  - ${duplicatesFixed} duplicados corregidos`);
    console.log(`  - Todos los inventarios ahora tienen un store_id válido`);

    return {
      duplicatesFound,
      duplicatesFixed,
    };
  } catch (error) {
    console.error('Error durante la limpieza:', error);
    throw error;
  }
}
