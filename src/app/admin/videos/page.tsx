"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useVideoManager } from '@/hooks/useVideoManager';
import { Plus, RefreshCw, Video, Loader2, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, Drawer, EmptyState, Notice, PageHeader } from '@/components/admin/ui';

const VideoForm = dynamic(() => import('@/components/admin/videos/VideoForm'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  ),
});

const VideoList = dynamic(() => import('@/components/admin/videos/VideoList'), {
  loading: () => (
    <ul className="divide-y divide-slate-100" aria-busy="true">
      {[1, 2, 3].map((n) => (
        <li key={n} className="flex gap-4 px-5 py-4">
          <div className="aspect-video w-28 shrink-0 animate-pulse rounded-lg bg-slate-100 sm:w-40" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  ),
});

const VideoManager = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const {
    videos,
    newVideo,
    isEditing,
    isLoading,
    error,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleFormChange,
    resetForm,
    fetchVideos,
  } = useVideoManager();

  useEffect(() => {
    fetchVideos();
  }, []);

  const featuredCount = videos.filter(v => v.featured).length;

  const wrappedHandleSubmit = async (e: React.FormEvent) => {
    await handleSubmit(e);
    if (!isEditing) setAddDialogOpen(false);
  };

  const closeForm = () => { resetForm(); setAddDialogOpen(false); };

  return (
    <div>
      <PageHeader
        title="Videos"
        description="YouTube videos shown on the website. Featured ones are listed first."
        actions={
          <>
            <Button variant="secondary" onClick={() => fetchVideos()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add video
            </Button>
          </>
        }
      />

      {error && (
        <Notice
          tone="danger"
          icon={AlertTriangle}
          className="mb-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => fetchVideos()} disabled={isLoading}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {isLoading && !videos.length ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500" aria-busy="true">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Loading videos…
        </div>
      ) : videos.length === 0 ? (
        !error && (
          <Card>
            <EmptyState
              icon={Video}
              title="No videos yet"
              hint="Add a YouTube video and it shows on the website."
              action={
                <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add video
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <Card
          flush
          title="All videos"
          actions={
            <>
              <Badge>{videos.length} {videos.length === 1 ? 'video' : 'videos'}</Badge>
              {featuredCount > 0 && <Badge tone="info">{featuredCount} featured</Badge>}
            </>
          }
        >
          <VideoList
            videos={videos}
            onEdit={(video) => { handleEdit(video); setAddDialogOpen(true); }}
            onDelete={handleDelete}
            isDeleting={isLoading}
          />
        </Card>
      )}

      <Drawer open={addDialogOpen} title={isEditing ? 'Edit video' : 'Add video'} onClose={closeForm}>
        <VideoForm
          video={newVideo}
          isEditing={isEditing}
          isLoading={isLoading}
          onSubmit={wrappedHandleSubmit}
          onChange={handleFormChange}
          onCancel={closeForm}
        />
      </Drawer>
    </div>
  );
};

export default VideoManager;
