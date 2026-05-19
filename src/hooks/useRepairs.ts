import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { Repair, getLocalData, putLocalData, addSyncAction, deleteLocalData } from "../services/db";
import { syncOfflineData } from "../services/sync";
import { useAuth } from "./useAuth";

export function useRepairs() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const loadLocal = useCallback(async () => {
    try {
      const localData = await getLocalData<Repair>('repairs');
      const sorted = localData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRepairs(sorted);
    } catch (err) {
      console.error("Local data load failed:", err);
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
      const q = query(collection(db, "repairs"));
      const unsub = onSnapshot(q, async (snap) => {
        try {
          // If the snapshot has documents, update local DB
          if (!snap.empty || snap.metadata.fromCache) {
             const promises = snap.docs.map(doc => {
              const data = doc.data();
              const item: Repair = {
                id: doc.id,
                title: data.title,
                description: data.description || "",
                status: data.status || "open",
                clientId: data.clientId || "",
                technicianId: data.technicianId || '',
                deviceModel: data.deviceModel || "",
                serialNumber: data.serialNumber || '',
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
                synced: true
              };
              return putLocalData('repairs', item);
            });
            await Promise.all(promises);
            await loadLocal();
          }
        } catch (e) {
          console.error("Failed handling repairs snapshot", e);
        }
      }, (error) => {
        console.warn("Firestore repairs snapshot error (offline/permissions)", error.message);
      });
      return () => unsub();
    }
  }, [user, isOnline, loadLocal]);

  const addRepair = useCallback(async (data: Omit<Repair, "id"|"createdAt"|"updatedAt"|"synced">) => {
    const now = new Date().toISOString();
    const id = `repair-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const newDoc: Repair = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    try {
      await putLocalData('repairs', newDoc);
      setRepairs(prev => [newDoc, ...prev]);

      await addSyncAction({ action: "CREATE", collection: "repairs", docId: id, payload: newDoc, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
      console.error("Failed to add repair ticket", e);
    }
  }, [isOnline]);

  const updateRepair = useCallback(async (id: string, updates: Partial<Repair>) => {
    try {
      const existing = repairs.find(r => r.id === id);
      if (!existing) return;

      const now = new Date().toISOString();
      const updatedDoc = { ...existing, ...updates, updatedAt: now, synced: false };
      
      setRepairs(prev => prev.map(m => m.id === id ? updatedDoc : m));
      await putLocalData('repairs', updatedDoc);

      const payloadOpts = { ...updates, updatedAt: now };
      await addSyncAction({ action: "UPDATE", collection: "repairs", docId: id, payload: payloadOpts, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
      console.error("Failed to update repair ticket", e);
    }
  }, [repairs, isOnline]);

  const removeRepair = useCallback(async (id: string) => {
    try {
      setRepairs(prev => prev.filter(m => m.id !== id));
      await deleteLocalData('repairs', id);

      const now = new Date().toISOString();
      await addSyncAction({ action: "DELETE", collection: "repairs", docId: id, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
      console.error("Failed to remove repair ticket", e);
    }
  }, [isOnline]);

  return { repairs, loading, addRepair, updateRepair, removeRepair };
}

