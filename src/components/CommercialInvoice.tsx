import { useRef } from 'react';
import { Sale, Store } from '../types/database';
import { FileText, Printer, Download, Mail } from 'lucide-react';

interface CommercialInvoiceProps {
  sale: Sale;
  store: Store;
  onSendEmail?: () => void;
  onClose?: () => void;
}

export default function CommercialInvoice({ sale, store, onSendEmail, onClose }: CommercialInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    window.print();
  }

  const customerName = sale.customer
    ? `${sale.customer.first_name} ${sale.customer.last_name}`
    : sale.quick_customer?.name || 'Cliente General';

  const customerEmail = sale.customer?.email || sale.quick_customer?.email || '';

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-5xl mx-auto">
      <div className="no-print flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2">
          <FileText className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Factura Comercial</h2>
        </div>
        <div className="flex items-center space-x-2">
          {onSendEmail && customerEmail && (
            <button
              onClick={onSendEmail}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar por Email
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="p-8 print-content">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-slate-900">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{store.name}</h1>
              {store.legal_info?.business_name && (
                <p className="text-sm text-slate-700 font-semibold">{store.legal_info.business_name}</p>
              )}
              {store.legal_info?.tax_id && (
                <p className="text-sm text-slate-600">RFC: {store.legal_info.tax_id}</p>
              )}
              {store.address && (
                <p className="text-sm text-slate-600">{store.address}</p>
              )}
              {store.phone && (
                <p className="text-sm text-slate-600">Tel: {store.phone}</p>
              )}
              {store.email && (
                <p className="text-sm text-slate-600">Email: {store.email}</p>
              )}
              {store.legal_info?.website && (
                <p className="text-sm text-slate-600">Web: {store.legal_info.website}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">FACTURA</h2>
              <div className="bg-slate-100 px-4 py-2 rounded-lg">
                <p className="text-sm text-slate-600">No. de Venta</p>
                <p className="text-lg font-bold text-slate-900">{sale.sale_number}</p>
              </div>
              <p className="text-sm text-slate-600 mt-2">Fecha</p>
              <p className="font-semibold">
                {new Date(sale.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase">Datos del Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Nombre:</p>
              <p className="font-semibold text-slate-900">{customerName}</p>
            </div>
            {customerEmail && (
              <div>
                <p className="text-sm text-slate-600">Email:</p>
                <p className="font-semibold text-slate-900">{customerEmail}</p>
              </div>
            )}
            {sale.customer?.phone && (
              <div>
                <p className="text-sm text-slate-600">Teléfono:</p>
                <p className="font-semibold text-slate-900">{sale.customer.phone}</p>
              </div>
            )}
            {sale.customer?.address && (
              <div className="col-span-2">
                <p className="text-sm text-slate-600">Dirección:</p>
                <p className="font-semibold text-slate-900">{sale.customer.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-sm font-bold">Producto</th>
                <th className="px-4 py-3 text-center text-sm font-bold">Cantidad</th>
                <th className="px-4 py-3 text-right text-sm font-bold">Precio Unit.</th>
                <th className="px-4 py-3 text-right text-sm font-bold">Descuento</th>
                <th className="px-4 py-3 text-right text-sm font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-200">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {item.variant?.product?.name || 'Producto'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Talla: {item.variant?.size?.name} | Color: {item.variant?.color?.name}
                    </p>
                    <p className="text-xs text-slate-500">SKU: {item.variant?.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-semibold">${item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {item.discount_amount > 0 ? `-$${item.discount_amount.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-300">
              <span className="text-slate-700 font-medium">Subtotal:</span>
              <span className="text-lg font-semibold">${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-300 text-red-600">
                <span className="font-medium">Descuento:</span>
                <span className="text-lg font-semibold">-${sale.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-300">
              <span className="text-slate-700 font-medium">IVA (16%):</span>
              <span className="text-lg font-semibold">${sale.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 bg-slate-900 text-white px-4 rounded-lg">
              <span className="text-lg font-bold">TOTAL:</span>
              <span className="text-2xl font-bold">${sale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {sale.payments && sale.payments.length > 0 && (
          <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-sm font-bold text-green-900 mb-2 uppercase">Información de Pago</h3>
            {sale.payments.map((payment, index) => (
              <div key={payment.id || index} className="flex justify-between text-sm">
                <span className="text-green-700">
                  {payment.method === 'cash' ? 'Efectivo' :
                   payment.method === 'card' ? 'Tarjeta' :
                   payment.method === 'transfer' ? 'Transferencia' : 'Crédito'}
                </span>
                <span className="font-semibold text-green-900">${payment.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Legal Information - Mexican Consumer Protection Law Compliance */}
        <div className="border-t-2 border-slate-900 pt-6 mt-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase">Información Legal</h3>

          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            {store.legal_info?.business_registration && (
              <div>
                <p className="text-slate-600 font-semibold">Registro Empresarial:</p>
                <p className="text-slate-900">{store.legal_info.business_registration}</p>
              </div>
            )}
            {store.legal_info?.legal_representative && (
              <div>
                <p className="text-slate-600 font-semibold">Representante Legal:</p>
                <p className="text-slate-900">{store.legal_info.legal_representative}</p>
              </div>
            )}
          </div>

          {/* Return Policy */}
          {store.legal_info?.return_policy && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-bold text-blue-900 mb-1">POLÍTICA DE DEVOLUCIONES</p>
              <p className="text-xs text-blue-800">{store.legal_info.return_policy}</p>
            </div>
          )}

          {/* Warranty Policy */}
          {store.legal_info?.warranty_policy && (
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-xs font-bold text-purple-900 mb-1">GARANTÍA</p>
              <p className="text-xs text-purple-800">{store.legal_info.warranty_policy}</p>
            </div>
          )}

          {/* Terms and Conditions */}
          {store.legal_info?.terms_conditions && (
            <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded">
              <p className="text-xs font-bold text-slate-900 mb-1">TÉRMINOS Y CONDICIONES</p>
              <p className="text-xs text-slate-700">{store.legal_info.terms_conditions}</p>
            </div>
          )}

          {/* PROFECO Notice */}
          <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded">
            <p className="text-xs font-bold text-yellow-900 mb-1">
              AVISO IMPORTANTE - PROCURADURÍA FEDERAL DEL CONSUMIDOR (PROFECO)
            </p>
            <p className="text-xs text-yellow-800">
              Este establecimiento respeta los derechos del consumidor conforme a la Ley Federal de Protección al Consumidor.
              Para cualquier queja o reclamación, puede contactar a PROFECO al teléfono 55-5568-8722 o en www.profeco.gob.mx
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
          <p>Gracias por su compra. Conserve este comprobante para cualquier aclaración.</p>
          <p className="mt-1">
            Documento generado el {new Date().toLocaleDateString('es-MX')} a las {new Date().toLocaleTimeString('es-MX')}
          </p>
          {sale.invoice_sent && sale.invoice_sent_at && (
            <p className="mt-1 text-green-600 font-semibold">
              ✓ Factura enviada por email el {new Date(sale.invoice_sent_at).toLocaleDateString('es-MX')}
            </p>
          )}
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
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
