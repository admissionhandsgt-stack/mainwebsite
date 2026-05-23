import React, { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Maximize, 
  Volume2, 
  Volume1,
  VolumeX, 
  SkipBack, 
  SkipForward,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Rewind,
  FastForward,
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface YoutubePlayerProps {
  videoId: string;
  title?: string;
  fallbackVideoId?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

interface YoutubePlayerState {
  player: any;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ 
  videoId, 
  title = 'YouTube Video',
  fallbackVideoId = 'dQw4w9WgXcQ', // Default fallback video
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) => {
  const isMobile = useIsMobile();
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [isHovering, setIsHovering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [userInteracting, setUserInteracting] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const playbackUpdateIntervalRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  
  const [playerState, setPlayerState] = useState<YoutubePlayerState>({
    player: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 50,
    isMuted: false,
  });
  
  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (!userInteracting) {
        setShowControls(false);
      }
    }, 3000); // 3 seconds
  };
  
  const handleUserInteraction = () => {
    setShowControls(true);
    setUserInteracting(true);
    
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    
    window.setTimeout(() => {
      setUserInteracting(false);
      hideControlsAfterDelay();
    }, 300);
  };
  
  useEffect(() => {
    if (playerState.isPlaying) {
      hideControlsAfterDelay();
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playerState.isPlaying]);
  
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    return () => {
      if (playbackUpdateIntervalRef.current) {
        window.clearInterval(playbackUpdateIntervalRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (!isMobile) {
      setShowControls(true);
    }
  }, [isMobile]);
  
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
  
  const finalVideoId = videoId ? extractVideoId(videoId) : extractVideoId(fallbackVideoId);
  
  const getYoutubeEmbedUrl = () => {
    let url = `https://www.youtube.com/embed/${finalVideoId}`;
    
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: window.location.origin,
      widget_referrer: window.location.href,
    });
    
    if (selectedQuality !== 'auto') {
      params.append('vq', selectedQuality);
    }
    
    return `${url}?${params.toString()}`;
  };
  
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  const togglePlay = () => {
    if (!playerInstanceRef.current) return;
    
    if (playerState.isPlaying) {
      playerInstanceRef.current.pauseVideo();
    } else {
      playerInstanceRef.current.playVideo();
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!playerInstanceRef.current) return;
    
    const newVolume = value[0];
    playerInstanceRef.current.setVolume(newVolume);
    setPlayerState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
  };
  
  const toggleMute = () => {
    if (!playerInstanceRef.current) return;
    
    const newMuteState = !playerState.isMuted;
    if (newMuteState) {
      playerInstanceRef.current.mute();
    } else {
      playerInstanceRef.current.unMute();
      if (playerState.volume === 0) {
        playerInstanceRef.current.setVolume(50);
        setPlayerState(prev => ({ ...prev, volume: 50 }));
      }
    }
    setPlayerState(prev => ({ ...prev, isMuted: newMuteState }));
  };
  
  const skipForward = (seconds = 10) => {
    if (!playerInstanceRef.current) return;
    
    const currentTime = playerInstanceRef.current.getCurrentTime();
    playerInstanceRef.current.seekTo(currentTime + seconds, true);
  };
  
  const skipBackward = (seconds = 10) => {
    if (!playerInstanceRef.current) return;
    
    const currentTime = playerInstanceRef.current.getCurrentTime();
    playerInstanceRef.current.seekTo(Math.max(0, currentTime - seconds), true);
  };
  
  const replayVideo = () => {
    if (!playerInstanceRef.current) return;
    playerInstanceRef.current.seekTo(0, true);
    playerInstanceRef.current.playVideo();
  };
  
  useEffect(() => {
    if (!finalVideoId) return;
    
    window.onYouTubeIframeAPIReady = () => {
      if (!youtubeIframeRef.current) return;
      
      const player = new window.YT.Player(youtubeIframeRef.current, {
        events: {
          onReady: (event: any) => {
            playerInstanceRef.current = event.target;
            
            event.target.setVolume(playerState.volume);
            
            if (playbackUpdateIntervalRef.current) {
              window.clearInterval(playbackUpdateIntervalRef.current);
            }
            
            playbackUpdateIntervalRef.current = window.setInterval(() => {
              if (playerInstanceRef.current) {
                const currentTime = playerInstanceRef.current.getCurrentTime() || 0;
                const duration = playerInstanceRef.current.getDuration() || 0;
                const volume = playerInstanceRef.current.getVolume();
                const isMuted = playerInstanceRef.current.isMuted();
                const state = playerInstanceRef.current.getPlayerState();
                const isPlaying = state === window.YT.PlayerState.PLAYING;
                
                setPlayerState(prev => ({
                  ...prev,
                  currentTime,
                  duration,
                  isPlaying,
                  volume,
                  isMuted
                }));
              }
            }, 1000);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlayerState(prev => ({ ...prev, isPlaying: true }));
              hideControlsAfterDelay();
            } else if (event.data === window.YT.PlayerState.PAUSED || 
                      event.data === window.YT.PlayerState.ENDED) {
              setPlayerState(prev => ({ ...prev, isPlaying: false }));
              setShowControls(true);
            }
          }
        }
      });
    };
    
    if (window.YT && window.YT.Player && playerInstanceRef.current) {
      playerInstanceRef.current.loadVideoById(finalVideoId);
    }
  }, [finalVideoId]);
  
  if (!finalVideoId) {
    console.error('No valid YouTube video ID found:', videoId);
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md flex items-center justify-center">
        <div className="text-gray-500 text-center px-4">
          <p>Video unavailable</p>
          <p className="text-xs mt-2">Invalid YouTube URL or ID</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col">
      <div 
        ref={playerContainerRef}
        className="w-full relative rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-gray-900 to-gray-800 p-1.5"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleUserInteraction}
        onClick={handleUserInteraction}
      >
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <div id="youtube-player" className="w-full h-full">
            <iframe
              ref={youtubeIframeRef}
              id={`youtube-iframe-${finalVideoId}`}
              src={getYoutubeEmbedUrl()}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          
          {!isMobile && (
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/30 backdrop-blur-sm max-h-[15%] transition-opacity duration-300",
                (isHovering || !playerState.isPlaying) ? "opacity-70" : "opacity-0"
              )}
            >
              <div className="w-full h-1 bg-gray-600/70 rounded-full mb-1 cursor-pointer"
                onClick={(e) => {
                  if (!playerInstanceRef.current) return;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = (e.clientX - rect.left) / rect.width;
                  playerInstanceRef.current.seekTo(position * playerState.duration);
                }}
              >
                <div 
                  className="h-full bg-medical-500 rounded-full relative"
                  style={{ width: `${playerState.duration ? (playerState.currentTime / playerState.duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 rounded-full text-white hover:bg-white/20 p-0"
                    onClick={togglePlay}
                  >
                    {playerState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                      onClick={() => skipBackward(10)}
                    >
                      <Rewind size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                      onClick={() => skipForward(10)}
                    >
                      <FastForward size={14} />
                    </Button>
                  </div>
                  
                  <div className="text-white text-xs mx-1">
                    <span>{formatTime(playerState.currentTime)}</span>
                    <span className="mx-1">/</span>
                    <span>{formatTime(playerState.duration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                    onClick={toggleMute}
                  >
                    {playerState.isMuted || playerState.volume === 0 ? (
                      <VolumeX size={14} />
                    ) : playerState.volume < 50 ? (
                      <Volume1 size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </Button>
                  
                  <Select
                    value={selectedQuality}
                    onValueChange={(value) => setSelectedQuality(value)}
                  >
                    <SelectTrigger className="w-[80px] h-6 bg-black/40 border-0 text-white text-xs px-2">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="hd1080">1080p</SelectItem>
                      <SelectItem value="hd720">720p</SelectItem>
                      <SelectItem value="large">480p</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                    onClick={() => {
                      if (playerContainerRef.current) {
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          playerContainerRef.current.requestFullscreen();
                        }
                      }
                    }}
                  >
                    <Maximize size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {isMobile && (
          <div 
            className={cn(
              "w-full px-2 py-1 bg-black/30 backdrop-blur-sm max-h-[15%] rounded-b-lg transition-opacity duration-300 youtube-controls-container",
              (showControls || !playerState.isPlaying) ? "opacity-70" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="w-full h-1 bg-gray-600/70 rounded-full mb-1 cursor-pointer"
                onClick={(e) => {
                  if (!playerInstanceRef.current) return;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = (e.clientX - rect.left) / rect.width;
                  playerInstanceRef.current.seekTo(position * playerState.duration);
                }}
            >
              <div 
                className="h-full bg-medical-500 rounded-full relative"
                style={{ width: `${playerState.duration ? (playerState.currentTime / playerState.duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 rounded-full text-white hover:bg-white/20 p-0"
                  onClick={togglePlay}
                >
                  {playerState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                
                <span className="text-white text-xs">
                  {formatTime(playerState.currentTime)}/{formatTime(playerState.duration)}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                  onClick={() => skipBackward(10)}
                >
                  <Rewind size={12} />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                  onClick={() => skipForward(10)}
                >
                  <FastForward size={12} />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                  onClick={toggleMute}
                >
                  {playerState.isMuted || playerState.volume === 0 ? (
                    <VolumeX size={12} />
                  ) : (
                    <Volume2 size={12} />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 rounded-full text-white hover:bg-white/20 p-0"
                  onClick={() => {
                    if (playerContainerRef.current) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        playerContainerRef.current.requestFullscreen();
                      }
                    }
                  }}
                >
                  <Maximize size={12} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {(onNext || onPrevious) && (
        <div className="flex justify-between mt-4 w-full">
          <Button 
            onClick={onPrevious} 
            disabled={!hasPrevious}
            variant="outline" 
            size="sm"
            className={cn(
              "transition-all duration-200 font-medium flex items-center",
              hasPrevious ? "hover:bg-medical-50 hover:text-medical-700 hover:border-medical-300" : "opacity-50 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="mr-1" size={18} />
            <SkipBack className="mr-1" size={16} />
            Previous
          </Button>
          <Button 
            onClick={onNext} 
            disabled={!hasNext}
            variant="outline" 
            size="sm"
            className={cn(
              "transition-all duration-200 font-medium flex items-center",
              hasNext ? "hover:bg-medical-50 hover:text-medical-700 hover:border-medical-300" : "opacity-50 cursor-not-allowed"
            )}
          >
            Next
            <SkipForward className="ml-1" size={16} />
            <ChevronRight className="ml-1" size={18} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default YoutubePlayer;
