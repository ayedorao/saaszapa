import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ActionLogData {
  user_id: string;
  user_email: string;
  action_type: string;
  module: string;
  description: string;
  metadata?: any;
}

export async function logAction(data: ActionLogData) {
  try {
    await addDoc(collection(db, 'action_logs'), {
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

export const ACTION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  PRINT: 'PRINT'
};

export const MODULES = {
  PRODUCTS: 'PRODUCTOS',
  INVENTORY: 'INVENTARIO',
  SALES: 'VENTAS',
  POS: 'PUNTO DE VENTA',
  CUSTOMERS: 'CLIENTES',
  SUPPLIERS: 'PROVEEDORES',
  PROMOTIONS: 'PROMOCIONES',
  USERS: 'USUARIOS',
  REPORTS: 'REPORTES',
  CASH_REGISTER: 'CAJA',
  STORES: 'TIENDAS',
  RETURNS: 'DEVOLUCIONES',
  SYSTEM: 'SISTEMA'
};
