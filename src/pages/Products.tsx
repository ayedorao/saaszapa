import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product, ProductVariant, Size, Color, Inventory } from '../types/database';
import { Plus, Search, Package, Eye, X, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import Barcode from 'react-barcode';
import SeedDataButton from '../components/SeedDataButton';
import { generateBarcode, validateBarcode } from '../utils/barcodeGenerator';

interface VariantWithDetails extends ProductVariant {
  product?: Product;
  size?: Size;
  color?: Color;
  inventory?: Inventory;
}

interface Store {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<VariantWithDetails[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantWithDetails | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    brand: '',
    finish: '',
    category: '',
    gender: '',
    image_url: '',
    base_cost: '',
    base_price: '',
  });

  const [selectedSizeIds, setSelectedSizeIds] = useState<Set<string>>(new Set());
  const [selectedColorIds, setSelectedColorIds] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [variantStocks, setVariantStocks] = useState<Map<string, number>>(new Map());
  const [variantBarcodes, setVariantBarcodes] = useState<Map<string, string>>(new Map());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadSizesAndColors(),
        loadStores(),
      ]);
      await loadProducts();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setDataLoading(false);
    }
  }, []);

  async function loadProducts() {
    try {
      const [productsSnap, variantsSnap, inventorySnap, sizesSnap, colorsSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'product_variants')),
        getDocs(collection(db, 'inventory')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'colors')),
      ]);

      const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      const variantsData = variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductVariant[];
      const inventoryData = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Inventory[];
      const sizesData = sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Size[];
      const colorsData = colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Color[];

      const sizesMap = new Map(sizesData.map(s => [s.id, s]));
      const colorsMap = new Map(colorsData.map(c => [c.id, c]));
      const productsMap = new Map(productsData.map(p => [p.id, p]));

      const inventoryByVariant = new Map<string, Inventory[]>();
      inventoryData.forEach(inv => {
        if (!inventoryByVariant.has(inv.variant_id)) {
          inventoryByVariant.set(inv.variant_id, []);
        }
        inventoryByVariant.get(inv.variant_id)!.push(inv);
      });

      const enrichedVariants = variantsData.map(variant => {
        const inventories = inventoryByVariant.get(variant.id) || [];
        const totalStock = inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

        const aggregatedInventory = inventories.length > 0 ? {
          ...inventories[0],
          quantity: totalStock,
        } : undefined;

        return {
          ...variant,
          product: productsMap.get(variant.product_id),
          size: sizesMap.get(variant.size_id),
          color: colorsMap.get(variant.color_id),
          inventory: aggregatedInventory,
        };
      });

      setProducts(productsData);
      setVariants(enrichedVariants);
    } catch (error) {
      console.error('Error loading products:', error);
      throw error;
    }
  }

  async function loadSizesAndColors() {
    try {
      const [sizesSnap, colorsSnap] = await Promise.all([
        getDocs(query(collection(db, 'sizes'), where('active', '==', true))),
        getDocs(query(collection(db, 'colors'), where('active', '==', true))),
      ]);

      const sizesData = sizesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Size[];
      const colorsData = colorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Color[];

      setSizes(sizesData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setColors(colorsData);
    } catch (error) {
      console.error('Error loading sizes and colors:', error);
      throw error;
    }
  }

  async function loadStores() {
    try {
      const storesQuery = query(collection(db, 'stores'), where('active', '==', true));
      const storesSnapshot = await getDocs(storesQuery);
      const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];

      if (storesData.length === 0) {
        const mainStore = {
          name: 'Tienda Principal',
          address: '',
          active: true,
          created_at: new Date().toISOString(),
        };
        const mainStoreRef = await addDoc(collection(db, 'stores'), mainStore);
        storesData.push({ id: mainStoreRef.id, ...mainStore });
      }

      setStores(storesData);
      if (storesData.length > 0 && !selectedStoreId) {
        setSelectedStoreId(storesData[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      throw error;
    }
  }

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, VariantWithDetails[]>();
    variants.forEach(variant => {
      if (!map.has(variant.product_id)) {
        map.set(variant.product_id, []);
      }
      map.get(variant.product_id)!.push(variant);
    });
    return map;
  }, [variants]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (selectedProduct) {
      await updateProduct();
    } else {
      await createProduct();
    }
  }

  async function createProduct() {
    if (!formData.name || !formData.brand || !formData.code) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (selectedSizeIds.size === 0 || selectedColorIds.size === 0) {
      alert('Debes seleccionar al menos una talla y un color');
      return;
    }

    if (stores.length === 0) {
      alert('No hay tiendas disponibles. Por favor, crea una tienda primero.');
      return;
    }

    if (!selectedStoreId) {
      alert('Por favor selecciona una tienda para el inventario');
      return;
    }

    setLoading(true);
    try {
      const productData: Omit<Product, 'id'> = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        brand: formData.brand,
        finish: formData.finish,
        category: formData.category,
        gender: formData.gender,
        image_url: formData.image_url,
        base_cost: parseFloat(formData.base_cost) || 0,
        base_price: parseFloat(formData.base_price) || 0,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const productDocRef = await addDoc(collection(db, 'products'), productData);
      const productId = productDocRef.id;

      const batch = writeBatch(db);
      let newVariantsCount = 0;

      for (const sizeId of Array.from(selectedSizeIds)) {
        for (const colorId of Array.from(selectedColorIds)) {
          const size = sizes.find(s => s.id === sizeId);
          const color = colors.find(c => c.id === colorId);
          const sku = `${formData.code}-${size?.name}-${color?.name}`.toUpperCase().replace(/\s+/g, '-');
          const variantKey = `${sizeId}-${colorId}`;

          const customBarcode = variantBarcodes.get(variantKey);
          let barcode: string;

          if (customBarcode && customBarcode.length >= 10) {
            barcode = customBarcode;
          } else {
            barcode = generateBarcode(
              formData.code,
              size?.name || '',
              color?.name || ''
            );
          }

          const stock = variantStocks.get(variantKey) || 0;

          const variantRef = doc(collection(db, 'product_variants'));
          batch.set(variantRef, {
            product_id: productId,
            size_id: sizeId,
            color_id: colorId,
            sku,
            barcode,
            price: parseFloat(formData.base_price),
            cost: parseFloat(formData.base_cost) || 0,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          const inventoryRef = doc(collection(db, 'inventory'));
          batch.set(inventoryRef, {
            variant_id: variantRef.id,
            quantity: stock,
            min_stock: 5,
            store_id: selectedStoreId,
            updated_at: new Date().toISOString(),
          });

          newVariantsCount++;
        }
      }

      await batch.commit();

      alert(`Producto creado con ${newVariantsCount} variantes exitosamente`);
      setShowModal(false);
      resetForm();
      await loadAllData();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error al crear el producto');
    } finally {
      setLoading(false);
    }
  }

  async function updateProduct() {
    if (!selectedProduct) return;

    if (!selectedStoreId) {
      alert('Por favor selecciona una tienda para el inventario');
      return;
    }

    setLoading(true);
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        name: formData.name,
        description: formData.description,
        brand: formData.brand,
        finish: formData.finish,
        category: formData.category,
        gender: formData.gender,
        image_url: formData.image_url,
        base_cost: parseFloat(formData.base_cost) || 0,
        base_price: parseFloat(formData.base_price) || 0,
        updated_at: new Date().toISOString(),
      });

      const existingVariants = variantsByProduct.get(selectedProduct.id) || [];

      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('store_id', '==', selectedStoreId)
      );
      const inventorySnap = await getDocs(inventoryQuery);
      const existingInventoryByVariant = new Map<string, { id: string; quantity: number }>();
      inventorySnap.docs.forEach(doc => {
        const inv = doc.data() as Inventory;
        existingInventoryByVariant.set(inv.variant_id, {
          id: doc.id,
          quantity: inv.quantity || 0,
        });
      });

      const batch = writeBatch(db);

      const currentKeys = new Set<string>();
      for (const sizeId of Array.from(selectedSizeIds)) {
        for (const colorId of Array.from(selectedColorIds)) {
          const variantKey = `${sizeId}-${colorId}`;
          currentKeys.add(variantKey);

          const existingVariant = existingVariants.find(
            v => v.size_id === sizeId && v.color_id === colorId
          );

          if (existingVariant) {
            const newStock = variantStocks.get(variantKey);

            if (newStock !== undefined) {
              const existingStoreInventory = existingInventoryByVariant.get(existingVariant.id);

              if (existingStoreInventory) {
                batch.update(doc(db, 'inventory', existingStoreInventory.id), {
                  quantity: newStock,
                  store_id: selectedStoreId,
                  updated_at: new Date().toISOString(),
                });
              } else {
                const inventoryRef = doc(collection(db, 'inventory'));
                batch.set(inventoryRef, {
                  variant_id: existingVariant.id,
                  quantity: newStock,
                  min_stock: 5,
                  store_id: selectedStoreId,
                  updated_at: new Date().toISOString(),
                });
              }
            }

            const newBarcode = variantBarcodes.get(variantKey);
            if (newBarcode && newBarcode !== existingVariant.barcode) {
              batch.update(doc(db, 'product_variants', existingVariant.id), {
                barcode: newBarcode,
                updated_at: new Date().toISOString(),
              });
            }
          } else {
            const size = sizes.find(s => s.id === sizeId);
            const color = colors.find(c => c.id === colorId);
            const sku = `${formData.code}-${size?.name}-${color?.name}`.toUpperCase().replace(/\s+/g, '-');

            const customBarcode = variantBarcodes.get(variantKey);
            const barcode = customBarcode && customBarcode.length >= 10
              ? customBarcode
              : generateBarcode(formData.code, size?.name || '', color?.name || '');

            const stock = variantStocks.get(variantKey) || 0;

            const variantRef = doc(collection(db, 'product_variants'));
            batch.set(variantRef, {
              product_id: selectedProduct.id,
              size_id: sizeId,
              color_id: colorId,
              sku,
              barcode,
              price: parseFloat(formData.base_price),
              cost: parseFloat(formData.base_cost) || 0,
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            const inventoryRef = doc(collection(db, 'inventory'));
            batch.set(inventoryRef, {
              variant_id: variantRef.id,
              quantity: stock,
              min_stock: 5,
              store_id: selectedStoreId,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      existingVariants.forEach(variant => {
        const variantKey = `${variant.size_id}-${variant.color_id}`;
        if (!currentKeys.has(variantKey)) {
          const existingStoreInventory = existingInventoryByVariant.get(variant.id);
          if (existingStoreInventory) {
            batch.delete(doc(db, 'inventory', existingStoreInventory.id));
          }
          batch.delete(doc(db, 'product_variants', variant.id));
        }
      });

      await batch.commit();

      alert('Producto y variantes actualizados exitosamente');
      setShowModal(false);
      resetForm();
      await loadAllData();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error al actualizar el producto');
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`¿Está seguro que desea eliminar el producto "${product.brand} - ${product.name}"?\n\nEsto eliminará el producto y todas sus variantes. Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      const productVariants = variantsByProduct.get(product.id) || [];
      const batch = writeBatch(db);

      for (const variant of productVariants) {
        if (variant.inventory?.id) {
          batch.delete(doc(db, 'inventory', variant.inventory.id));
        }
        batch.delete(doc(db, 'product_variants', variant.id));
      }

      batch.update(doc(db, 'products', product.id), {
        active: false,
        updated_at: new Date().toISOString(),
      });

      await batch.commit();

      alert('Producto eliminado exitosamente');
      await loadAllData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      name: '',
      description: '',
      brand: '',
      finish: '',
      category: '',
      gender: '',
      image_url: '',
      base_cost: '',
      base_price: '',
    });
    setSelectedProduct(null);
    setSelectedSizeIds(new Set());
    setSelectedColorIds(new Set());
    setVariantStocks(new Map());
    setVariantBarcodes(new Map());
    setSelectedStoreId(stores.length > 0 ? stores[0].id : '');
  }

  function toggleProductExpansion(productId: string) {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  }

  function generateBarcodePreview(sizeId: string, colorId: string): string {
    const size = sizes.find(s => s.id === sizeId);
    const color = colors.find(c => c.id === colorId);
    return generateBarcode(formData.code, size?.name || '', color?.name || '');
  }

  async function openEditModal(product: Product) {
    setSelectedProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      brand: product.brand,
      finish: product.finish,
      category: product.category || '',
      gender: product.gender || '',
      image_url: product.image_url || '',
      base_cost: product.base_cost.toString(),
      base_price: product.base_price.toString(),
    });

    const productVariants = variantsByProduct.get(product.id) || [];
    const selectedSizes = new Set<string>();
    const selectedColors = new Set<string>();
    const barcodes = new Map<string, string>();

    productVariants.forEach(variant => {
      selectedSizes.add(variant.size_id);
      selectedColors.add(variant.color_id);
      const key = `${variant.size_id}-${variant.color_id}`;
      barcodes.set(key, variant.barcode || '');
    });

    const firstStoreWithInventory = stores[0]?.id || '';
    setSelectedStoreId(firstStoreWithInventory);

    await loadStockForStore(productVariants, firstStoreWithInventory);

    setSelectedSizeIds(selectedSizes);
    setSelectedColorIds(selectedColors);
    setVariantBarcodes(barcodes);
    setShowModal(true);
  }

  async function loadStockForStore(productVariants: VariantWithDetails[], storeId: string) {
    if (!storeId) {
      setVariantStocks(new Map());
      return;
    }

    try {
      const stocks = new Map<string, number>();
      const variantIds = productVariants.map(v => v.id);

      if (variantIds.length > 0) {
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('store_id', '==', storeId)
        );
        const inventorySnap = await getDocs(inventoryQuery);

        inventorySnap.docs.forEach(doc => {
          const inv = doc.data() as Inventory;
          if (variantIds.includes(inv.variant_id)) {
            const variant = productVariants.find(v => v.id === inv.variant_id);
            if (variant) {
              const key = `${variant.size_id}-${variant.color_id}`;
              stocks.set(key, inv.quantity || 0);
            }
          }
        });
      }

      setVariantStocks(stocks);
    } catch (error) {
      console.error('Error loading stock for store:', error);
      setVariantStocks(new Map());
    }
  }

  function openBarcodeModal(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    setShowBarcodeModal(true);
  }

  function printBarcode() {
    const printContent = document.getElementById('barcode-print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Código de Barras</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .print-container {
              text-align: center;
              padding: 20px;
            }
            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
          <p className="text-slate-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadAllData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Productos</h1>
          <p className="text-slate-600 mt-1">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex items-center space-x-3">
          <SeedDataButton />
          <button
            onClick={loadAllData}
            disabled={dataLoading}
            className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, marca o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="space-y-3">
          {filteredProducts.map(product => {
            const productVariants = variantsByProduct.get(product.id) || [];
            const isExpanded = expandedProducts.has(product.id);

            const variantsByColor = new Map<string, VariantWithDetails[]>();
            productVariants.forEach(variant => {
              const colorId = variant.color_id;
              if (!variantsByColor.has(colorId)) {
                variantsByColor.set(colorId, []);
              }
              variantsByColor.get(colorId)!.push(variant);
            });

            const allColors = Array.from(variantsByColor.keys())
              .map(colorId => {
                const variant = productVariants.find(v => v.color_id === colorId);
                return variant?.color;
              })
              .filter(Boolean);

            return (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div
                  className="bg-slate-50 px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleProductExpansion(product.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-slate-900">{product.brand} - {product.name}</h3>
                        <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {product.finish} | Código: {product.code} | ${product.base_price.toFixed(2)}
                      </p>
                    </div>

                    {!isExpanded && (
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-wrap gap-1">
                          {allColors.slice(0, 3).map((color, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700"
                            >
                              {color?.name}
                            </span>
                          ))}
                          {allColors.length > 3 && (
                            <span className="text-xs text-slate-500">+{allColors.length - 3}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(variantsByColor.entries()).slice(0, 1).map(([colorId, colorVariants]) => {
                            const sortedVariants = colorVariants.sort((a, b) => {
                              const sizeA = a.size?.sort_order || 0;
                              const sizeB = b.size?.sort_order || 0;
                              return sizeA - sizeB;
                            });
                            return sortedVariants.map(variant => {
                              const stock = variant.inventory?.quantity || 0;
                              return (
                                <div key={variant.id} className="flex items-center space-x-1">
                                  <span className="text-xs text-slate-600">{variant.size?.name}:</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {stock}
                                  </span>
                                </div>
                              );
                            });
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-slate-200">
                    <div className="flex justify-end space-x-3 mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(product);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar Producto
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProduct(product);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Producto
                      </button>
                    </div>

                    {variantsByColor.size > 0 ? (
                      <div className="space-y-4">
                        {Array.from(variantsByColor.entries()).map(([colorId, colorVariants]) => {
                          const color = colorVariants[0]?.color;
                          const sortedVariants = colorVariants.sort((a, b) => {
                            const sizeA = a.size?.sort_order || 0;
                            const sizeB = b.size?.sort_order || 0;
                            return sizeA - sizeB;
                          });

                          return (
                            <div key={colorId} className="border border-slate-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                Color: {color?.name}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {sortedVariants.map(variant => {
                                  const stock = variant.inventory?.quantity || 0;
                                  return (
                                    <div
                                      key={variant.id}
                                      className="flex flex-col items-center space-y-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      <span className="text-sm font-medium text-slate-700">
                                        {variant.size?.name}
                                      </span>
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        stock > 0
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {stock}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openBarcodeModal(variant);
                                        }}
                                        className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                                        title="Ver código de barras"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Barcode</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-4">No hay variantes disponibles</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay productos</h3>
          <p className="text-slate-600 mb-4">Comienza agregando tu primer producto al catálogo</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Código del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedProduct}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100"
                    placeholder="SKU001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Nombre del producto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Nike, Adidas, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Acabado *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.finish}
                    onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Casual, Deportivo, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Calzado, Ropa, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Género
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Niño">Niño</option>
                    <option value="Niña">Niña</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Costo Base *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.base_cost}
                    onChange={(e) => setFormData({ ...formData, base_cost: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio Base *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Descripción del producto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL de Imagen
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="font-semibold text-slate-900 mb-3">
                  {selectedProduct ? 'Gestionar Variantes' : 'Tallas y Colores *'}
                </h4>
                {selectedProduct && (
                  <p className="text-sm text-slate-600 mb-3">
                    Selecciona o deselecciona tallas y colores para agregar o eliminar variantes
                  </p>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tienda para Inventario *
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => {
                      const newStoreId = e.target.value;
                      setSelectedStoreId(newStoreId);
                      if (selectedProduct && newStoreId) {
                        const productVariants = variantsByProduct.get(selectedProduct.id) || [];
                        loadStockForStore(productVariants, newStoreId);
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar tienda...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedProduct
                      ? 'Selecciona la tienda para ver y editar su inventario. Puedes crear inventario para diferentes tiendas.'
                      : 'Selecciona la tienda donde se registrará el inventario inicial de este producto.'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Seleccionar Tallas
                        </label>
                        <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50">
                          {sizes.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-2">No hay tallas disponibles</p>
                          ) : (
                            sizes.map(size => (
                              <label key={size.id} className="flex items-center space-x-2 py-2 cursor-pointer hover:bg-white px-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedSizeIds.has(size.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedSizeIds);
                                    if (e.target.checked) {
                                      newSet.add(size.id);
                                    } else {
                                      newSet.delete(size.id);
                                    }
                                    setSelectedSizeIds(newSet);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm font-medium">{size.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Seleccionar Colores
                        </label>
                        <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50">
                          {colors.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-2">No hay colores disponibles</p>
                          ) : (
                            colors.map(color => (
                              <label key={color.id} className="flex items-center space-x-2 py-2 cursor-pointer hover:bg-white px-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedColorIds.has(color.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedColorIds);
                                    if (e.target.checked) {
                                      newSet.add(color.id);
                                    } else {
                                      newSet.delete(color.id);
                                    }
                                    setSelectedColorIds(newSet);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm font-medium">{color.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                {selectedSizeIds.size > 0 && selectedColorIds.size > 0 && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Stock y Códigos de Barras</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Talla</th>
                              <th className="px-3 py-2 text-left">Color</th>
                              <th className="px-3 py-2 text-left">Stock Inicial</th>
                              <th className="px-3 py-2 text-left">Código de Barras</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {Array.from(selectedSizeIds).map(sizeId => {
                              const size = sizes.find(s => s.id === sizeId);
                              return Array.from(selectedColorIds).map(colorId => {
                                const color = colors.find(c => c.id === colorId);
                                const variantKey = `${sizeId}-${colorId}`;
                                const defaultBarcode = generateBarcodePreview(sizeId, colorId);

                                return (
                                  <tr key={variantKey}>
                                    <td className="px-3 py-2">{size?.name}</td>
                                    <td className="px-3 py-2">{color?.name}</td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={variantStocks.get(variantKey) || 0}
                                        onChange={(e) => {
                                          const newStocks = new Map(variantStocks);
                                          newStocks.set(variantKey, parseInt(e.target.value) || 0);
                                          setVariantStocks(newStocks);
                                        }}
                                        className="w-20 px-2 py-1 border border-slate-300 rounded"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={variantBarcodes.get(variantKey) || defaultBarcode}
                                        onChange={(e) => {
                                          const newBarcodes = new Map(variantBarcodes);
                                          newBarcodes.set(variantKey, e.target.value);
                                          setVariantBarcodes(newBarcodes);
                                        }}
                                        placeholder={defaultBarcode}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                                      />
                                    </td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : selectedProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcodeModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Código de Barras</h2>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Información del Producto</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Producto</p>
                    <p className="font-medium text-slate-900">{selectedVariant.product?.brand} - {selectedVariant.product?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Talla</p>
                    <p className="font-medium text-slate-900">{selectedVariant.size?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Color</p>
                    <p className="font-medium text-slate-900">{selectedVariant.color?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">SKU</p>
                    <p className="font-mono text-sm font-medium text-slate-900">{selectedVariant.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Precio</p>
                    <p className="font-bold text-slate-900">${selectedVariant.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-lg p-8 flex flex-col items-center">
                {selectedVariant.barcode && selectedVariant.barcode.length > 0 ? (
                  <Barcode
                    value={selectedVariant.barcode}
                    format="CODE128"
                    width={2}
                    height={80}
                    displayValue={true}
                    fontSize={14}
                    margin={10}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No hay código de barras disponible</p>
                    <p className="text-xs text-slate-400 mt-2">SKU: {selectedVariant.sku}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={printBarcode}
                  disabled={!selectedVariant.barcode}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Imprimir Código de Barras
                </button>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>

              <div id="barcode-print-area" style={{ display: 'none' }}>
                {selectedVariant.barcode && selectedVariant.barcode.length > 0 && (
                  <Barcode
                    value={selectedVariant.barcode}
                    format="CODE128"
                    width={2}
                    height={80}
                    displayValue={true}
                    fontSize={14}
                    margin={10}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
