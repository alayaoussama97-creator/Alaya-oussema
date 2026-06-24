import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw,
  FastForward,
  Settings,
  Terminal as TermIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { TerminalSimulator } from './TerminalSimulator';

interface CustomPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
  onWaiting?: () => void;
  onError?: (err: any) => void;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({ 
  src, 
  poster, 
  className,
  onLoadStart,
  onCanPlay,
  onPlaying,
  onWaiting,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [showSimulator, setShowSimulator] = useState(false);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  };

  const seekBy = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
    }
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'l':
          e.preventDefault();
          seekBy(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          seekBy(5);
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'c':
          // Toggle caption (if implemented) or just a fun shortcut
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullscreen]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      const value = Number(e.target.value);
      const time = (value / 100) * videoRef.current.duration;
      if (isFinite(time)) {
        videoRef.current.currentTime = time;
        setProgress(value);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      setIsMuted(value === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    setCurrentSrc(src);
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      setProgress(0);
      setError(false);
    }
  }, [src]);

  if (showSimulator) {
    return (
      <div className={cn("relative bg-black rounded-xl overflow-hidden aspect-video shadow-2xl border border-white/10", className)}>
        <TerminalSimulator onClose={() => {
          setShowSimulator(false);
          setError(false);
        }} />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative group bg-black rounded-xl overflow-hidden aspect-video shadow-2xl",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={currentSrc || null}
        poster={poster || null}
        className="w-full h-full cursor-pointer"
        onClick={togglePlay}
        onLoadedMetadata={(e) => {
          handleLoadedMetadata();
          onCanPlay?.();
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadStart={onLoadStart}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        playsInline
        crossOrigin="anonymous"
        onError={(e) => {
          const videoElement = e.currentTarget;
          console.error("Video loading error:", videoElement.error);
          setError(true);
          onError?.(videoElement.error || { message: "Unknown details error" });
        }}
      />

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/98 text-white p-6 text-center z-[60] backdrop-blur-md">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3 border border-red-500/20">
            <VolumeX size={24} className="text-red-500" />
          </div>
          <h3 className="font-extrabold text-md uppercase tracking-wide mb-1 text-red-400">Erreur de Flux Vidéo</h3>
          <p className="text-neutral-400 text-[11px] max-w-sm mb-5 leading-normal">
            L'hébergement distant d'origine de cette démo a expiré (GCS NoSuchBucket). Vous pouvez lancer notre <strong>simulation de terminal interactive</strong> haute-fidélité en un clic !
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button 
              onClick={() => setShowSimulator(true)}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 border border-green-500"
            >
              <TermIcon size={14} /> lancer la simulation terminal
            </button>
            <button 
              onClick={() => {
                setError(false);
                setCurrentSrc("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                    setIsPlaying(true);
                  }
                }, 100);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Regarder un flux vidéo d'archive
            </button>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => {
                  setError(false);
                  if (videoRef.current) videoRef.current.load();
                }}
                className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-bold uppercase"
              >
                Réessayer
              </button>
              <button 
                onClick={() => window.open(src, '_blank')}
                className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-bold uppercase border border-white/5"
              >
                Lien direct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speed Overlay Menu */}
      <AnimatePresence>
        {showSpeedMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 z-50 min-w-[120px] shadow-2xl"
          >
            <div className="text-[10px] uppercase font-black tracking-widest text-neutral-500 mb-2 px-2">Vitesse</div>
            {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                  playbackRate === rate ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span>{rate === 1 ? 'Normale' : `${rate}x`}</span>
                {playbackRate === rate && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolution Indicator (Top Right) */}
      <div className={cn(
        "absolute top-4 right-4 transition-opacity duration-300 pointer-events-none",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {resolution && (
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-white/50 tracking-wider">
            {resolution.width}x{resolution.height} {resolution.height >= 720 ? <span className="text-blue-400 font-bold ml-1">HD</span> : null}
          </div>
        )}
      </div>

      {/* Overlay controls */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent transition-opacity duration-300 flex flex-col justify-end p-4 lg:p-6",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 mb-4 group/progress">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-full h-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-100 relative shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-xl" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all active:scale-90">
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume relative">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 active:scale-95 transition-all">
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-24 transition-all duration-300 opacity-0 group-hover/volume:opacity-100 h-1 appearance-none bg-blue-500/20 rounded-full accent-blue-500"
              />
            </div>

            <div className="text-xs font-mono text-white/70 tabular-nums">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="mx-1.5 opacity-30">/</span>
              <span className="opacity-60">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setShowSimulator(true)}
              className="flex items-center gap-1.5 px-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/20 hover:border-[#00ffcc]/40 text-[#00ffcc] py-1 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider"
              title="Lancer la simulation de terminal interactive"
            >
              <TermIcon size={12} />
              <span>Terminal</span>
            </button>
            
            <button 
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                showSpeedMenu ? "bg-white/10 text-blue-400" : "text-white/70 hover:text-white"
              )}
            >
              <Settings size={18} className={cn(showSpeedMenu && "animate-spin-slow")} />
              <span className="text-[10px] font-bold uppercase tracking-tight">{playbackRate}x</span>
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-all active:scale-90">
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Center Play/Pause Indicator (briefly visible on toggle) */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
            <Play size={32} className="text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
};
