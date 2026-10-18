"use client";

import { useEffect, useState } from 'react';
import { listRows, createRow, updateRow, deleteRow, uploadImage } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Plus, RefreshCw, Loader2, ImageIcon, Search, Pencil, Trash2, ImagePlus, Eye, EyeOff, Smartphone,
} from 'lucide-react';
import {
  PageHeader, Toolbar, Button, BUTTON, SIZE, INPUT, INPUT_H, Field, Toggle, Badge, Notice, EmptyState, Drawer,
} from '@/components/admin/ui';

interface MediaAsset {
  id: number;
  media_key: string;
  title: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  alt_text: string | null;
  section_type: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

type SectionTypeFilter = 'all' | 'hero' | 'content' | 'college' | 'marketing';

const SECTION_TYPES: SectionTypeFilter[] = ['all', 'hero', 'content', 'college', 'marketing'];

const SECTION_LABEL: Record<string, string> = {
  all: 'All',
  hero: 'Hero',
  content: 'Content',
  college: 'College',
  marketing: 'Marketing',
};

const defaultFormState = {
  media_key: '',
  title: '',
  alt_text: '',
  section_type: 'content',
  display_order: 0,
  is_active: true,
};

/** One image slot in the form: preview, choose, remove. */
function ImageSlot({
  id,
  label,
  hint,
  preview,
  chooseLabel,
  onChange,
  onRemove,
}: {
  id: string;
  label: string;
  hint: string;
  preview: string | null;
  chooseLabel: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-slate-700">{label}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input id={id} type="file" accept="image/*" className="peer sr-only" onChange={onChange} />
            <label
              htmlFor={id}
              className={`${BUTTON.secondary} ${SIZE.sm} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40`}
            >
              <ImagePlus className="h-4 w-4" />
              {chooseLabel}
            </label>
            {preview && (
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

const MediaManager = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<SectionTypeFilter>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(defaultFormState);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setAssets(await listRows<MediaAsset>('media'));
    } catch (err: any) {
      console.error('Error fetching media assets:', err);
      setError(err.message || 'Failed to load media assets');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = (file: File, sectionType: string) => uploadImage(file, sectionType);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'desktop') {
      setDesktopFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setDesktopPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setMobileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMobilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setEditingAsset(null);
  };

  const handleAdd = async () => {
    if (!formData.media_key.trim()) {
      toast.error('Media Key is required');
      return;
    }

    try {
      setIsSaving(true);
      let desktopUrl: string | null = null;
      let mobileUrl: string | null = null;

      if (desktopFile) {
        desktopUrl = await uploadFile(desktopFile, formData.section_type);
      }
      if (mobileFile) {
        mobileUrl = await uploadFile(mobileFile, formData.section_type);
      }

      await createRow('media', {
        media_key: formData.media_key,
        title: formData.title || null,
        image_url: desktopUrl || '',
        mobile_image_url: mobileUrl,
        alt_text: formData.alt_text || null,
        section_type: formData.section_type,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      toast.success('Media asset added successfully');
      setAddDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      console.error('Error adding media asset:', err);
      toast.error(`Failed to add: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAsset) return;
    if (!formData.media_key.trim()) {
      toast.error('Media Key is required');
      return;
    }

    try {
      setIsSaving(true);
      let desktopUrl = editingAsset.image_url;
      let mobileUrl = editingAsset.mobile_image_url;

      if (desktopFile) {
        desktopUrl = await uploadFile(desktopFile, formData.section_type);
      }
      if (mobileFile) {
        mobileUrl = await uploadFile(mobileFile, formData.section_type);
      }

      await updateRow('media', editingAsset.id, {
        media_key: formData.media_key,
        title: formData.title || null,
        image_url: desktopUrl,
        mobile_image_url: mobileUrl,
        alt_text: formData.alt_text || null,
        section_type: formData.section_type,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      toast.success('Media asset updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      console.error('Error updating media asset:', err);
      toast.error(`Failed to update: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteRow('media', deleteTarget.id);
      toast.success('Media asset deleted successfully');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchAssets();
    } catch (err: any) {
      console.error('Error deleting media asset:', err);
      toast.error(`Failed to delete: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (asset: MediaAsset) => {
    try {
      await updateRow('media', asset.id, { is_active: !asset.is_active });
      toast.success(`Asset ${asset.is_active ? 'deactivated' : 'activated'}`);
      fetchAssets();
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  const openEditDialog = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setFormData({
      media_key: asset.media_key,
      title: asset.title || '',
      alt_text: asset.alt_text || '',
      section_type: asset.section_type,
      display_order: asset.display_order,
      is_active: asset.is_active,
    });
    setDesktopPreview(asset.image_url);
    setMobilePreview(asset.mobile_image_url);
    setDesktopFile(null);
    setMobileFile(null);
    setEditDialogOpen(true);
  };

  // Filtered assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.media_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = sectionFilter === 'all' || a.section_type === sectionFilter;
    return matchesSearch && matchesFilter;
  });

  // Counts for the filter chips
  const activeCount = assets.filter((a) => a.is_active).length;
  const countFor = (type: SectionTypeFilter) =>
    type === 'all' ? assets.length : assets.filter((a) => a.section_type === type).length;

  const closeAdd = () => { setAddDialogOpen(false); resetForm(); };
  const closeEdit = () => { setEditDialogOpen(false); resetForm(); };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-5">
      <Field
        label="Media key"
        htmlFor={`media-key-${isEdit ? 'edit' : 'add'}`}
        hint="The name pages look this image up by."
      >
        <input
          id={`media-key-${isEdit ? 'edit' : 'add'}`}
          placeholder="e.g. hero-homepage-banner"
          value={formData.media_key}
          onChange={(e) => setFormData({ ...formData, media_key: e.target.value })}
          className={`${INPUT} ${INPUT_H} font-mono`}
        />
      </Field>

      <Field label="Title" htmlFor={`media-title-${isEdit ? 'edit' : 'add'}`}>
        <input
          id={`media-title-${isEdit ? 'edit' : 'add'}`}
          placeholder="e.g. Homepage Hero Banner"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`${INPUT} ${INPUT_H}`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Used in" htmlFor={`media-section-${isEdit ? 'edit' : 'add'}`}>
          <select
            id={`media-section-${isEdit ? 'edit' : 'add'}`}
            value={formData.section_type}
            onChange={(e) => setFormData({ ...formData, section_type: e.target.value })}
            className={`${INPUT} ${INPUT_H}`}
          >
            <option value="hero">Hero</option>
            <option value="content">Content</option>
            <option value="college">College</option>
            <option value="marketing">Marketing</option>
          </select>
        </Field>
        <Field label="Display order" htmlFor={`media-order-${isEdit ? 'edit' : 'add'}`}>
          <input
            id={`media-order-${isEdit ? 'edit' : 'add'}`}
            type="number"
            placeholder="0"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            className={`${INPUT} ${INPUT_H} tabular-nums`}
          />
        </Field>
      </div>

      <Field label="Alt text" htmlFor={`media-alt-${isEdit ? 'edit' : 'add'}`} hint="What the image shows, for screen readers and search engines.">
        <input
          id={`media-alt-${isEdit ? 'edit' : 'add'}`}
          placeholder="Descriptive alt text for accessibility"
          value={formData.alt_text}
          onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
          className={`${INPUT} ${INPUT_H}`}
        />
      </Field>

      <div className="space-y-4 border-t border-slate-100 pt-5">
        <ImageSlot
          id={`desktop-upload-${isEdit ? 'edit' : 'add'}`}
          label="Desktop image"
          hint="Recommended: 1920x1080px. Max 5MB."
          preview={desktopPreview}
          chooseLabel={isEdit ? 'Change image' : 'Choose image'}
          onChange={(e) => handleFileChange(e, 'desktop')}
          onRemove={() => { setDesktopFile(null); setDesktopPreview(null); }}
        />
        <ImageSlot
          id={`mobile-upload-${isEdit ? 'edit' : 'add'}`}
          label="Mobile image (optional)"
          hint="Recommended: 768x1024px. Max 5MB."
          preview={mobilePreview}
          chooseLabel={isEdit ? 'Change mobile' : 'Choose mobile'}
          onChange={(e) => handleFileChange(e, 'mobile')}
          onRemove={() => { setMobileFile(null); setMobilePreview(null); }}
        />
      </div>

      <div className="border-t border-slate-100 pt-5">
        <Toggle
          checked={formData.is_active}
          onChange={(v) => setFormData({ ...formData, is_active: v })}
          label="Active (visible on website)"
        />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Media"
        description="Images the website looks up by key. Replace one here and every page that uses its key shows the new image."
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => fetchAssets()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" size="md" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add image
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <Toolbar>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by key or title"
              aria-label="Search media"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} ${INPUT_H} pl-9`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by where the image is used">
            {SECTION_TYPES.map((type) => {
              const active = sectionFilter === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSectionFilter(type)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-cyan-600 bg-cyan-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {SECTION_LABEL[type]}
                  <span className={`text-[11px] font-semibold tabular-nums ${active ? 'text-cyan-50' : 'text-slate-400'}`}>
                    {countFor(type)}
                  </span>
                </button>
              );
            })}
          </div>
          {assets.length > 0 && (
            <span className="text-xs tabular-nums text-slate-500 sm:ml-auto">
              {activeCount} of {assets.length} live
            </span>
          )}
        </Toolbar>

        {/* Error */}
        {error && (
          <Notice
            tone="danger"
            title="Could not load the images"
            action={<Button size="sm" onClick={() => fetchAssets()}>Retry</Button>}
          >
            {error}
          </Notice>
        )}

        {/* Content */}
        {isLoading && assets.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Loading media">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          error ? null : (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <EmptyState
                icon={ImageIcon}
                title={assets.length > 0 ? 'Nothing matches that' : 'No images yet'}
                hint={assets.length > 0 ? 'Try a different search or filter.' : 'Add the first image to get started.'}
                action={
                  assets.length > 0 ? (
                    <Button size="sm" onClick={() => { setSearchQuery(''); setSectionFilter('all'); }}>Clear filters</Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4" /> Add image
                    </Button>
                  )
                }
              />
            </div>
          )
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredAssets.map((asset) => (
              <li
                key={asset.id}
                className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${asset.is_active ? '' : 'opacity-75'}`}
              >
                {/* Preview */}
                <div className="relative aspect-[16/10] bg-slate-100">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  {asset.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.image_url}
                      alt={asset.alt_text || asset.media_key}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {asset.is_active ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-semibold text-slate-900" title={asset.media_key}>
                      {asset.media_key}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500" title={asset.title || undefined}>
                      {asset.title || 'No title'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <Badge tone="neutral" className="capitalize">{asset.section_type}</Badge>
                    <span className="tabular-nums">Order {asset.display_order}</span>
                    {asset.mobile_image_url && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5" /> Mobile version
                      </span>
                    )}
                  </div>
                  {!asset.alt_text && <p className="text-xs text-amber-700">No alt text</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-2.5">
                  <Button size="sm" onClick={() => openEditDialog(asset)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(asset)}>
                    {asset.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {asset.is_active ? 'Hide' : 'Show'}
                  </Button>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    onClick={() => { setDeleteTarget(asset); setDeleteDialogOpen(true); }}
                    aria-label={`Delete ${asset.media_key}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add */}
      <Drawer
        open={addDialogOpen}
        title="Add an image"
        onClose={closeAdd}
        footer={
          <>
            <Button onClick={closeAdd}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Add image'}
            </Button>
          </>
        }
      >
        {renderForm(false)}
      </Drawer>

      {/* Edit */}
      <Drawer
        open={editDialogOpen}
        title={<>Edit <span className="font-mono text-base">{editingAsset?.media_key}</span></>}
        onClose={closeEdit}
        footer={
          <>
            <Button onClick={closeEdit}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          </>
        }
      >
        {renderForm(true)}
      </Drawer>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 sm:max-w-md">
          <div className="space-y-2 p-5 pr-12">
            <DialogTitle className="text-lg font-bold text-slate-900">Delete this image?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              <span className="font-mono font-semibold text-slate-900">{deleteTarget?.media_key}</span> will be deleted.
              This cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;
