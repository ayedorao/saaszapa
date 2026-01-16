import Barcode from 'react-barcode';
import { ProductVariant } from '../types/database';

interface SimpleShoeBoxLabelProps {
  variant: ProductVariant;
  price: number;
}

export default function SimpleShoeBoxLabel({ variant, price }: SimpleShoeBoxLabelProps) {
  return (
    <div className="w-full bg-white border-4 border-black p-3" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-1 mb-2">
        <p className="text-base font-bold m-0">Mi Tienda</p>
      </div>

      {/* Product Info */}
      <div>
        <h2 className="text-sm font-bold my-1 uppercase">
          {variant.product?.name || 'Producto'}
        </h2>
        <p className="text-xs text-gray-600 my-0.5">
          {variant.product?.brand || ''}
        </p>

        {/* Variant Details Grid */}
        <div className="grid grid-cols-2 gap-1 my-2 p-1.5 bg-gray-100 border border-gray-300 text-[10px]">
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
        <div className="text-center my-2">
          {variant.barcode && (
            <Barcode
              value={variant.barcode}
              height={40}
              width={1.5}
              fontSize={10}
              margin={0}
              background="#ffffff"
              lineColor="#000000"
            />
          )}
        </div>
      </div>

      {/* Price */}
      <div className="text-center border-t-2 border-black pt-1 mt-2">
        <p className="text-2xl font-bold m-0">
          ${price.toFixed(2)}
        </p>
        <p className="text-[9px] text-gray-600 mt-0.5">
          SKU: {variant.sku}
        </p>
      </div>
    </div>
  );
}
