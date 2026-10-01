import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Globe,
  MapPin,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  Navigation,
  Star,
  Compass,
} from "lucide-react";
import { ChatMessage, Coordinates, PlaceMarker, RolePreset } from "../types";
import { getCategoryTheme } from "../utils/markerUtils";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onSelectPlace: (place: PlaceMarker) => void;
  selectedModel: string;
  onChangeModel: (model: string) => void;
  selectedRole: RolePreset;
  onChangeRole: (role: RolePreset) => void;
  searchGroundingEnabled: boolean;
  onToggleSearchGrounding: (enabled: boolean) => void;
  mapCenter: Coordinates;
  includeMapLocation: boolean;
  onToggleIncludeLocation: (include: boolean) => void;
  presetPrompt?: string;
  onClearPresetPrompt?: () => void;
}

const MODEL_OPTIONS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", badge: "Search Grounded" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", badge: "Fast & Smart" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", badge: "Low Latency" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", badge: "Complex Reasoning" },
];

const ROLE_OPTIONS: { id: RolePreset; label: string; desc: string }[] = [
  { id: "explorer", label: "Local Explorer", desc: "Hidden gems & neighborhood vibes" },
  { id: "foodie", label: "Culinary & Dining", desc: "Top restaurants, cafes & food trends" },
  { id: "travel_guide", label: "Trip Planner", desc: "Itineraries, transit & attractions" },
  { id: "history_buff", label: "History & Culture", desc: "Architecture, heritage & stories" },
  { id: "nightlife", label: "Nightlife Scout", desc: "Lounges, live music & evenings" },
];

const SUGGESTED_QUESTIONS = [
  "Top 4 specialty coffee shops nearby?",
  "Best authentic dinner spots in this area",
  "Must-visit cultural landmarks around here",
  "Plan a scenic 2-hour walking tour",
  "Any green parks or viewpoints nearby?",
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  onSelectPlace,
  selectedModel,
  onChangeModel,
  selectedRole,
  onChangeRole,
  searchGroundingEnabled,
  onToggleSearchGrounding,
  mapCenter,
  includeMapLocation,
  onToggleIncludeLocation,
  presetPrompt,
  onClearPresetPrompt,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (presetPrompt) {
      setInputText(presetPrompt);
      textareaRef.current?.focus();
      onClearPresetPrompt?.();
    }
  }, [presetPrompt, onClearPresetPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 shadow-xl overflow-hidden">
      {/* Top Header & Settings Panel */}
      <div className="p-3.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                GeoChat AI
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Maps Live
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">Interactive Location & Travel Assistant</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearChat}
            title="Clear Chat History"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Model, Persona & Grounding Controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Model Selector */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              Gemini Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => onChangeModel(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-medium py-1.5 px-2 pr-6 rounded-lg border border-slate-200 outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.badge})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Role Persona Selector */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              AI Persona
            </label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => onChangeRole(e.target.value as RolePreset)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-medium py-1.5 px-2 pr-6 rounded-lg border border-slate-200 outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search Grounding & Location Status Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => onToggleSearchGrounding(!searchGroundingEnabled)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
              searchGroundingEnabled
                ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Search Grounding: {searchGroundingEnabled ? "Active" : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleIncludeLocation(!includeMapLocation)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
              includeMapLocation
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
            title="Attach map coordinates to user questions"
          >
            <MapPin className="w-3 h-3" />
            <span>Map Sync: {includeMapLocation ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Chat History Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`flex gap-2 max-w-[92%] ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                    isUser
                      ? "bg-slate-800 text-white"
                      : "bg-blue-600 text-white shadow-sm"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`relative rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  }`}
                >
                  {/* Markdown or plain text */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  ) : (
                    <div className="prose prose-xs max-w-none text-slate-800 prose-headings:font-bold prose-headings:text-slate-900 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600">
                      <Markdown>{message.text}</Markdown>
                    </div>
                  )}

                  {/* Copy Button */}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(message.id, message.text)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                      title="Copy response"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Places Cards Carousel */}
              {!isUser && message.places && message.places.length > 0 && (
                <div className="w-full pl-8 mt-2.5">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Plotted Places on Google Map ({message.places.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {message.places.map((place) => {
                      const theme = getCategoryTheme(place.category);
                      const IconComp = theme.icon;

                      return (
                        <div
                          key={place.id}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-semibold text-slate-900 text-[11px] leading-tight line-clamp-1">
                                {place.name}
                              </span>
                              {place.rating && (
                                <span className="flex items-center text-[10px] text-amber-600 font-bold shrink-0">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-0.5" />
                                  {place.rating.toFixed(1)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                              <IconComp className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="capitalize">{theme.label}</span>
                              {place.address && (
                                <span className="truncate max-w-[130px]">
                                  • {place.address}
                                </span>
                              )}
                            </div>

                            {place.description && (
                              <p className="text-[10px] text-slate-600 line-clamp-2 mb-2 leading-snug">
                                {place.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onSelectPlace(place)}
                              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1 px-2 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              Show on Map
                            </button>

                            <a
                              href={
                                place.mapsUrl ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${place.name} ${place.address}`
                                )}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-1.5 rounded-lg text-[10px] flex items-center gap-0.5 transition-colors"
                              title="Open in Google Maps"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search Grounding Citations */}
              {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
                <div className="w-full pl-8 mt-2">
                  <div className="bg-slate-100/80 border border-slate-200/80 rounded-lg p-2 text-[10px] text-slate-600">
                    <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3 text-blue-600" />
                      Google Search Grounding Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {message.groundingSources.map((source, sIdx) => {
                        let domain = "";
                        try {
                          domain = new URL(source.uri).hostname.replace(/^www\./, "");
                        } catch {
                          domain = source.title;
                        }
                        return (
                          <a
                            key={sIdx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-blue-50 border border-slate-200 px-2 py-0.5 rounded text-blue-700 hover:underline flex items-center gap-1 transition-colors max-w-[200px] truncate"
                            title={source.title}
                          >
                            <span className="truncate">{source.title || domain}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 pl-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 text-xs text-slate-500">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
              </div>
              <span className="text-[11px] font-medium text-slate-600">
                Grounding with Google Maps & Search...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      {messages.length <= 2 && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(q)}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-medium py-1 px-2.5 rounded-full border border-slate-200 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Box */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about restaurants, sights, or routes near (${mapCenter.lat.toFixed(2)}, ${mapCenter.lng.toFixed(2)})...`}
            rows={1}
            className="w-full resize-none bg-slate-50 text-slate-800 text-xs rounded-xl py-2.5 pl-3.5 pr-12 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span>Powered by Gemini & Google Maps</span>
        </div>
      </div>
    </div>
  );
};
