import React from 'react';
import { Save } from 'lucide-react';
import { youtubeId } from '@/lib/youtube';
import { Button, Field, INPUT, INPUT_H, TEXTAREA, Toggle } from '@/components/admin/ui';

interface VideoFormProps {
  video: {
    title: string;
    videos_id: string;
    description: string;
    featured: boolean;
  };
  isEditing: number | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string | boolean) => void;
  onCancel: () => void;
}

const VideoForm = ({ video, isEditing, isLoading, onSubmit, onChange, onCancel }: VideoFormProps) => {
  // The site reads any YouTube link down to its id (lib/youtube.ts), so show
  // what it will find — a wrong paste is visible before it is saved.
  const detected = youtubeId(video.videos_id);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Title" htmlFor="video-title">
        <input
          id="video-title"
          value={video.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g. NEET PG counselling explained"
          required
          className={`${INPUT} ${INPUT_H}`}
        />
      </Field>

      <Field
        label="YouTube link or video ID"
        htmlFor="video-id"
        hint="Paste the link from YouTube's Share button, or just the 11-character ID."
      >
        <input
          id="video-id"
          value={video.videos_id}
          onChange={(e) => onChange('videos_id', e.target.value)}
          placeholder="https://youtu.be/..."
          required
          className={`${INPUT} ${INPUT_H}`}
        />
      </Field>

      {video.videos_id.trim() !== '' &&
        (detected ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <img
              src={`https://img.youtube.com/vi/${detected}/mqdefault.jpg`}
              alt=""
              className="aspect-video w-28 shrink-0 rounded-md bg-slate-200 object-cover"
            />
            <p className="min-w-0 text-xs text-slate-500">
              Video found: <span className="font-mono text-slate-800">{detected}</span>
            </p>
          </div>
        ) : (
          <p className="-mt-3 text-xs font-medium text-amber-700">
            That does not look like a YouTube link or ID yet.
          </p>
        ))}

      <Field label="Description (optional)" htmlFor="video-description">
        <textarea
          id="video-description"
          value={video.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="A line or two on what the video covers."
          rows={3}
          className={TEXTAREA}
        />
      </Field>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Toggle
          checked={video.featured}
          onChange={(checked) => onChange('featured', !!checked)}
          disabled={isLoading}
          label={<span className="font-medium text-slate-900">Featured</span>}
        />
        <p className="mt-1.5 text-xs text-slate-500">Featured videos are listed first, newest first after that.</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          <Save className="h-4 w-4" />
          {isLoading ? 'Processing...' : isEditing ? 'Save changes' : 'Publish video'}
        </Button>
      </div>
    </form>
  );
};

export default VideoForm;
