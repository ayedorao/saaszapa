import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Barcode from 'react-barcode';
import { ProductVariant, Product, Size, Color } from '../types/database';

interface ProfessionalBarcodeLabelProps {
  variantIds: string[];
  storeName?: string;
  onClose?: () => void;
}

interface LabelData {
  storeName: string;
  productName: string;
  brand: string;
  size: string;
  color: string;
  price: number;
  barcode: string;
  sku: string;
}

export default function ProfessionalBarcodeLabel({ variantIds, storeName, onClose }: ProfessionalBarcodeLabelProps) {
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabelData();
  }, [variantIds]);

  async function loadLabelData() {
    setLoading(true);
    try {
      const [variantsSnap, productsSnap, sizesSnap, colorsSnap, storesSnap] = await Promise.all([
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
        getDocs(query(collection(db, 'stores'), where('active', '==', true))),
      ]);

      const productsMap = new Map<string, Product>();
      productsSnap.docs.forEach(doc => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
      });

      const sizesMap = new Map<string, Size>();
      sizesSnap.docs.forEach(doc => {
        sizesMap.set(doc.id, { id: doc.id, ...doc.data() } as Size);
      });

      const colorsMap = new Map<string, Color>();
      colorsSnap.docs.forEach(doc => {
        colorsMap.set(doc.id, { id: doc.id, ...doc.data() } as Color);
      });

      const defaultStoreName = storesSnap.empty ? 'Mi Tienda' : storesSnap.docs[0].data().name;

      const labelsData: LabelData[] = [];

      for (const variantId of variantIds) {
        const variantDoc = variantsSnap.docs.find(doc => doc.id === variantId);
        if (!variantDoc) continue;

        const variant = { id: variantDoc.id, ...variantDoc.data() } as ProductVariant;
        const product = productsMap.get(variant.product_id);
        const size = sizesMap.get(variant.size_id);
        const color = colorsMap.get(variant.color_id);

        if (!product || !size || !color) continue;

        labelsData.push({
          storeName: storeName || defaultStoreName,
          productName: product.name,
          brand: product.brand,
          size: size.name,
          color: color.name,
          price: variant.price,
          barcode: variant.barcode || variant.sku,
          sku: variant.sku,
        });
      }

      setLabels(labelsData);
    } catch (error) {
      console.error('Error loading label data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-600">Cargando etiquetas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vista Previa de Etiquetas</h2>
          <p className="text-sm text-slate-600">{labels.length} {labels.length === 1 ? 'etiqueta' : 'etiquetas'} listas para imprimir</p>
        </div>
        <div className="flex space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Cerrar
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Imprimir Etiquetas
          </button>
        </div>
      </div>

      <div className="p-8 print:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-2">
        {labels.map((label, index) => (
          <div
            key={index}
            className="label-container border-2 border-slate-300 rounded-lg p-4 print:rounded-none print:border print:border-slate-400 print:p-2 print:break-inside-avoid"
            style={{ pageBreakInside: 'avoid' }}
          >
            <div className="text-center space-y-2">
              <div className="border-b-2 border-slate-200 pb-2 print:pb-1">
                <h3 className="text-lg font-bold text-slate-900 print:text-base">{label.storeName}</h3>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-600 print:text-[10px]">{label.brand}</p>
                <p className="text-base font-bold text-slate-900 print:text-sm leading-tight">{label.productName}</p>
              </div>

              <div className="flex justify-center items-center space-x-4 py-1">
                <div className="text-center">
                  <p className="text-xs text-slate-600 print:text-[9px]">Talla</p>
                  <p className="text-lg font-bold text-slate-900 print:text-base">{label.size}</p>
                </div>
                <div className="w-px h-10 bg-slate-300"></div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 print:text-[9px]">Color</p>
                  <p className="text-sm font-semibold text-slate-700 print:text-xs">{label.color}</p>
                </div>
              </div>

              <div className="border-t-2 border-slate-200 pt-2 print:pt-1">
                <p className="text-xs text-slate-600 print:text-[9px]">Precio</p>
                <p className="text-2xl font-bold text-green-600 print:text-xl">${label.price.toFixed(2)}</p>
                <p className="text-xs text-slate-500 print:text-[9px]">MXN</p>
              </div>

              <div className="flex justify-center py-2 print:py-1">
                {label.barcode && label.barcode.length > 0 ? (
                  <Barcode
                    value={label.barcode}
                    format="CODE128"
                    width={1.5}
                    height={50}
                    displayValue={true}
                    fontSize={11}
                    margin={5}
                    background="#ffffff"
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500">Sin código de barras</p>
                    <p className="text-xs font-mono text-slate-400 mt-1">{label.sku}</p>
                  </div>
                )}
              </div>

              <div className="text-[9px] text-slate-400 font-mono print:text-[8px]">
                SKU: {label.sku}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: auto;
            margin: 10mm;
          }
          .label-container {
            width: 9cm;
            height: 5cm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 2mm;
          }
        }
      `}</style>
    </div>
  );
}
