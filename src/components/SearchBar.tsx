"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SearchResult } from "@/types";

interface SearchBarProps {
  items: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export default function SearchBar({ items, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length >= 2
    ? items
        .filter((item) => {
          const q = query.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.operator.toLowerCase().includes(q)
          );
        })
        .slice(0, 10)
    : [];

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    [results, selectedIndex, handleSelect],
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-4 right-4 z-20"
    >
      <div className="panel flex items-center gap-2 px-3 py-2 w-[240px]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search facilities... (⌘K)"
          className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="panel mt-1 py-1 max-h-[320px] overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <span
                className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
                  result.type === "datacenter"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {result.type === "datacenter" ? "DC" : "Plant"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate">{result.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {result.operator} · {result.detail}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
