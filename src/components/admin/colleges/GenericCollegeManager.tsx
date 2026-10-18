"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import CollegeVisual from '@/components/ui/CollegeVisual';
import { listRows, createRow, updateRow, deleteRow, uploadImage } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, ImagePlus, Plus, Building2, Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Card, Toolbar, Button, BUTTON, SIZE, INPUT, INPUT_H, Field, Badge, Notice, EmptyState, TABLE, Drawer,
} from '@/components/admin/ui';

export interface GenericCollege {
  id: number;
  slug: string;
  college_name: string;
  state: string;
  city: string | null;
  intake: number | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  /** Read-only here: shown in the list, never written by this screen. */
  college_type?: string | null;
  university_name?: string | null;
  established_year?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface GenericCollegeManagerProps {
  /** Admin API resource this tab edits, e.g. "colleges-ug". */
  resource: string;
  title: string;
  description: string;
  /**
   * Bumped by the page header's "Add college" button. Each change opens the
   * add form. Left undefined, the list shows its own add button instead.
   */
  addSignal?: number;
}

/** Rows drawn at once. 765 colleges in one table is a slow page for nothing. */
const PAGE = 100;

const GenericCollegeManager: React.FC<GenericCollegeManagerProps> = ({ resource, title, description, addSignal }) => {
  const [colleges, setColleges] = useState<GenericCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const [selectedCollege, setSelectedCollege] = useState<GenericCollege | null>(null);
  const [newCollege, setNewCollege] = useState<Partial<GenericCollege>>({
    college_name: '',
    state: '',
    city: '',
    intake: 0,
    image_url: '',
    display_order: 100
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchColleges();
  }, [resource]);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setColleges(await listRows<GenericCollege>(resource));
    } catch (err) {
      console.error(`Error fetching ${resource}:`, err);
      toast.error(`Failed to load data for ${title}`);
      setLoadError(err instanceof Error ? err.message : `Failed to load data for ${title}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      // Validate file extension
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        toast.error("Invalid file format. Only JPG, JPEG, PNG, WEBP, and AVIF are allowed.");
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Maximum allowed size is 5MB.");
        e.target.value = ''; // Reset input
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCollege = async () => {
    if (!newCollege.college_name || !newCollege.state) {
      toast.error("Please fill in College Name and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = newCollege.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'colleges');
      }

      const slug = newCollege.college_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await createRow(resource, {
        college_name: newCollege.college_name,
        slug: slug,
        city: newCollege.city || null,
        state: newCollege.state,
        intake: newCollege.intake || 0,
        image_url: imageUrl,
        is_active: true,
        display_order: newCollege.display_order ?? ((colleges.length + 1) * 100)
      });

      toast.success("College added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchColleges();
    } catch (err: any) {
      console.error('Error adding college:', err);
      toast.error(`Failed to add college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCollege = async () => {
    if (!selectedCollege || !selectedCollege.college_name || !selectedCollege.state) {
      toast.error("Please fill in College Name and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = selectedCollege.image_url;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'colleges');
      } else if (previewUrl === null) {
        imageUrl = null; // Explicitly remove the image
      }

      const slug = selectedCollege.college_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await updateRow(resource, selectedCollege.id, {
        college_name: selectedCollege.college_name,
        slug: slug,
        city: selectedCollege.city || null,
        state: selectedCollege.state,
        intake: selectedCollege.intake,
        image_url: imageUrl,
        display_order: selectedCollege.display_order
      });


      toast.success("College updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCollege(null);
      setImageFile(null);
      setPreviewUrl(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error updating college:', err);
      toast.error(`Failed to update college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    try {
      setIsDeleting(true);
      await deleteRow(resource, selectedCollege.id);
      toast.success("College deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCollege(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error deleting college:', err);
      toast.error(`Failed to delete college: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setNewCollege({ college_name: '', state: '', city: '', intake: 0, image_url: '', display_order: (colleges.length + 1) * 100 });
    setImageFile(null);
    setPreviewUrl(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEdit = (college: GenericCollege) => {
    setSelectedCollege(college);
    // A photo picked for another college and then cancelled must not ride along.
    setImageFile(null);
    setPreviewUrl(college.image_url);
    setIsEditDialogOpen(true);
  };

  // The page header owns the "Add college" button; it bumps addSignal.
  // The first value is the one this list mounted with, so a tab switch
  // never opens the form by itself.
  const lastAddSignal = useRef(addSignal);
  useEffect(() => {
    if (addSignal === undefined || addSignal === lastAddSignal.current) return;
    lastAddSignal.current = addSignal;
    openAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  // The drawers close on Escape, like the leads panel.
  useEffect(() => {
    if (!isAddDialogOpen && !isEditDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAddDialogOpen, isEditDialogOpen]);

  const filteredColleges = colleges.filter(u =>
    u.college_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.state ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stateOptions = useMemo(
    () => Array.from(new Set(colleges.map((c) => c.state).filter(Boolean))).sort(),
    [colleges],
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(colleges.map((c) => c.college_type).filter((t): t is string => !!t))).sort(),
    [colleges],
  );

  const visible = filteredColleges.filter(
    (u) =>
      (stateFilter === 'all' || u.state === stateFilter) &&
      (typeFilter === 'all' || u.college_type === typeFilter),
  );

  useEffect(() => setShown(PAGE), [searchQuery, stateFilter, typeFilter, resource]);

  const filtering = searchQuery !== '' || stateFilter !== 'all' || typeFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setStateFilter('all');
    setTypeFilter('all');
  };

  const activeCount = colleges.filter((c) => c.is_active).length;

  /** One form for add and edit; only the values and the setter differ. */
  const renderFields = (
    values: Partial<GenericCollege>,
    set: (patch: Partial<GenericCollege>) => void,
    idPrefix: string,
  ) => (
    <div className="space-y-6">
      <FormSection title="College">
        <Field label="College name *" htmlFor={`${idPrefix}-name`}>
          <input
            id={`${idPrefix}-name`}
            placeholder="e.g. AIIMS Delhi"
            value={values.college_name || ''}
            onChange={(e) => set({ college_name: e.target.value })}
            className={`${INPUT} ${INPUT_H}`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State *" htmlFor={`${idPrefix}-state`}>
            <input
              id={`${idPrefix}-state`}
              placeholder="e.g. Delhi"
              value={values.state || ''}
              onChange={(e) => set({ state: e.target.value })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
          <Field label="City" htmlFor={`${idPrefix}-city`}>
            <input
              id={`${idPrefix}-city`}
              placeholder="e.g. New Delhi"
              value={values.city || ''}
              onChange={(e) => set({ city: e.target.value })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Listing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total seats" htmlFor={`${idPrefix}-intake`}>
            <input
              id={`${idPrefix}-intake`}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 150"
              value={values.intake || ''}
              onChange={(e) => set({ intake: parseInt(e.target.value) || 0 })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
          <Field label="Display order" htmlFor={`${idPrefix}-order`} hint="Lower numbers show first.">
            <input
              id={`${idPrefix}-order`}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={values.display_order === undefined ? '' : values.display_order}
              onChange={(e) => set({ display_order: parseInt(e.target.value) || 0 })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );

  const renderImage = (inputId: string, chooseLabel: string, onRemove: () => void) => (
    <FormSection title="Photo">
      <div className="flex flex-wrap items-center gap-4">
        {previewUrl ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label htmlFor={inputId} className={`${BUTTON.secondary} ${SIZE.sm} cursor-pointer`}>
              <ImagePlus className="h-4 w-4" />
              {chooseLabel}
            </label>
            {previewUrl && (
              <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <p className="text-xs text-slate-500">JPG, PNG, WebP or AVIF, up to 5 MB. 800 × 600 px or larger looks best.</p>
        </div>
      </div>
    </FormSection>
  );

  return (
    <>
      <Card
        flush
        title={title}
        description={
          <>
            {description}
            {!loading && colleges.length > 0 && (
              <span className="text-slate-400"> · {colleges.length} colleges, {activeCount} active</span>
            )}
          </>
        }
        actions={
          addSignal === undefined ? (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add college
            </Button>
          ) : undefined
        }
      >
        <Toolbar className="border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, city or state…"
              aria-label="Search colleges"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} ${INPUT_H} pl-9`}
            />
          </div>
          {stateOptions.length > 1 && (
            <div className="w-full sm:w-44">
              <select
                aria-label="Filter by state"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className={`${INPUT} ${INPUT_H}`}
              >
                <option value="all">All states</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          {typeOptions.length > 1 && (
            <div className="w-full sm:w-40">
              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`${INPUT} ${INPUT_H}`}
              >
                <option value="all">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-xs tabular-nums text-slate-500">
            {visible.length} of {colleges.length}
          </span>
          <Button size="sm" onClick={fetchColleges} disabled={loading} className="ml-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </Toolbar>

        {loadError && (
          <div className="p-4">
            <Notice
              tone="danger"
              title="Could not load this list"
              action={
                <Button size="sm" onClick={fetchColleges} disabled={loading}>
                  Retry
                </Button>
              }
            >
              {loadError}
            </Notice>
          </div>
        )}

        {loading && colleges.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Loading colleges…
          </div>
        ) : loadError && colleges.length === 0 ? null : colleges.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No colleges in this list yet"
            hint="Add the first one and it appears on the site in display order."
            action={
              <Button variant="primary" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add college
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No college matches"
            hint={filtering ? 'Try another name, or clear the filters.' : undefined}
            action={<Button onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className={TABLE.wrap}>
              <table className={`${TABLE.table} min-w-[760px]`}>
                <thead className={TABLE.head}>
                  <tr>
                    <th className={TABLE.th}>College</th>
                    <th className={TABLE.th}>Location</th>
                    <th className={TABLE.th}>Type</th>
                    <th className={`${TABLE.th} text-right`}>Seats</th>
                    <th className={`${TABLE.th} text-right`}>Order</th>
                    <th className={TABLE.th}>Status</th>
                    <th className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice(0, shown).map((college) => (
                    <tr key={college.id} className={TABLE.row}>
                      <td className={TABLE.td}>
                        <div className="flex items-center gap-3">
                          {/*
                            The placeholder here was an AI-generated building signed
                            "ALL INDIA INSTITUTE OF MEDICAL SCIENCES, NEW DELHI", shown
                            against every college that has no picture — so the list said
                            AIIMS beside hundreds of rows and read as though a photo had
                            been set. The monogram says plainly that none has.
                          */}
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 [&_span]:!text-[11px] [&_span]:!tracking-normal">
                            <CollegeVisual name={college.college_name} imageUrl={college.image_url} sizes="36px" />
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[18rem] truncate font-medium text-slate-900" title={college.college_name}>
                              {college.college_name}
                            </div>
                            {(college.university_name || college.established_year) && (
                              <div className="max-w-[18rem] truncate text-xs text-slate-500">
                                {[college.university_name, college.established_year ? `Est. ${college.established_year}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={TABLE.td}>
                        <div className="max-w-[12rem] truncate" title={`${college.city ? `${college.city}, ` : ''}${college.state}`}>
                          {college.city ? `${college.city}, ` : ''}{college.state}
                        </div>
                      </td>
                      <td className={TABLE.td}>{college.college_type || <span className="text-slate-400">—</span>}</td>
                      <td className={`${TABLE.td} text-right tabular-nums`}>{college.intake ?? '—'}</td>
                      <td className={`${TABLE.td} text-right tabular-nums text-slate-500`}>{college.display_order}</td>
                      <td className={TABLE.td}>
                        {college.is_active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}
                      </td>
                      <td className={TABLE.td}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${college.college_name}`}
                            title="Edit"
                            onClick={() => openEdit(college)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${college.college_name}`}
                            title="Delete"
                            className="hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              setSelectedCollege(college);
                              setIsDeleteDialogOpen(true);
                            }}
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
            {visible.length > shown && (
              <div className="border-t border-slate-100 p-3 text-center">
                <Button size="sm" onClick={() => setShown((s) => s + PAGE)}>
                  <ChevronDown className="h-4 w-4" /> Show {Math.min(PAGE, visible.length - shown)} more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add */}
      <Drawer
        open={isAddDialogOpen}
        title="Add college"
        onClose={() => setIsAddDialogOpen(false)}
        footer={
          <>
            <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddCollege} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Add college'}
            </Button>
          </>
        }
      >
        <p className="mb-5 text-sm text-slate-500">Adds to <span className="font-medium text-slate-700">{title}</span>. Fields marked * are required.</p>
        <div className="space-y-6">
          {renderFields(newCollege, (patch) => setNewCollege({ ...newCollege, ...patch }), 'add')}
          {renderImage('image-upload', 'Choose image', () => { setImageFile(null); setPreviewUrl(null); })}
        </div>
      </Drawer>

      {/* Edit */}
      <Drawer
        open={isEditDialogOpen}
        title={selectedCollege ? `Edit ${selectedCollege.college_name}` : 'Edit college'}
        onClose={() => setIsEditDialogOpen(false)}
        footer={
          <>
            <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditCollege} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          </>
        }
      >
        {selectedCollege && (
          <div className="space-y-6">
            {renderFields(selectedCollege, (patch) => setSelectedCollege({ ...selectedCollege, ...patch }), 'edit')}
            {renderImage('edit-image-upload', 'Change image', () => {
              setImageFile(null);
              setPreviewUrl(null);
              setSelectedCollege(prev => prev ? { ...prev, image_url: null } : null);
            })}
          </div>
        )}
      </Drawer>

      {/* Delete */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 sm:rounded-2xl">
          <div className="space-y-2 p-5 pr-12">
            <DialogTitle className="text-base font-semibold text-slate-900">Delete this college?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-800">{selectedCollege?.college_name}</span> will be removed from{' '}
              {title}. This cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteCollege} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** A titled group of fields inside a form. */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export default GenericCollegeManager;
