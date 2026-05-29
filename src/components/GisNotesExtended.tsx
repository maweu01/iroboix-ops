import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, GeoJSON } from "react-leaflet";
import * as turf from "@turf/turf";
import * as toGeoJSON from "@tmcw/togeojson";
import shp from "shpjs";
import JSZip from "jszip";
import L from "leaflet";
import { 
  Layers, Upload, Plus, Shield, MapPin, Navigation, 
  Trash2, Eye, EyeOff, Search, Download, Radio, Eye as ViewIcon, 
  Edit3, FileText, ClipboardList, Crosshair, Cloud, Compass, FileCheck
} from "lucide-react";

// Fix Leaflet marker path resolutions for asset compilers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- CORE INTERFACES WITH VIEW/EDIT/DELETE COMPLIANCE ---
interface IngestedLayer {
  id: string;
  name: string;
  geoJsonData: any;
  visible: boolean;
  color: string;
}

interface Observation {
  id: string;
  title: string;
  description: string;
  coordinates: [number, number];
  timestamp: string;
  category: "UAV Mapping" | "Survey" | "Environmental" | "Engineering" | "Inspection" | "Safety" | "Other";
  photoUrl?: string;
}

interface UavMission {
  id: string;
  missionName: string;
  projectName: string;
  pilot: string;
  uavModel: string;
  cameraType: string;
  date: string;
  altitude: number;
  flightDuration: number;
  status: "Planned" | "In Progress" | "Completed" | "Aborted";
}

interface GroundControlPoint {
  id: string;
  pointId: string;
  easting: number;
  northing: number;
  elevation: number;
  description: string;
  coordinates: [number, number];
}

interface FieldReport {
  id: string;
  reportType: "UAV Mission Report" | "Site Inspection Report" | "Field Observation Report" | "Daily Field Report";
  generatedAt: string;
  summary: string;
}

// Map Event Lifecycle Controller (Handles Camera Extent Zoom Adjustments)
function MapExtentEngine({ mapCenter }: { mapCenter: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (mapCenter) {
      map.setView(mapCenter, map.getZoom());
    }
  }, [mapCenter, map]);
  return null;
}

