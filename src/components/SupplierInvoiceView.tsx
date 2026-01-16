import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PurchaseInvoice, PurchaseInvoiceItem, Supplier, ProductVariant, Size, Color } from '../types/database';
import { X, Download, Printer, FileText } from 'lucide-react';

interface SupplierInvoiceViewProps {
  invoiceId: string;
  onClose: () => void;
}

interface EnrichedInvoiceItem extends PurchaseInvoiceItem {
  variant?: ProductVariant;
  size?: Size;
  color?: Color;
}

export default function SupplierInvoiceView({ invoiceId, onClose }: SupplierInvoiceViewProps) {
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<EnrichedInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  async function loadInvoiceData() {
    try {
      const invoiceDoc = await getDoc(doc(db, 'purchase_invoices', invoiceId));
      if (!invoiceDoc.exists()) {
        alert('Factura no encontrada');
        onClose();
        return;
      }

      const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as PurchaseInvoice;
      setInvoice(invoiceData);

      if (invoiceData.supplier_id) {
        const supplierDoc = await getDoc(doc(db, 'suppliers', invoiceData.supplier_id));
        if (supplierDoc.exists()) {
          setSupplier({ id: supplierDoc.id, ...supplierDoc.data() } as Supplier);
        }
      }

      const itemsQuery = query(
        collection(db, 'purchase_invoice_items'),
        where('invoice_id', '==', invoiceId)
      );
      const itemsSnap = await getDocs(itemsQuery);
      const itemsData = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseInvoiceItem[];

      const [variantsSnap, sizesSnap, colorsSnap] = await Promise.all([
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors'))
      ]);

      const variantsMap = new Map(variantsSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as ProductVariant]));
      const sizesMap = new Map(sizesSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Size]));
      const colorsMap = new Map(colorsSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Color]));

      const enrichedItems = itemsData.map(item => {
        const variant = variantsMap.get(item.variant_id);
        return {
          ...item,
          variant,
          size: variant ? sizesMap.get(variant.size_id) : undefined,
          color: variant ? colorsMap.get(variant.color_id) : undefined
        };
      });

      setItems(enrichedItems);
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Error al cargar la factura');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    window.print();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-slate-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const supplierData = supplier as any;
  const invoiceData = invoice as any;
  const isPaid = invoiceData.statusPago === true;
  const statusText = isPaid ? 'PAGADO' : 'PENDIENTE DE PAGO';
  const statusColor = isPaid ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-5xl mx-auto">
      <div className="no-print flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2">
          <FileText className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Factura de Compra</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

        <div className="p-8 print-content">
          <div className="mb-8 pb-6 border-b-2 border-slate-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">FACTURA DE COMPRA</h1>
                <div className={`inline-block px-4 py-2 rounded-lg font-bold ${statusColor}`}>
                  {statusText}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Número de Factura</p>
                <p className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</p>
                <p className="text-sm text-slate-600 mt-2">Fecha</p>
                <p className="font-semibold">{new Date(invoice.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {invoice.confirmed_at && (
                  <>
                    <p className="text-sm text-slate-600 mt-2">Fecha de Pago</p>
                    <p className="font-semibold text-green-700">{new Date(invoice.confirmed_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Proveedor</h3>
              {supplier ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-600">Nombre Comercial:</p>
                    <p className="font-semibold text-slate-900">{supplier.name}</p>
                  </div>
                  {supplierData?.company_name && (
                    <div>
                      <p className="text-slate-600">Razón Social:</p>
                      <p className="font-semibold text-slate-900">{supplierData.company_name}</p>
                    </div>
                  )}
                  {supplier.tax_id && (
                    <div>
                      <p className="text-slate-600">RFC:</p>
                      <p className="font-semibold text-slate-900">{supplier.tax_id}</p>
                    </div>
                  )}
                  {supplier.address && (
                    <div>
                      <p className="text-slate-600">Dirección:</p>
                      <p className="font-semibold text-slate-900">{supplier.address}</p>
                    </div>
                  )}
                  {supplier.phone && (
                    <div>
                      <p className="text-slate-600">Teléfono:</p>
                      <p className="font-semibold text-slate-900">{supplier.phone}</p>
                    </div>
                  )}
                  {supplier.email && (
                    <div>
                      <p className="text-slate-600">Email:</p>
                      <p className="font-semibold text-slate-900">{supplier.email}</p>
                    </div>
                  )}
                  {supplierData?.payment_terms && (
                    <div className="pt-2 border-t border-slate-300 mt-2">
                      <p className="text-slate-600">Términos de Pago:</p>
                      <p className="font-semibold text-slate-900">{supplierData.payment_terms}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Sin información de proveedor</p>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Información de Pago</h3>
              {supplier && supplierData?.bank_name && (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-600">Banco:</p>
                    <p className="font-semibold text-slate-900">{supplierData.bank_name}</p>
                  </div>
                  {supplierData?.bank_account && (
                    <div>
                      <p className="text-slate-600">Cuenta:</p>
                      <p className="font-semibold text-slate-900">{supplierData.bank_account}</p>
                    </div>
                  )}
                </div>
              )}
              {supplierData?.account_notes && (
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <p className="text-slate-600 text-sm">Notas Contables:</p>
                  <p className="text-sm text-slate-700 mt-1">{supplierData.account_notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Detalle de Productos</h3>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Talla</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Color</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Costo Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.size?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.color?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-center font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">${item.cost_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-bold">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-300">
                <span className="text-slate-700 font-medium">Subtotal:</span>
                <span className="text-lg font-semibold text-slate-900">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-300">
                <span className="text-slate-700 font-medium">IVA (16%):</span>
                <span className="text-lg font-semibold text-slate-900">${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-slate-900 text-white px-4 rounded-lg">
                <span className="text-lg font-bold">TOTAL A PAGAR:</span>
                <span className="text-2xl font-bold">${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-slate-300">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Notas:</h4>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>Este documento es una factura de compra interna para control contable</p>
            <p className="mt-1">Generado el {new Date().toLocaleDateString('es-MX')} a las {new Date().toLocaleTimeString('es-MX')}</p>
          </div>
        </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
