import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService } from '../services/api';
import type { Client, IssueCategory, IssueTag, ReferredOffice } from '../types/client';

interface ConsultationModalProps {
  client: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

const OTHERS_GROUP = 'Others';

export function ConsultationModal({ client, onClose, onSaved }: ConsultationModalProps) {
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [offices, setOffices] = useState<ReferredOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingReferral, setDownloadingReferral] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [othersText, setOthersText] = useState('');
  const [legalAdvice, setLegalAdvice] = useState(client.legal_advice ?? '');
  const [referring, setReferring] = useState(!!client.referred_office_id);
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
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.client_id]);

  const grouped = useMemo(() => {
    const groups = new Map<string, IssueCategory[]>();
    for (const cat of categories) {
      const list = groups.get(cat.category_group) ?? [];
      list.push(cat);
      groups.set(cat.category_group, list);
    }
    return groups;
  }, [categories]);

  const hasOthersSelected = useMemo(
    () => [...selectedIds].some((id) => categories.find((c) => c.category_id === id)?.category_group === OTHERS_GROUP),
    [selectedIds, categories]
  );

  function toggleCategory(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        referred_reason: referring ? referralReason || undefined : null,
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
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title pacu-display">Complete Transaction</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  {client.first_name} {client.last_name} &middot; Queue #{client.queue_number}
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            {loading ? (
              <div className="modal-body d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {client.concern && (
                    <div className="mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                      <p className="pacu-eyebrow mb-1">Client's stated concern</p>
                      <p className="mb-0" style={{ fontSize: '0.9rem' }}>{client.concern}</p>
                    </div>
                  )}

                  <p className="pacu-eyebrow mb-3">Issue Categories</p>
                  <div className="row g-3 mb-4">
                    {[...grouped.entries()].map(([group, cats]) => (
                      <div key={group} className="col-md-6">
                        <p className="fw-semibold mb-2" style={{ fontSize: '0.85rem' }}>{group}</p>
                        {cats.map((cat) => (
                          <div className="form-check" key={cat.category_id}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`cat-${cat.category_id}`}
                              checked={selectedIds.has(cat.category_id)}
                              onChange={() => toggleCategory(cat.category_id)}
                            />
                            <label className="form-check-label" htmlFor={`cat-${cat.category_id}`} style={{ fontSize: '0.9rem' }}>
                              {cat.category_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
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
                      placeholder="Record the legal advice given to the client..."
                      value={legalAdvice}
                      onChange={(e) => setLegalAdvice(e.target.value)}
                    />
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3">
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
                    <div className="row g-3 mb-4">
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
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                    Cancel
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
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
