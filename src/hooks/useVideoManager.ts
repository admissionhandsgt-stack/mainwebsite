
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Video {
  id: number;
  title: string;
  videos_id: string;
  description?: string;
  created_at: string;
  featured?: boolean;
}

interface VideoFormData {
  title: string;
  videos_id: string;
  description: string;
  featured: boolean;
}

export const useVideoManager = (options: { silent?: boolean } = {}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideo, setNewVideo] = useState<VideoFormData>({
    title: '',
    videos_id: '',
    description: '',
    featured: false
  });
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVideos = async (silent = options.silent) => {
    setIsLoading(true);
    try {
      // The admin list needs every video, including ones not featured.
      const res = await fetch('/api/admin/videos', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { data } = await res.json();

      setVideos(
        (data ?? []).map((item: Record<string, unknown>) => ({
          id: item.id as number,
          title: (item.title as string) || '',
          videos_id: (item.videos_id as string) || '',
          description: (item.description as string) || '',
          created_at: (item.created_at as string) || new Date().toISOString(),
          featured: !!item.featured,
        })),
      );
      setError('');
    } catch (e) {
      if (!silent) console.error('Error fetching videos:', e);
      setError('Failed to fetch videos');
      if (!silent) toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVideo.title || !newVideo.videos_id) {
      setError('Title and YouTube Video ID are required fields');
      toast.error('Title and YouTube Video ID are required fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        isEditing ? `/api/admin/videos/${isEditing}` : '/api/admin/videos',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newVideo.title,
            videos_id: newVideo.videos_id,
            description: newVideo.description,
            featured: newVideo.featured,
          }),
        },
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Save failed');

      toast.success(isEditing ? 'Video updated' : 'Video added');
      setIsEditing(null);
      resetForm();
      await fetchVideos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save the video';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (video: Video) => {
    setNewVideo({
      title: video.title,
      videos_id: video.videos_id,
      description: video.description || '',
      featured: video.featured || false
    });
    setIsEditing(video.id);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Video deleted');
      await fetchVideos();
    } catch (err) {
      setError('Failed to delete video');
      toast.error('Could not delete the video');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewVideo({
      title: '',
      videos_id: '',
      description: '',
      featured: false
    });
    setIsEditing(null);
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setNewVideo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
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
    fetchVideos
  };
};
