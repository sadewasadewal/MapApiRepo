import { GoogleGenAI, Type } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please set your API key in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface PlaceMarker {
  id: string;
  name: string;
  address: string;
  category: "restaurant" | "cafe" | "landmark" | "park" | "museum" | "shopping" | "hotel" | "bar" | "other";
  lat: number;
  lng: number;
  rating?: number;
  description: string;
  websiteUri?: string;
  mapsUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  model?: string;
  mapCenter?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  locationName?: string;
  enableSearchGrounding?: boolean;
  rolePreset?: "explorer" | "foodie" | "travel_guide" | "history_buff" | "nightlife";
}

const ROLE_PROMPTS = {
  explorer: "You are GeoChat, an expert local navigator and urban explorer with real-time geospatial intelligence. You provide authentic, high-value local discoveries, neighborhood vibes, hidden gems, and practical logistical guidance.",
  foodie: "You are GeoChat Culinary Guide, a world-class food critic and local gastronomy insider. You recommend top restaurants, cafes, street eats, must-order dishes, reservation advice, and current dining trends.",
  travel_guide: "You are GeoChat Trip Planner, an efficient, inspiring travel concierge. You organize optimal walking routes, multi-stop itineraries, travel times, and must-see attractions with spatial logic.",
  history_buff: "You are GeoChat Heritage Historian, an engaging cultural storyteller. You share fascinating architectural insights, historical context, and deep cultural trivia for monuments and neighborhoods.",
  nightlife: "You are GeoChat Evening Specialist, tuned into current nightlife, craft cocktail lounges, live music venues, sunset viewpoints, and nighttime safety and vibes.",
};

export async function handleChatRequest(payload: ChatRequestPayload) {
  const ai = getGeminiClient();
  const selectedModel = payload.model || "gemini-3.5-flash";
  const rolePreset = payload.rolePreset || "explorer";
  const roleDescription = ROLE_PROMPTS[rolePreset] || ROLE_PROMPTS.explorer;

  const mapContext = payload.mapCenter
    ? `Current interactive map focus coordinates: latitude ${payload.mapCenter.lat.toFixed(5)}, longitude ${payload.mapCenter.lng.toFixed(5)}${payload.locationName ? ` (${payload.locationName})` : ""}.`
    : "";
  const userLocContext = payload.userLocation
    ? `User physical device location: latitude ${payload.userLocation.lat.toFixed(5)}, longitude ${payload.userLocation.lng.toFixed(5)}.`
    : "";

  const systemInstruction = `${roleDescription}

SPATIAL & INTERACTIVE MAP RULES:
1. When the user asks about places, food, sights, activities, or locations, provide a helpful, natural, well-formatted response with rich details (vibe, highlights, pricing/hours, insider tips).
2. REAL-TIME GOOGLE MAPS INTEGRATION: ${mapContext} ${userLocContext}
If the user mentions "here", "nearby", "this area", or asks for recommendations relative to the map, use the active map coordinates and location context.
3. STRUCTURED PLACE MARKERS (CRITICAL):
Whenever you mention or recommend specific real-world venues, landmarks, shops, parks, or points of interest, you MUST append a JSON code block at the very end of your response under the delimiter \`\`\`places-json
The JSON block must contain a valid array of place objects with exact or approximate latitude & longitude coordinates so they can be plotted live onto the interactive Google Map!

Format of places-json block:
\`\`\`places-json
[
  {
    "name": "Place Name",
    "address": "Street Address, City, Country",
    "category": "restaurant" | "cafe" | "landmark" | "park" | "museum" | "shopping" | "hotel" | "bar" | "other",
    "lat": 37.7749,
    "lng": -122.4194,
    "rating": 4.8,
    "description": "Short 1-2 sentence compelling summary of why to visit."
  }
]
\`\`\`
Do not omit the \`\`\`places-json block if any places are recommended. Coordinates must be accurate floating numbers.`;

  // Format multi-turn conversation
  const contents = payload.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const tools: Array<{ googleSearch?: Record<string, never> }> = [];
  if (payload.enableSearchGrounding !== false) {
    tools.push({ googleSearch: {} });
  }

  const response = await ai.models.generateContent({
    model: selectedModel,
    contents,
    config: {
      systemInstruction,
      tools: tools.length > 0 ? tools : undefined,
    },
  });

  const fullText = response.text || "";

  // Extract grounding chunks
  const groundingSources: GroundingSource[] = [];
  const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(rawChunks)) {
    for (const chunk of rawChunks) {
      if (chunk.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
    }
  }

  // Parse places-json block
  let cleanedText = fullText;
  const places: PlaceMarker[] = [];
  const jsonMatch = fullText.match(/```places-json\s*([\s\S]*?)\s*```/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (item && item.name && typeof item.lat === "number" && typeof item.lng === "number") {
            places.push({
              id: `place-${Date.now()}-${i}`,
              name: String(item.name),
              address: String(item.address || ""),
              category: item.category || "landmark",
              lat: Number(item.lat),
              lng: Number(item.lng),
              rating: typeof item.rating === "number" ? item.rating : undefined,
              description: String(item.description || ""),
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.address || ""}`)}`,
            });
          }
        }
      }
      cleanedText = fullText.replace(/```places-json\s*[\s\S]*?\s*```/, "").trim();
    } catch (e) {
      console.error("Failed to parse places-json block:", e);
    }
  }

  return {
    text: cleanedText,
    places,
    groundingSources,
    modelUsed: selectedModel,
  };
}

export async function geocodeLocation(query: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results?.[0]) {
    const res0 = data.results[0];
    return {
      formattedAddress: res0.formatted_address as string,
      lat: res0.geometry.location.lat as number,
      lng: res0.geometry.location.lng as number,
      placeId: res0.place_id as string,
    };
  }
  return null;
}
