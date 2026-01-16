import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function clearDatabase() {
  console.log('Iniciando limpieza completa de la base de datos...');

  try {
    const collectionsToDelete = [
      'products',
      'variants',
      'inventory',
      'sales',
      'sale_items',
      'customers',
      'promotions',
      'promotions_products',
      'returns',
      'return_items',
      'purchase_invoices',
      'purchase_invoice_items',
      'supplier_invoices',
      'supplier_invoice_items',
      'supplier_payments',
      'document_access_attempts',
      'system_incidents',
      'announces'
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToDelete) {
      console.log(`Limpiando colección: ${collectionName}`);
      const snapshot = await getDocs(collection(db, collectionName));

      if (snapshot.empty) {
        console.log(`  - ${collectionName}: vacía, saltando`);
        continue;
      }

      const batch = writeBatch(db);
      let batchCount = 0;

      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
        batchCount++;

        if (batchCount >= 500) {
          console.log(`  - Procesando batch de ${batchCount} documentos`);
        }
      });

      if (batchCount > 0) {
        await batch.commit();
        totalDeleted += batchCount;
        console.log(`  - ${collectionName}: ${batchCount} documentos eliminados`);
      }
    }

    console.log(`✅ Limpieza completada: ${totalDeleted} documentos eliminados en total`);

    return {
      success: true,
      totalDeleted,
      collectionsCleared: collectionsToDelete.length,
    };
  } catch (error) {
    console.error('Error durante la limpieza de la base de datos:', error);
    throw error;
  }
}
