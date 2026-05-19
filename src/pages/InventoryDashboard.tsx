import React, { useState } from "react";
import { Plus, Trash2, Box, PackageOpen } from "lucide-react";
import { useInventory } from "../hooks/useInventory";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { DashboardLayout } from "../components/layout";

export default function InventoryModule() {
  const { inventory, addInventoryItem, updateInventoryItem, removeInventoryItem } = useInventory();
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"drone"|"battery"|"part"|"accessory">("part");
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<"new"|"good"|"fair"|"poor"|"broken">("new");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await addInventoryItem({
      name, category, quantity: qty, condition, location: "Main Depot"
    });
    setName("");
    setQty(1);
    setCondition("new");
    setShowForm(false);
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Fleet & Inventory</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Manage drones and spare parts</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Item</span>
          </Button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Box className="h-4 w-4" /> New Inventory Item</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Item Name</label>
                  <Input placeholder="e.g. Inspire 2 Propellers" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Category</label>
                  <select 
                    className="flex h-10 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                    value={category} onChange={e => setCategory(e.target.value as any)}>
                    <option value="drone">Drone</option>
                    <option value="battery">Battery</option>
                    <option value="part">Spare Part</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Quantity</label>
                  <Input type="number" min={0} value={qty} onChange={e => setQty(Number(e.target.value))} required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Save Item</Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm flex-1">
          {inventory.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-500 dark:text-slate-400">
              <PackageOpen className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium">Inventory is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 h-full overflow-y-auto">
              {inventory.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col gap-3 shadow-sm group">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeInventoryItem(item.id)} className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">QTY: {item.quantity}</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                    <select 
                      className="bg-transparent font-bold capitalize text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                      value={item.condition}
                      onChange={(e) => updateInventoryItem(item.id, { condition: e.target.value as any })}
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="broken">Broken</option>
                    </select>
                    {!item.synced && <span className="w-2 h-2 rounded-full bg-amber-400" title="Sync Pending" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
