import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useGisSync } from "../hooks/useGisSync";
import SyncStatusBar from "./SyncStatusBar";
import toGeoJSON from "@tmcw/togeojson";
import shp from "shpjs";
import * as turf from "@turf/turf";

const aoiLayerStyle = {
  color: "#06b6d4", // Cyan-500
  weight: 2.5,
  fillColor: "#06b6d4",
  fillOpacity: 0.15
};

// Nairobi Central baseline operational parameters
const NAIROBI_COORDS: [number, number] = [-1.286389, 36.817223];
const DEFAULT_ZOOM = 13;

// Tracks map state updates seamlessly to preserve locations across tabs
function MapViewTracker({ onMove }: { onMove: (lat: number, lng: number, zoom: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMove(center.lat, center.lng, map.getZoom());
    }
  });
  return null;
}

// Custom internal layer handling WebGL/Canvas Leaflet.heat rendering natively
function HeatmapLayer({ points, intensity, opacity }: { points: any[], intensity: number, opacity: number }) {
  const map = useMapEvents({});
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    const heatPoints = points
      .filter(p => p.location?.lat && p.location?.lng)
      .map(p => [p.location.lat, p.location.lng, intensity]);

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // @ts-ignore - plugin hooks array elements directly to map instance
    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      minOpacity: opacity
    }).addTo(map);

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [points, intensity, opacity, map]);

  return null;
}

