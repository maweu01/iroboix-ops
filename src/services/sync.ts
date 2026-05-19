import { doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { getSyncQueue, removeSyncAction, putLocalData } from "./db";

let isSyncing = false;

export async function syncOfflineData() {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;
  
  try {
    const queue = await getSyncQueue();
    for (const action of queue) {
      if (!["repairs", "inventory", "fieldNotes"].includes(action.collection)) continue;
      
      const docRef = doc(db, action.collection, action.docId);
      
      try {
        if (action.action === "CREATE") {
          await setDoc(docRef, action.payload);
        } else if (action.action === "UPDATE") {
          await updateDoc(docRef, action.payload);
        } else if (action.action === "DELETE") {
          await deleteDoc(docRef);
        }
        
        if (action.action !== "DELETE") {
          const freshSnap = await getDoc(docRef);
          if (freshSnap.exists()) {
            await putLocalData(action.collection as any, { ...freshSnap.data(), id: freshSnap.id, synced: true });
          }
        }
        
        await removeSyncAction(action.id);
      } catch (err: any) {
        console.error(`Failed to sync action [${action.collection}]`, action, err);
        if (err.code === "permission-denied" || err.message.includes("permission") || err.code === "not-found") {
            await removeSyncAction(action.id);
        }
      }
    }
  } finally {
    isSyncing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", syncOfflineData);
}
