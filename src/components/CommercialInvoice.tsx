import { useRef } from 'react';
import { Sale, Store } from '../types/database';
import { FileText, Printer, Download, Mail, X } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-xl border border-slate-300">
      <div className="no-print flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">Factura Comercial</h2>
        </div>
        <div className="flex items-center space-x-2">
          {onSendEmail && customerEmail && (
            <button
              onClick={onSendEmail}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div ref={printRef} className="p-6 print-content">
        <div className="mb-6 pb-4 border-b-2 border-slate-900">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{store.name}</h1>
              {store.legal_info?.business_name && (
                <p className="text-xs text-slate-700 font-semibold">{store.legal_info.business_name}</p>
              )}
              {store.legal_info?.tax_id && (
                <p className="text-xs text-slate-600">RFC: {store.legal_info.tax_id}</p>
              )}
              <p className="text-xs text-slate-600">{store.address}</p>
              {store.phone && <p className="text-xs text-slate-600">Tel: {store.phone}</p>}
              {store.email && <p className="text-xs text-slate-600">{store.email}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-900 mb-1">FACTURA</h2>
              <div className="bg-slate-100 px-3 py-1 rounded">
                <p className="text-xs text-slate-600">No. Venta</p>
                <p className="text-sm font-bold text-slate-900">{sale.sale_number}</p>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {new Date(sale.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase">Cliente</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-600">Nombre:</p>
              <p className="font-semibold text-slate-900">{customerName}</p>
            </div>
            {customerEmail && (
              <div>
                <p className="text-slate-600">Email:</p>
                <p className="font-semibold text-slate-900">{customerEmail}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-2 text-left text-xs font-bold">Producto</th>
                <th className="px-3 py-2 text-center text-xs font-bold">Cant.</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Precio</th>
                <th className="px-3 py-2 text-right text-xs font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-200">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900 text-xs">
                      {item.variant?.product?.name || 'Producto'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.variant?.size?.name} | {item.variant?.color?.name} | {item.variant?.sku}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-xs">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-semibold text-xs">${item.unit_price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-bold text-xs">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-300">
              <span className="text-slate-700">Subtotal:</span>
              <span className="font-semibold">${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-300 text-red-600">
                <span>Descuento:</span>
                <span className="font-semibold">-${sale.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {sale.tax_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-300">
                <span className="text-slate-700">IVA (16%):</span>
                <span className="font-semibold">${sale.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-slate-900 text-white px-3 rounded">
              <span className="font-bold">TOTAL:</span>
              <span className="text-xl font-bold">${sale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {sale.payments && sale.payments.length > 0 && (
          <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
            <h3 className="text-xs font-bold text-green-900 mb-1 uppercase">Pago</h3>
            {sale.payments.map((payment, index) => (
              <div key={payment.id || index} className="flex justify-between text-xs">
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

        <div className="border-t border-slate-300 pt-4">
          <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase">Información Legal</h3>

          {store.legal_info?.return_policy && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-bold text-blue-900">DEVOLUCIONES</p>
              <p className="text-xs text-blue-800 leading-tight">{store.legal_info.return_policy}</p>
            </div>
          )}

          {store.legal_info?.warranty_policy && (
            <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <p className="text-xs font-bold text-purple-900">GARANTÍA</p>
              <p className="text-xs text-purple-800 leading-tight">{store.legal_info.warranty_policy}</p>
            </div>
          )}

          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-xs font-bold text-yellow-900">PROFECO</p>
            <p className="text-xs text-yellow-800 leading-tight">
              Este establecimiento respeta los derechos del consumidor. Para quejas: PROFECO 55-5568-8722 | www.profeco.gob.mx
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>Gracias por su compra. Conserve este comprobante.</p>
          <p className="mt-1">
            {new Date().toLocaleDateString('es-MX')} - {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
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
