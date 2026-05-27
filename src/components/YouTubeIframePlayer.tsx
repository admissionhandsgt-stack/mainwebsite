
import React, { useState } from 'react';

interface YouTubeIframePlayerProps {
  videoId: string;
  title?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const YouTubeIframePlayer: React.FC<YouTubeIframePlayerProps> = ({ 
  videoId, 
  title,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract video ID from URL if a full URL is provided
  const extractVideoId = (videoIdOrUrl: string): string => {
    if (!videoIdOrUrl.includes('/') && !videoIdOrUrl.includes('.')) {
      return videoIdOrUrl;
    }
    
    try {
      if (videoIdOrUrl.includes('youtube.com/watch?v=')) {
        const url = new URL(videoIdOrUrl);
        return url.searchParams.get('v') || '';
      } else if (videoIdOrUrl.includes('youtube.com/embed/')) {
        return videoIdOrUrl.split('embed/')[1].split('?')[0].split('/')[0];
      } else if (videoIdOrUrl.includes('youtu.be/')) {
        return videoIdOrUrl.split('youtu.be/')[1].split('?')[0].split('/')[0];
      }
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
    }
    
    return videoIdOrUrl;
  };

  const finalVideoId = extractVideoId(videoId);

  return (
    <div className="youtube-iframe-container relative w-full rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-video relative w-full bg-slate-900">
        <iframe 
          src={`https://www.youtube.com/embed/${finalVideoId}?rel=0&modestbranding=1`}
          title={title || "YouTube video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
        ></iframe>
      </div>
      
      {/* Navigation buttons */}
      {(onPrevious || onNext) && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 pointer-events-none">
          <button 
            onClick={onPrevious} 
            disabled={!hasPrevious}
            className={`p-3 rounded-full bg-black/60 backdrop-blur-sm text-white pointer-events-auto transition-all duration-300 ${
              !hasPrevious ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:bg-black/80 hover:scale-110'
            }`}
            aria-label="Previous video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button 
            onClick={onNext} 
            disabled={!hasNext}
            className={`p-3 rounded-full bg-black/60 backdrop-blur-sm text-white pointer-events-auto transition-all duration-300 ${
              !hasNext ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:bg-black/80 hover:scale-110'
            }`}
            aria-label="Next video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(YouTubeIframePlayer);
