import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Repair {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  clientId: string;
  technicianId?: string;
  deviceModel: string;
  serialNumber?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'drone' | 'battery' | 'part' | 'accessory';
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'broken';
  location?: string;
  cycleCount?: number;
  flightHours?: number;
  lastMaintenanceDate?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface FieldNote {
  id: string;
  title: string;
  note: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  structuralIssues?: string;
  weatherConditions?: string;
  inspectorName?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  siteStatus?: 'safe' | 'monitor' | 'action_required' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface SyncAction {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'repairs' | 'inventory' | 'fieldNotes' | 'reports' | 'clients' | 'clientRequests';
  docId: string;
  payload?: any;
  timestamp: string;
}

export interface ReportRecord {
  id: string;
  repairId: string;
  mode: string;
  pdfBlobUrl?: string; // transient, not saved normally but possibly base64
  pdfData?: string; // base64 encoded
  createdAt: string;
  synced: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface ClientRequest {
  id: string;
  clientId: string;
  description: string;
  status: 'Submitted' | 'In Review' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

interface IRobotixDB extends DBSchema {
  repairs: {
    key: string;
    value: Repair;
  };
  inventory: {
    key: string;
    value: InventoryItem;
  };
  fieldNotes: {
    key: string;
    value: FieldNote;
  };
  reports: {
    key: string;
    value: ReportRecord;
  };
  clients: {
    key: string;
    value: Client;
  };
  clientRequests: {
    key: string;
    value: ClientRequest;
  };
  syncQueue: {
    key: string;
    value: SyncAction;
  };
}

let dbPromise: Promise<IDBPDatabase<IRobotixDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<IRobotixDB>('irobotix-ops-db', 5, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('repairs')) db.createObjectStore('repairs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fieldNotes')) db.createObjectStore('fieldNotes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('reports')) db.createObjectStore('reports', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('clientRequests')) db.createObjectStore('clientRequests', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getLocalData<T>(storeName: 'repairs' | 'inventory' | 'fieldNotes' | 'reports' | 'clients' | 'clientRequests'): Promise<T[]> {
  try {
    const db = await getDB();
    return db.getAll(storeName) as Promise<T[]>;
  } catch (err) {
    console.error(`Error getting local data from ${storeName}`, err);
    return [];
  }
}

export async function putLocalData(storeName: 'repairs' | 'inventory' | 'fieldNotes' | 'reports' | 'clients' | 'clientRequests', data: any): Promise<void> {
  const db = await getDB();
  await db.put(storeName, data);
}

export async function deleteLocalData(storeName: 'repairs' | 'inventory' | 'fieldNotes' | 'reports' | 'clients' | 'clientRequests', id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

export async function addSyncAction(action: Omit<SyncAction, 'id'>): Promise<void> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put('syncQueue', { ...action, id });
}

export async function getSyncQueue(): Promise<SyncAction[]> {
  try {
    const db = await getDB();
    return db.getAll('syncQueue');
  } catch (err) {
    return [];
  }
}

export async function removeSyncAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}
