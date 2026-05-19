import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { InventoryItem, getLocalData, putLocalData, addSyncAction, deleteLocalData } from "../services/db";
import { syncOfflineData } from "../services/sync";
import { useAuth } from "./useAuth";

export function useInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const loadLocal = useCallback(async () => {
    try {
      const localData = await getLocalData<InventoryItem>('inventory');
      const sorted = localData.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setInventory(sorted);
    } catch (err) {
      console.error("Local inventory load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncOfflineData(); };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    loadLocal();

    if (isOnline && user) {
      const q = query(collection(db, "inventory"));
      const unsub = onSnapshot(q, async (snap) => {
        try {
          if (!snap.empty || snap.metadata.fromCache) {
             const promises = snap.docs.map(doc => {
              const data = doc.data();
              const item: InventoryItem = {
                id: doc.id,
                name: data.name || "",
                category: data.category || "part",
                quantity: data.quantity || 0,
                condition: data.condition || "good",
                location: data.location || '',
                cycleCount: data.cycleCount,
                flightHours: data.flightHours,
                lastMaintenanceDate: data.lastMaintenanceDate,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
                synced: true
              };
              return putLocalData('inventory', item);
            });
            await Promise.all(promises);
            await loadLocal();
          }
        } catch (e) {
          console.error("Failed handling inventory snapshot", e);
        }
      }, (error) => {
         console.warn("Firestore inventory snapshot error", error.message);
      });
      return () => unsub();
    }
  }, [user, isOnline, loadLocal]);

  const addInventoryItem = useCallback(async (data: Omit<InventoryItem, "id"|"createdAt"|"updatedAt"|"synced">) => {
    const now = new Date().toISOString();
    const id = `inv-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const newDoc: InventoryItem = { id, ...data, createdAt: now, updatedAt: now, synced: false };
    try {
      await putLocalData('inventory', newDoc);
      setInventory(prev => [newDoc, ...prev]);
      await addSyncAction({ action: "CREATE", collection: "inventory", docId: id, payload: newDoc, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
      console.error("Failed to add inventory item", e);
    }
  }, [isOnline]);

  const updateInventoryItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const existing = inventory.find(r => r.id === id);
      if (!existing) return;
      const now = new Date().toISOString();
      const updatedDoc = { ...existing, ...updates, updatedAt: now, synced: false };
      setInventory(prev => prev.map(m => m.id === id ? updatedDoc : m));
      await putLocalData('inventory', updatedDoc);
      const payloadOpts = { ...updates, updatedAt: now };
      await addSyncAction({ action: "UPDATE", collection: "inventory", docId: id, payload: payloadOpts, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
       console.error("Failed to update inventory item", e);
    }
  }, [inventory, isOnline]);

  const removeInventoryItem = useCallback(async (id: string) => {
    try {
      setInventory(prev => prev.filter(m => m.id !== id));
      await deleteLocalData('inventory', id);
      const now = new Date().toISOString();
      await addSyncAction({ action: "DELETE", collection: "inventory", docId: id, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
       console.error("Failed to remove inventory item", e);
    }
  }, [isOnline]);

  return { inventory, loading, addInventoryItem, updateInventoryItem, removeInventoryItem };
}
