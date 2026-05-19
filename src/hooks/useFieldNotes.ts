import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { FieldNote, getLocalData, putLocalData, addSyncAction, deleteLocalData } from "../services/db";
import { syncOfflineData } from "../services/sync";
import { useAuth } from "./useAuth";

export function useFieldNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const loadLocal = useCallback(async () => {
    try {
      const localData = await getLocalData<FieldNote>('fieldNotes');
      const sorted = localData.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(sorted);
    } catch (err) {
      console.error("Local field notes load failed:", err);
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
      const q = query(collection(db, "fieldNotes"), where("createdBy", "==", user.uid));
      const unsub = onSnapshot(q, async (snap) => {
        try {
          if (!snap.empty || snap.metadata.fromCache) {
             const promises = snap.docs.map(doc => {
              const data = doc.data();
              const item: FieldNote = {
                id: doc.id,
                title: data.title || "",
                note: data.note || "",
                locationName: data.locationName || '',
                latitude: data.latitude,
                longitude: data.longitude,
                structuralIssues: data.structuralIssues,
                weatherConditions: data.weatherConditions,
                inspectorName: data.inspectorName,
                riskLevel: data.riskLevel,
                siteStatus: data.siteStatus,
                createdBy: data.createdBy,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
                synced: true
              };
              return putLocalData('fieldNotes', item);
            });
            await Promise.all(promises);
            await loadLocal();
          }
        } catch (e) {
          console.error("Failed handling field notes snapshot", e);
        }
      }, (error) => {
         console.warn("Firestore field notes snapshot error", error.message);
      });
      return () => unsub();
    }
  }, [user, isOnline, loadLocal]);

  const addNote = useCallback(async (data: Omit<FieldNote, "id"|"createdAt"|"updatedAt"|"synced"|"createdBy">) => {
    const now = new Date().toISOString();
    const id = `note-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const newDoc: FieldNote = { id, ...data, createdBy: user?.uid || "mock-user-123", createdAt: now, updatedAt: now, synced: false };
    try {
      await putLocalData('fieldNotes', newDoc);
      setNotes(prev => [newDoc, ...prev]);
      await addSyncAction({ action: "CREATE", collection: "fieldNotes", docId: id, payload: newDoc, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
      console.error("Failed to add note", e);
    }
  }, [user, isOnline]);

  const updateNote = useCallback(async (id: string, updates: Partial<FieldNote>) => {
    try {
      const existing = notes.find(r => r.id === id);
      if (!existing) return;
      const now = new Date().toISOString();
      const updatedDoc = { ...existing, ...updates, updatedAt: now, synced: false };
      setNotes(prev => prev.map(m => m.id === id ? updatedDoc : m));
      await putLocalData('fieldNotes', updatedDoc);
      const payloadOpts = { ...updates, updatedAt: now };
      await addSyncAction({ action: "UPDATE", collection: "fieldNotes", docId: id, payload: payloadOpts, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
       console.error("Failed to update note", e);
    }
  }, [notes, isOnline]);

  const removeNote = useCallback(async (id: string) => {
    try {
      setNotes(prev => prev.filter(m => m.id !== id));
      await deleteLocalData('fieldNotes', id);
      const now = new Date().toISOString();
      await addSyncAction({ action: "DELETE", collection: "fieldNotes", docId: id, timestamp: now });
      if (isOnline) syncOfflineData();
    } catch (e) {
       console.error("Failed to remove note", e);
    }
  }, [isOnline]);

  return { notes, loading, addNote, updateNote, removeNote };
}
