import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Edit2, Save, X, FileText, Check } from 'lucide-react';
import { PurchaseInvoice, PurchaseInvoiceItem, Supplier, Size, Color } from '../types/database';

interface PurchaseInvoiceEditorProps {
  invoiceId: string;
  onClose: () => void;
  onConfirmed: (productIds: string[]) => void;
}

interface EditableInvoiceItem extends PurchaseInvoiceItem {
  isEditing?: boolean;
  editedProductName?: string;
  editedSupplierId?: string;
  editedCostPrice?: string;
  editedQuantity?: string;
}

const IVA_RATE = 0.16;

export default function PurchaseInvoiceEditor({ invoiceId, onClose, onConfirmed }: PurchaseInvoiceEditorProps) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [items, setItems] = useState<EditableInvoiceItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  async function loadInvoiceData() {
    setLoading(true);
    try {
      const [invoiceSnap, itemsSnap, suppliersSnap] = await Promise.all([
        getDocs(query(collection(db, 'purchase_invoices'), where('__name__', '==', invoiceId))),
        getDocs(query(collection(db, 'purchase_invoice_items'), where('invoice_id', '==', invoiceId))),
        getDocs(query(collection(db, 'suppliers'), where('active', '==', true))),
      ]);

      if (!invoiceSnap.empty) {
        const invoiceData = { id: invoiceSnap.docs[0].id, ...invoiceSnap.docs[0].data() } as PurchaseInvoice;
        setInvoice(invoiceData);
      }

      const itemsData = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isEditing: false,
      })) as EditableInvoiceItem[];
      setItems(itemsData);

      const suppliersData = suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Error al cargar la factura');
    } finally {
      setLoading(false);
    }
  }

  function startEditItem(itemId: string) {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isEditing: true,
          editedProductName: item.product_name,
          editedSupplierId: item.supplier_id || '',
          editedCostPrice: item.cost_price.toString(),
          editedQuantity: item.quantity.toString(),
        };
      }
      return item;
    }));
  }

  function cancelEditItem(itemId: string) {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isEditing: false,
        };
      }
      return item;
    }));
  }

  function updateEditedField(itemId: string, field: string, value: string) {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          [field]: value,
        };
      }
      return item;
    }));
  }

  async function saveEditedItem(itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const costPrice = parseFloat(item.editedCostPrice || '0');
    const quantity = parseInt(item.editedQuantity || '0');

    if (costPrice < 0 || quantity < 0) {
      alert('El costo y la cantidad deben ser mayores o iguales a 0');
      return;
    }

    if (!item.editedProductName) {
      alert('El nombre del producto es requerido');
      return;
    }

    try {
      const subtotal = costPrice * quantity;

      await updateDoc(doc(db, 'purchase_invoice_items', itemId), {
        product_name: item.editedProductName,
        supplier_id: item.editedSupplierId || null,
        cost_price: costPrice,
        quantity: quantity,
        subtotal: subtotal,
      });

      await addDoc(collection(db, 'purchase_invoice_revisions'), {
        invoice_id: invoiceId,
        revision_number: Date.now(),
        changes: {
          item_id: itemId,
          old_values: {
            product_name: item.product_name,
            supplier_id: item.supplier_id,
            cost_price: item.cost_price,
            quantity: item.quantity,
          },
          new_values: {
            product_name: item.editedProductName,
            supplier_id: item.editedSupplierId,
            cost_price: costPrice,
            quantity: quantity,
          },
        },
        revised_by: user?.uid || '',
        revised_at: new Date().toISOString(),
      });

      setItems(items.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            product_name: item.editedProductName || i.product_name,
            supplier_id: item.editedSupplierId || i.supplier_id,
            cost_price: costPrice,
            quantity: quantity,
            subtotal: subtotal,
            isEditing: false,
          };
        }
        return i;
      }));

      await recalculateInvoiceTotals();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error al guardar el ítem');
    }
  }

  async function recalculateInvoiceTotals() {
    const itemsSnap = await getDocs(query(collection(db, 'purchase_invoice_items'), where('invoice_id', '==', invoiceId)));
    const allItems = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseInvoiceItem[];

    const subtotal = allItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const taxAmount = subtotal * IVA_RATE;
    const total = subtotal + taxAmount;

    await updateDoc(doc(db, 'purchase_invoices', invoiceId), {
      subtotal,
      tax_amount: taxAmount,
      total,
      updated_at: new Date().toISOString(),
    });

    if (invoice) {
      setInvoice({
        ...invoice,
        subtotal,
        tax_amount: taxAmount,
        total,
      });
    }
  }

  async function confirmInvoice() {
    if (!user) return;

    if (items.some(item => item.isEditing)) {
      alert('Hay ítems en edición. Por favor guarda o cancela los cambios antes de confirmar.');
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'purchase_invoices', invoiceId), {
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.uid,
        updated_at: new Date().toISOString(),
      });

      await batch.commit();

      const variantIds = items.map(item => item.variant_id);
      onConfirmed(variantIds);
    } catch (error) {
      console.error('Error confirming invoice:', error);
      alert('Error al confirmar la factura');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-slate-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-red-600">No se pudo cargar la factura</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Factura de Ingreso - BORRADOR</h2>
              <p className="text-sm text-slate-600 mt-1">{invoice.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Esta factura está en estado BORRADOR. Puedes editar los detalles de cada ítem antes de confirmar.
              Al confirmar, se registrarán los movimientos de inventario y la factura quedará guardada permanentemente.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4">
            <div>
              <p className="text-sm text-slate-600">Subtotal</p>
              <p className="text-xl font-bold text-slate-900">${invoice.subtotal.toFixed(2)} MXN</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">IVA (16%)</p>
              <p className="text-xl font-bold text-slate-900">${invoice.tax_amount.toFixed(2)} MXN</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-2xl font-bold text-green-600">${invoice.total.toFixed(2)} MXN</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Costo Unit.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Subtotal</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {item.isEditing ? (
                        <input
                          type="text"
                          value={item.editedProductName}
                          onChange={(e) => updateEditedField(item.id, 'editedProductName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-900">{item.product_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.isEditing ? (
                        <select
                          value={item.editedSupplierId}
                          onChange={(e) => updateEditedField(item.id, 'editedSupplierId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="">Sin proveedor</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-slate-700">
                          {item.supplier_id ? suppliers.find(s => s.id === item.supplier_id)?.name || 'N/A' : 'Sin proveedor'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.editedCostPrice}
                          onChange={(e) => updateEditedField(item.id, 'editedCostPrice', e.target.value)}
                          className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">${item.cost_price.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.isEditing ? (
                        <input
                          type="number"
                          value={item.editedQuantity}
                          onChange={(e) => updateEditedField(item.id, 'editedQuantity', e.target.value)}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm text-slate-900">{item.quantity}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">${item.subtotal.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.isEditing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => saveEditedItem(item.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Guardar cambios"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelEditItem(item.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditItem(item.id)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar ítem"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'} en la factura
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmInvoice}
              disabled={saving || items.some(item => item.isEditing)}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5 mr-2" />
              {saving ? 'Confirmando...' : 'Confirmar Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
