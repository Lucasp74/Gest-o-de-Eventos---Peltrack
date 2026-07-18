"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value: string | null;
  onChange: (value: string) => void;
  options: string[];
  onCreate?: (value: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
  error?: boolean;
}

export function Combobox({
  value,
  onChange,
  options,
  onCreate,
  placeholder = "Selecione",
  allowCreate = true,
  error,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(q));
  const exact = options.some((o) => o.toLowerCase() === q);
  const canCreate = allowCreate && query.trim().length > 0 && !exact;
  const total = filtered.length + (canCreate ? 1 : 0);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Foca a busca ao abrir
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Reseta destaque ao filtrar
  useEffect(() => setActive(0), [query]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function create() {
    const v = query.trim();
    if (!v) return;
    onCreate?.(v);
    select(v);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) select(filtered[active]);
      else if (canCreate) create();
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between h-11 px-4 rounded-xl border bg-card text-sm outline-none transition-all",
          "focus:ring-2 focus:ring-laranja/20 focus:border-laranja",
          error ? "border-red-400" : "border-border hover:border-border",
          open && "ring-2 ring-laranja/20 border-laranja",
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
          {/* Busca */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar ou criar..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-fundo/50 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-laranja focus:bg-card transition-colors"
              />
            </div>
          </div>

          {/* Lista */}
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filtered.map((o, i) => (
              <li key={o} role="option" aria-selected={value === o}>
                <button
                  type="button"
                  onClick={() => select(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors",
                    active === i ? "bg-laranja/10 text-laranja" : "text-foreground hover:bg-fundo",
                  )}
                >
                  {o}
                  {value === o && <Check className="w-4 h-4 text-laranja" />}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !canCreate && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma opção encontrada
              </li>
            )}

            {canCreate && (
              <li>
                <button
                  type="button"
                  onClick={create}
                  onMouseEnter={() => setActive(filtered.length)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-border transition-colors",
                    active === filtered.length
                      ? "bg-laranja/10 text-laranja"
                      : "text-laranja hover:bg-laranja/5",
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Criar &ldquo;{query.trim()}&rdquo;
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
