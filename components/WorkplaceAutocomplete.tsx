"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Navigation, MapPin } from "lucide-react";

interface WorkplaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: 'map-pin' | 'navigation';
}

export default function WorkplaceAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Where are you going?",
  icon = 'navigation' // Defaults to the navigation arrow
}: WorkplaceAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [allWorkplaces, setAllWorkplaces] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // THE FIX: We define IconComponent right here!
  const IconComponent = icon === 'map-pin' ? MapPin : Navigation;

  // 1. SILENT BACKGROUND FETCH
  useEffect(() => {
    const fetchAllWorkplaces = async () => {
      const { data } = await supabase.from('workplaces').select('name');
      if (data) {
        setAllWorkplaces(data.map(item => item.name));
      }
    };
    fetchAllWorkplaces();
  }, []);

  // Close dropdown if user clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // 2. INSTANT LOCAL FILTERING
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    return allWorkplaces
      .filter(name => name.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  }, [query, allWorkplaces]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (workplaceName: string) => {
    setQuery(workplaceName);
    onChange(workplaceName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* The Icon is successfully rendered here */}
        <IconComponent className="absolute left-4 h-6 w-6 text-emerald-600 z-10" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-lg font-normal text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-base placeholder:text-gray-400"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-5 py-4 text-base font-normal text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
            >
              <Navigation className="h-4 w-4 opacity-40" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}