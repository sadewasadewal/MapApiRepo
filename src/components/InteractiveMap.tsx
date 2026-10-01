import React, { useState, useEffect, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  Compass,
  Crosshair,
  ExternalLink,
  Layers,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Coordinates, PlaceMarker } from "../types";
import { getCategoryTheme } from "../utils/markerUtils";

interface InteractiveMapProps {
  apiKey: string;
  center: Coordinates;
  zoom: number;
  places: PlaceMarker[];
  selectedPlaceId?: string | null;
  onSelectPlace: (place: PlaceMarker | null) => void;
  onMapCenterChange: (center: Coordinates, zoom: number) => void;
  onAskAboutPlace: (place: PlaceMarker) => void;
  onClearPlaces: () => void;
}

// Controller component to smoothly pan/zoom map programmatically
const MapController: React.FC<{
  targetCenter: Coordinates;
  targetZoom?: number;
  selectedPlace?: PlaceMarker | null;
  onCameraIdle?: (center: Coordinates, zoom: number) => void;
}> = ({ targetCenter, targetZoom, selectedPlace, onCameraIdle }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(targetCenter);
    if (targetZoom !== undefined) {
      map.setZoom(targetZoom);
    }
  }, [map, targetCenter.lat, targetCenter.lng, targetZoom]);

  useEffect(() => {
    if (!map || !selectedPlace) return;
    map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    if (map.getZoom()! < 15) {
      map.setZoom(15);
    }
  }, [map, selectedPlace]);

  useEffect(() => {
    if (!map || !onCameraIdle) return;
    const listener = map.addListener("idle", () => {
      const c = map.getCenter();
      const z = map.getZoom();
      if (c && z !== undefined) {
        onCameraIdle({ lat: c.lat(), lng: c.lng() }, z);
      }
    });
    return () => {
      listener?.remove();
    };
  }, [map, onCameraIdle]);

  return null;
};

