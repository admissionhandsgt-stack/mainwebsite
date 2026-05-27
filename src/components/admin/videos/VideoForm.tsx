import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Save, Video as VideoIcon, Link as LinkIcon, AlignLeft, Star } from 'lucide-react';

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
  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="space-y-2 group md:col-span-2">
          <Label htmlFor="title" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Video Title
          </Label>
          <div className="relative">
            <VideoIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="title"
              value={video.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="e.g. Admission Process 2024"
              required
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>
        
        <div className="space-y-2 group md:col-span-2">
          <Label htmlFor="videos_id" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            YouTube Video ID
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Input
              id="videos_id"
              value={video.videos_id}
              onChange={(e) => onChange('videos_id', e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              required
              className="pl-10 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300"
            />
          </div>
          <p className="text-xs text-gray-400 ml-1 mt-1">
            The unique ID located after "v=" in a YouTube URL (e.g., https://youtube.com/watch?v=<span className="text-medical-500 font-semibold">dQw4w9WgXcQ</span>)
          </p>
        </div>
        
        <div className="space-y-2 group md:col-span-2">
          <Label htmlFor="description" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
            Description (Optional)
          </Label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
            <Textarea
              id="description"
              value={video.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Provide context or a summary of the video content..."
              rows={3}
              className="pl-10 pt-3 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300 min-h-[100px]"
            />
          </div>
        </div>
        
        <div className="md:col-span-2 flex items-center p-4 bg-amber-50/50 border border-amber-100 rounded-xl mt-2 transition-colors hover:bg-amber-50/80">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 mr-4 shrink-0">
            <Star className={`w-5 h-5 ${video.featured ? 'fill-amber-500 text-amber-500' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <Label htmlFor="featured-toggle" className="text-amber-900 font-semibold text-base block cursor-pointer">
              Feature this Video
            </Label>
            <p className="text-xs text-amber-700/70 mt-0.5">Pin this video to highlight it across the platform.</p>
          </div>
          <div className="shrink-0 pl-4">
            <Checkbox 
              id="featured-toggle"
              checked={video.featured}
              onCheckedChange={(checked) => onChange('featured', !!checked)}
              disabled={isLoading}
              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 scale-125 mr-2"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors px-6"
        >
          Cancel
        </Button>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white shadow-md shadow-medical-500/20 rounded-xl px-8 transition-all duration-300 border-0"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Processing...' : isEditing ? 'Save Changes' : 'Publish Video'}
          </Button>
        </motion.div>
      </div>
    </form>
  );
};

export default VideoForm;
