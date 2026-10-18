"use client";

import { useEffect, useMemo, useState } from 'react';
import { listRows, createRow, updateRow, deleteRow, uploadImage } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, RefreshCw, Loader2, Search, Pencil, Trash2,
  ImagePlus, Stethoscope, Scissors, Activity, GraduationCap,
} from 'lucide-react';
import {
  PageHeader, Card, Toolbar, Tabs, Button, BUTTON, SIZE, INPUT, INPUT_H, TEXTAREA, Field, Toggle, Badge, Notice,
  EmptyState, TABLE, Drawer,
} from '@/components/admin/ui';

interface PgBranch {
  id: number;
  branch_name: string;
  category: string;
  short_description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const categoryConfig: Record<string, { label: string; icon: typeof Stethoscope }> = {
  clinical: { label: 'Clinical', icon: Stethoscope },
  surgical: { label: 'Surgical', icon: Scissors },
  non_clinical: { label: 'Non-Clinical', icon: Activity },
};

const defaultFormState = {
  branch_name: '',
  category: 'clinical',
  short_description: '',
  display_order: 0,
  is_active: true,
};

type CategoryTab = 'all' | 'clinical' | 'surgical' | 'non_clinical';

const PgBranchesManager = () => {
  const [branches, setBranches] = useState<PgBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(defaultFormState);
  const [editingBranch, setEditingBranch] = useState<PgBranch | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PgBranch | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setBranches(await listRows<PgBranch>('branches'));
    } catch (err: any) {
      console.error('Error fetching PG branches:', err);
      setError(err.message || 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadIcon = (file: File) => uploadImage(file, 'branches');

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setIconPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setIconFile(null);
    setIconPreview(null);
    setEditingBranch(null);
  };

  const handleAdd = async () => {
    if (!formData.branch_name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      setIsSaving(true);
      let iconUrl: string | null = null;

      if (iconFile) {
        iconUrl = await uploadIcon(iconFile);
      }

      await createRow('branches', {
        branch_name: formData.branch_name,
        category: formData.category,
        short_description: formData.short_description || null,
        icon_url: iconUrl,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      toast.success('Branch added successfully');
      setAddDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (err: any) {
      console.error('Error adding branch:', err);
      toast.error(`Failed to add: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingBranch) return;
    if (!formData.branch_name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      setIsSaving(true);
      let iconUrl = editingBranch.icon_url;

      if (iconFile) {
        iconUrl = await uploadIcon(iconFile);
      }

      await updateRow('branches', editingBranch.id, {
        branch_name: formData.branch_name,
        category: formData.category,
        short_description: formData.short_description || null,
        icon_url: iconUrl,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      toast.success('Branch updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (err: any) {
      console.error('Error updating branch:', err);
      toast.error(`Failed to update: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteRow('branches', deleteTarget.id);
      toast.success('Branch deleted successfully');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchBranches();
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      toast.error(`Failed to delete: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (branch: PgBranch) => {
    try {
      await updateRow('branches', branch.id, { is_active: !branch.is_active });
      toast.success(`Branch ${branch.is_active ? 'deactivated' : 'activated'}`);
      fetchBranches();
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  const openEditDialog = (branch: PgBranch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      category: branch.category,
      short_description: branch.short_description || '',
      display_order: branch.display_order,
      is_active: branch.is_active,
    });
    setIconPreview(branch.icon_url);
    setIconFile(null);
    setEditDialogOpen(true);
  };

  // A drawer closed by Escape, the backdrop or its X resets the form, as the
  // old dialogs did, and so does Cancel.
  const dismissAdd = () => { setAddDialogOpen(false); resetForm(); };
  const dismissEdit = () => { setEditDialogOpen(false); resetForm(); };

  useEffect(() => {
    if (!addDialogOpen && !editDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (addDialogOpen) dismissAdd();
      if (editDialogOpen) dismissEdit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDialogOpen, editDialogOpen]);

  // Filtered branches
  const filteredBranches = branches.filter((b) =>
    b.branch_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const visible = filteredBranches.filter((b) => categoryTab === 'all' || b.category === categoryTab);

  // Stats
  const activeCount = branches.filter((b) => b.is_active).length;
  const categoryTabs = useMemo(
    () => [
      { id: 'all' as CategoryTab, label: 'All', count: branches.length },
      ...(['clinical', 'surgical', 'non_clinical'] as const).map((c) => ({
        id: c as CategoryTab,
        label: categoryConfig[c].label,
        count: branches.filter((b) => b.category === c).length,
      })),
    ],
    [branches],
  );

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</h3>
        <Field label="Branch name *" htmlFor={`branch-name-${isEdit ? 'edit' : 'add'}`}>
          <input
            id={`branch-name-${isEdit ? 'edit' : 'add'}`}
            placeholder="e.g. General Medicine"
            value={formData.branch_name}
            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
            className={`${INPUT} ${INPUT_H}`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor={`branch-category-${isEdit ? 'edit' : 'add'}`}>
            <select
              id={`branch-category-${isEdit ? 'edit' : 'add'}`}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`${INPUT} ${INPUT_H}`}
            >
              <option value="clinical">Clinical</option>
              <option value="surgical">Surgical</option>
              <option value="non_clinical">Non-Clinical</option>
            </select>
          </Field>
          <Field label="Display order" htmlFor={`branch-order-${isEdit ? 'edit' : 'add'}`} hint="Lower numbers show first.">
            <input
              id={`branch-order-${isEdit ? 'edit' : 'add'}`}
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
        </div>

        <Field label="Short description" htmlFor={`branch-desc-${isEdit ? 'edit' : 'add'}`}>
          <textarea
            id={`branch-desc-${isEdit ? 'edit' : 'add'}`}
            placeholder="Brief description of this branch..."
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            rows={3}
            className={`${TEXTAREA} resize-none`}
          />
        </Field>
      </section>

      {/* Icon Upload */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Icon</h3>
        <div className="flex flex-wrap items-center gap-4">
          {iconPreview ? (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconPreview} alt="Icon preview" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={`icon-upload-${isEdit ? 'edit' : 'add'}`}
                className={`${BUTTON.secondary} ${SIZE.sm} cursor-pointer`}
              >
                <ImagePlus className="h-4 w-4" />
                {isEdit ? 'Change icon' : 'Choose icon'}
              </label>
              {iconPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIconFile(null); setIconPreview(null); }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <input
              id={`icon-upload-${isEdit ? 'edit' : 'add'}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconChange}
            />
            <p className="text-xs text-slate-500">Square, about 128 × 128 px. PNG, JPG or WebP.</p>
          </div>
        </div>
      </section>

      {/* Active Toggle */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Toggle
          checked={formData.is_active}
          onChange={(checked) => setFormData({ ...formData, is_active: checked })}
          label="Active (visible on the site)"
        />
      </section>
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="PG branches"
        description="The MD/MS branches listed on the site, grouped as clinical, surgical or non-clinical. A hidden branch is not shown on the site."
        actions={
          <>
            <Button onClick={() => fetchBranches()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add branch
            </Button>
          </>
        }
      />

      {/* Error */}
      {error && (
        <Notice
          tone="danger"
          title="Could not load the branches"
          className="mb-4"
          action={
            <Button size="sm" onClick={() => fetchBranches()} disabled={isLoading}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      <Card
        flush
        title="Branches"
        description={branches.length > 0 ? `${branches.length} branches · ${activeCount} active` : undefined}
      >
        {branches.length > 0 && (
          <>
            <div className="px-3 pt-1">
              <Tabs<CategoryTab> items={categoryTabs} value={categoryTab} onChange={setCategoryTab} />
            </div>
            <Toolbar className="border-b border-slate-100 px-4 py-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search branches…"
                  aria-label="Search branches"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT} ${INPUT_H} pl-9`}
                />
              </div>
              <span className="text-xs tabular-nums text-slate-500">
                {visible.length} of {branches.length}
              </span>
            </Toolbar>
          </>
        )}

        {/* Content */}
        {isLoading && branches.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Loading branches…
          </div>
        ) : branches.length === 0 ? (
          error ? null : (
            <EmptyState
              icon={GraduationCap}
              title="No branches yet"
              hint="Add your first PG branch to get started."
              action={
                <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add branch
                </Button>
              }
            />
          )
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No branch matches"
            hint="Try another name or category."
            action={<Button onClick={() => { setSearchQuery(''); setCategoryTab('all'); }}>Clear filters</Button>}
          />
        ) : (
          <div className={TABLE.wrap}>
            <table className={`${TABLE.table} min-w-[680px]`}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Branch</th>
                  <th className={TABLE.th}>Category</th>
                  <th className={`${TABLE.th} text-right`}>Order</th>
                  <th className={TABLE.th}>Status</th>
                  <th className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((branch) => {
                  const config = categoryConfig[branch.category] || categoryConfig.clinical;
                  const CategoryIcon = config.icon;
                  return (
                    <tr key={branch.id} className={TABLE.row}>
                      <td className={TABLE.td}>
                        <div className="flex items-center gap-3">
                          <BranchIcon src={branch.icon_url} fallback={CategoryIcon} />
                          <div className="min-w-0">
                            <div className="max-w-[22rem] truncate font-medium text-slate-900">{branch.branch_name}</div>
                            {branch.short_description && (
                              <div className="max-w-[22rem] truncate text-xs text-slate-500" title={branch.short_description}>
                                {branch.short_description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={TABLE.td}>
                        <Badge>
                          <CategoryIcon className="h-3 w-3" /> {config.label}
                        </Badge>
                      </td>
                      <td className={`${TABLE.td} text-right tabular-nums text-slate-500`}>{branch.display_order}</td>
                      <td className={TABLE.td}>
                        <Toggle
                          checked={branch.is_active}
                          onChange={() => toggleActive(branch)}
                          label={branch.is_active ? 'Active' : 'Hidden'}
                        />
                      </td>
                      <td className={TABLE.td}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${branch.branch_name}`}
                            title="Edit"
                            onClick={() => openEditDialog(branch)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${branch.branch_name}`}
                            title="Delete"
                            className="hover:bg-red-50 hover:text-red-600"
                            onClick={() => { setDeleteTarget(branch); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add */}
      <Drawer
        open={addDialogOpen}
        title="Add branch"
        onClose={dismissAdd}
        footer={
          <>
            <Button onClick={dismissAdd}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Add branch'}
            </Button>
          </>
        }
      >
        {renderForm(false)}
      </Drawer>

      {/* Edit */}
      <Drawer
        open={editDialogOpen}
        title={editingBranch ? `Edit ${editingBranch.branch_name}` : 'Edit branch'}
        onClose={dismissEdit}
        footer={
          <>
            <Button onClick={dismissEdit}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          </>
        }
      >
        {renderForm(true)}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 sm:rounded-2xl">
          <div className="space-y-2 p-5 pr-12">
            <DialogTitle className="text-base font-semibold text-slate-900">Delete this branch?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-800">{deleteTarget?.branch_name}</span> will be removed. This cannot
              be undone.
            </DialogDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * The branch's uploaded icon, or its category's icon when there is none or it
 * fails to load. Held in state rather than by rewriting the DOM on error.
 */
function BranchIcon({ src, fallback: Fallback }: { src: string | null; fallback: typeof Stethoscope }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Fallback className="h-4 w-4" />
      )}
    </div>
  );
}

export default PgBranchesManager;
