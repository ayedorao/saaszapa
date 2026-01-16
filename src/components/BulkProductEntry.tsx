import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Trash2, Save } from 'lucide-react';
import { Size, Color, Supplier } from '../types/database';
import { generateBarcode } from '../utils/barcodeGenerator';

interface BulkProductRow {
  id: string;
  code: string;
  name: string;
  brand: string;
  finish: string;
  category: string;
  gender: string;
  supplier_id: string;
  supplier_name: string;
  base_cost: string;
  base_price: string;
  size_id: string;
  color_id: string;
  quantity: string;
  barcode: string;
}

interface BulkProductEntryProps {
  onClose: () => void;
  onSuccess: (invoiceId: string, products: any[]) => void;
  storeId: string;
}

const IVA_RATE = 0.16;

export default function BulkProductEntry({ onClose, onSuccess, storeId }: BulkProductEntryProps) {
  const { user } = useAuth();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rows, setRows] = useState<BulkProductRow[]>([
    createEmptyRow()
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  function createEmptyRow(): BulkProductRow {
    return {
      id: Date.now().toString() + Math.random(),
      code: '',
      name: '',
      brand: '',
      finish: '',
      category: '',
      gender: '',
      supplier_id: '',
      supplier_name: '',
      base_cost: '',
      base_price: '',
      size_id: '',
      color_id: '',
      quantity: '0',
      barcode: '',
    };
  }

  async function loadData() {
    setLoadingData(true);
    try {
      const [sizesSnap, colorsSnap, suppliersSnap] = await Promise.all([
        getDocs(query(collection(db, 'sizes'), where('active', '==', true))),
        getDocs(query(collection(db, 'colors'), where('active', '==', true))),
        getDocs(query(collection(db, 'suppliers'), where('active', '==', true))),
      ]);

      const sizesData = sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Size[];
      const colorsData = colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Color[];
      const suppliersData = suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];

      if (suppliersData.length === 0) {
        const defaultSupplier = {
          code: 'PROV001',
          name: 'Proveedor General',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.uid,
        };
        const supplierRef = await addDoc(collection(db, 'suppliers'), defaultSupplier);
        suppliersData.push({ id: supplierRef.id, ...defaultSupplier });
      }

      setSizes(sizesData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setColors(colorsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar datos');
    } finally {
      setLoadingData(false);
    }
  }

  function addRow() {
    setRows([...rows, createEmptyRow()]);
  }

  function removeRow(id: string) {
    if (rows.length === 1) {
      alert('Debe haber al menos una fila');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  }

  function updateRow(id: string, field: keyof BulkProductRow, value: string) {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };

        if (field === 'code' || field === 'size_id' || field === 'color_id') {
          if (updated.code && updated.size_id && updated.color_id) {
            const size = sizes.find(s => s.id === updated.size_id);
            const color = colors.find(c => c.id === updated.color_id);
            updated.barcode = generateBarcode(updated.code, size?.name || '', color?.name || '');
          }
        }

        return updated;
      }
      return row;
    }));
  }

  function validateRows(): string | null {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.code) return `Fila ${i + 1}: El código es requerido`;
      if (!row.name) return `Fila ${i + 1}: El nombre es requerido`;
      if (!row.brand) return `Fila ${i + 1}: La marca es requerida`;
      if (!row.finish) return `Fila ${i + 1}: El acabado es requerido`;
      if (!row.size_id) return `Fila ${i + 1}: La talla es requerida`;
      if (!row.color_id) return `Fila ${i + 1}: El color es requerido`;
      if (!row.base_cost || parseFloat(row.base_cost) < 0) return `Fila ${i + 1}: El costo debe ser mayor o igual a 0`;
      if (!row.base_price || parseFloat(row.base_price) < 0) return `Fila ${i + 1}: El precio debe ser mayor o igual a 0`;
      if (!row.quantity || parseInt(row.quantity) < 0) return `Fila ${i + 1}: La cantidad debe ser mayor o igual a 0`;
    }

    return null;
  }

  async function handleSubmit() {
    if (!user) return;

    const validationError = validateRows();
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);
    try {
      const invoiceNumber = `FINV-${Date.now()}`;

      const supplierMap = new Map<string, string>();
      const uniqueSupplierNames = new Set<string>();

      for (const row of rows) {
        if (row.supplier_name && !row.supplier_id) {
          uniqueSupplierNames.add(row.supplier_name.toLowerCase());
        }
      }

      const supplierNameMap = new Map<string, string>();
      for (const row of rows) {
        if (row.supplier_name) {
          supplierNameMap.set(row.supplier_name.toLowerCase(), row.supplier_name);
        }
      }

      for (const supplierNameLower of uniqueSupplierNames) {
        const existingSupplier = suppliers.find(
          s => s.name.toLowerCase() === supplierNameLower
        );

        if (existingSupplier) {
          supplierMap.set(supplierNameLower, existingSupplier.id);
          console.log('Proveedor existente encontrado:', existingSupplier.name, 'ID:', existingSupplier.id);
        } else {
          const originalName = supplierNameMap.get(supplierNameLower) || supplierNameLower;
          const supplierCode = `PROV${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
          const newSupplierData = {
            code: supplierCode,
            name: originalName,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user.uid
          };

          const newSupplierRef = await addDoc(collection(db, 'suppliers'), newSupplierData);
          supplierMap.set(supplierNameLower, newSupplierRef.id);

          console.log('Proveedor creado:', originalName, 'con ID:', newSupplierRef.id);
        }
      }

      const batch = writeBatch(db);
      const invoiceRef = doc(collection(db, 'purchase_invoices'));
      let invoiceSubtotal = 0;

      const productsCreated: any[] = [];
      const invoiceItems: any[] = [];

      for (const row of rows) {
        const productData = {
          code: row.code,
          name: row.name,
          brand: row.brand,
          finish: row.finish,
          category: row.category,
          gender: row.gender,
          base_cost: parseFloat(row.base_cost),
          base_price: parseFloat(row.base_price),
          store_id: storeId,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.uid,
        };

        const productRef = doc(collection(db, 'products'));
        batch.set(productRef, productData);

        const size = sizes.find(s => s.id === row.size_id);
        const color = colors.find(c => c.id === row.color_id);
        const sku = `${row.code}-${size?.name}-${color?.name}`.toUpperCase().replace(/\s+/g, '-');
        const quantity = parseInt(row.quantity);

        const variantRef = doc(collection(db, 'product_variants'));
        batch.set(variantRef, {
          product_id: productRef.id,
          size_id: row.size_id,
          color_id: row.color_id,
          sku,
          barcode: row.barcode,
          price: parseFloat(row.base_price),
          cost: parseFloat(row.base_cost),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        const inventoryRef = doc(collection(db, 'inventory'));
        batch.set(inventoryRef, {
          variant_id: variantRef.id,
          quantity: quantity,
          min_stock: 5,
          store_id: storeId,
          updated_at: new Date().toISOString(),
        });

        const movementRef = doc(collection(db, 'inventory_movements'));
        batch.set(movementRef, {
          variant_id: variantRef.id,
          movement_type: 'purchase',
          quantity: quantity,
          quantity_before: 0,
          quantity_after: quantity,
          reference_type: 'purchase_invoice',
          reference_id: invoiceRef.id,
          notes: `Ingreso por factura ${invoiceNumber}`,
          created_by: user.uid,
          created_at: new Date().toISOString(),
        });

        const itemSubtotal = parseFloat(row.base_cost) * quantity;
        invoiceSubtotal += itemSubtotal;

        const finalSupplierId = row.supplier_id ||
          (row.supplier_name ? supplierMap.get(row.supplier_name.toLowerCase()) : null) ||
          null;

        console.log('Item con supplier_id:', finalSupplierId, 'para producto:', row.name);

        invoiceItems.push({
          invoice_id: invoiceRef.id,
          variant_id: variantRef.id,
          product_name: `${row.brand} ${row.name} - ${size?.name} ${color?.name}`,
          supplier_id: finalSupplierId,
          cost_price: parseFloat(row.base_cost),
          quantity: quantity,
          subtotal: itemSubtotal,
          created_at: new Date().toISOString(),
        });

        productsCreated.push({
          productId: productRef.id,
          variantId: variantRef.id,
          ...productData,
          size: size?.name,
          color: color?.name,
          sku,
          barcode: row.barcode,
          quantity,
        });
      }

      const taxAmount = invoiceSubtotal * IVA_RATE;
      const total = invoiceSubtotal + taxAmount;

      const primarySupplierId = rows[0]?.supplier_id ||
        (rows[0]?.supplier_name ? supplierMap.get(rows[0].supplier_name.toLowerCase()) : null) ||
        null;

      console.log('Factura con supplier_id principal:', primarySupplierId);

      batch.set(invoiceRef, {
        invoice_number: invoiceNumber,
        supplier_id: primarySupplierId,
        status: 'draft',
        subtotal: invoiceSubtotal,
        tax_amount: taxAmount,
        total: total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.uid,
      });

      for (const item of invoiceItems) {
        const itemRef = doc(collection(db, 'purchase_invoice_items'));
        batch.set(itemRef, item);
      }

      await batch.commit();

      console.log('Productos creados exitosamente:', productsCreated.length);
      console.log('Items de factura:', invoiceItems.length);

      alert(`¡Entrada exitosa! ${productsCreated.length} productos creados`);
      onSuccess(invoiceRef.id, productsCreated);
    } catch (error) {
      console.error('Error creating bulk products:', error);
      alert('Error al crear productos en masa: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-slate-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Entrada Masiva de Productos</h2>
            <p className="text-sm text-slate-600 mt-1">Agrega múltiples productos a la vez</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Código*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Nombre*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Marca*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Acabado*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Categoría</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Proveedor</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Talla*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Color*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Costo*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Precio*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Cantidad*</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-700">Código Barras</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-slate-700">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.code}
                        onChange={(e) => updateRow(row.id, 'code', e.target.value.toUpperCase())}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="SKU001"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Nombre"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.brand}
                        onChange={(e) => updateRow(row.id, 'brand', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Marca"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.finish}
                        onChange={(e) => updateRow(row.id, 'finish', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Acabado"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.category}
                        onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Categoría"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col space-y-1">
                        <select
                          value={row.supplier_id}
                          onChange={(e) => {
                            const newSupplierId = e.target.value;
                            setRows(rows.map(r => {
                              if (r.id === row.id) {
                                return {
                                  ...r,
                                  supplier_id: newSupplierId,
                                  supplier_name: newSupplierId ? '' : r.supplier_name
                                };
                              }
                              return r;
                            }));
                          }}
                          className="w-32 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="">Seleccionar...</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.supplier_name}
                          onChange={(e) => {
                            const newSupplierName = e.target.value;
                            setRows(rows.map(r => {
                              if (r.id === row.id) {
                                return {
                                  ...r,
                                  supplier_name: newSupplierName,
                                  supplier_id: newSupplierName ? '' : r.supplier_id
                                };
                              }
                              return r;
                            }));
                          }}
                          placeholder="O escribir nuevo"
                          className="w-32 px-2 py-1 border border-slate-300 rounded text-xs italic bg-white"
                          disabled={!!row.supplier_id}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.size_id}
                        onChange={(e) => updateRow(row.id, 'size_id', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                      >
                        <option value="">Talla</option>
                        {sizes.map(size => (
                          <option key={size.id} value={size.id}>{size.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.color_id}
                        onChange={(e) => updateRow(row.id, 'color_id', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                      >
                        <option value="">Color</option>
                        {colors.map(color => (
                          <option key={color.id} value={color.id}>{color.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.base_cost}
                        onChange={(e) => updateRow(row.id, 'base_cost', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.base_price}
                        onChange={(e) => updateRow(row.id, 'base_price', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.barcode}
                        onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                        placeholder="Autogenerado"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-4 inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Fila
          </button>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            {rows.length} {rows.length === 1 ? 'producto' : 'productos'} en la lista
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Guardando...' : 'Guardar y Generar Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
