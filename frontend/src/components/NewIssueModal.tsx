import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { lookupService } from '../services/api';
import type { IssueCategory, IssueCategoryGroup } from '../types/client';

interface NewIssueModalProps {
  groups: IssueCategoryGroup[];
  onClose: () => void;
  onCreated: (category: IssueCategory) => void;
}

export function NewIssueModal({ groups, onClose, onCreated }: NewIssueModalProps) {
  const [groupId, setGroupId] = useState<number | ''>(groups[0]?.group_id ?? '');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (groupId === '') return;
    setSaving(true);
    try {
      const created = await lookupService.createIssueCategory({
        group_id: groupId,
        category_name: categoryName.trim(),
        description: description.trim() || undefined,
      });
      Swal.fire({
        icon: 'success',
        title: 'Issue added',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
      });
      onCreated(created);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not add issue',
        text: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <div>
                <h5 className="modal-title pacu-display">New Issue</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  Add an issue under an existing category.
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Category <span style={{ color: 'red' }}>*</span></label>
                <select
                  className="form-select"
                  value={groupId}
                  onChange={(e) => setGroupId(Number(e.target.value))}
                  required
                  autoFocus
                >
                  {groups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Issue Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. Delayed payment"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Add Issue
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