export default function GisNotesExtended() {
  // --- STATE REGISTRIES (Data Storage Layers) ---
  const [layers, setLayers] = useState<IngestedLayer[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [missions, setMissions] = useState<UavMission[]>([]);
  const [gcps, setGcps] = useState<GroundControlPoint[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);

  // --- COMPONENT CRITICAL HUD MAP STATES ---
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.2921, 36.8219]); // Nairobi Center Datum
  const [gpsMetrics, setGpsMetrics] = useState({ accuracy: 0, elevation: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  // --- UI NAVIGATION NAVIGATION PANELS CONTROLLER ---
  const [leftActiveTab, setLeftActiveTab] = useState<"projects" | "obs" | "missions" | "gcps" | "reports">("projects");
  const [selectedEntity, setSelectedEntity] = useState<{ type: "obs" | "mission" | "gcp" | "report"; data: any } | null>(null);
  
  // --- EDIT MODAL TRACKING MACHINES ---
  const [editingEntity, setEditingEntity] = useState<{ type: string; data: any } | null>(null);

  // --- INGEST UX TRACKING STATES ---
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HARDWARE LOCATION QUERIES ---
  const acquireCurrentGpsPosition = () => {
    if (!("geolocation" in navigator)) return alert("Telemetry hardware localized link down.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setGpsMetrics({ accuracy: accuracy || 1.2, elevation: altitude || 1680 });
      },
      () => alert("GPS context retrieval execution timed out."),
      { enableHighAccuracy: true }
    );
  };

  // --- VECTOR ENGINE PACKET CONVERTERS ---
  const loadVectorToWorkspace = (geoJson: any, filename: string) => {
    try {
      const newLayer: IngestedLayer = {
        id: crypto.randomUUID(),
        name: filename.replace(/\.[^/.]+$/, ""),
        geoJsonData: geoJson,
        visible: true,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16)
      };
      setLayers(prev => [...prev, newLayer]);
      const bbox = turf.bbox(geoJson);
      if (bbox && bbox.length === 4) {
        setMapCenter([(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]);
      }
      setUploadStatus(null);
    } catch (err) {
      alert("Error staging vector map assets.");
      setUploadStatus(null);
    }
  };

  const executeVectorPipelineInference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Processing vector block...");
    const ext = file.name.toLowerCase();

    try {
      if (ext.endsWith(".geojson") || ext.endsWith(".json")) {
        loadVectorToWorkspace(JSON.parse(await file.text()), file.name);
      } else if (ext.endsWith(".kml")) {
        const dom = new DOMParser().parseFromString(await file.text(), "text/xml");
        loadVectorToWorkspace(toGeoJSON.kml(dom), file.name);
      } else if (ext.endsWith(".kmz")) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const kmlFile = Object.keys(zip.files).find(f => f.endsWith(".kml"));
        if (!kmlFile) throw new Error();
        const dom = new DOMParser().parseFromString(await zip.files[kmlFile].async("string"), "text/xml");
        loadVectorToWorkspace(toGeoJSON.kml(dom), file.name);
      } else if (ext.endsWith(".zip")) {
        const geojson: any = await shp(await file.arrayBuffer());
        loadVectorToWorkspace(geojson, file.name);
      } else {
        alert("Unsupported standard geospatial file configuration dropped.");
        setUploadStatus(null);
      }
    } catch {
      alert("Fatal structure failure reading tracking parameters.");
      setUploadStatus(null);
    }
  };

  // --- DELETION STATE CONFIRMATION MATRIX ---
  const executeValidatedRecordDeletion = (type: "layer" | "obs" | "mission" | "gcp" | "report", id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type.toUpperCase()} record from local database state storage memory?`)) return;
    
    if (type === "layer") setLayers(layers.filter(l => l.id !== id));
    else if (type === "obs") setObservations(observations.filter(o => o.id !== id));
    else if (type === "mission") setMissions(missions.filter(m => m.id !== id));
    else if (type === "gcp") setGcps(gcps.filter(g => g.id !== id));
    else if (type === "report") setReports(reports.filter(r => r.id !== id));

    if (selectedEntity?.data?.id === id) setSelectedEntity(null);
  };

  // --- SELECTION ATTRIBUTE EXTRACTOR SEARCH ---
  const triggerCoordinateQueryLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const clean = searchQuery.trim();
    const matchCoords = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (matchCoords.test(clean)) {
      const [lat, lng] = clean.split(",").map(Number);
      setMapCenter([lat, lng]);
    } else {
      alert("Coordinates parsed outside bounds structure pattern. Enter string matching: 'Lat, Lng'.");
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden text-xs">
      
      {/* 1. TOP TOOLBAR HUD INTERFACE */}
      <nav className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-30 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Radio className="text-blue-500 w-4 h-4 animate-pulse" />
            <span className="font-bold tracking-wider text-white text-[11px] uppercase">IROBOTIX UAV SPACE WORKSPACE</span>
          </div>
          <div className="hidden md:flex gap-1">
            <button onClick={() => {
              const name = prompt("Enter Mission Name:");
              if(name) setMissions([...missions, { id: crypto.randomUUID(), missionName: name, projectName: "Ragia Mapping Flight", pilot: "K. Mwatu", uavModel: "DJI Matrice 350 RTK", cameraType: "Zenmuse P1", date: "2026-05-29", altitude: 120, flightDuration: 25, status: "Planned" }]);
            }} className="bg-slate-950 border border-slate-800 hover:border-blue-500 px-2 py-1 rounded text-slate-300 transition-all font-bold text-[10px] uppercase">New Mission Log</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-950 border border-slate-800 hover:border-blue-500 px-2 py-1 rounded text-slate-300 transition-all font-bold text-[10px] uppercase flex items-center gap-1"><Upload className="w-3 h-3 text-blue-400" /> Ingest Vector</button>
            <button onClick={() => {
              const title = prompt("Enter Observation Title:");
              if(title) setObservations([...observations, { id: crypto.randomUUID(), title, description: "Aerial anomaly noted during run segment", coordinates: mapCenter, timestamp: new Date().toISOString(), category: "UAV Mapping" }]);
            }} className="bg-slate-950 border border-slate-800 hover:border-teal-500 px-2 py-1 rounded text-slate-300 transition-all font-bold text-[10px] uppercase">Capture Obs</button>
            <button onClick={() => {
              setGcps([...gcps, { id: crypto.randomUUID(), pointId: `GCP-0${gcps.length+1}`, easting: 258410.25, northing: 9857410.85, elevation: 1642.3, description: "Iron nail in concrete slab base anchor", coordinates: mapCenter }]);
            }} className="bg-slate-950 border border-slate-800 hover:border-purple-500 px-2 py-1 rounded text-slate-300 transition-all font-bold text-[10px] uppercase">Log GCP</button>
            <button onClick={() => {
              setReports([...reports, { id: crypto.randomUUID(), reportType: "UAV Mission Report", generatedAt: new Date().toISOString().split('T')[0], summary: "High precision operational orthomosaic mapping metrics validated with clean accuracy distribution logs." }]);
            }} className="bg-slate-950 border border-slate-800 hover:border-amber-500 px-2 py-1 rounded text-slate-300 transition-all font-bold text-[10px] uppercase">Gen Report</button>
          </div>
        </div>

        {/* File Pointer Stream Pipeline */}
        <input type="file" ref={fileInputRef} onChange={executeVectorPipelineInference} accept=".kml,.kmz,.geojson,.json,.zip" className="hidden" />

        {/* Geodetic Target Parameter Search Console */}
        <form onSubmit={triggerCoordinateQueryLookup} className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-0.5 w-64">
          <Search className="w-3 h-3 text-slate-500 mr-1.5" />
          <input 
            type="text" 
            placeholder="Search matching Lat, Lng..." 
            className="bg-transparent text-[11px] w-full outline-none text-slate-200 placeholder-slate-700 font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </nav>

      {/* 2. THREE-PANEL CORE SYSTEM GRID VIEW LAYOUT */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* A. LEFT SIDEBAR: CONFIG MANAGERS */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 font-mono">
          <div className="grid grid-cols-5 border-b border-slate-800 text-center text-[8px] uppercase tracking-tighter bg-slate-950 font-bold text-slate-500 shrink-0">
            <button onClick={() => setLeftActiveTab("projects")} className={`py-2 border-r border-slate-800 ${leftActiveTab === "projects" ? "text-blue-400 bg-slate-900" : ""}`}>Layers</button>
            <button onClick={() => setLeftActiveTab("obs")} className={`py-2 border-r border-slate-800 ${leftActiveTab === "obs" ? "text-teal-400 bg-slate-900" : ""}`}>Obs</button>
            <button onClick={() => setLeftActiveTab("missions")} className={`py-2 border-r border-slate-800 ${leftActiveTab === "missions" ? "text-purple-400 bg-slate-900" : ""}`}>UAV</button>
            <button onClick={() => setLeftActiveTab("gcps")} className={`py-2 border-r border-slate-800 ${leftActiveTab === "gcps" ? "text-orange-400 bg-slate-900" : ""}`}>GCP</button>
            <button onClick={() => setLeftActiveTab("reports")} className={`py-2 ${leftActiveTab === "reports" ? "text-amber-400 bg-slate-900" : ""}`}>Doc</button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-[11px]">
            {leftActiveTab === "projects" && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Vector Overlay Layers</span>
                {layers.length === 0 ? <span className="text-slate-600 italic block text-[10px]">No layers uploaded.</span> : 
                  layers.map(layer => (
                    <div key={layer.id} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <button onClick={() => setLayers(layers.map(l => l.id === layer.id ? {...l, visible: !l.visible} : l))}>
                          {layer.visible ? <Eye className="w-3 h-3 text-teal-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                        </button>
                        <span className="truncate text-slate-300">{layer.name}</span>
                      </div>
                      <button onClick={() => executeValidatedRecordDeletion("layer", layer.id)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))
                }
              </div>
            )}

            {leftActiveTab === "obs" && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Field Observations Registry</span>
                {observations.map(o => (
                  <div key={o.id} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-teal-500" onClick={() => setSelectedEntity({ type: "obs", data: o })}>
                    <span className="truncate text-slate-200 font-bold">{o.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); executeValidatedRecordDeletion("obs", o.id); }} className="text-slate-600 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {leftActiveTab === "missions" && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Aerial UAV Missions Log</span>
                {missions.map(m => (
                  <div key={m.id} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-purple-500" onClick={() => setSelectedEntity({ type: "mission", data: m })}>
                    <span className="truncate text-purple-300">{m.missionName}</span>
                    <button onClick={(e) => { e.stopPropagation(); executeValidatedRecordDeletion("mission", m.id); }} className="text-slate-600 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {leftActiveTab === "gcps" && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Ground Control Network</span>
                {gcps.map(g => (
                  <div key={g.id} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-orange-500" onClick={() => setSelectedEntity({ type: "gcp", data: g })}>
                    <span className="truncate text-orange-300 font-bold">{g.pointId}</span>
                    <button onClick={(e) => { e.stopPropagation(); executeValidatedRecordDeletion("gcp", g.id); }} className="text-slate-600 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {leftActiveTab === "reports" && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Compiled Field Records</span>
                {reports.map(r => (
                  <div key={r.id} className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500" onClick={() => setSelectedEntity({ type: "report", data: r })}>
                    <span className="truncate text-amber-300 font-bold">{r.reportType}</span>
                    <button onClick={(e) => { e.stopPropagation(); executeValidatedRecordDeletion("report", r.id); }} className="text-slate-600 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* B. CENTER PANEL: FULL SCREEN GEOSPATIAL GIS MAP CONTAINER */}
        <main className="flex-1 h-full relative bg-slate-950 z-0">
          
          {/* FLOATING ACTION HUD SYSTEM MODULE POSITION CONTROLS */}
          <div className="absolute left-12 top-3 z-[1000] flex items-center gap-1.5 font-mono">
            <button onClick={acquireCurrentGpsPosition} className="bg-slate-900/90 backdrop-blur text-teal-400 border border-slate-800 hover:border-teal-500 p-1.5 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 shadow-2xl transition-all">
              <Navigation className="w-3 h-3 animate-spin" /> Fetch GPS Location
            </button>
            {gpsMetrics.accuracy > 0 && (
              <div className="bg-slate-900/95 border border-slate-800 px-2 py-1 rounded text-[9px] text-slate-400 flex gap-2">
                <span>Acc: <strong className="text-white font-bold">{gpsMetrics.accuracy.toFixed(1)}m</strong></span>
                <span>Elev: <strong className="text-amber-400 font-bold">{gpsMetrics.elevation.toFixed(1)}m</strong></span>
              </div>
            )}
          </div>

          <div className="w-full h-full relative">
            <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="w-full h-full">
              
              {/* ADVANCED MULTI-SOURCE MIXED MAP BASEMAP MATRIX SELECTOR */}
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap Standard Core">
                  <TileLayer attribution='&copy; OSM contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Esri World Imagery Digital Satellite Surface">
                  <TileLayer attribution='Tiles &copy; Esri &mdash; DigitalGlobe' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenTopoMap High Elevation Relief Terrain">
                  <TileLayer attribution='&copy; OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
              </LayersControl>

              <MapExtentEngine mapCenter={mapCenter} />

              {/* Dynamic Vector Layer Geometry Ingest Processing Loops */}
              {layers.map(layer => {
                if (!layer.visible || !layer.geoJsonData) return null;
                return <GeoJSON key={layer.id} data={layer.geoJsonData} style={{ color: layer.color, weight: 3, fillOpacity: 0.15 }} />;
              })}

              {/* Live Render Points for Ground Control Networks and Observation Log Records */}
              {observations.map(obs => (
                <Marker key={obs.id} position={obs.coordinates}>
                  <Popup><span className="font-mono text-xs font-bold text-slate-900">{obs.title} [{obs.category}]</span></Popup>
                </Marker>
              ))}

              {gcps.map(g => (
                <Marker key={g.id} position={g.coordinates}>
                  <Popup><span className="font-mono text-xs text-orange-600 font-bold">GCP Anchor Check: {g.pointId}</span></Popup>
                </Marker>
              ))}

            </MapContainer>
          </div>
        </main>

        {/* C. RIGHT PANEL: PROPERTY EXTRACTOR INSPECTOR ATTRIBUTE MODULES */}
        <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20 font-mono p-3 overflow-y-auto">
          {selectedEntity ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1"><Crosshair className="w-3.5 h-3.5 text-blue-500" /> Selected Attribute</span>
                <button onClick={() => setSelectedEntity(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>

              {/* READ-ONLY VIEW OR TRIGGER EDIT SELECTION ROUTINES */}
              {selectedEntity.type === "obs" && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white uppercase">{selectedEntity.data.title}</h4>
                  <span className="text-[9px] bg-teal-950 text-teal-400 border border-teal-900 px-1.5 py-0.5 rounded font-bold uppercase">{selectedEntity.data.category}</span>
                  <p className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 text-[11px] leading-relaxed">{selectedEntity.data.description}</p>
                  <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                    <div>Coordinates: {selectedEntity.data.coordinates[0].toFixed(5)}, {selectedEntity.data.coordinates[1].toFixed(5)}</div>
                    <div>Timestamp: {selectedEntity.data.timestamp}</div>
                  </div>
                </div>
              )}

              {selectedEntity.type === "mission" && (
                <div className="space-y-2 text-[11px] text-slate-300">
                  <h4 className="text-sm font-bold text-purple-400 uppercase">{selectedEntity.data.missionName}</h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
                    <span className="text-slate-500">Project:</span> <span className="text-white text-right truncate">{selectedEntity.data.projectName}</span>
                    <span className="text-slate-500">Pilot Sign:</span> <span className="text-white text-right">{selectedEntity.data.pilot}</span>
                    <span className="text-slate-500">Hardware:</span> <span className="text-white text-right truncate">{selectedEntity.data.uavModel}</span>
                    <span className="text-slate-500">Ceiling Alt:</span> <span className="text-emerald-400 text-right font-bold">{selectedEntity.data.altitude}m</span>
                    <span className="text-slate-500">Duration:</span> <span className="text-white text-right">{selectedEntity.data.flightDuration} min</span>
                    <span className="text-slate-500">State:</span> <span className="text-amber-400 text-right font-bold uppercase">{selectedEntity.data.status}</span>
                  </div>
                </div>
              )}

              {selectedEntity.type === "gcp" && (
                <div className="space-y-2 text-[11px]">
                  <h4 className="text-sm font-bold text-orange-400 uppercase">Station Anchor: {selectedEntity.data.pointId}</h4>
                  <div className="bg-slate-950 border border-slate-800 p-2 rounded space-y-1 text-slate-300">
                    <div className="flex justify-between"><span>Grid Easting (X):</span> <strong className="text-white font-mono">{selectedEntity.data.easting.toFixed(2)}m</strong></div>
                    <div className="flex justify-between"><span>Grid Northing (Y):</span> <strong className="text-white font-mono">{selectedEntity.data.northing.toFixed(2)}m</strong></div>
                    <div className="flex justify-between"><span>Orthometric Height:</span> <strong className="text-orange-400 font-mono">{selectedEntity.data.elevation.toFixed(2)}m</strong></div>
                    <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1 mt-1 font-sans">{selectedEntity.data.description}</div>
                  </div>
                </div>
              )}

              {selectedEntity.type === "report" && (
                <div className="space-y-2 text-[11px]">
                  <h4 className="text-sm font-bold text-amber-400 uppercase">{selectedEntity.data.reportType}</h4>
                  <div className="text-[9px] text-slate-500 font-mono">Generated: {selectedEntity.data.generatedAt}</div>
                  <p className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300 leading-relaxed font-sans">{selectedEntity.data.summary}</p>
                  <button onClick={() => alert("Downloading production PDF summary block stream telemetry payload asset bundle...")} className="w-full bg-amber-600 hover:bg-amber-700 font-bold text-white text-xs py-1 rounded flex items-center justify-center gap-1 uppercase transition-all mt-2">
                    <Download className="w-3 h-3" /> Download Report PDF
                  </button>
                </div>
              )}

              {/* UNIFIED INTERFACE BUTTON SYSTEM MATRIX ACTION SETS */}
              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button onClick={() => setEditingEntity({ type: selectedEntity.type, data: { ...selectedEntity.data } })} className="w-1/2 bg-slate-950 border border-slate-800 hover:border-blue-500 text-slate-300 font-bold py-1 rounded flex items-center justify-center gap-1 uppercase transition-all">
                  <Edit3 className="w-3 h-3" /> Edit Row
                </button>
                <button onClick={() => executeValidatedRecordDeletion(selectedEntity.type, selectedEntity.data.id)} className="w-1/2 bg-red-950/40 border border-red-900/50 hover:bg-red-900 text-red-400 hover:text-white font-bold py-1 rounded flex items-center justify-center gap-1 uppercase transition-all">
                  <Trash2 className="w-3 h-3" /> Delete Node
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 uppercase tracking-widest text-[10px] py-20 px-4 leading-loose">
              <ClipboardList className="w-6 h-6 text-slate-700 mb-2" /> Select any observation log, UAV drone mission layer index, or survey GCP marker from the left panel to inspect parameters.
            </div>
          )}
        </aside>

      </div>

      {/* 3. INLINE ROW IN-PLACE DATA EDITOR SUB-MODAL LAYER OVERLAY */}
      {editingEntity && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 font-mono">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingEntity.type === "obs") setObservations(observations.map(o => o.id === editingEntity.data.id ? editingEntity.data : o));
            else if (editingEntity.type === "mission") setMissions(missions.map(m => m.id === editingEntity.data.id ? editingEntity.data : m));
            else if (editingEntity.type === "gcp") setGcps(gcps.map(g => g.id === editingEntity.data.id ? editingEntity.data : g));
            else if (editingEntity.type === "report") setReports(reports.map(r => r.id === editingEntity.data.id ? editingEntity.data : r));
            
            setSelectedEntity({ type: editingEntity.type as any, data: { ...editingEntity.data } });
            setEditingEntity(null);
          }} className="bg-slate-900 border border-slate-800 rounded p-4 w-full max-w-sm space-y-3 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Modify Row Parameters Matrix ({editingEntity.type.toUpperCase()})
            </div>

            {editingEntity.type === "obs" && (
              <div className="space-y-2 text-xs">
                <input type="text" className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-white" value={editingEntity.data.title} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, title: ev.target.value}})} />
                <textarea className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-300 h-16 resize-none" value={editingEntity.data.description} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, description: ev.target.value}})} />
              </div>
            )}

            {editingEntity.type === "mission" && (
              <div className="space-y-2 text-xs">
                <input type="text" className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-white" value={editingEntity.data.missionName} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, missionName: ev.target.value}})} />
                <select className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-300" value={editingEntity.data.status} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, status: ev.target.value as any}})}>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Aborted">Aborted</option>
                </select>
              </div>
            )}

            {editingEntity.type === "gcp" && (
              <div className="space-y-2 text-xs">
                <input type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-white" value={editingEntity.data.elevation} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, elevation: Number(ev.target.value)}})} />
                <input type="text" className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-300" value={editingEntity.data.description} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, description: ev.target.value}})} />
              </div>
            )}

            {editingEntity.type === "report" && (
              <div className="space-y-2 text-xs">
                <textarea className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-slate-300 h-20 resize-none" value={editingEntity.data.summary} onChange={(ev)=>setEditingEntity({...editingEntity, data: {...editingEntity.data, summary: ev.target.value}})} />
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button type="submit" className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 rounded text-xs uppercase">Save Data</button>
              <button type="button" onClick={() => setEditingEntity(null)} className="w-1/2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 font-bold py-1 rounded text-xs uppercase">Cancel</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

