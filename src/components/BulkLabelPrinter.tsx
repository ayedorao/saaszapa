import { useState } from 'react';
import { ProductVariant } from '../types/database';
import SimpleProfessionalLabel from './SimpleProfessionalLabel';
import { BarcodeLabel } from './BarcodeLabel';
import SimpleShoeBoxLabel from './SimpleShoeBoxLabel';
import { X, Printer, Download, Minus, Plus } from 'lucide-react';

interface BulkLabelPrinterProps {
  selectedVariants: ProductVariant[];
  onClose: () => void;
}

interface LabelQuantity {
  variant: ProductVariant;
  quantity: number;
}

export default function BulkLabelPrinter({ selectedVariants, onClose }: BulkLabelPrinterProps) {
  const [labelType, setLabelType] = useState<'barcode' | 'professional' | 'shoebox'>('professional');
  const [labelQuantities, setLabelQuantities] = useState<LabelQuantity[]>(
    selectedVariants.map(v => ({ variant: v, quantity: 1 }))
  );

  function updateQuantity(variantId: string, delta: number) {
    setLabelQuantities(prev =>
      prev.map(lq =>
        lq.variant.id === variantId
          ? { ...lq, quantity: Math.max(1, lq.quantity + delta) }
          : lq
      )
    );
  }

  function setQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return;
    setLabelQuantities(prev =>
      prev.map(lq =>
        lq.variant.id === variantId ? { ...lq, quantity } : lq
      )
    );
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    window.print();
  }

  const totalLabels = labelQuantities.reduce((sum, lq) => sum + lq.quantity, 0);

  function renderLabel(variant: ProductVariant, index: number) {
    switch (labelType) {
      case 'barcode':
        return (
          <BarcodeLabel
            key={index}
            barcode={variant.barcode || variant.sku}
            productName={variant.product?.name || ''}
            brand={variant.product?.brand || ''}
            size={variant.size?.name || ''}
            color={variant.color?.name || ''}
            price={variant.price}
            sku={variant.sku}
          />
        );
      case 'professional':
        return <SimpleProfessionalLabel key={index} variant={variant} />;
      case 'shoebox':
        return <SimpleShoeBoxLabel key={index} variant={variant} price={variant.price} />;
      default:
        return (
          <BarcodeLabel
            key={index}
            barcode={variant.barcode || variant.sku}
            productName={variant.product?.name || ''}
            brand={variant.product?.brand || ''}
            size={variant.size?.name || ''}
            color={variant.color?.name || ''}
            price={variant.price}
            sku={variant.sku}
          />
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print-overlay">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col no-print-container">
        <div className="no-print flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Imprimir Etiquetas ({totalLabels} {totalLabels === 1 ? 'etiqueta' : 'etiquetas'})
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {selectedVariants.length} {selectedVariants.length === 1 ? 'variante seleccionada' : 'variantes seleccionadas'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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

        <div className="no-print p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-semibold text-slate-700">Tipo de Etiqueta:</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setLabelType('barcode')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  labelType === 'barcode'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Código de Barras Simple
              </button>
              <button
                onClick={() => setLabelType('professional')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  labelType === 'professional'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Etiqueta Profesional
              </button>
              <button
                onClick={() => setLabelType('shoebox')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  labelType === 'shoebox'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Etiqueta de Caja
              </button>
            </div>
          </div>
        </div>

        <div className="no-print flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-3">
            {labelQuantities.map(({ variant, quantity }) => (
              <div
                key={variant.id}
                className="bg-white rounded-lg p-4 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {variant.product?.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    Talla: {variant.size?.name} | Color: {variant.color?.name} | SKU: {variant.sku}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600">Cantidad:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(variant.id, -1)}
                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(variant.id, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                    <button
                      onClick={() => updateQuantity(variant.id, 1)}
                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="print-only p-8">
          <div className="grid grid-cols-2 gap-4">
            {labelQuantities.flatMap(({ variant, quantity }, idx) =>
              Array.from({ length: quantity }, (_, i) =>
                renderLabel(variant, idx * 1000 + i)
              )
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          /* Ocultar elementos de UI */
          .no-print {
            display: none !important;
          }

          /* Ocultar el overlay y contenedor del modal */
          .no-print-overlay {
            background: white !important;
            position: static !important;
            padding: 0 !important;
          }

          .no-print-container {
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Mostrar solo las etiquetas */
          .print-only {
            display: block !important;
            padding: 0 !important;
          }

          /* Configurar página para impresión */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }

          @page {
            margin: 0.5cm;
            background: white;
          }

          /* Asegurar que las etiquetas se vean correctamente */
          .print-only > div {
            page-break-inside: avoid;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
