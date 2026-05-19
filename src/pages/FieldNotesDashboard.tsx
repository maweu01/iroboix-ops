import React, { useState, useEffect } from "react";
import { Plus, Trash2, MapPin, Navigation2, Map as MapIcon, Compass } from "lucide-react";
import { useFieldNotes } from "../hooks/useFieldNotes";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { DashboardLayout } from "../components/layout";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ setPos }: { setPos: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function FieldNotesModule() {
  const { notes, addNote, removeNote } = useFieldNotes();
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [locationName, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high" | "critical">("low");
  const [siteStatus, setSiteStatus] = useState<"safe" | "monitor" | "action_required" | "closed">("safe");
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.warn("Geolocation denied or unavailable");
        }
      );
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !note) return;
    await addNote({ 
      title, 
      note, 
      locationName, 
      latitude: latitude || undefined, 
      longitude: longitude || undefined,
      riskLevel,
      siteStatus
    });
    setTitle("");
    setNote("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setShowForm(false);
  };

  const handleMapClick = (pos: [number, number]) => {
    if (showForm) {
      setLatitude(Number(pos[0].toFixed(6)));
      setLongitude(Number(pos[1].toFixed(6)));
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(Number(position.coords.latitude.toFixed(6)));
          setLongitude(Number(position.coords.longitude.toFixed(6)));
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          alert("Could not get location. Please enable GPS.");
        }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 flex flex-col h-full">
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-blue-500" />
              GIS Field Operations
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Live Maps & Coordination</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Observation</span>
          </Button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
          {/* Notes List */}
          <div className="flex-[1.2] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
            {showForm && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-3 overflow-y-auto">
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Site Name" value={title} onChange={e => setTitle(e.target.value)} required />
                    <Input placeholder="Location Ref" value={locationName} onChange={e => setLocation(e.target.value)} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <Input type="number" step="any" placeholder="Latitude" value={latitude} onChange={e => setLatitude(Number(e.target.value))} />
                    </div>
                    <div className="relative">
                      <Input type="number" step="any" placeholder="Longitude" value={longitude} onChange={e => setLongitude(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="w-full text-xs" onClick={getCurrentLocation}>
                    <Compass className="h-3 w-3 mr-2" /> Use Current GPS
                  </Button>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <select value={riskLevel} onChange={e => setRiskLevel(e.target.value as any)} className="flex h-10 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900">
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                      <option value="critical">Critical Risk</option>
                    </select>
                    <select value={siteStatus} onChange={e => setSiteStatus(e.target.value as any)} className="flex h-10 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900">
                      <option value="safe">Status: Safe</option>
                      <option value="monitor">Status: Monitor</option>
                      <option value="action_required">Status: Action Req</option>
                      <option value="closed">Status: Closed</option>
                    </select>
                  </div>

                  <textarea 
                    className="flex w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 font-mono resize-none h-20"
                    placeholder="Observation log..." 
                    value={note} onChange={e => setNote(e.target.value)} required 
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto w-full p-4 space-y-4">
              {notes.length === 0 && !showForm ? (
                <div className="text-center py-12 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  No observations recorded.
                </div>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm flex flex-col cursor-pointer hover:border-blue-500 transition-colors" onClick={() => { if(note.latitude && note.longitude) setMapCenter([note.latitude, note.longitude]) }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{note.title}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{note.riskLevel} | {note.siteStatus}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeNote(note.id); }} className="h-6 w-6 p-0 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-mono mb-4 whitespace-pre-wrap">{note.note}</p>
                    <div className="mt-auto flex flex-col text-xs text-slate-500 gap-1">
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {note.locationName || 'Unknown Location'}</div>
                      <div className="flex justify-between items-center w-full">
                         <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded">
                          {note.latitude ? `${note.latitude}, ${note.longitude}` : "No Coordinates"}
                         </span>
                         <span className="font-mono text-[10px]">{new Date(note.createdAt).toLocaleDateString()} {!note.synced && '*'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="flex-[1.8] bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden shadow-inner hidden md:block z-0">
             <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler setPos={handleMapClick} />
                
                {/* Temporary marker when clicking, if form is open */}
                {showForm && latitude && longitude && (
                  <Marker position={[latitude as number, longitude as number]} opacity={0.5}>
                    <Popup>Draft Location</Popup>
                  </Marker>
                )}

                {/* Saved observation markers */}
                {notes.map(note => (
                  note.latitude && note.longitude ? (
                    <Marker key={note.id} position={[note.latitude, note.longitude]}>
                      <Popup>
                        <div className="font-bold">{note.title}</div>
                        <div className="text-xs">{note.riskLevel}</div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
            </MapContainer>
            {showForm && (
                <div className="absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded shadow-lg p-2 text-xs font-mono font-bold text-blue-600 animate-pulse border border-blue-500/30">
                  Click map to set coordinate
                </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