const CITY_PRESETS = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  apiKey,
  center,
  zoom,
  places,
  selectedPlaceId,
  onSelectPlace,
  onMapCenterChange,
  onAskAboutPlace,
  onClearPlaces,
}) => {
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<Coordinates | null>(null);

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || null;

  // Handle Geolocation
  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(loc);
          onMapCenterChange(loc, 15);
        },
        (err) => {
          console.warn("Geolocation denied or error:", err);
        },
        { timeout: 8000 }
      );
    }
  };

  // Search geocode
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        onMapCenterChange({ lat: data.lat, lng: data.lng }, 14);
        setSearchQuery("");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col bg-slate-900 overflow-hidden">
      {/* Top Floating Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search Bar & Preset Pills */}
        <div className="flex items-center gap-2 pointer-events-auto max-w-xl flex-1">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-3 py-1.5 border border-slate-200 text-sm w-full max-w-xs transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white"
          >
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to city, area, landmark..."
              className="bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-xs w-full"
            />
            {isSearching && (
              <span className="text-[10px] text-blue-600 font-medium animate-pulse shrink-0">
                Finding...
              </span>
            )}
          </form>

          {/* Quick City Presets (hidden on tiny screens) */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {CITY_PRESETS.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => onMapCenterChange({ lat: city.lat, lng: city.lng }, 13)}
                className="bg-white/90 hover:bg-white text-slate-700 hover:text-blue-700 backdrop-blur-md px-2.5 py-1 text-xs font-medium rounded-lg shadow-sm border border-slate-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Utility Action Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {places.length > 0 && (
            <div className="bg-blue-600 text-white px-2.5 py-1 text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{places.length} places pinned</span>
              <button
                type="button"
                onClick={onClearPlaces}
                title="Clear markers"
                className="hover:text-red-200 ml-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === "roadmap" ? "hybrid" : "roadmap"))}
            title="Toggle Satellite view"
            className="bg-white/95 hover:bg-white text-slate-700 px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{mapType === "roadmap" ? "Satellite" : "Map"}</span>
          </button>

          <button
            type="button"
            onClick={handleLocateUser}
            title="Locate my position"
            className="bg-white/95 hover:bg-white text-slate-700 p-1.5 rounded-lg shadow-md border border-slate-200 transition-colors cursor-pointer"
          >
            <Crosshair className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Main Google Map Viewport */}
      <div className="flex-1 w-full h-full relative">
        <APIProvider apiKey={apiKey} solutionChannel="GMP_visgl_reactgooglemaps_v1">
          <Map
            style={{ width: "100%", height: "100%" }}
            defaultCenter={center}
            defaultZoom={zoom}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            onClick={(e) => {
              if (e.detail.latLng) {
                setClickedLocation({
                  lat: e.detail.latLng.lat,
                  lng: e.detail.latLng.lng,
                });
              }
            }}
          >
            <MapController
              targetCenter={center}
              targetZoom={zoom}
              selectedPlace={selectedPlace}
              onCameraIdle={onMapCenterChange}
            />

            {/* User GPS Location Marker */}
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Your Location">
                <div className="relative flex items-center justify-center">
                  <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
                  <div className="absolute w-8 h-8 bg-blue-400 rounded-full opacity-30 animate-ping" />
                </div>
              </AdvancedMarker>
            )}

            {/* Clicked Map Location Pin */}
            {clickedLocation && (
              <AdvancedMarker position={clickedLocation} title="Selected Coordinate">
                <div className="flex flex-col items-center">
                  <div className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow mb-1 whitespace-nowrap">
                    {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
                  </div>
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-md animate-bounce" />
                </div>
              </AdvancedMarker>
            )}

            {/* Place Markers plotted from chatbot recommendations */}
            {places.map((place, idx) => {
              const theme = getCategoryTheme(place.category);
              const IconComp = theme.icon;
              const isSelected = selectedPlaceId === place.id;

              return (
                <AdvancedMarker
                  key={place.id}
                  position={{ lat: place.lat, lng: place.lng }}
                  title={place.name}
                  onClick={() => onSelectPlace(place)}
                >
                  <div
                    className={`relative flex items-center cursor-pointer transition-transform duration-200 ${
                      isSelected ? "scale-125 z-30" : "hover:scale-110 z-10"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border text-white font-medium text-xs ${
                        isSelected
                          ? "ring-4 ring-blue-400 ring-offset-1 font-bold"
                          : ""
                      }`}
                      style={{ backgroundColor: theme.pinBg, borderColor: "rgba(255,255,255,0.7)" }}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[120px]">{place.name}</span>
                      {place.rating && (
                        <span className="flex items-center text-[10px] bg-black/20 px-1 py-0.2 rounded ml-0.5">
                          ★{place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Selected Place */}
            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => onSelectPlace(null)}
                headerContent={
                  <div className="flex items-center gap-2 pr-4 font-semibold text-slate-900 text-sm">
                    <span className="truncate max-w-[200px]">{selectedPlace.name}</span>
                  </div>
                }
              >
                <div className="p-1 max-w-[260px] text-xs text-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        getCategoryTheme(selectedPlace.category).bgColor
                      } ${getCategoryTheme(selectedPlace.category).textColor} ${
                        getCategoryTheme(selectedPlace.category).borderColor
                      }`}
                    >
                      {getCategoryTheme(selectedPlace.category).label}
                    </span>

                    {selectedPlace.rating && (
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {selectedPlace.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {selectedPlace.address && (
                    <div className="flex items-start gap-1 text-slate-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span className="text-[11px] leading-tight">{selectedPlace.address}</span>
                    </div>
                  )}

                  {selectedPlace.description && (
                    <p className="text-slate-600 mb-3 text-[11px] leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100">
                      {selectedPlace.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAskAboutPlace(selectedPlace)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1 px-2 rounded flex items-center justify-center gap-1 text-[11px] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Ask AI
                    </button>

                    <a
                      href={
                        selectedPlace.mapsUrl ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${selectedPlace.name} ${selectedPlace.address}`
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1 px-2 rounded flex items-center justify-center gap-1 text-[11px] transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Maps
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Bottom Coordinates Status Overlay */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-lg border border-slate-700/60 shadow flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {center.lat.toFixed(4)}° N, {center.lng.toFixed(4)}° W
          </span>
          <span className="text-slate-400">Zoom {Math.round(zoom)}</span>
        </div>
      </div>
    </div>
  );
};
