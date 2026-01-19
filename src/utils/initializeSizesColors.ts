import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DEFAULT_SIZES = [
  { name: '22', sort_order: 1 },
  { name: '22.5', sort_order: 2 },
  { name: '23', sort_order: 3 },
  { name: '23.5', sort_order: 4 },
  { name: '24', sort_order: 5 },
  { name: '24.5', sort_order: 6 },
  { name: '25', sort_order: 7 },
  { name: '25.5', sort_order: 8 },
  { name: '26', sort_order: 9 },
  { name: '26.5', sort_order: 10 },
  { name: '27', sort_order: 11 },
  { name: '27.5', sort_order: 12 },
  { name: '28', sort_order: 13 },
  { name: '28.5', sort_order: 14 },
  { name: '29', sort_order: 15 },
  { name: '29.5', sort_order: 16 },
  { name: '30', sort_order: 17 },
];

const DEFAULT_COLORS = [
  { name: 'Negro', hex_code: '#000000' },
  { name: 'Blanco', hex_code: '#FFFFFF' },
  { name: 'Café', hex_code: '#8B4513' },
  { name: 'Gris', hex_code: '#808080' },
  { name: 'Azul', hex_code: '#0000FF' },
  { name: 'Rojo', hex_code: '#FF0000' },
  { name: 'Verde', hex_code: '#008000' },
  { name: 'Amarillo', hex_code: '#FFFF00' },
  { name: 'Rosa', hex_code: '#FFC0CB' },
  { name: 'Beige', hex_code: '#F5F5DC' },
  { name: 'Naranja', hex_code: '#FFA500' },
  { name: 'Morado', hex_code: '#800080' },
];

export async function initializeSizesAndColors(): Promise<{ sizesAdded: number; colorsAdded: number }> {
  let sizesAdded = 0;
  let colorsAdded = 0;

  try {
    const sizesSnapshot = await getDocs(collection(db, 'sizes'));

    if (sizesSnapshot.empty) {
      console.log('Inicializando tallas...');
      for (const size of DEFAULT_SIZES) {
        await addDoc(collection(db, 'sizes'), {
          ...size,
          active: true,
          created_at: new Date().toISOString(),
        });
        sizesAdded++;
      }
      console.log(`${sizesAdded} tallas agregadas`);
    }

    const colorsSnapshot = await getDocs(collection(db, 'colors'));

    if (colorsSnapshot.empty) {
      console.log('Inicializando colores...');
      for (const color of DEFAULT_COLORS) {
        await addDoc(collection(db, 'colors'), {
          ...color,
          active: true,
          created_at: new Date().toISOString(),
        });
        colorsAdded++;
      }
      console.log(`${colorsAdded} colores agregados`);
    }

    return { sizesAdded, colorsAdded };
  } catch (error) {
    console.error('Error inicializando tallas y colores:', error);
    throw error;
  }
}

export async function checkAndInitializeSizesColors(): Promise<boolean> {
  try {
    const [sizesSnapshot, colorsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'sizes'), where('active', '==', true))),
      getDocs(query(collection(db, 'colors'), where('active', '==', true))),
    ]);

    const needsInitialization = sizesSnapshot.empty || colorsSnapshot.empty;

    if (needsInitialization) {
      await initializeSizesAndColors();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verificando tallas y colores:', error);
    return false;
  }
}
