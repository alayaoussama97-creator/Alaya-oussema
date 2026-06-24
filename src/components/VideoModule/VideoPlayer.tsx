import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { CustomPlayer } from './CustomPlayer';
import { cn } from '../../lib/utils';
import { localVideoStore } from './LocalVideoStorage';

// ============================================================================
// 1. REACT ERROR BOUNDARY COMPONENT (Class Component)
// ============================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class VideoPlayerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("VideoPlayer Boundary Catastrophe:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[300px] aspect-video flex flex-col items-center justify-center bg-zinc-950 border border-red-500/30 rounded-[32px] p-8 text-center relative overflow-hidden select-none">
          {/* Cyber grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="relative z-10 max-w-md space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
              <AlertTriangle className="text-red-500" size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-display font-black tracking-tight text-red-400 uppercase">
                ÉCHEC D'INTÉGRITÉ DU MODULE VIDÉO
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Une exception d'exécution a été interceptée par le Sandbox Node.js. Chiffrement de la pile d'erreurs en cours...
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-950/20 border border-red-500/10 rounded-xl text-[10px] text-red-300 font-mono text-left max-h-24 overflow-y-auto scrollbar-thin">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button 
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} className="animate-spin-slow" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// 2. VIDEO PLAYER PROPS & IMPLEMENTATION
// ============================================================================
interface VideoPlayerProps {
  src: string;
  url?: string; // fallback matching either name
  poster?: string;
  type?: 'youtube' | 'external' | 'local' | string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  url, 
  poster, 
  type = 'external', 
  className 
}) => {
  const finalSrc = src || url || '';
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoWaiting, setIsVideoWaiting] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse YouTube links
  const getYouTubeIdsLocally = (u: string) => {
    const videoRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const playlistRegExp = /[?&]list=([^#\&\?]+)/;
    
    return {
      videoId: u.match(videoRegExp)?.[1] || null,
      playlistId: u.match(playlistRegExp)?.[1] || null
    };
  };

  const ytIds = getYouTubeIdsLocally(finalSrc);
  const isYouTube = type === 'youtube' || !!ytIds.videoId || !!ytIds.playlistId || finalSrc.includes('youtube.com') || finalSrc.includes('youtu.be');

  useEffect(() => {
    // Reset loader states when src changes
    setIsLoading(true);
    setIsVideoWaiting(false);

    // Safeguard timeout to clear spinner in case browser events lag
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [finalSrc]);

  useEffect(() => {
    let activeObjectURL = '';
    const resolveSource = async () => {
      if (finalSrc.startsWith('indexeddb://')) {
        const fileKey = finalSrc.replace('indexeddb://', '');
        try {
          const blob = await localVideoStore.getFile(fileKey);
          if (blob) {
            activeObjectURL = URL.createObjectURL(blob);
            setResolvedSrc(activeObjectURL);
          } else {
            console.error("IndexedDB file not found for key:", fileKey);
            setResolvedSrc('');
          }
        } catch (err) {
          console.error("Failed to load file from IndexedDB:", err);
          setResolvedSrc('');
        }
      } else {
        setResolvedSrc(finalSrc);
      }
    };

    resolveSource();

    return () => {
      if (activeObjectURL) {
        URL.revokeObjectURL(activeObjectURL);
      }
    };
  }, [finalSrc]);

  return (
    <VideoPlayerErrorBoundary>
      <div className={cn("relative w-full h-full bg-zinc-950 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl", className)}>
        
        {/* Unified Loading Overlay Container */}
        {(isLoading || isVideoWaiting) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <Loader2 size={44} className="text-nexus-cyan animate-spin" />
                <div className="absolute inset-0 w-11 h-11 border border-nexus-blue/20 rounded-full scale-125 animate-pulse" />
              </div>
              <div className="space-y-1.5 mt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#00ffcc]">
                  {isVideoWaiting ? 'Mise en mémoire tampon...' : 'Authentification et Flux Sécurisé...'}
                </p>
                <div className="flex items-center gap-1.5 justify-center text-[10px] text-zinc-500 font-mono">
                  <ShieldCheck size={12} className="text-nexus-safe animate-pulse" />
                  <span>NEXUS-SECURE-MEDIA-PROXY</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic Video Rendering Surface */}
        <div className="w-full h-full">
          {isYouTube ? (
            <div className="w-full h-full relative">
              {ytIds.playlistId || ytIds.videoId ? (
                <iframe 
                  className="w-full h-full border-0 rounded-[32px]" 
                  src={ytIds.playlistId && !ytIds.videoId 
                    ? `https://www.youtube.com/embed?listType=playlist&list=${ytIds.playlistId}&autoplay=1`
                    : `https://www.youtube.com/embed/${ytIds.videoId}?autoplay=1${ytIds.playlistId ? `&list=${ytIds.playlistId}` : ''}`} 
                  allowFullScreen
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 gap-6 p-8 text-center rounded-[32px]">
                  <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                    <Loader2 className="animate-spin" size={30} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-md font-bold uppercase tracking-tight">Redirection YouTube</h3>
                    <p className="text-xs text-white/40 max-w-sm">Le format personnalisé ne supporte pas l'intégration locale. Cliquez ci-dessous pour ouvrir.</p>
                  </div>
                  <a 
                    href={finalSrc} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg"
                  >
                    Ouvrir sur YouTube
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full relative">
              <CustomPlayer 
                src={resolvedSrc} 
                poster={poster} 
                className="w-full h-full" 
                onLoadStart={() => setIsLoading(true)}
                onWaiting={() => setIsVideoWaiting(true)}
                onCanPlay={() => {
                  setIsLoading(false);
                  setIsVideoWaiting(false);
                }}
                onPlaying={() => {
                  setIsLoading(false);
                  setIsVideoWaiting(false);
                }}
                onError={(err) => {
                  console.warn("VideoPlayer detected CustomPlayer error:", err);
                  setIsLoading(false);
                  setIsVideoWaiting(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </VideoPlayerErrorBoundary>
  );
};
