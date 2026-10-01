import React, { useState, useEffect, useCallback } from "react";
import { QuotaBanner } from "./components/QuotaBanner";
import { InteractiveMap } from "./components/InteractiveMap";
import { ChatPanel } from "./components/ChatPanel";
import { ChatMessage, Coordinates, PlaceMarker, RolePreset } from "./types";
import { AlertCircle, MessageSquare, Map as MapIcon } from "lucide-react";

const DEFAULT_MAPS_KEY = "AIzaSyB1ZONYvs3Yp7teH6YYQhWWpWx48vBPtLY";

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_MAPS_KEY
  );
  const [mapCenter, setMapCenter] = useState<Coordinates>({
    lat: 40.7128,
    lng: -74.006, // New York default
  });
  const [zoom, setZoom] = useState<number>(13);
  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [selectedRole, setSelectedRole] = useState<RolePreset>("explorer");
  const [searchGroundingEnabled, setSearchGroundingEnabled] = useState<boolean>(true);
  const [includeMapLocation, setIncludeMapLocation] = useState<boolean>(true);
  const [presetPrompt, setPresetPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "map">("chat");

  // Initial welcome message from GeoChat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: "👋 Welcome to **GeoChat**! I'm your interactive, real-time map companion powered by **Gemini** and live **Google Maps & Search data**.\n\nYou can ask me for recommendations, hidden gems, walking itineraries, or travel details anywhere in the world. As we talk, I'll drop interactive pins onto the map so you can explore visually!\n\nTry moving the map to any city and asking: *'What are the best food spots around here?'*",
      timestamp: Date.now(),
      modelUsed: "gemini-3.5-flash",
    },
  ]);

  // Fetch verified Maps API Key if not present in client bundle
  useEffect(() => {
    if (!mapsApiKey || mapsApiKey === "MY_GOOGLE_MAPS_API_KEY") {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.mapsApiKey) {
            setMapsApiKey(data.mapsApiKey);
          }
        })
        .catch((err) => console.error("Could not fetch maps config:", err));
    }
  }, [mapsApiKey]);

  // Geolocation on start if permission granted
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Ignore if denied or timed out, default coordinates are fine
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
      locationContext: includeMapLocation ? { ...mapCenter } : undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        messages: newHistory.map((m) => ({
          role: m.role,
          text: m.text,
        })),
        model: selectedModel,
        rolePreset: selectedRole,
        mapCenter: includeMapLocation ? mapCenter : undefined,
        enableSearchGrounding: searchGroundingEnabled,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "model",
        text: data.text,
        timestamp: Date.now(),
        places: data.places,
        groundingSources: data.groundingSources,
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If new places were generated, add to map and pan to the first place
      if (data.places && data.places.length > 0) {
        setPlaces((prev) => {
          // Filter duplicates
          const existingIds = new Set(prev.map((p) => p.name.toLowerCase()));
          const fresh = data.places.filter(
            (p: PlaceMarker) => !existingIds.has(p.name.toLowerCase())
          );
          return [...prev, ...fresh];
        });

        // Pan map smoothly to the primary recommended place
        const firstPlace = data.places[0];
        setMapCenter({ lat: firstPlace.lat, lng: firstPlace.lng });
        setSelectedPlaceId(firstPlace.id);
        if (zoom < 14) {
          setZoom(14);
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setErrorMessage(
        err.message || "Failed to communicate with GeoChat. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = useCallback(() => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: "model",
        text: "Conversation reset! What city or area would you like to explore next?",
        timestamp: Date.now(),
      },
    ]);
    setPlaces([]);
    setSelectedPlaceId(null);
  }, []);

  const handleSelectPlace = useCallback((place: PlaceMarker | null) => {
    if (!place) {
      setSelectedPlaceId(null);
      return;
    }
    setSelectedPlaceId(place.id);
    setMapCenter({ lat: place.lat, lng: place.lng });
    setZoom((prev) => (prev < 15 ? 15 : prev));
  }, []);

  const handleMapCenterChange = useCallback((newCenter: Coordinates, newZoom: number) => {
    setMapCenter(newCenter);
    setZoom(newZoom);
  }, []);

  const handleAskAboutPlace = useCallback((place: PlaceMarker) => {
    setPresetPrompt(
      `Tell me more about ${place.name} at ${place.address}. What are the highlights, best times to visit, and nearby spots?`
    );
  }, []);

  const handleClearPlaces = useCallback(() => {
    setPlaces([]);
    setSelectedPlaceId(null);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Required Google Maps Platform Quota Defense Banner */}
      <QuotaBanner />

      {/* Optional Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-600 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Screen Navigation Tabs */}
      <div className="md:hidden flex items-center justify-around bg-white border-b border-slate-200 p-1.5 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mobileTab === "chat"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mobileTab === "map"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Interactive Map ({places.length})</span>
        </button>
      </div>

      {/* Main Dual-Pane Viewport */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Side: Chat Panel */}
        <div
          className={`h-full w-full md:w-[440px] lg:w-[480px] shrink-0 z-10 transition-all ${
            mobileTab === "chat" ? "block" : "hidden md:block"
          }`}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onSelectPlace={handleSelectPlace}
            selectedModel={selectedModel}
            onChangeModel={setSelectedModel}
            selectedRole={selectedRole}
            onChangeRole={setSelectedRole}
            searchGroundingEnabled={searchGroundingEnabled}
            onToggleSearchGrounding={setSearchGroundingEnabled}
            mapCenter={mapCenter}
            includeMapLocation={includeMapLocation}
            onToggleIncludeLocation={setIncludeMapLocation}
            presetPrompt={presetPrompt}
            onClearPresetPrompt={() => setPresetPrompt("")}
          />
        </div>

        {/* Right Side: Interactive Google Map */}
        <div
          className={`h-full flex-1 relative ${
            mobileTab === "map" ? "block" : "hidden md:block"
          }`}
        >
          {mapsApiKey ? (
            <InteractiveMap
              apiKey={mapsApiKey}
              center={mapCenter}
              zoom={zoom}
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={handleSelectPlace}
              onMapCenterChange={handleMapCenterChange}
              onAskAboutPlace={handleAskAboutPlace}
              onClearPlaces={handleClearPlaces}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-sm">
              Loading Google Maps...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
