export type RolePreset = "explorer" | "foodie" | "travel_guide" | "history_buff" | "nightlife";

export interface GroundingSource {
  title: string;
  uri: string;
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

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  places?: PlaceMarker[];
  groundingSources?: GroundingSource[];
  modelUsed?: string;
  locationContext?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

export interface Coordinates {
  lat: number;
  lng: number;
}
