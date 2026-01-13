import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SizeData {
  name: string;
  sort_order: number;
  active: boolean;
}

export interface ColorData {
  name: string;
  hex_code: string;
  active: boolean;
}

// Tallas mexicanas para zapatos (niños y adultos)
export const mexicanShoeSizes: SizeData[] = [
  // Tallas de bebé (0-2 años)
  { name: '9', sort_order: 1, active: true },
  { name: '10', sort_order: 2, active: true },
  { name: '11', sort_order: 3, active: true },
  { name: '12', sort_order: 4, active: true },
  { name: '13', sort_order: 5, active: true },
  { name: '14', sort_order: 6, active: true },
  { name: '15', sort_order: 7, active: true },
  { name: '16', sort_order: 8, active: true },
  
  // Tallas de niño pequeño (2-6 años)
  { name: '17', sort_order: 9, active: true },
  { name: '18', sort_order: 10, active: true },
  { name: '19', sort_order: 11, active: true },
  { name: '20', sort_order: 12, active: true },
  { name: '21', sort_order: 13, active: true },
  { name: '22', sort_order: 14, active: true },
  { name: '23', sort_order: 15, active: true },
  { name: '24', sort_order: 16, active: true },
  
  // Tallas de niño grande (6-12 años)
  { name: '25', sort_order: 17, active: true },
  { name: '26', sort_order: 18, active: true },
  { name: '27', sort_order: 19, active: true },
  { name: '28', sort_order: 20, active: true },
  { name: '29', sort_order: 21, active: true },
  { name: '30', sort_order: 22, active: true },
  { name: '31', sort_order: 23, active: true },
  { name: '32', sort_order: 24, active: true },
  { name: '33', sort_order: 25, active: true },
  { name: '34', sort_order: 26, active: true },
  
  // Tallas de adulto (más comunes en México)
  { name: '35', sort_order: 27, active: true },
  { name: '36', sort_order: 28, active: true },
  { name: '37', sort_order: 29, active: true },
  { name: '38', sort_order: 30, active: true },
  { name: '39', sort_order: 31, active: true },
  { name: '40', sort_order: 32, active: true },
  { name: '41', sort_order: 33, active: true },
  { name: '42', sort_order: 34, active: true },
  { name: '43', sort_order: 35, active: true },
  { name: '44', sort_order: 36, active: true },
  { name: '45', sort_order: 37, active: true },
  { name: '46', sort_order: 38, active: true },
  { name: '47', sort_order: 39, active: true },
  { name: '48', sort_order: 40, active: true },
  { name: '49', sort_order: 41, active: true },
  { name: '50', sort_order: 42, active: true },
];

// Colores básicos para zapatos
export const basicShoeColors: ColorData[] = [
  { name: 'Negro', hex_code: '#000000', active: true },
  { name: 'Café', hex_code: '#8B4513', active: true },
  { name: 'Marrón', hex_code: '#A0522D', active: true },
  { name: 'Beige', hex_code: '#F5F5DC', active: true },
  { name: 'Blanco', hex_code: '#FFFFFF', active: true },
  { name: 'Gris', hex_code: '#808080', active: true },
  { name: 'Azul Marino', hex_code: '#000080', active: true },
  { name: 'Rojo', hex_code: '#DC143C', active: true },
  { name: 'Verde', hex_code: '#228B22', active: true },
  { name: 'Rosa', hex_code: '#FFC0CB', active: true },
  { name: 'Amarillo', hex_code: '#FFD700', active: true },
  { name: 'Naranja', hex_code: '#FF8C00', active: true },
  { name: 'Morado', hex_code: '#800080', active: true },
  { name: 'Dorado', hex_code: '#DAA520', active: true },
  { name: 'Plateado', hex_code: '#C0C0C0', active: true },
  { name: 'Vino', hex_code: '#722F37', active: true },
  { name: 'Camel', hex_code: '#C19A6B', active: true },
  { name: 'Miel', hex_code: '#FDB863', active: true },
];

export async function seedSizes(): Promise<void> {
  try {
    console.log('Verificando tallas existentes...');
    
    // Verificar si ya existen tallas
    const existingSizesQuery = query(collection(db, 'sizes'));
    const existingSizesSnapshot = await getDocs(existingSizesQuery);
    
    if (existingSizesSnapshot.size > 0) {
      console.log(`Ya existen ${existingSizesSnapshot.size} tallas. Omitiendo creación.`);
      return;
    }

    console.log('Creando tallas mexicanas...');
    
    for (const size of mexicanShoeSizes) {
      await addDoc(collection(db, 'sizes'), {
        ...size,
        created_at: new Date().toISOString(),
      });
    }

    console.log(`✅ Se crearon ${mexicanShoeSizes.length} tallas exitosamente`);
  } catch (error) {
    console.error('Error creando tallas:', error);
    throw error;
  }
}

export async function seedColors(): Promise<void> {
  try {
    console.log('Verificando colores existentes...');
    
    // Verificar si ya existen colores
    const existingColorsQuery = query(collection(db, 'colors'));
    const existingColorsSnapshot = await getDocs(existingColorsQuery);
    
    if (existingColorsSnapshot.size > 0) {
      console.log(`Ya existen ${existingColorsSnapshot.size} colores. Omitiendo creación.`);
      return;
    }

    console.log('Creando colores básicos...');
    
    for (const color of basicShoeColors) {
      await addDoc(collection(db, 'colors'), {
        ...color,
        created_at: new Date().toISOString(),
      });
    }

    console.log(`✅ Se crearon ${basicShoeColors.length} colores exitosamente`);
  } catch (error) {
    console.error('Error creando colores:', error);
    throw error;
  }
}

async function seedStoresAndRegisters(): Promise<void> {
  try {
    const storesQuery = query(collection(db, 'stores'));
    const existingStores = await getDocs(storesQuery);

    if (existingStores.empty) {
      console.log('🏪 Creando tiendas por defecto...');

      const mainStore = await addDoc(collection(db, 'stores'), {
        name: 'Tienda Principal',
        address: 'Dirección principal',
        phone: '555-0000',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log('💰 Creando cajas registradoras por defecto...');

      await addDoc(collection(db, 'cash_registers'), {
        name: 'Caja 1',
        store_id: mainStore.id,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await addDoc(collection(db, 'cash_registers'), {
        name: 'Caja 2',
        store_id: mainStore.id,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log('✅ Tiendas y cajas registradoras creadas exitosamente');
    }
  } catch (error) {
    console.error('Error creando tiendas y cajas:', error);
    throw error;
  }
}

export async function seedBasicData(): Promise<void> {
  try {
    console.log('🌱 Iniciando creación de datos básicos...');

    await Promise.all([
      seedSizes(),
      seedColors(),
      seedStoresAndRegisters(),
    ]);

    console.log('🎉 Datos básicos creados exitosamente');
  } catch (error) {
    console.error('❌ Error creando datos básicos:', error);
    throw error;
  }
}