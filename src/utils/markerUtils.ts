import {
  Utensils,
  Coffee,
  Landmark,
  Trees,
  Building2,
  ShoppingBag,
  Hotel,
  Wine,
  MapPin,
} from "lucide-react";
import React from "react";
import { PlaceMarker } from "../types";

export interface CategoryTheme {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
  pinBg: string;
  label: string;
}

export const CATEGORY_THEMES: Record<PlaceMarker["category"], CategoryTheme> = {
  restaurant: {
    icon: Utensils,
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
    pinBg: "#ea580c",
    label: "Restaurant",
  },
  cafe: {
    icon: Coffee,
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
    pinBg: "#d97706",
    label: "Cafe",
  },
  landmark: {
    icon: Landmark,
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200",
    pinBg: "#4f46e5",
    label: "Landmark",
  },
  park: {
    icon: Trees,
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    pinBg: "#059669",
    label: "Park & Nature",
  },
  museum: {
    icon: Building2,
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    borderColor: "border-violet-200",
    pinBg: "#7c3aed",
    label: "Museum & Culture",
  },
  shopping: {
    icon: ShoppingBag,
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    pinBg: "#e11d48",
    label: "Shopping",
  },
  hotel: {
    icon: Hotel,
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    pinBg: "#2563eb",
    label: "Accommodation",
  },
  bar: {
    icon: Wine,
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    pinBg: "#9333ea",
    label: "Nightlife & Bar",
  },
  other: {
    icon: MapPin,
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    borderColor: "border-slate-200",
    pinBg: "#475569",
    label: "Place",
  },
};

export const getCategoryTheme = (category?: string): CategoryTheme => {
  if (category && category in CATEGORY_THEMES) {
    return CATEGORY_THEMES[category as PlaceMarker["category"]];
  }
  return CATEGORY_THEMES.other;
};
