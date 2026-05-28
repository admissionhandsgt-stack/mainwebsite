"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useVideoManager } from '@/hooks/useVideoManager';
import { Plus, RefreshCw, Video, Star, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoForm = dynamic(() => import('@/components/admin/videos/VideoForm'), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-medical-500" /></div>
});

const VideoList = dynamic(() => import('@/components/admin/videos/VideoList'), {
  loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map(n => (
      <div key={n} className="bg-slate-100 dark:bg-slate-800 rounded-xl h-60"></div>
    ))}
  </div>
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
          <p className="text-sm text-gray-500 mt-1">Manage YouTube videos displayed on the website</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchVideos()}
            disabled={isLoading}
            className="rounded-xl border-gray-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 border-0 shadow-md shadow-medical-500/20">
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{isEditing ? 'Edit Video' : 'Add New Video'}</DialogTitle>
              </DialogHeader>
              <VideoForm
                video={newVideo}
                isEditing={isEditing}
                isLoading={isLoading}
                onSubmit={wrappedHandleSubmit}
                onChange={handleFormChange}
                onCancel={() => { resetForm(); setAddDialogOpen(false); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {[
          { label: 'Total Videos', value: videos.length, icon: Video, color: 'text-medical-600 bg-medical-50' },
          { label: 'Featured', value: featuredCount, icon: Star, color: 'text-amber-600 bg-amber-50' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !videos.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
          <Video className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No videos yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first YouTube video to display on the website</p>
        </div>
      ) : (
        <VideoList
          videos={videos}
          onEdit={(video) => { handleEdit(video); setAddDialogOpen(true); }}
          onDelete={handleDelete}
          isDeleting={isLoading}
        />
      )}
    </div>
  );
};

export default VideoManager;
