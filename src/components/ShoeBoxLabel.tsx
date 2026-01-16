import { useRef } from 'react';
import Barcode from 'react-barcode';
import { ProductVariant } from '../types/database';
import { Printer } from 'lucide-react';

interface ShoeBoxLabelProps {
  variant: ProductVariant;
  price: number;
  storeName?: string;
}

export default function ShoeBoxLabel({ variant, price, storeName }: ShoeBoxLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta Caja - ${variant.sku}</title>
              <style>
                @page {
                  size: 4in 3in;
                  margin: 0;
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  width: 4in;
                  height: 3in;
                }
                .label-container {
                  width: 100%;
                  height: 100%;
                  padding: 8px;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  border: 2px solid #000;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #000;
                  padding-bottom: 4px;
                  margin-bottom: 4px;
                }
                .store-name {
                  font-size: 16px;
                  font-weight: bold;
                  margin: 0;
                }
                .product-info {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                }
                .product-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin: 4px 0;
                  text-transform: uppercase;
                }
                .product-brand {
                  font-size: 12px;
                  color: #666;
                  margin: 2px 0;
                }
                .variant-info {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 4px;
                  margin: 6px 0;
                  padding: 4px;
                  background: #f5f5f5;
                  border: 1px solid #ddd;
                }
                .info-item {
                  font-size: 11px;
                }
                .info-label {
                  font-weight: bold;
                  color: #333;
                }
                .info-value {
                  color: #000;
                  font-size: 13px;
                  font-weight: bold;
                }
                .barcode-container {
                  text-align: center;
                  margin: 4px 0;
                }
                .price-container {
                  text-align: center;
                  border-top: 2px solid #000;
                  padding-top: 4px;
                  margin-top: 4px;
                }
                .price {
                  font-size: 28px;
                  font-weight: bold;
                  margin: 0;
                }
                .sku {
                  font-size: 10px;
                  color: #666;
                  margin-top: 2px;
                }
                @media print {
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Etiqueta para Caja de Zapatos</h3>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Etiqueta
        </button>
      </div>

      {/* Preview */}
      <div className="bg-white p-4 border-2 border-slate-300 rounded-lg">
        <div
          ref={printRef}
          className="w-[4in] h-[3in] mx-auto border-4 border-black p-2 bg-white"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-1 mb-1">
            {storeName && (
              <p className="text-base font-bold m-0">{storeName}</p>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1">
            <h2 className="text-sm font-bold my-1 uppercase">
              {variant.product?.name || 'Producto'}
            </h2>
            <p className="text-xs text-gray-600 my-0.5">
              {variant.product?.brand || ''}
            </p>

            {/* Variant Details Grid */}
            <div className="grid grid-cols-2 gap-1 my-1.5 p-1 bg-gray-100 border border-gray-300 text-[10px]">
              <div>
                <span className="font-bold text-gray-700">TALLA:</span>
                <div className="text-xs font-bold mt-0.5">
                  {variant.size?.name || '-'}
                </div>
              </div>
              <div>
                <span className="font-bold text-gray-700">COLOR:</span>
                <div className="text-xs font-bold mt-0.5">
                  {variant.color?.name || '-'}
                </div>
              </div>
              <div>
                <span className="font-bold text-gray-700">ACABADO:</span>
                <div className="text-xs font-bold mt-0.5">
                  {variant.product?.finish || '-'}
                </div>
              </div>
              <div>
                <span className="font-bold text-gray-700">GÉNERO:</span>
                <div className="text-xs font-bold mt-0.5">
                  {variant.product?.gender || '-'}
                </div>
              </div>
            </div>

            {/* Barcode */}
            <div className="text-center my-1">
              {variant.barcode && (
                <Barcode
                  value={variant.barcode}
                  height={40}
                  width={1.5}
                  fontSize={10}
                  margin={0}
                />
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-center border-t-2 border-black pt-1 mt-1">
            <p className="text-2xl font-bold m-0">
              ${price.toFixed(2)}
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5">
              SKU: {variant.sku}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Compatibilidad de Impresión</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Impresoras de etiquetas especializadas (4" x 3")</li>
          <li>✓ Impresoras estándar (ajuste automático)</li>
          <li>✓ Formato optimizado para cajas de zapatos</li>
          <li>✓ Código de barras escaneable</li>
        </ul>
      </div>
    </div>
  );
}
