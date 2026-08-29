import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { geocode, type GeoResult } from '../lib/api';

interface Props {
  onSelect: (r: GeoResult) => void;
  onError: (message: string) => void;
}

export function SearchBar({ onSelect, onError }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noUs, setNoUs] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setNoUs(false);
    try {
      const res = await geocode(q);
      setResults(res);
      setNoUs(res.length === 0);
      setOpen(true);
    } catch (e) {
      setResults([]);
      setNoUs(false);
      setOpen(false);
      onError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  function pick(r: GeoResult) {
    setQuery(r.display_name);
    setOpen(false);
    setNoUs(false);
    onSelect(r);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && open) {
        pick(results[0]);
      } else {
        doSearch();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0 && open) pick(results[0]);
          else doSearch();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(false);
            }}
            onKeyDown={handleKey}
            placeholder="Search a city, address, or landmark…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          ) : (
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
            >
              Search
            </button>
          )}
        </div>
      </form>

      {open && noUs && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-3 text-sm text-amber-300 shadow-2xl">
          No US locations found. This tool only supports pinning work sites
          inside the United States.
        </div>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lon}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
