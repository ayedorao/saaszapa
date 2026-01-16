import { useState } from 'react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Printer, Clock } from 'lucide-react';

interface ProductSaveConfirmationProps {
  productIds: string[];
  onClose: () => void;
  onPrintNow: () => void;
  storeId?: string;
}

export default function ProductSaveConfirmation({
  productIds,
  onClose,
  onPrintNow,
  storeId
}: ProductSaveConfirmationProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  async function handlePrintLater() {
    if (!user) return;

    setProcessing(true);
    try {
      const batch = writeBatch(db);

      for (const variantId of productIds) {
        const queueItemRef = doc(collection(db, 'print_queue'));
        batch.set(queueItemRef, {
          item_type: 'barcode_label',
          variant_id: variantId,
          reference_type: 'product',
          reference_id: variantId,
          data: {
            variantId: variantId,
          },
          status: 'pending',
          store_id: storeId || null,
          created_at: new Date().toISOString(),
        });
      }

      await batch.commit();

      alert(`${productIds.length} ${productIds.length === 1 ? 'etiqueta agregada' : 'etiquetas agregadas'} a la cola de impresión`);
      onClose();
    } catch (error) {
      console.error('Error adding to print queue:', error);
      alert('Error al agregar etiquetas a la cola de impresión');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Productos Guardados Correctamente
            </h2>
            <p className="text-slate-600">
              Se {productIds.length === 1 ? 'ha creado' : 'han creado'} {productIds.length} {productIds.length === 1 ? 'producto' : 'productos'} exitosamente.
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={onPrintNow}
              disabled={processing}
              className="w-full inline-flex items-center justify-center px-6 py-4 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Printer className="w-5 h-5 mr-3" />
              Imprimir Etiquetas Ahora
            </button>

            <button
              onClick={handlePrintLater}
              disabled={processing}
              className="w-full inline-flex items-center justify-center px-6 py-4 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <Clock className="w-5 h-5 mr-3" />
              {processing ? 'Agregando a cola...' : 'Imprimir Etiquetas Más Tarde'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cerrar sin imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
