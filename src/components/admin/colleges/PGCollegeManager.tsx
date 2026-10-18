"use client";

import React, { useState, useEffect, useRef } from 'react';
import CollegeVisual from '@/components/ui/CollegeVisual';
import { listRows, createRow, updateRow, deleteRow, uploadImage } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, ImagePlus, Plus, Building2, Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Card, Toolbar, Button, BUTTON, SIZE, INPUT, INPUT_H, TEXTAREA, Field, Toggle, Badge, Notice, EmptyState, TABLE, Drawer,
} from '@/components/admin/ui';

/** key_specialties is a JSON array kept in a text column. */
function parseSpecialties(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v !== 'string' || v.trim() === '') return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Older rows may hold a plain comma-separated list.
    return v.split(',').map((x) => x.trim()).filter(Boolean);
  }
}

export interface PGCollege {
  id: number;
  college_name: string;
  city: string;
  state: string;
  college_type: string;
  ownership: string | null;
  year_established: number | null;
  total_pg_seats: number;
  key_specialties: string[];
  short_description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Rows drawn at once. */
const PAGE = 100;

const PGCollegeManager: React.FC<{
  /**
   * Bumped by the page header's "Add college" button. Each change opens the
   * add form. Left undefined, the list shows its own add button instead.
   */
  addSignal?: number;
}> = ({ addSignal }) => {
  const [colleges, setColleges] = useState<PGCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const [selectedCollege, setSelectedCollege] = useState<PGCollege | null>(null);
  const [specialtiesText, setSpecialtiesText] = useState('');

  const [newCollege, setNewCollege] = useState<Partial<PGCollege>>({
    college_name: '',
    city: '',
    state: '',
    college_type: 'Government',
    ownership: '',
    year_established: new Date().getFullYear() - 10,
    total_pg_seats: 0,
    key_specialties: [],
    short_description: '',
    image_url: '',
    is_active: true,
    display_order: 100
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const rows = await listRows<Omit<PGCollege, 'key_specialties'> & { key_specialties: unknown }>(
        'colleges-pg',
      );
      setColleges(rows.map((r) => ({ ...r, key_specialties: parseSpecialties(r.key_specialties) })));
    } catch (err) {
      console.error('Error fetching pg_colleges:', err);
      toast.error('Failed to load PG colleges');
      setLoadError(err instanceof Error ? err.message : 'Failed to load PG colleges');
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
    if (!newCollege.college_name || !newCollege.state || !newCollege.city) {
      toast.error("Please fill in College Name, City, and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = newCollege.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'colleges');
      }

      const specialties = specialtiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await createRow('colleges-pg', {
        college_name: newCollege.college_name,
        city: newCollege.city,
        state: newCollege.state,
        college_type: newCollege.college_type || 'Government',
        ownership: newCollege.ownership || null,
        year_established: newCollege.year_established || null,
        total_pg_seats: newCollege.total_pg_seats || 0,
        key_specialties: JSON.stringify(specialties),
        short_description: newCollege.short_description || null,
        image_url: imageUrl,
        is_active: newCollege.is_active ?? true,
        display_order: newCollege.display_order ?? ((colleges.length + 1) * 100)
      });

      toast.success("PG College added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchColleges();
    } catch (err: any) {
      console.error('Error adding PG college:', err);
      toast.error(`Failed to add college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCollege = async () => {
    if (!selectedCollege || !selectedCollege.college_name || !selectedCollege.state || !selectedCollege.city) {
      toast.error("Please fill in College Name, City, and State");
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

      const specialties = specialtiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await updateRow('colleges-pg', selectedCollege.id, {
        college_name: selectedCollege.college_name,
        city: selectedCollege.city,
        state: selectedCollege.state,
        college_type: selectedCollege.college_type,
        ownership: selectedCollege.ownership || null,
        year_established: selectedCollege.year_established || null,
        total_pg_seats: selectedCollege.total_pg_seats,
        key_specialties: JSON.stringify(specialties),
        short_description: selectedCollege.short_description || null,
        image_url: imageUrl,
        is_active: selectedCollege.is_active,
        display_order: selectedCollege.display_order
      });

      toast.success("PG College updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCollege(null);
      setImageFile(null);
      setPreviewUrl(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error updating PG college:', err);
      toast.error(`Failed to update college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    try {
      setIsDeleting(true);
      await deleteRow('colleges-pg', selectedCollege.id);
      toast.success("College deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCollege(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error deleting PG college:', err);
      toast.error(`Failed to delete college: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setNewCollege({
      college_name: '',
      city: '',
      state: '',
      college_type: 'Government',
      ownership: '',
      year_established: new Date().getFullYear() - 10,
      total_pg_seats: 0,
      key_specialties: [],
      short_description: '',
      image_url: '',
      is_active: true,
      display_order: (colleges.length + 1) * 100
    });
    setSpecialtiesText('');
    setImageFile(null);
    setPreviewUrl(null);
  };

  const openAdd = () => {
    setIsAddDialogOpen(true);
    resetForm();
  };

  const openEdit = (college: PGCollege) => {
    setSelectedCollege(college);
    // A photo picked for another college and then cancelled must not ride along.
    setImageFile(null);
    setSpecialtiesText(college.key_specialties.join(', '));
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

  const filteredColleges = colleges.filter(u => {
    const matchesSearch = u.college_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.state ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || (u.college_type ?? '').toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  useEffect(() => setShown(PAGE), [searchQuery, typeFilter]);

  const activeCount = colleges.filter((c) => c.is_active).length;

  /**
   * One form for add and edit. `isEdit` only decides the few places where the
   * two forms showed a value differently, so neither changes behaviour.
   */
  const renderFields = (
    values: Partial<PGCollege>,
    set: (patch: Partial<PGCollege>) => void,
    isEdit: boolean,
  ) => {
    const p = isEdit ? 'edit' : 'new';
    return (
      <div className="space-y-6">
        <FormSection title="College">
          <Field label="College name *" htmlFor={`${p}-name`}>
            <input
              id={`${p}-name`}
              placeholder="e.g. Kasturba Medical College"
              value={values.college_name || ''}
              onChange={(e) => set({ college_name: e.target.value })}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State *" htmlFor={`${p}-state`}>
              <input
                id={`${p}-state`}
                placeholder="e.g. Karnataka"
                value={values.state || ''}
                onChange={(e) => set({ state: e.target.value })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Field label="City *" htmlFor={`${p}-city`}>
              <input
                id={`${p}-city`}
                placeholder="e.g. Mangalore"
                value={values.city || ''}
                onChange={(e) => set({ city: e.target.value })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="College type" htmlFor={`${p}-type`}>
              <select
                id={`${p}-type`}
                value={isEdit ? values.college_type : values.college_type || 'Government'}
                onChange={(e) => set({ college_type: e.target.value })}
                className={`${INPUT} ${INPUT_H}`}
              >
                <option value="Government">Government</option>
                <option value="Private">Private</option>
                <option value="Deemed">Deemed</option>
              </select>
            </Field>
            <Field label="Ownership" htmlFor={`${p}-ownership`}>
              <input
                id={`${p}-ownership`}
                placeholder="e.g. Trust, Government"
                value={values.ownership || ''}
                onChange={(e) => set({ ownership: e.target.value })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Field label="Year established" htmlFor={`${p}-year`}>
              <input
                id={`${p}-year`}
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1953"
                value={values.year_established || ''}
                onChange={(e) => set({ year_established: parseInt(e.target.value) || null })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Seats and courses">
          <Field label="Total PG seats" htmlFor={`${p}-seats`}>
            <input
              id={`${p}-seats`}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 120"
              value={isEdit ? values.total_pg_seats : values.total_pg_seats || ''}
              onChange={(e) => set({ total_pg_seats: parseInt(e.target.value) || 0 })}
              className={`${INPUT} ${INPUT_H} sm:max-w-[12rem]`}
            />
          </Field>
          <Field label="Specialties" htmlFor={`${p}-specialties`} hint="Separate with commas.">
            <input
              id={`${p}-specialties`}
              placeholder="e.g. MD General Medicine, MS General Surgery, MD Paediatrics"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              className={`${INPUT} ${INPUT_H}`}
            />
          </Field>
          <Field label="Short description" htmlFor={`${p}-description`}>
            <textarea
              id={`${p}-description`}
              rows={3}
              placeholder="Brief description about the college campus or specialties..."
              value={values.short_description || ''}
              onChange={(e) => set({ short_description: e.target.value })}
              className={TEXTAREA}
            />
          </Field>
        </FormSection>

        <FormSection title="On the site">
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <Field label="Display order" htmlFor={`${p}-order`} hint="Lower numbers show first.">
              <input
                id={`${p}-order`}
                type="number"
                inputMode="numeric"
                placeholder="e.g. 100"
                value={values.display_order === undefined ? '' : values.display_order}
                onChange={(e) => set({ display_order: parseInt(e.target.value) || 0 })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <div className="pb-6">
              <Toggle
                checked={isEdit ? !!values.is_active : values.is_active ?? true}
                onChange={(checked) => set({ is_active: checked })}
                label="Active (visible on the site)"
              />
            </div>
          </div>
        </FormSection>
      </div>
    );
  };

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
          <p className="text-xs text-slate-500">JPG, PNG, WebP or AVIF, up to 5 MB. 800 × 600 px looks best.</p>
        </div>
      </div>
    </FormSection>
  );

  return (
    <>
      <Card
        flush
        title="All PG colleges"
        description={
          <>
            PG medical colleges offering MD/MS seats in India.
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
              aria-label="Search PG colleges"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} ${INPUT_H} pl-9`}
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${INPUT} ${INPUT_H}`}
            >
              <option value="all">All types</option>
              <option value="Government">Government</option>
              <option value="Private">Private</option>
              <option value="Deemed">Deemed</option>
            </select>
          </div>
          <span className="text-xs tabular-nums text-slate-500">
            {filteredColleges.length} of {colleges.length}
          </span>
          <Button size="sm" onClick={fetchColleges} disabled={loading} className="ml-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </Toolbar>

        {loadError && (
          <div className="p-4">
            <Notice
              tone="danger"
              title="Could not load PG colleges"
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
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> Loading PG colleges…
          </div>
        ) : loadError && colleges.length === 0 ? null : colleges.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No PG colleges yet"
            hint="Add the first one and it appears on the MD/MS pages in display order."
            action={
              <Button variant="primary" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add college
              </Button>
            }
          />
        ) : filteredColleges.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No college matches"
            hint="Try another name, or clear the filters."
            action={<Button onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className={TABLE.wrap}>
              <table className={`${TABLE.table} min-w-[920px]`}>
                <thead className={TABLE.head}>
                  <tr>
                    <th className={TABLE.th}>College</th>
                    <th className={TABLE.th}>Location</th>
                    <th className={TABLE.th}>Type</th>
                    <th className={`${TABLE.th} text-right`}>PG seats</th>
                    <th className={TABLE.th}>Specialties</th>
                    <th className={`${TABLE.th} text-right`}>Order</th>
                    <th className={TABLE.th}>Status</th>
                    <th className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColleges.slice(0, shown).map((college) => (
                    <tr key={college.id} className={TABLE.row}>
                      <td className={TABLE.td}>
                        <div className="flex items-center gap-3">
                          {/* See GenericCollegeManager: the fallback was a fake AIIMS. */}
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 [&_span]:!text-[11px] [&_span]:!tracking-normal">
                            <CollegeVisual name={college.college_name} imageUrl={college.image_url} sizes="36px" />
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[17rem] truncate font-medium text-slate-900" title={college.college_name}>
                              {college.college_name}
                            </div>
                            {(college.ownership || college.year_established) && (
                              <div className="max-w-[17rem] truncate text-xs text-slate-500">
                                {[college.ownership, college.year_established ? `Est. ${college.year_established}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={TABLE.td}>
                        <div className="max-w-[11rem] truncate" title={`${college.city}, ${college.state}`}>
                          {college.city}, {college.state}
                        </div>
                      </td>
                      <td className={TABLE.td}>
                        <Badge tone={college.college_type === 'Government' ? 'info' : 'neutral'}>{college.college_type}</Badge>
                      </td>
                      <td className={`${TABLE.td} text-right tabular-nums`}>{college.total_pg_seats}</td>
                      <td className={TABLE.td}>
                        {college.key_specialties.length > 0 ? (
                          <div className="max-w-[14rem] truncate text-xs text-slate-600" title={college.key_specialties.join(', ')}>
                            <span className="font-semibold tabular-nums text-slate-700">{college.key_specialties.length}</span>
                            {' · '}
                            {college.key_specialties.slice(0, 2).join(', ')}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
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
            {filteredColleges.length > shown && (
              <div className="border-t border-slate-100 p-3 text-center">
                <Button size="sm" onClick={() => setShown((s) => s + PAGE)}>
                  <ChevronDown className="h-4 w-4" /> Show {Math.min(PAGE, filteredColleges.length - shown)} more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add */}
      <Drawer
        open={isAddDialogOpen}
        title="Add PG college"
        width="max-w-2xl"
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
        <p className="mb-5 text-sm text-slate-500">Fields marked * are required.</p>
        <div className="space-y-6">
          {renderFields(newCollege, (patch) => setNewCollege({ ...newCollege, ...patch }), false)}
          {renderImage('image-upload-pg', 'Choose image', () => { setImageFile(null); setPreviewUrl(null); })}
        </div>
      </Drawer>

      {/* Edit */}
      <Drawer
        open={isEditDialogOpen}
        title={selectedCollege ? `Edit ${selectedCollege.college_name}` : 'Edit PG college'}
        width="max-w-2xl"
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
            {renderFields(selectedCollege, (patch) => setSelectedCollege({ ...selectedCollege, ...patch }), true)}
            {renderImage('edit-image-upload-pg', 'Change image', () => {
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
            <DialogTitle className="text-base font-semibold text-slate-900">Delete this PG college?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-800">{selectedCollege?.college_name}</span> will be removed.
              This cannot be undone.
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

export default PGCollegeManager;
