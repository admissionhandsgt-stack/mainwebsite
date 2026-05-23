
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    setIsLoading(false);
    if (error) {
      if (!silent) console.error('Error fetching videos:', error);
      setError('Failed to fetch videos');
      if (!silent) toast.error('Failed to load videos');
      return;
    }

    if (data) {
      const mappedVideos: Video[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || '',
        videos_id: item.videos_id || '',
        description: item.description || '',
        created_at: item.created_at || new Date().toISOString(),
        featured: !!item.featured
      }));
      setVideos(mappedVideos);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('public:videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, (payload) => {
        fetchVideos(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newVideo.title || !newVideo.videos_id) {
      setError('Title and YouTube Video ID are required fields');
      toast.error('Title and YouTube Video ID are required fields');
      return;
    }
    
    setIsLoading(true);
    
    if (isEditing) {
      const { error } = await supabase
        .from('videos')
        .update({
          title: newVideo.title,
          videos_id: newVideo.videos_id,
          description: newVideo.description,
          featured: newVideo.featured
        })
        .eq('id', isEditing)
        .select();

      if (error) {
        setError('Failed to update video');
        toast.error('Failed to update video');
      } else {
        toast.success('Video updated successfully');
        setIsEditing(null);
      }
    } else {
      const { error } = await supabase
        .from('videos')
        .insert({
          title: newVideo.title,
          videos_id: newVideo.videos_id,
          description: newVideo.description,
          featured: newVideo.featured
        })
        .select();

      if (error) {
        setError('Failed to create video');
        toast.error('Failed to create video');
        console.error('Supabase error:', error);
      } else {
        toast.success('Video added successfully');
      }
    }

    setIsLoading(false);
    fetchVideos();
    resetForm();
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
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);
    
    setIsLoading(false);
    
    if (error) {
      setError('Failed to delete video');
      toast.error('Failed to delete video');
    } else {
      toast.success('Video deleted successfully');
      fetchVideos();
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
