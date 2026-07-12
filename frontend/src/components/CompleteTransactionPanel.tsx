import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService } from '../services/api';
import type { Client, IssueCategory, IssueTag, ReferredOffice } from '../types/client';

interface CompleteTransactionPanelProps {
  client: Client;
  onCancel: () => void;
  onSaved: (client: Client) => void;
}

const OTHERS_GROUP = 'Others';

// ---------------------------------------------------------------------------
// IssueMultiSelect
// ---------------------------------------------------------------------------

interface IssueMultiSelectProps {
  categories: IssueCategory[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}

function IssueMultiSelect({ categories, selectedIds, onChange }: IssueMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter by category_name only, then group
  const { filteredGrouped, flatFiltered } = useMemo(() => {
    const query = search.trim().toLowerCase();
    const flat = query
      ? categories.filter((c) => c.category_name.toLowerCase().includes(query))
      : categories;
    const groups = new Map<string, IssueCategory[]>();
    for (const cat of flat) {
      const list = groups.get(cat.category_group) ?? [];
      list.push(cat);
      groups.set(cat.category_group, list);
    }
    return { filteredGrouped: groups, flatFiltered: flat };
  }, [search, categories]);

  // Measure trigger position for the portal-rendered dropdown
  function measureAndOpen() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  // Close on outside pointer-down
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
        setSearch('');
        setFocusedId(null);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Reset keyboard focus when search changes
  useEffect(() => { setFocusedId(null); }, [search]);

  function toggleItem(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
      setFocusedId(null);
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
      if (flatFiltered.length === 0) return;
      const cur = focusedId !== null ? flatFiltered.findIndex((c) => c.category_id === focusedId) : -1;
      const next =
        e.key === 'ArrowDown'
          ? cur < flatFiltered.length - 1 ? cur + 1 : 0
          : cur > 0 ? cur - 1 : flatFiltered.length - 1;
      const nextId = flatFiltered[next].category_id;
      setFocusedId(nextId);
      setTimeout(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-id="${nextId}"]`)?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedId !== null) {
      e.preventDefault();
      toggleItem(focusedId);
    }
  }

  const selectedCats = categories.filter((c) => selectedIds.has(c.category_id));

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
      {flatFiltered.length === 0 ? (
        <div className="px-3 py-3 text-muted" style={{ fontSize: '0.875rem' }}>
          No matching issues
        </div>
      ) : (
        [...filteredGrouped.entries()].sort(([a], [b]) => a === OTHERS_GROUP ? 1 : b === OTHERS_GROUP ? -1 : 0).map(([group, cats], groupIdx) => (
          <div key={group}>
            <div
              className="px-3 pb-1"
              style={{
                paddingTop: groupIdx === 0 ? '0.5rem' : '0.6rem',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--pacu-accent)',
                userSelect: 'none',
                borderTop: groupIdx > 0 ? '1px solid var(--bs-border-color)' : undefined,
              }}
            >
              {group}
            </div>
            {cats.map((cat) => {
              const selected = selectedIds.has(cat.category_id);
              const focused = cat.category_id === focusedId;
              return (
                <div
                  key={cat.category_id}
                  data-id={cat.category_id}
                  role="option"
                  aria-selected={selected}
                  className="px-3 py-2 d-flex align-items-center gap-2"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    backgroundColor: focused ? 'var(--pacu-accent-soft)' : undefined,
                    transition: 'background-color 0.08s',
                  }}
                  onMouseDown={(e) => { e.preventDefault(); toggleItem(cat.category_id); }}
                  onMouseEnter={() => setFocusedId(cat.category_id)}
                >
                  <input
                    type="checkbox"
                    className="form-check-input mt-0 flex-shrink-0"
                    checked={selected}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <span>{cat.category_name}</span>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search / trigger */}
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
          placeholder="Search issues…"
          className="border-0 p-0 m-0 flex-grow-1 bg-transparent"
          style={{ outline: 'none', minWidth: 0, color: 'inherit', fontSize: '0.9rem' }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Search issues"
        />
        <i
          className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted flex-shrink-0`}
          style={{ fontSize: '0.75rem' }}
        />
      </div>

      {/* Selected chips */}
      {selectedCats.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {selectedCats.map((cat) => (
            <span
              key={cat.category_id}
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
              {cat.category_name}
              <button
                type="button"
                onClick={() => toggleItem(cat.category_id)}
                aria-label={`Remove ${cat.category_name}`}
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

// ---------------------------------------------------------------------------
// CompleteTransactionPanel
// ---------------------------------------------------------------------------

export function CompleteTransactionPanel({ client, onCancel, onSaved }: CompleteTransactionPanelProps) {
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [offices, setOffices] = useState<ReferredOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingReferral, setDownloadingReferral] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [othersText, setOthersText] = useState('');
  const [legalAdvice, setLegalAdvice] = useState(client.legal_advice ?? '');
  const [referring, setReferring] = useState(!!client.referred_office_id || client.referred_reason !== null);
  const [officeId, setOfficeId] = useState<number | ''>(client.referred_office_id ?? '');
  const [referralReason, setReferralReason] = useState(client.referred_reason ?? '');
  const [markIncomplete, setMarkIncomplete] = useState(false);

  useEffect(() => {
    Promise.all([
      lookupService.issueCategories(),
      lookupService.referredOffices(),
      clientService.getMine(client.client_id),
    ])
      .then(([cats, offs, detail]) => {
        setCategories(cats);
        setOffices(offs);
        const ids = new Set(detail.issues.map((i: IssueTag) => i.category_id));
        setSelectedIds(ids);
        const othersTag = detail.issues.find((i: IssueTag) => i.issue_description);
        if (othersTag) setOthersText(othersTag.issue_description ?? '');
      })
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Could not load consultation data', text: err instanceof Error ? err.message : 'Please try again' });
        onCancel();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.client_id]);

  const hasOthersSelected = useMemo(
    () => [...selectedIds].some((id) => categories.find((c) => c.category_id === id)?.category_group === OTHERS_GROUP),
    [selectedIds, categories]
  );

  async function handleDownloadReferral() {
    setDownloadingReferral(true);
    try {
      await clientService.downloadReferralPdf(client.client_id, client.reference_no);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not download referral form', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setDownloadingReferral(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!markIncomplete) {
      const missingCategory = selectedIds.size === 0;
      const missingAdvice = legalAdvice.trim() === '';
      if (missingCategory || missingAdvice) {
        const missingItems = [
          missingCategory && 'No issue category has been selected.',
          missingAdvice && 'No legal advice has been entered.',
        ].filter(Boolean).join('<br>');
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Incomplete Transaction',
          html: `${missingItems}<br><br>If you are not yet ready to complete this consultation, please mark the transaction as <strong>Incomplete</strong> so you can continue it later.`,
          showCancelButton: true,
          confirmButtonText: 'Mark as Incomplete',
          cancelButtonText: 'Continue Editing',
          confirmButtonColor: 'var(--pacu-accent)',
        });
        if (result.isConfirmed) {
          setMarkIncomplete(true);
        }
        return;
      }

      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Complete this transaction?',
        text: 'This closes the case and cannot be undone from this screen.',
        showCancelButton: true,
        confirmButtonText: 'Complete',
        confirmButtonColor: 'var(--pacu-accent)',
      });
      if (!confirm.isConfirmed) return;
    }

    setSaving(true);
    try {
      const updated = await clientService.saveConsultation(client.client_id, {
        issue_category_ids: [...selectedIds],
        issue_description: hasOthersSelected ? othersText : undefined,
        legal_advice: legalAdvice || undefined,
        referred_office_id: referring && officeId !== '' ? Number(officeId) : null,
        referred_reason: referring ? (referralReason.trim() || (markIncomplete ? '' : undefined)) : null,
        mark_incomplete: markIncomplete,
      });
      Swal.fire({
        icon: 'success',
        title: markIncomplete ? 'Saved' : 'Transaction completed',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });
      onSaved(updated);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card pacu-transaction-panel h-100">
      <div className="card-body p-4 p-md-5 d-flex flex-column">
        <div className="mb-4">
          <h5 className="pacu-display mb-1">Complete Transaction</h5>
          <p className="mb-0" style={{ fontSize: '0.85rem' }}>
            {client.first_name} {client.last_name} &middot; Queue #{client.queue_number}
          </p>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="d-flex flex-column flex-grow-1">
            {client.concern && (
              <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                <p className="pacu-eyebrow mb-1">Client's stated concern</p>
                <p className="mb-0" style={{ fontSize: '0.9rem' }}>{client.concern}</p>
              </div>
            )}

            <p className="pacu-eyebrow mb-2">Issue Categories</p>
            <div className="mb-4">
              <IssueMultiSelect
                categories={categories}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
              />
            </div>

            {hasOthersSelected && (
              <div className="mb-4">
                <label className="form-label">Please describe the "Others" issue</label>
                <input className="form-control" value={othersText} onChange={(e) => setOthersText(e.target.value)} />
              </div>
            )}

            <p className="pacu-eyebrow mb-3">Legal Advice</p>
            <div className="mb-4">
              <textarea
                className="form-control"
                rows={5}

                value={legalAdvice}
                onChange={(e) => setLegalAdvice(e.target.value)}
              />
            </div>

            <div className="card mb-4">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="referring"
                      checked={referring}
                      onChange={(e) => setReferring(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="referring">
                      Refer to another office
                    </label>
                  </div>
                  {client.referred_office_id && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleDownloadReferral}
                      disabled={downloadingReferral}
                    >
                      {downloadingReferral ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : (
                        <i className="bi bi-file-earmark-pdf me-1" />
                      )}
                      Download Referral Form
                    </button>
                  )}
                </div>

                {referring && (
                  <div className="row g-3 mt-2">
                    <div className="col-md-5">
                      <label className="form-label">Referral office</label>
                      <select className="form-select" value={officeId} onChange={(e) => setOfficeId(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">Select an office</option>
                        {offices.map((o) => (
                          <option key={o.office_id} value={o.office_id}>{o.office_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-7">
                      <label className="form-label">Reason for referral</label>
                      <input className="form-control" value={referralReason} onChange={(e) => setReferralReason(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body p-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="markIncomplete"
                    checked={markIncomplete}
                    onChange={(e) => setMarkIncomplete(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="markIncomplete">
                    <span className="fw-semibold d-block">Mark as incomplete</span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      Save what's filled in so far and come back to finish later. Nothing above is required
                      while this is checked.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pacu-panel-footer mt-auto">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                {markIncomplete ? 'Save & Keep In Progress' : 'Complete Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