export default function GisNotesExtended() {
  const { data: syncNotes, isOnline, hasPendingWrites, saveData } = useGisSync();
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const savedLat = localStorage.getItem("irobotix_last_lat");
    const savedLng = localStorage.getItem("irobotix_last_lng");
    return savedLat && savedLng ? [parseFloat(savedLat), parseFloat(savedLng)] : NAIROBI_COORDS;
  });
  
  const [mapZoom, setMapZoom] = useState<number>(() => {
    const savedZoom = localStorage.getItem("irobotix_last_zoom");
    return savedZoom ? parseInt(savedZoom, 10) : DEFAULT_ZOOM;
  });

  const [filterType, setFilterType] = useState("ALL");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatOpacity, setHeatOpacity] = useState(0.5);
  const [previewGeoJson, setPreviewGeoJson] = useState<any>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadMetadata, setUploadMetadata] = useState<any>(null);

  const handleMapMovement = (lat: number, lng: number, zoom: number) => {
    localStorage.setItem("irobotix_last_lat", lat.toString());
    localStorage.setItem("irobotix_last_lng", lng.toString());
    localStorage.setItem("irobotix_last_zoom", zoom.toString());
  };

  // Ingestion parsing engine executing inside the client sandbox environment
  const processSpatialFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    let parsedGeoJson: any = null;

    try {
      if (extension === "geojson" || extension === "json") {
        const text = await file.text();
        parsedGeoJson = JSON.parse(text);
      } else if (extension === "kml") {
        const text = await file.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(text, "text/xml");
parsedGeoJson = toGeoJSON.kml(kmlDom);
      } else if (extension === "zip") {
        const arrayBuffer = await file.arrayBuffer();
        parsedGeoJson = await shp(arrayBuffer);
      } else {
        alert("Format unsupported. Inject .kml, .geojson, or zipped Shapefile frameworks.");
        return;
      }

      if (parsedGeoJson) {
        // Evaluate geometric sizing footprint via turf analytics instantly
        const areaMeters = turf.area(parsedGeoJson);
        const centerFeatures = turf.center(parsedGeoJson);
        const centerCoords = centerFeatures.geometry.coordinates;

        setPreviewGeoJson(parsedGeoJson);
        setUploadMetadata({
          fileName: file.name,
          fileType: extension?.toUpperCase(),
          areaSqMeters: parseFloat(areaMeters.toFixed(2)),
          center: [centerCoords[1], centerCoords[0]]
        });
      }
    } catch (err) {
      console.error("Geospatial Processing Failure:", err);
      alert("Geometry parsing error. Ensure structural data compliance.");
    }
  };

  const commitAoiToCloud = async () => {
    if (!previewGeoJson || !uploadMetadata) return;

    const newGisDocument = {
      title: AOI Import: ${uploadMetadata.fileName},
      noteText: Automated data ingest monitoring for ${uploadMetadata.fileType} vector tracking boundaries. Calculated scope maps to ${uploadMetadata.areaSqMeters} square meters.,
      location: {
        lat: uploadMetadata.center[0],
        lng: uploadMetadata.center[1]
      },
      projectType: "Survey Mission",
      aoiData: previewGeoJson,
      metadata: uploadMetadata
    };

    await saveData(newGisDocument);
    setMapCenter([uploadMetadata.center[0], uploadMetadata.center[1]]);
    setPreviewGeoJson(null);
    setUploadMetadata(null);
  };

  const filteredNotes = syncNotes.filter(note => {
    if (filterType === "ALL") return true;
    return note.projectType?.toUpperCase() === filterType.toUpperCase();
  });

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden pb-safe">
      
      <SyncStatusBar isOnline={isOnline} hasPendingWrites={hasPendingWrites} />

      {/* DASHBOARD MANAGEMENT SIDEPANEL */}
      <div className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto z-10">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
            GIS Control Dashboard
          </h2>
        </div>

        {/* Mission Type Isolation Filter */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">Mission Pipeline</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none focus:border-teal-500 text-slate-200"
          >
            <option value="ALL">Show All System Operations</option>
            <option value="UAV MAPPING">UAV Mapping Runs</option>
            <option value="SURVEY MISSION">Survey Boundaries</option>
          </select>
        </div>

        {/* Dynamic Opacity Slider Adjustments */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Heatmap Layer</span>
            <input 
              type="checkbox" 
              checked={showHeatmap}
onChange={(e) => setShowHeatmap(e.target.checked)}
              className="accent-teal-500 cursor-pointer h-3.5 w-3.5"
            />
          </div>
          {showHeatmap && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>Density Opacity</span>
                <span>{Math.round(heatOpacity * 100)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="1" step="0.05"
                value={heatOpacity}
                onChange={(e) => setHeatOpacity(parseFloat(e.target.value))}
                className="w-full accent-teal-500 bg-slate-800 h-1 rounded"
              />
            </div>
          )}
        </div>

        {/* LOCAL VECTOR VECTOR DRAG SECTOR ENTRY */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            if (e.dataTransfer.files?.[0]) processSpatialFile(e.dataTransfer.files[0]);
          }}
          className={border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            isDraggingFile ? "border-teal-500 bg-teal-950/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
          }}
        >
          <span className="text-xl">🛰️</span>
          <p className="text-xs font-semibold text-slate-300">Ingest Operational Vector</p>
          <p className="text-[10px] text-slate-500 font-mono">Drag .KML, .GeoJSON, or Zipped Shapefile</p>
          <input 
            type="file" accept=".kml,.geojson,.json,.zip"
            onChange={(e) => { if (e.target.files?.[0]) processSpatialFile(e.target.files[0]); }}
            className="hidden" id="gis-file-input"
          />
          <label htmlFor="gis-file-input" className="mt-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 uppercase tracking-wider rounded font-mono cursor-pointer transition">
            Browse Files
          </label>
        </div>

        {/* Local Parse Context Confirmation Modal UI */}
        {uploadMetadata && (
          <div className="bg-teal-950/20 border border-teal-500/30 rounded p-3 space-y-2 animate-fadeIn">
            <h4 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">✔ Geometry Isolated</h4>
            <div className="space-y-0.5 font-mono text-[10px] text-slate-400">
              <p className="truncate"><span className="text-slate-500">FILE:</span> {uploadMetadata.fileName}</p>
              <p><span className="text-slate-500">AREA:</span> {uploadMetadata.areaSqMeters.toLocaleString()} m²</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={commitAoiToCloud} className="flex-1 bg-teal-600 hover:bg-teal-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded transition">
                Commit AOI
              </button>
              <button onClick={() => { setPreviewGeoJson(null); setUploadMetadata(null); }} className="px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded transition">
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Telemetry Asset Ledger Indices */}
        <div className="flex-1 space-y-2 mt-2">
          <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">Live Spatial Sync Index ({filteredNotes.length})</label>
          <div className="space-y-1.5 h-48 md:h-auto overflow-y-auto">
{filteredNotes.map((note) => (
              <div 
                key={note.id} 
                onClick={() => note.location && setMapCenter([note.location.lat, note.location.lng])}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 transition cursor-pointer text-left space-y-1"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xs font-bold text-slate-200 truncate flex-1">{note.title}</h3>
                  <span className="text-[9px] px-1 bg-slate-800 border border-slate-700 rounded text-slate-400 uppercase font-mono">{note.projectType || "General"}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">{note.noteText}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CORE LEAFLET FRAME CONTAINER SPACE */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapViewTracker onMove={handleMapMovement} />

          {showHeatmap && (
            <HeatmapLayer 
              points={filteredNotes} 
              intensity={2.0} 
              opacity={heatOpacity} 
            />
          )}

          {previewGeoJson && (
            <GeoJSON 
              data={previewGeoJson} 
              style={() => aoiLayerStyle} 
            />
          )}

          {filteredNotes
            .filter(note => note.aoiData)
            .map(note => (
              <GeoJSON 
                key={note.id} 
                data={note.aoiData} 
                style={() => ({
                  color: note.projectType === "UAV Mapping" ? "#ec4899" : "#06b6d4",
                  weight: 2,
                  fillColor: note.projectType === "UAV Mapping" ? "#ec4899" : "#06b6d4",
                  fillOpacity: 0.1
                })} 
              />
            ))
          }
        </MapContainer>
      </div>
    </div>
  );
}