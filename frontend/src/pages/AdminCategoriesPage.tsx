import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { lookupService } from '../services/api';
import type { IssueCategory } from '../types/client';

const EMPTY_FORM = { category_group: '', category_name: '', description: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCategories(await lookupService.allIssueCategories());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load issue categories', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, IssueCategory[]>();
    for (const cat of categories) {
      const list = groups.get(cat.category_group) ?? [];
      list.push(cat);
      groups.set(cat.category_group, list);
    }
    return groups;
  }, [categories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await lookupService.createIssueCategory(form);
      setCategories((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      Swal.fire({ icon: 'success', title: 'Category added', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not add category', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(cat: IssueCategory) {
    const action = cat.is_active ? 'Deactivate' : 'Activate';
    const result = await Swal.fire({
      icon: 'warning',
      title: `${action} "${cat.category_name}"?`,
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: cat.is_active ? 'var(--pacu-danger)' : 'var(--pacu-accent)',
    });
    if (!result.isConfirmed) return;

    try {
      const updated = await lookupService.updateIssueCategory(cat.category_id, { is_active: !cat.is_active });
      setCategories((prev) => prev.map((c) => (c.category_id === updated.category_id ? updated : c)));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not update category', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Issue Categories</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="bi bi-plus-lg me-2" />
          New Category
        </button>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Categories lawyers tag on a transaction, grouped for display in the consultation modal.
      </p>

      {showForm && (
        <div className="card mb-4">
          <div className="card-body p-4">
            <form onSubmit={handleCreate}>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Group *</label>
                  <input className="form-control" placeholder="e.g. Wages" value={form.category_group} onChange={(e) => setForm({ ...form, category_group: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Name *</label>
                  <input className="form-control" placeholder="e.g. Delay" value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Description</label>
                  <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="row g-3">
          {[...grouped.entries()].map(([group, cats]) => (
            <div key={group} className="col-md-6">
              <div className="card h-100">
                <div className="card-body p-4">
                  <p className="pacu-eyebrow mb-3">{group}</p>
                  {cats.map((cat) => (
                    <div key={cat.category_id} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid var(--pacu-border)' }}>
                      <span style={{ opacity: cat.is_active ? 1 : 0.5, fontSize: '0.9rem' }}>{cat.category_name}</span>
                      <button
                        className={`btn btn-sm ${cat.is_active ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                        onClick={() => handleToggleActive(cat)}
                      >
                        {cat.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
