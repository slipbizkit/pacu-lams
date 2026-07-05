import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  id: number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, id, required, invalid }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? options.filter((o) => o.label.toLowerCase().includes(query)) : options;
  }, [search, options]);

  function measureAndOpen() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
        setSearch('');
        setFocusedIdx(-1);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => { setFocusedIdx(-1); }, [search]);

  function selectValue(option: SearchableSelectOption) {
    onChange(option.id);
    setOpen(false);
    setSearch('');
    setFocusedIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
      setFocusedIdx(-1);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      measureAndOpen();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next =
        e.key === 'ArrowDown'
          ? focusedIdx < filtered.length - 1 ? focusedIdx + 1 : 0
          : focusedIdx > 0 ? focusedIdx - 1 : filtered.length - 1;
      setFocusedIdx(next);
      setTimeout(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      selectValue(filtered[focusedIdx]);
    }
  }

  const dropdown = (
    <div
      ref={listRef}
      role="listbox"
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 1070,
        maxHeight: 260,
        overflowY: 'auto',
        backgroundColor: 'var(--bs-body-bg)',
        border: '1px solid var(--bs-border-color)',
        borderRadius: 'var(--pacu-radius)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-3 text-muted" style={{ fontSize: '0.875rem' }}>
          No matching cities
        </div>
      ) : (
        filtered.map((option, idx) => {
          const selected = option.id === value;
          const focused = idx === focusedIdx;
          return (
            <div
              key={option.id}
              data-idx={idx}
              role="option"
              aria-selected={selected}
              className="px-3 py-2"
              style={{
                cursor: 'pointer',
                fontSize: '0.9rem',
                backgroundColor: focused ? 'var(--pacu-accent-soft)' : selected ? 'var(--pacu-accent-soft)' : undefined,
                color: selected ? 'var(--pacu-accent)' : undefined,
                fontWeight: selected ? 500 : 400,
              }}
              onMouseDown={(e) => { e.preventDefault(); selectValue(option); }}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              {option.label}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className={`form-control d-flex align-items-center gap-2${invalid ? ' is-invalid' : ''}`}
        style={{ cursor: 'text', padding: '6px 12px', minHeight: 38 }}
        onClick={() => measureAndOpen()}
      >
        <input
          id={id}
          ref={searchRef}
          type="text"
          value={open ? search : selectedOption?.label ?? ''}
          onChange={(e) => { setSearch(e.target.value); if (!open) measureAndOpen(); }}
          onFocus={() => { if (!open) measureAndOpen(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="border-0 p-0 m-0 flex-grow-1 bg-transparent"
          style={{ outline: 'none', minWidth: 0, color: 'inherit', fontSize: '0.9rem' }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-autocomplete="list"
          required={required}
          autoComplete="off"
        />
        <i
          className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted flex-shrink-0`}
          style={{ fontSize: '0.75rem' }}
        />
      </div>

      {open && createPortal(dropdown, document.body)}
    </div>
  );
}
