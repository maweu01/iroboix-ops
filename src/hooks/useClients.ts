import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Client, ClientRequest, getLocalData, putLocalData, deleteLocalData } from '../services/db';
import { useAuth } from './useAuth';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const loadLocal = useCallback(async () => {
    try {
      const localClients = await getLocalData<Client>('clients');
      const localRequests = await getLocalData<ClientRequest>('clientRequests');
      
      setClients(localClients.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setRequests(localRequests.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (e) {
      console.error("Local client load failed:", e);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); };
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

    if (!user || !isOnline) return;

    // Sync Clients
    const clientsUnsubscribe = onSnapshot(collection(db, 'clients'), 
      async (snapshot) => {
        try {
          if (!snapshot.empty || snapshot.metadata.fromCache) {
            const promises = snapshot.docs.map(doc => {
              const data = doc.data() as Client;
              return putLocalData('clients', { ...data, id: doc.id, synced: true });
            });
            await Promise.all(promises);
            await loadLocal();
          }
        } catch (e) {
          console.error("Failed handling clients snapshot", e);
        }
      },
      (error) => {
        console.warn("Firestore Clients Error: ", error.message);
      }
    );

    // Sync Client Requests
    const requestsUnsubscribe = onSnapshot(collection(db, 'clientRequests'), 
      async (snapshot) => {
        try {
          if (!snapshot.empty || snapshot.metadata.fromCache) {
             const promises = snapshot.docs.map(doc => {
                const data = doc.data() as ClientRequest;
                return putLocalData('clientRequests', { ...data, id: doc.id, synced: true });
             });
             await Promise.all(promises);
             await loadLocal();
          }
        } catch (e) {
             console.error("Failed handling client requests snapshot", e);
        }
      },
      (error) => {
        console.warn("Firestore ClientRequests Error: ", error.message);
      }
    );

    return () => {
      clientsUnsubscribe();
      requestsUnsubscribe();
    };
  }, [user, isOnline, loadLocal]);

  const addClient = async (clientData: Partial<Client>) => {
    const newClient: Client = {
      id: `client-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name: clientData.name || '',
      phone: clientData.phone || '',
      email: clientData.email || '',
      address: clientData.address || '',
      notes: clientData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: isOnline
    };

    setClients(prev => [newClient, ...prev]);
    try {
      await putLocalData('clients', newClient);
      
      if (isOnline) {
        await setDoc(doc(db, 'clients', newClient.id), newClient);
      }
    } catch (e: any) {
      console.warn("Firestore save failed, keeping local offline DB", e.message);
      newClient.synced = false;
      await putLocalData('clients', newClient);
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const clientToUpdate = clients.find(c => c.id === id);
    if (!clientToUpdate) return;
    
    const updatedClient = { ...clientToUpdate, ...updates, updatedAt: new Date().toISOString(), synced: isOnline };
    setClients(prev => prev.map(c => c.id === id ? updatedClient : c));
    
    try {
      await putLocalData('clients', updatedClient);

      if (isOnline) {
        await setDoc(doc(db, 'clients', id), updatedClient);
      }
    } catch (e: any) {
       console.warn("Firestore update failed, keeping local offline DB", e.message);
       updatedClient.synced = false;
       await putLocalData('clients', updatedClient);
    }
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    try {
      await deleteLocalData('clients', id);
      
      if (isOnline) {
          await deleteDoc(doc(db, 'clients', id));
      }
    } catch (e: any) {
         console.warn("Firestore delete failed", e.message);
    }
  };

  const addRequest = async (requestData: Partial<ClientRequest>) => {
    const newRequest: ClientRequest = {
      id: `req-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      clientId: requestData.clientId || '',
      description: requestData.description || '',
      status: requestData.status || 'Submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: isOnline
    };

    setRequests(prev => [newRequest, ...prev]);
    try {
      await putLocalData('clientRequests', newRequest);

      if (isOnline) {
          await setDoc(doc(db, 'clientRequests', newRequest.id), newRequest);
      }
    } catch (e: any) {
         console.warn("Firestore Error", e.message);
         newRequest.synced = false;
         await putLocalData('clientRequests', newRequest);
    }
  };

  const updateRequest = async (id: string, updates: Partial<ClientRequest>) => {
    const requestToUpdate = requests.find(r => r.id === id);
    if (!requestToUpdate) return;
    
    const updatedRequest = { ...requestToUpdate, ...updates, updatedAt: new Date().toISOString(), synced: isOnline };
    setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
    
    try {
      await putLocalData('clientRequests', updatedRequest);

      if (isOnline) {
          await setDoc(doc(db, 'clientRequests', id), updatedRequest);
      }
    } catch (e: any) {
         console.warn("Firestore Error", e.message);
         updatedRequest.synced = false;
         await putLocalData('clientRequests', updatedRequest);
    }
  };

  return {
    clients,
    requests,
    addClient,
    updateClient,
    deleteClient,
    addRequest,
    updateRequest
  };
}
