import Barcode from 'react-barcode';
import { ProductVariant } from '../types/database';

interface SimpleProfessionalLabelProps {
  variant: ProductVariant;
}

export default function SimpleProfessionalLabel({ variant }: SimpleProfessionalLabelProps) {
  const barcode = variant.barcode || variant.sku;
  const productName = variant.product?.name || '';
  const brand = variant.product?.brand || '';
  const size = variant.size?.name || '';
  const color = variant.color?.name || '';
  const price = variant.price;
  const sku = variant.sku;

  return (
    <div className="label-container bg-white border-2 border-slate-300 rounded-lg p-4 w-full">
      <div className="text-center space-y-2">
        <div className="border-b-2 border-slate-200 pb-2">
          <h3 className="text-base font-bold text-slate-900">Mi Tienda</h3>
        </div>

        <div className="py-2">
          <p className="text-xs text-slate-600">{brand}</p>
          <p className="text-sm font-bold text-slate-900 leading-tight">{productName}</p>
        </div>

        <div className="flex justify-center items-center space-x-4 py-1">
          <div className="text-center">
            <p className="text-xs text-slate-600">Talla</p>
            <p className="text-base font-bold text-slate-900">{size}</p>
          </div>
          <div className="w-px h-10 bg-slate-300"></div>
          <div className="text-center">
            <p className="text-xs text-slate-600">Color</p>
            <p className="text-xs font-semibold text-slate-700">{color}</p>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-2">
          <p className="text-xs text-slate-600">Precio</p>
          <p className="text-xl font-bold text-green-600">${price.toFixed(2)}</p>
          <p className="text-xs text-slate-500">MXN</p>
        </div>

        <div className="flex justify-center py-2">
          {barcode && barcode.length > 0 ? (
            <Barcode
              value={barcode}
              format="CODE128"
              width={1.5}
              height={50}
              displayValue={true}
              fontSize={11}
              margin={5}
              background="#ffffff"
              lineColor="#000000"
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-slate-500">Sin código de barras</p>
              <p className="text-xs font-mono text-slate-400 mt-1">{sku}</p>
            </div>
          )}
        </div>

        <div className="text-[9px] text-slate-400 font-mono">
          SKU: {sku}
        </div>
      </div>
    </div>
  );
}
