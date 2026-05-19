import React, { useState, useMemo } from "react";
import { DashboardLayout } from "../components/layout";
import { Building2, Search, Plus, MapPin, Mail, Phone, Clock, FileText, ChevronRight, X, Briefcase, Activity } from "lucide-react";
import { useClients } from "../hooks/useClients";
import { useRepairs } from "../hooks/useRepairs";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Client, ClientRequest } from "../services/db";

export default function ClientsPortal() {
  const { clients, requests, addClient, updateClient, addRequest } = useClients();
  const { repairs } = useRepairs();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientFormId, setClientFormId] = useState<string | null>(null);
  const [clientFormData, setClientFormData] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({ description: "" });

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientFormId) {
      await updateClient(clientFormId, clientFormData);
      if (selectedClient && selectedClient.id === clientFormId) {
        setSelectedClient({ ...selectedClient, ...clientFormData });
      }
    } else {
      await addClient(clientFormData);
    }
    setShowClientForm(false);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    await addRequest({
      clientId: selectedClient.id,
      description: requestFormData.description,
      status: 'Submitted'
    });
    setRequestFormData({ description: "" });
    setShowRequestForm(false);
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-500" />
              Client Directory
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Manage accounts and service requests</p>
          </div>
          {!selectedClient && (
            <Button onClick={() => {
              setClientFormId(null);
              setClientFormData({ name: "", phone: "", email: "", address: "", notes: "" });
              setShowClientForm(true);
            }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> New Client
            </Button>
          )}
        </div>

        {selectedClient ? (
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-y-auto pb-6">
            {/* Profile Sidebar */}
            <div className="w-full md:w-1/3 space-y-6">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative">
                 <button onClick={() => setSelectedClient(null)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <ChevronRight className="h-5 w-5 rotate-180" />
                 </button>
                 <div className="flex flex-col items-center text-center mt-6">
                   <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-2xl shadow-inner mb-4">
                     {selectedClient.name.substring(0, 2).toUpperCase()}
                   </div>
                   <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">{selectedClient.name}</h3>
                   <p className="text-xs font-mono text-slate-500 mt-1 uppercase">ID: {selectedClient.id}</p>
                 </div>
                 
                 <div className="mt-8 space-y-4">
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                     <Phone className="h-4 w-4 text-slate-400" />
                     <span>{selectedClient.phone}</span>
                   </div>
                   {selectedClient.email && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{selectedClient.email}</span>
                    </div>
                   )}
                   {selectedClient.address && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedClient.address}</span>
                    </div>
                   )}
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" className="w-full" onClick={() => {
                        setClientFormId(selectedClient.id);
                        setClientFormData({
                          name: selectedClient.name,
                          phone: selectedClient.phone,
                          email: selectedClient.email || "",
                          address: selectedClient.address || "",
                          notes: selectedClient.notes || ""
                        });
                        setShowClientForm(true);
                    }}>
                      Edit Profile
                    </Button>
                 </div>
               </div>

               {selectedClient.notes && (
                 <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
                   <h4 className="font-bold text-amber-800 dark:text-amber-500 text-sm flex items-center gap-2 mb-2">
                     <FileText className="h-4 w-4" /> Internal Notes
                   </h4>
                   <p className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap font-mono">
                     {selectedClient.notes}
                   </p>
                 </div>
               )}
            </div>

            {/* Activity & History */}
            <div className="w-full md:w-2/3 space-y-6">
              {/* Requests Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-500" />
                      Service Requests
                    </h3>
                    <Button size="sm" onClick={() => setShowRequestForm(true)}>New Request</Button>
                 </div>
                 <div className="p-0">
                    {requests.filter(r => r.clientId === selectedClient.id).length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No active service requests.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                         {requests.filter(r => r.clientId === selectedClient.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(req => (
                           <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <div>
                               <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{req.description}</p>
                               <div className="text-xs text-slate-500 font-mono mt-2">
                                 {new Date(req.createdAt).toLocaleString()}
                               </div>
                             </div>
                             <div className="shrink-0">
                               <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase
                                  ${req.status === 'Submitted' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 
                                  req.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  req.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                               `}>
                                 {req.status}
                               </span>
                             </div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>

              {/* Repairs History */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-indigo-500" />
                      Repair History
                    </h3>
                 </div>
                 <div className="p-0">
                    {repairs.filter(r => r.clientId === selectedClient.id).length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No repair ticket history.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                         {repairs.filter(r => r.clientId === selectedClient.id).map(repair => (
                           <div key={repair.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <div>
                               <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                 {repair.title} <span className="text-xs font-normal text-slate-500 ml-2">({repair.deviceModel})</span>
                               </div>
                               <div className="text-xs text-slate-500 mt-1 line-clamp-1">{repair.description}</div>
                               <div className="text-[10px] text-slate-400 font-mono mt-2 uppercase">
                                 Ticket ID: {repair.id} · {new Date(repair.createdAt).toLocaleDateString()}
                               </div>
                             </div>
                             <div className="shrink-0 flex items-center gap-3">
                               <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">
                                 {repair.status}
                               </div>
                             </div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden min-h-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search clients by name, phone, or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              {filteredClients.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                     <Building2 className="h-8 w-8" />
                   </div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2">No clients found</h3>
                   <p className="text-sm text-slate-500">
                     {searchTerm ? "No clients match your search criteria." : "No clients registered yet. Add your first client to start tracking service history."}
                   </p>
                   {!searchTerm && (
                     <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowClientForm(true)}>
                       <Plus className="h-4 w-4 mr-2" /> Add Client
                     </Button>
                   )}
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Client</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800">Contact</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800 hidden md:table-cell">Location</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredClients.map(client => (
                      <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setSelectedClient(client)}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{client.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase">ID: {client.id.split('-')[1]}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <div>{client.phone}</div>
                          {client.email && <div className="text-xs text-slate-400 truncate max-w-[150px]">{client.email}</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">
                          {client.address ? <span className="line-clamp-1 max-w-xs">{client.address}</span> : <span className="text-slate-400 italic">Unspecified</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      {showClientForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-full">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg">{clientFormId ? 'Edit Client Profile' : 'New Client Registration'}</h3>
              <button onClick={() => setShowClientForm(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-4 flex-1 overflow-y-auto space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization / Name <span className="text-red-500">*</span></label>
                 <Input required placeholder="Acme Logistics, Inc." value={clientFormData.name} onChange={e => setClientFormData({...clientFormData, name: e.target.value})} />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Phone <span className="text-red-500">*</span></label>
                 <Input required type="tel" placeholder="+1 (555) 000-0000" value={clientFormData.phone} onChange={e => setClientFormData({...clientFormData, phone: e.target.value})} />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Contact</label>
                 <Input type="email" placeholder="contact@acme.com" value={clientFormData.email} onChange={e => setClientFormData({...clientFormData, email: e.target.value})} />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing / Site Address</label>
                 <textarea 
                    className="flex w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 resize-none h-20"
                    placeholder="123 Industrial Pkwy..." value={clientFormData.address} onChange={e => setClientFormData({...clientFormData, address: e.target.value})} 
                  />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Internal Notes</label>
                 <textarea 
                    className="flex w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 resize-none h-24 font-mono text-xs"
                    placeholder="SLA details, special requirements..." value={clientFormData.notes} onChange={e => setClientFormData({...clientFormData, notes: e.target.value})} 
                  />
               </div>
               
               <div className="pt-4 flex justify-end gap-3">
                 <Button type="button" variant="ghost" onClick={() => setShowClientForm(false)}>Cancel</Button>
                 <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Profile</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Request Form Modal */}
      {showRequestForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg">New Service Request</h3>
              <button onClick={() => setShowRequestForm(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRequest} className="p-4 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Issue Description / Request <span className="text-red-500">*</span></label>
                 <textarea 
                    required
                    className="flex w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 resize-none h-32"
                    placeholder="Describe the service requested or equipment issue..." 
                    value={requestFormData.description} onChange={e => setRequestFormData({ description: e.target.value})} 
                  />
               </div>
               
               <div className="pt-4 flex justify-end gap-3">
                 <Button type="button" variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                 <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Submit Request</Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
