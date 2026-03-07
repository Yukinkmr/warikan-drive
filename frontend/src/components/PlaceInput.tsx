"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const hasMapsKey = () =>
  Boolean(typeof process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY === "string" && process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim());

// API オプションは一度だけ設定（RouteMap.tsx と共有）
let apiOptionsSet = false;
function ensureApiOptions() {
  if (!apiOptionsSet && hasMapsKey()) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!.trim(),
      v: "weekly",
      language: "ja",
      region: "JP",
    });
    apiOptionsSet = true;
  }
}

// AutocompleteService は読み込み後にインスタンス化
let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesLoaded = false;
let placesLoadingPromise: Promise<void> | null = null;

function loadPlaces(): Promise<void> {
  if (!hasMapsKey()) return Promise.resolve(); // API キー未設定時はオートコンプリートなし（手入力のみ）
  if (placesLoaded) return Promise.resolve();
  if (placesLoadingPromise) return placesLoadingPromise;
  ensureApiOptions();
  placesLoadingPromise = importLibrary("places").then(() => {
    autocompleteService = new google.maps.places.AutocompleteService();
    placesLoaded = true;
  });
  return placesLoadingPromise;
}

interface PlaceInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PlaceInput({
  placeholder,
  value,
  onChange,
  className = "",
}: PlaceInputProps) {
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Places ライブラリを読み込む
  useEffect(() => {
    loadPlaces().then(() => setReady(true)).catch(() => {/* API キー未設定など */});
  }, []);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!ready || !autocompleteService || input.length < 1) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    autocompleteService.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "jp" },
        language: "ja",
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setOpen(true);
          setActiveIdx(-1);
        } else {
          setPredictions([]);
          setOpen(false);
        }
      }
    );
  }, [ready]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  }

  function handleSelect(pred: google.maps.places.AutocompletePrediction) {
    onChange(pred.description);
    setPredictions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (predictions.length > 0) setOpen(true); }}
        autoComplete="off"
        className={className}
      />
      {open && predictions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-2xl border border-border bg-card py-1 shadow-lg"
        >
          {predictions.map((pred, idx) => (
            <li
              key={pred.place_id}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(pred); }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                idx === activeIdx ? "bg-accentDim text-accent" : "text-text hover:bg-accentDim/50"
              }`}
            >
              <span className="font-medium">
                {pred.structured_formatting.main_text}
              </span>
              {pred.structured_formatting.secondary_text && (
                <span className="ml-1 text-xs text-muted">
                  {pred.structured_formatting.secondary_text}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
