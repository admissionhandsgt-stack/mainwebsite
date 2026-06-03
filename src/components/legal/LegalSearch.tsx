"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface LegalSearchProps {
  sections: Array<{
    slug: string;
    title: string;
    content: string;
  }>;
  onSearchResultSelect?: (slug: string) => void;
}

interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
}

function getSnippet(content: string, query: string, maxLen = 80): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, maxLen) + (content.length > maxLen ? "…" : "");

  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 50);
  let snippet = content.slice(start, end);

  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";

  return snippet;
}

export default function LegalSearch({ sections, onSearchResultSelect }: LegalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "legal-search-results";

  const search = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      const lower = q.toLowerCase();
      const matched: SearchResult[] = [];

      for (const section of sections) {
        if (matched.length >= 8) break;

        const titleMatch = section.title.toLowerCase().includes(lower);
        const contentMatch = section.content.toLowerCase().includes(lower);

        if (titleMatch || contentMatch) {
          matched.push({
            slug: section.slug,
            title: section.title,
            snippet: contentMatch
              ? getSnippet(section.content, q)
              : section.content.slice(0, 80) + (section.content.length > 80 ? "…" : ""),
          });
        }
      }

      setResults(matched);
      setIsOpen(matched.length > 0);
      setActiveIndex(-1);
    },
    [sections]
  );

  const selectResult = useCallback((result: SearchResult) => {
    if (onSearchResultSelect) {
      onSearchResultSelect(result.slug);
    } else {
      const el = document.getElementById(result.slug);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }, [onSearchResultSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectResult(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative print:hidden">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          placeholder="Search legal documents..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-800/50 text-sm py-2 px-3 pl-9
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
            transition-colors"
        />
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg
            border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto z-40"
        >
          {results.map((result, index) => (
            <li
              key={result.slug}
              id={`search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-2 cursor-pointer transition-colors
                ${
                  index === activeIndex
                    ? "bg-slate-50 dark:bg-slate-700/50"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {result.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {result.snippet}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
