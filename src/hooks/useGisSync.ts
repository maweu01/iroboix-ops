import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export function useGisSync(collectionName = "gis_notes") {
  const [data, setData] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOfflineStatus);

    // Order by update timestamp to maintain data consistency across connected assets
    const q = query(collection(db, collectionName), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setData(items);
      
      // True if document changes are currently locked in local storage waiting for network reconnection
      setHasPendingWrites(snapshot.metadata.hasPendingWrites);
    }, (error) => {
      console.error("GIS Synchronization Sync Interrupted:", error);
    });

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOfflineStatus);
      unsubscribe();
    };
  }, [collectionName]);

  const saveData = async (payload: any) => {
    try {
      await addDoc(collection(db, collectionName), {
        ...payload,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Offline Cache Write Injection Failed:", err);
    }
  };

  return { data, isOnline, hasPendingWrites, saveData };
}