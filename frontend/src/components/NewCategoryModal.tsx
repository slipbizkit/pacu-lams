import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { lookupService } from '../services/api';
import type { IssueCategoryGroup } from '../types/client';

interface NewCategoryModalProps {
  onClose: () => void;
  onCreated: (group: IssueCategoryGroup) => void;
}

export function NewCategoryModal({ onClose, onCreated }: NewCategoryModalProps) {
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await lookupService.createIssueCategoryGroup({
        group_name: groupName.trim(),
      });
      Swal.fire({
        icon: 'success',
        title: 'Category added',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
      });
      onCreated(created);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not add category',
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
                <h5 className="modal-title pacu-display">New Category</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  A category groups related issues together.
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              <label className="form-label">Category Name <span style={{ color: 'red' }}>*</span></label>
              <input
                className="form-control"
                placeholder="e.g. Wages"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                autoFocus
              />
              <div className="form-text">
                You can add issues to this category afterwards with “New Issue”.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Add Category
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
