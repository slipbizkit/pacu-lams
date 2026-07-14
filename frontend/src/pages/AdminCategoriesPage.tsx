import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { lookupService } from '../services/api';
import type { IssueCategory, IssueCategoryGroup } from '../types/client';
import { NewCategoryModal } from '../components/NewCategoryModal';
import { NewIssueModal } from '../components/NewIssueModal';

export default function AdminCategoriesPage() {
  const [groups, setGroups] = useState<IssueCategoryGroup[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [groupRows, categoryRows] = await Promise.all([
        lookupService.issueCategoryGroups(),
        lookupService.allIssueCategories(),
      ]);
      setGroups(groupRows);
      setCategories(categoryRows);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load issue categories', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Keyed off the group list (not the issues), so a category with no issues yet
  // still gets a card.
  const issuesByGroup = useMemo(() => {
    const map = new Map<number, IssueCategory[]>();
    for (const group of groups) map.set(group.group_id, []);
    for (const cat of categories) {
      const list = map.get(cat.group_id);
      if (list) list.push(cat);
    }
    return map;
  }, [groups, categories]);

  function handleCategoryCreated(created: IssueCategoryGroup) {
    setGroups((prev) => [...prev, created].sort((a, b) => a.group_name.localeCompare(b.group_name)));
    setShowCategoryModal(false);
  }

  function handleIssueCreated(created: IssueCategory) {
    setCategories((prev) => [...prev, created]);
    setShowIssueModal(false);
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
      Swal.fire({ icon: 'error', title: 'Could not update issue', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Issue Categories</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setShowCategoryModal(true)}>
            <i className="bi bi-folder-plus me-2" />
            New Category
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowIssueModal(true)}
            disabled={groups.length === 0}
            title={groups.length === 0 ? 'Add a category first' : undefined}
          >
            <i className="bi bi-plus-lg me-2" />
            New Issue
          </button>
        </div>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Categories lawyers tag on a transaction, grouped for display in the consultation modal.
      </p>

      {showCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}

      {showIssueModal && (
        <NewIssueModal
          groups={groups}
          onClose={() => setShowIssueModal(false)}
          onCreated={handleIssueCreated}
        />
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="row g-3">
          {groups.map((group) => {
            const issues = issuesByGroup.get(group.group_id) ?? [];
            return (
              <div key={group.group_id} className="col-md-6">
                <div className="card h-100">
                  <div className="card-body p-4">
                    <p className="pacu-eyebrow mb-3">{group.group_name}</p>
                    {issues.length === 0 ? (
                      <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                        No issues yet. Use “New Issue” to add one.
                      </p>
                    ) : (
                      issues.map((cat) => (
                        <div key={cat.category_id} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: '1px solid var(--pacu-border)' }}>
                          <span style={{ opacity: cat.is_active ? 1 : 0.5, fontSize: '0.9rem' }}>{cat.category_name}</span>
                          <button
                            className={`btn btn-sm ${cat.is_active ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                            onClick={() => handleToggleActive(cat)}
                          >
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
