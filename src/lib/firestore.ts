import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
  OrderByDirection,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

export interface QueryOptions {
  where?: Array<{ field: string; operator: WhereFilterOp; value: any }>;
  orderBy?: { field: string; direction?: OrderByDirection };
  limit?: number;
}

export async function getDocument(collectionName: string, documentId: string) {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getDocuments(
  collectionName: string,
  options?: QueryOptions
) {
  const constraints: QueryConstraint[] = [];

  if (options?.where) {
    options.where.forEach(({ field, operator, value }) => {
      constraints.push(where(field, operator, value));
    });
  }

  if (options?.orderBy) {
    constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
  }

  if (options?.limit) {
    constraints.push(limit(options.limit));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function createDocument(
  collectionName: string,
  data: DocumentData
) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    created_at: new Date().toISOString()
  });

  return { id: docRef.id, ...data };
}

export async function createDocumentWithId(
  collectionName: string,
  documentId: string,
  data: DocumentData
) {
  await setDoc(doc(db, collectionName, documentId), {
    ...data,
    created_at: new Date().toISOString()
  });

  return { id: documentId, ...data };
}

export async function updateDocument(
  collectionName: string,
  documentId: string,
  data: DocumentData
) {
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updated_at: new Date().toISOString()
  });

  return { id: documentId, ...data };
}

export async function deleteDocument(
  collectionName: string,
  documentId: string
) {
  await deleteDoc(doc(db, collectionName, documentId));
}
