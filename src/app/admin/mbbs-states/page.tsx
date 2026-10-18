"use client";

import React, { useState, useEffect } from 'react';
import { listRows, createRow, updateRow, deleteRow } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Map, Plus, Pencil, Trash2, Loader2, RefreshCw, Search } from 'lucide-react';
import {
  PageHeader, Card, Toolbar, Button, INPUT, INPUT_H, TEXTAREA, Field, Toggle, Notice, EmptyState, TABLE, Drawer,
} from '@/components/admin/ui';

interface MBBSState {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  colleges_count: number | null;
  content: string | null;
  is_active: boolean;
}

const emptyState = {
  name: '',
  slug: '',
  image_url: '',
  colleges_count: 0,
  content: '',
  is_active: true
};

const FORM_ID = 'mbbs-state-form';

const MBBSStateManager = () => {
  const [states, setStates] = useState<MBBSState[]>([]);
  const [formData, setFormData] = useState<typeof emptyState>(emptyState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    setIsLoading(true);
    try {
      setStates(await listRows<MBBSState>('states'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch states');
      toast.error('Failed to fetch states');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and Slug are required');
      return;
    }

    setIsLoading(true);

    try {
      if (editingId !== null) {
        await updateRow('states', editingId, formData);
        toast.success('State updated successfully');
      } else {
        await createRow('states', formData);
        toast.success('State created successfully');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save state');
      return;
    } finally {
      setIsLoading(false);
    }

    setDialogOpen(false);
    resetForm();
    fetchStates();
  };

  const handleEdit = (state: MBBSState) => {
    setFormData({
      name: state.name,
      slug: state.slug,
      image_url: state.image_url || '',
      colleges_count: state.colleges_count || 0,
      content: state.content || '',
      is_active: state.is_active ?? true,
    });
    setEditingId(state.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete state "${name}"? This cannot be undone.`)) return;
    setIsLoading(true);
    try {
      await deleteRow('states', id);
    } catch {
      toast.error('Failed to delete state');
      return;
    } finally {
      setIsLoading(false);
    }
    toast.success('State deleted');
    fetchStates();
  };

  const toggleStatus = async (id: number, current: boolean) => {
    try {
      await updateRow('states', id, { is_active: !current });
    } catch {
      toast.error('Failed to update status');
      return;
    }
    fetchStates();
  };

  const resetForm = () => {
    setFormData(emptyState);
    setEditingId(null);
  };

  const closeDrawer = () => {
    setDialogOpen(false);
    resetForm();
  };

  // The drawer closes on Escape, like the leads panel.
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  const activeCount = states.filter(s => s.is_active).length;

  const q = query.trim().toLowerCase();
  const visible = q
    ? states.filter((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
    : states;

  return (
    <div>
      <PageHeader
        title="MBBS states"
        description="The Indian states shown on the MBBS India page. A hidden state stays here but is not shown on the site."
        actions={
          <>
            <Button onClick={fetchStates} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add state
            </Button>
          </>
        }
      />

      {error && (
        <Notice
          tone="danger"
          title="Could not load the states"
          className="mb-4"
          action={
            <Button size="sm" onClick={fetchStates} disabled={isLoading}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      <Card
        flush
        title="States"
        description={
          states.length > 0
            ? `${states.length} states · ${activeCount} active · ${states.length - activeCount} hidden`
            : undefined
        }
      >
        {states.length > 0 && (
          <Toolbar className="border-b border-slate-100 px-4 py-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or slug…"
                aria-label="Search states"
                className={`${INPUT} ${INPUT_H} pl-9`}
              />
            </div>
            <span className="text-xs tabular-nums text-slate-500">
              {visible.length} of {states.length}
            </span>
          </Toolbar>
        )}

        {isLoading && states.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Loading states…
          </div>
        ) : states.length === 0 ? (
          error ? null : (
            <EmptyState
              icon={Map}
              title="No states added yet"
              hint="Add a state and it appears on the MBBS India page."
              action={
                <Button variant="primary" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add state
                </Button>
              }
            />
          )
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No state matches"
            action={<Button onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <div className={TABLE.wrap}>
            <table className={`${TABLE.table} min-w-[640px]`}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>State</th>
                  <th className={`${TABLE.th} text-right`}>Colleges</th>
                  <th className={TABLE.th}>Description</th>
                  <th className={TABLE.th}>Status</th>
                  <th className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((state) => (
                  <tr key={state.id} className={TABLE.row}>
                    <td className={TABLE.td}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                          {state.image_url ? (
                            <img src={state.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Map className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{state.name}</div>
                          <div className="truncate font-mono text-xs text-slate-400">{state.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${TABLE.td} text-right tabular-nums`}>
                      {state.colleges_count !== null ? state.colleges_count : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={TABLE.td}>
                      {state.content ? (
                        <div className="max-w-[20rem] truncate text-slate-500" title={state.content}>
                          {state.content}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={TABLE.td}>
                      <Toggle
                        checked={!!state.is_active}
                        onChange={() => toggleStatus(state.id, !!state.is_active)}
                        label={state.is_active ? 'Active' : 'Hidden'}
                      />
                    </td>
                    <td className={TABLE.td}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${state.name}`}
                          title="Edit"
                          onClick={() => handleEdit(state)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${state.name}`}
                          title="Delete"
                          className="hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(state.id, state.name)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer
        open={dialogOpen}
        title={editingId ? 'Edit state' : 'Add state'}
        onClose={closeDrawer}
        footer={
          <>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Save changes' : 'Create state'}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">State</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State name *" htmlFor="name">
                <input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: editingId ? formData.slug : e.target.value.toLowerCase().replace(/\s+/g, '-')
                  })}
                  placeholder="e.g. Maharashtra"
                  required
                  className={`${INPUT} ${INPUT_H}`}
                />
              </Field>
              <Field label="Slug *" htmlFor="slug" hint="The page address. Filled in from the name when you add a state.">
                <input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. maharashtra"
                  className={`${INPUT} ${INPUT_H} font-mono`}
                />
              </Field>
            </div>
            <Field label="Number of colleges" htmlFor="colleges_count">
              <input
                id="colleges_count"
                type="number"
                inputMode="numeric"
                value={formData.colleges_count || 0}
                onChange={(e) => setFormData({ ...formData, colleges_count: parseInt(e.target.value) || 0 })}
                className={`${INPUT} ${INPUT_H} sm:max-w-[12rem]`}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page content</h3>
            <Field label="Image URL" htmlFor="image_url">
              <input
                id="image_url"
                value={formData.image_url || ''}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Field label="Content / description" htmlFor="content">
              <textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                placeholder="Brief description of MBBS opportunities in this state..."
                className={TEXTAREA}
              />
            </Field>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Toggle
              checked={!!formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              label="Active (visible on the site)"
            />
          </section>
        </form>
      </Drawer>
    </div>
  );
};

export default MBBSStateManager;
