import React from 'react';
import RecordActions from '../shared/RecordActions';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Star, Calendar, FileText } from 'lucide-react';

interface Video {
  id: number;
  title: string;
  videos_id: string;
  description?: string;
  created_at: string;
  featured?: boolean;
}

interface VideoListProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

const VideoList = ({ videos, onEdit, onDelete, isDeleting }: VideoListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {videos.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-16 text-center text-gray-500 bg-white/50 backdrop-blur-md rounded-2xl border border-dashed border-gray-200"
          >
            <PlayCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>No videos found. Add your first video to start building your library!</p>
          </motion.div>
        ) : (
          videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative bg-white/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
            >
              {/* Top Status Bar */}
              <div className={`h-1 w-full transition-colors duration-300 ${video.featured ? 'bg-amber-400' : 'bg-gray-200'}`} />

              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={`https://img.youtube.com/vi/${video.videos_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                {video.featured && (
                  <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                  {video.title}
                </h3>
                
                {video.description && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50/50 p-2.5 rounded-lg mb-4">
                    <FileText className="w-4 h-4 text-medical-500 shrink-0 mt-0.5" />
                    <p className="line-clamp-3 text-xs leading-relaxed">{video.description}</p>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100/50 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(video.created_at).toLocaleDateString()}
                  </div>
                  <RecordActions
                    onEdit={() => onEdit(video)}
                    onDelete={() => onDelete(video.id)}
                    isDeleting={isDeleting}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoList;
