import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Script para corregir el estado de las facturas de proveedores
 * Las facturas en estado 'draft' son PENDIENTES DE PAGO
 * Las facturas en estado 'confirmed' son PAGADAS
 */
export async function fixSupplierInvoices() {
  try {
    console.log('🔧 Iniciando corrección de facturas de proveedores...');

    const invoicesSnap = await getDocs(collection(db, 'purchase_invoices'));
    const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📋 Total de facturas encontradas: ${invoices.length}`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;

    for (const invoice of invoices) {
      const inv = invoice as any;

      if (inv.status === 'confirmed' && !inv.confirmed_at) {
        console.warn(`⚠️ Factura ${inv.invoice_number}: Status 'confirmed' pero sin fecha de pago`);
        console.log(`   ℹ️ Cambiando a 'draft' (pendiente de pago)`);

        await updateDoc(doc(db, 'purchase_invoices', invoice.id), {
          status: 'draft',
          updated_at: new Date().toISOString()
        });

        correctedCount++;
      } else if (inv.status === 'draft') {
        alreadyCorrectCount++;
        console.log(`✅ Factura ${inv.invoice_number}: Ya está en 'draft' (pendiente de pago) - OK`);
      } else if (inv.status === 'confirmed' && inv.confirmed_at) {
        alreadyCorrectCount++;
        console.log(`✅ Factura ${inv.invoice_number}: Ya está en 'confirmed' con fecha de pago - OK`);
      }
    }

    console.log('\n📊 Resumen de corrección:');
    console.log(`   ✅ Facturas ya correctas: ${alreadyCorrectCount}`);
    console.log(`   🔧 Facturas corregidas: ${correctedCount}`);
    console.log(`   📋 Total procesadas: ${invoices.length}`);
    console.log('\n✨ Corrección completada');

    return {
      total: invoices.length,
      corrected: correctedCount,
      alreadyCorrect: alreadyCorrectCount
    };
  } catch (error) {
    console.error('❌ Error al corregir facturas:', error);
    throw error;
  }
}

/**
 * Script para mostrar el estado actual de proveedores
 */
export async function showSuppliersDebugInfo() {
  try {
    console.log('\n🔍 DEBUG: Estado actual de proveedores\n');

    const [suppliersSnap, invoicesSnap, itemsSnap] = await Promise.all([
      getDocs(collection(db, 'suppliers')),
      getDocs(collection(db, 'purchase_invoices')),
      getDocs(collection(db, 'purchase_invoice_items'))
    ]);

    const suppliers = suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📦 Total proveedores: ${suppliers.length}`);
    console.log(`📋 Total facturas: ${invoices.length}`);
    console.log(`📦 Total items: ${items.length}\n`);

    const invoicesBySupplier = new Map<string, any[]>();
    invoices.forEach(invoice => {
      const inv = invoice as any;
      if (inv.supplier_id) {
        if (!invoicesBySupplier.has(inv.supplier_id)) {
          invoicesBySupplier.set(inv.supplier_id, []);
        }
        invoicesBySupplier.get(inv.supplier_id)!.push(invoice);
      }
    });

    suppliers.forEach((supplier: any) => {
      const supplierInvoices = invoicesBySupplier.get(supplier.id) || [];

      const draftInvoices = supplierInvoices.filter((inv: any) => inv.status === 'draft');
      const confirmedInvoices = supplierInvoices.filter((inv: any) => inv.status === 'confirmed');

      const pendingAmount = draftInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const paidAmount = confirmedInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      console.log(`\n🏪 Proveedor: ${supplier.name} (${supplier.code})`);
      console.log(`   📋 Total facturas: ${supplierInvoices.length}`);
      console.log(`   ❌ Pendientes de pago (draft): ${draftInvoices.length} = $${pendingAmount.toFixed(2)}`);
      console.log(`   ✅ Pagadas (confirmed): ${confirmedInvoices.length} = $${paidAmount.toFixed(2)}`);

      if (draftInvoices.length > 0) {
        console.log(`   🔴 TIENE DEUDA: $${pendingAmount.toFixed(2)}`);
      } else {
        console.log(`   🟢 Al corriente`);
      }

      supplierInvoices.forEach((inv: any) => {
        const statusEmoji = inv.status === 'draft' ? '❌' : '✅';
        const statusText = inv.status === 'draft' ? 'PENDIENTE' : 'PAGADO';
        console.log(`      ${statusEmoji} ${inv.invoice_number} - ${statusText} - $${inv.total?.toFixed(2) || '0.00'}`);
      });
    });

    console.log('\n✨ Debug completado\n');
  } catch (error) {
    console.error('❌ Error en debug:', error);
    throw error;
  }
}
