import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

interface MultiSelectChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectChips({ options, selected, onChange, placeholder }: MultiSelectChipsProps) {
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  }, [search, options]);

  function measureAndOpen() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
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

  function toggleItem(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
      setFocusedIdx(-1);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
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
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIdx >= 0) {
      e.preventDefault();
      toggleItem(filtered[focusedIdx]);
    }
  }

  const dropdown = (
    <div
      ref={listRef}
      role="listbox"
      aria-multiselectable="true"
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
          No matching options
        </div>
      ) : (
        filtered.map((option, idx) => {
          const isSelected = selected.includes(option);
          const focused = idx === focusedIdx;
          return (
            <div
              key={option}
              data-idx={idx}
              role="option"
              aria-selected={isSelected}
              className="px-3 py-2 d-flex align-items-center gap-2"
              style={{
                cursor: 'pointer',
                fontSize: '0.9rem',
                backgroundColor: focused ? 'var(--pacu-accent-soft)' : undefined,
              }}
              onMouseDown={(e) => { e.preventDefault(); toggleItem(option); }}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              <input
                type="checkbox"
                className="form-check-input mt-0 flex-shrink-0"
                checked={isSelected}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              <span>{option}</span>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="form-control d-flex align-items-center gap-2"
        style={{ cursor: 'text', padding: '6px 12px', minHeight: 38 }}
        onClick={() => { measureAndOpen(); searchRef.current?.focus(); }}
      >
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (!open) measureAndOpen(); }}
          onFocus={() => { if (!open) measureAndOpen(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Search...'}
          className="border-0 p-0 m-0 flex-grow-1 bg-transparent"
          style={{ outline: 'none', minWidth: 0, color: 'inherit', fontSize: '0.9rem' }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <i
          className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted flex-shrink-0`}
          style={{ fontSize: '0.75rem' }}
        />
      </div>

      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {selected.map((option) => (
            <span
              key={option}
              className="d-inline-flex align-items-center gap-1"
              style={{
                padding: '3px 6px 3px 8px',
                borderRadius: 'var(--pacu-radius-sm)',
                backgroundColor: 'var(--pacu-accent-soft)',
                color: 'var(--pacu-accent)',
                fontSize: '0.8rem',
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {option}
              <button
                type="button"
                onClick={() => toggleItem(option)}
                aria-label={`Remove ${option}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.7,
                  lineHeight: 1,
                }}
              >
                <i className="bi bi-x" style={{ fontSize: '0.9rem' }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && createPortal(dropdown, document.body)}
    </div>
  );
}
