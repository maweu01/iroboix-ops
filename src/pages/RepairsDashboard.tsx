import React, { useState } from "react";
import { Plus, Trash2, Wrench, Search, PackageCheck } from "lucide-react";
import { useRepairs } from "../hooks/useRepairs";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { DashboardLayout } from "../components/layout";

export default function RepairsModule() {
  const { repairs, loading, addRepair, updateRepair, removeRepair } = useRepairs();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !client || !model) return;
    await addRepair({
      title,
      clientId: client,
      deviceModel: model,
      serialNumber: serial,
      status: "open",
      description: ""
    });
    setTitle("");
    setClient("");
    setModel("");
    setSerial("");
    setShowForm(false);
  };

  const filteredRepairs = repairs.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
    r.clientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 flex flex-col">
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search repairs, clients, or models..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Repair Ticket</span>
          </Button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Wrench className="h-4 w-4" /> Log New Repair</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Issue Summary</label>
                  <Input placeholder="e.g. Broken Gimbal Motor" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Client Name / ID</label>
                  <Input placeholder="TechCorp Inc." value={client} onChange={e => setClient(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Drone Model</label>
                  <Input placeholder="DJI Mavic 3 Enterprise" value={model} onChange={e => setModel(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Serial Number</label>
                  <Input placeholder="Optional" value={serial} onChange={e => setSerial(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create Ticket</Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm flex-1">
          {loading ? (
             <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">Loading System Data...</div>
          ) : filteredRepairs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-500 dark:text-slate-400">
              <PackageCheck className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium">No repair tickets found</p>
              <p className="text-xs mt-1">All drone assets are operational or not logged.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-5 py-3 font-semibold">TICKET / DEVICE</th>
                    <th className="px-5 py-3 font-semibold">CLIENT</th>
                    <th className="px-5 py-3 font-semibold">STATUS</th>
                    <th className="px-5 py-3 font-semibold">LOGGED</th>
                    <th className="px-5 py-3 text-right font-semibold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredRepairs.map(repair => (
                    <tr key={repair.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{repair.title}</div>
                          {!repair.synced && <span className="w-2 h-2 rounded-full bg-amber-400" title="Sync Pending" />}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{repair.deviceModel} {repair.serialNumber ? `(${repair.serialNumber})` : ''}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">
                        {repair.clientId}
                      </td>
                      <td className="px-5 py-4">
                        <select 
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded border-none outline-none appearance-none cursor-pointer ${
                            repair.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                            repair.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                            repair.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                            'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                          value={repair.status}
                          onChange={(e) => updateRepair(repair.id, { status: e.target.value as any })}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs font-mono">
                        {new Date(repair.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeRepair(repair.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete Ticket">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
