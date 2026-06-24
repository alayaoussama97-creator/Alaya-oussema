import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  Play,
  X,
  Search,
  Loader2,
  Database,
  RefreshCcw,
  AlertCircle,
  UploadCloud,
  FileVideo,
  Tag,
  Edit3,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoItem } from './types';
import { cn } from '../../lib/utils';
import { VideoPlayer } from './VideoPlayer';
import { localVideoStore } from './LocalVideoStorage';
import { db, auth, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc
} from 'firebase/firestore';

interface VideoModuleProps {
  activeVideo: VideoItem | null;
  setActiveVideo: (video: VideoItem | null) => void;
}

export const VideoModule: React.FC<VideoModuleProps> = ({ activeVideo, setActiveVideo }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [onlyShowMine, setOnlyShowMine] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [addTab, setAddTab] = useState<'url' | 'file'>('url');
  const [tagsEditingActive, setTagsEditingActive] = useState(false);
  const [editingTagsInput, setEditingTagsInput] = useState('');

  const getYouTubeIds = (url: string) => {
    const videoRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const playlistRegExp = /[?&]list=([^#\&\?]+)/;
    
    return {
      videoId: url.match(videoRegExp)?.[1] || null,
      playlistId: url.match(playlistRegExp)?.[1] || null
    };
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoData: VideoItem[] = [];
      snapshot.forEach((doc) => {
        videoData.push({ id: doc.id, ...doc.data() } as VideoItem);
      });
      setVideos(videoData);
      setLoading(false);

      // Auto-seed playlist and key demo videos if missing
      const playlistId = "PLlLRxnWDSVNL1sDlxZr-R-5qfzoqsYapp";
      const ztnaDemoUrl = "https://storage.googleapis.com/temp-public-assets/ztna-demo.mp4";
      const mtlsDemoUrl = "https://storage.googleapis.com/temp-public-assets/mtls-demo.mp4";
      const userId = auth.currentUser?.uid || 'guest_user';

      if (!videoData.some(v => v.url.includes(playlistId))) {
        addDoc(collection(db, 'videos'), {
          title: "Nexus Technology Playlist",
          url: `https://youtube.com/playlist?list=${playlistId}`,
          type: 'youtube',
          thumbnail: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=400",
          createdAt: Date.now() - 3000,
          userId: userId,
          duration: 'Playlist',
          tags: ['Cyber', 'Tech', 'Nexus']
        }).catch(err => {
          console.warn("Playlist seed skipped: ", err);
        });
      }

      if (!videoData.some(v => v.url === ztnaDemoUrl)) {
        addDoc(collection(db, 'videos'), {
          title: "Démonstration ZTNA & mTLS",
          url: ztnaDemoUrl,
          type: 'external',
          thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400",
          createdAt: Date.now() - 2000,
          userId: userId,
          duration: "01:40",
          tags: ['ZTNA', 'mTLS', 'Ubuntu', 'Demo', 'Featured']
        }).catch(err => {
          console.warn("ZTNA seed skipped: ", err);
        });
      }

      if (!videoData.some(v => v.url === mtlsDemoUrl)) {
        addDoc(collection(db, 'videos'), {
          title: "Confidential mTLS Communication",
          url: mtlsDemoUrl,
          type: 'external',
          thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=400",
          createdAt: Date.now() - 1000,
          userId: userId,
          duration: "02:15",
          tags: ['mTLS', 'NGINX', 'SSL', 'Cyber']
        }).catch(err => {
          console.warn("mTLS seed skipped: ", err);
        });
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setConnectionError(true);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'videos');
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (file: File) => {
    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../../firebase');
    const userId = auth.currentUser?.uid || 'guest_user';
    const storageRef = ref(storage, `videos/${userId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), 
        (error) => reject(error), 
        () => getDownloadURL(uploadTask.snapshot.ref).then(resolve)
      );
    });
  };

  const addVideo = async () => {
    if (!urlInput && !uploadFile) {
        setErrorStatus("Veuillez entrer une URL ou choisir un fichier.");
        return;
    }
    setIsSaving(true);
    setErrorStatus(null);
    try {
      const userId = auth.currentUser?.uid || 'guest_user';
      let finalUrl = urlInput.trim();
      let finalType: 'youtube' | 'external' | 'local' = 'external';
      let finalThumbnail = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400";

      let isLocalOnly = false;
      if (uploadFile) {
        try {
          finalUrl = await handleFileUpload(uploadFile);
          finalType = 'local';
        } catch (uploadError) {
          console.warn("Storage upload failed or unconfigured, falling back to local IndexedDB:", uploadError);
          const fileId = `local_${Date.now()}`;
          finalUrl = await localVideoStore.saveFile(uploadFile, fileId);
          finalType = 'local';
          isLocalOnly = true;
        }
      } else {
        const ids = getYouTubeIds(finalUrl);
        if (ids.videoId || ids.playlistId) {
          finalType = 'youtube';
          if (ids.videoId) {
            finalThumbnail = `https://img.youtube.com/vi/${ids.videoId}/maxresdefault.jpg`;
          } else {
            // Placeholder for playlist
            finalThumbnail = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=400";
          }
        } else if (isYouTubeUrl(finalUrl)) {
          finalType = 'youtube';
          finalThumbnail = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=400";
        }
      }
      
      await addDoc(collection(db, 'videos'), {
        title: titleInput || 'Nouvelle Ressource',
        url: finalUrl,
        type: finalType,
        thumbnail: finalThumbnail,
        createdAt: Date.now(),
        userId: userId,
        duration: durationInput || 'Nexus Item',
        tags: tagsInput ? tagsInput.split(',').map(t => t.trim()) : ['External'],
        isLocalOnly: isLocalOnly
      });

      setIsAddingMode(false);
      setUrlInput('');
      setTitleInput('');
      setUploadFile(null);
      setErrorStatus(null);
    } catch (error: any) {
      console.error("Error adding video:", error);
      setErrorStatus("Erreur lors de l'enregistrement de la vidéo.");
      handleFirestoreError(error, OperationType.WRITE, 'videos');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVideo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette ressource ?")) return;
    setDeletingId(id);
    try {
      const videoToDelete = videos.find(v => v.id === id);
      if (videoToDelete && videoToDelete.url.startsWith('indexeddb://')) {
        const fileKey = videoToDelete.url.replace('indexeddb://', '');
        await localVideoStore.deleteFile(fileKey).catch(err => console.warn("Error deleting IndexedDB file:", err));
      }
      await deleteDoc(doc(db, 'videos', id));
      if (activeVideo?.id === id) setActiveVideo(null);
    } catch (error: any) {
      console.error("Error deleting video:", error);
      setErrorStatus("Erreur lors de la suppression de la vidéo.");
      handleFirestoreError(error, OperationType.DELETE, `videos/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const saveActiveTags = async () => {
    if (!activeVideo) return;
    try {
      const updatedTags = editingTagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await updateDoc(doc(db, 'videos', activeVideo.id), {
        tags: updatedTags
      });
      setTagsEditingActive(false);
    } catch (err: any) {
      console.error("Error updating video tags:", err);
      setErrorStatus("Erreur lors de la mise à jour des tags.");
      handleFirestoreError(err, OperationType.UPDATE, `videos/${activeVideo.id}`);
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag ? v.tags?.includes(selectedTag) : true;
    const matchesUser = onlyShowMine ? v.userId === (auth.currentUser?.uid || 'guest_user') : true;
    return matchesSearch && matchesTag && matchesUser;
  });

  const allTags = Array.from(new Set(videos.flatMap(v => v.tags || []))).sort();

  return (
    <div className="w-full space-y-12 bg-black min-h-screen text-white pb-20 relative px-4 sm:px-8 lg:px-12 pt-10">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {!activeVideo && filteredVideos.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-[55vh] w-full rounded-[40px] overflow-hidden shadow-2xl group flex items-end p-8 sm:p-16">
          <div className="absolute inset-0 z-0">
            <img src={filteredVideos[0].thumbnail || null} className="w-full h-full object-cover brightness-50 group-hover:scale-105 transition-transform duration-1000" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">Exclusif Nexus</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-display font-black tracking-tight uppercase leading-none">{filteredVideos[0].title}</h1>
            <div className="flex items-center gap-4 pt-4">
              <button onClick={() => setActiveVideo(filteredVideos[0])} className="bg-white text-black px-8 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-neutral-200 transition-all active:scale-95">
                <Play className="fill-current" size={20} /> CONSULTER
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10 pt-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-center gap-6 overflow-hidden w-full xl:max-w-4xl">
          <h1 className="text-2xl font-display font-bold tracking-tight uppercase shrink-0">Médiathèque & Liens</h1>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap w-full">
             <button 
               onClick={() => setSelectedTag(null)} 
               className={cn(
                 "text-xs font-bold uppercase tracking-widest transition-all px-3.5 py-2 rounded-full border shrink-0", 
                 !selectedTag 
                   ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)] font-black" 
                   : "border-white/10 text-white/50 hover:text-white"
               )}
             >
               Tout ({videos.length})
             </button>
             {allTags.map(tag => {
               const count = videos.filter(v => v.tags?.includes(tag)).length;
               return (
                 <button 
                   key={tag} 
                   onClick={() => setSelectedTag(tag)} 
                   className={cn(
                     "text-xs font-bold uppercase tracking-widest transition-all px-3.5 py-2 rounded-full border shrink-0 flex items-center gap-2", 
                     selectedTag === tag 
                       ? "bg-nexus-blue text-white border-nexus-blue shadow-[0_0_20px_rgba(14,165,233,0.3)] font-black" 
                       : "border-white/10 text-white/50 hover:text-white"
                   )}
                 >
                   <span>#{tag}</span>
                   <span className={cn(
                     "text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono",
                     selectedTag === tag ? "bg-white/20 text-white font-black" : "bg-white/5 text-white/40"
                   )}>
                     {count}
                   </span>
                 </button>
               );
             })}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button 
            onClick={() => setOnlyShowMine(!onlyShowMine)}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-3.5 rounded-2xl border transition-all shrink-0",
              onlyShowMine ? "bg-nexus-blue/20 border-nexus-blue text-nexus-blue shadow-[0_0_15px_rgba(14,165,233,0.3)]" : "border-white/10 text-white/40 hover:text-white/60"
            )}
          >
            Mes Ressources
          </button>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-12 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-40 md:w-52" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
          <button onClick={() => setIsAddingMode(true)} className="p-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl transition-all"><Plus size={20}/></button>
        </div>
      </div>

      {activeVideo ? (() => {
        const currentLiveVideo = videos.find(v => v.id === activeVideo.id) || activeVideo;
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-bold">{currentLiveVideo.title}</h2>
              <button 
                onClick={() => { 
                  setActiveVideo(null); 
                  setTagsEditingActive(false); 
                }} 
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl"
              >
                <X size={24}/>
              </button>
            </div>
            <div className="aspect-video w-full rounded-[40px] overflow-hidden shadow-2xl border border-white/10 bg-black">
              <VideoPlayer 
                src={currentLiveVideo.url} 
                poster={currentLiveVideo.thumbnail} 
                type={currentLiveVideo.type} 
                className="w-full h-full" 
              />
            </div>

            {/* Dynamic Metadata and Editing Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-900/45 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-nexus-blue uppercase block">
                    Média Enregistré
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {currentLiveVideo.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-white/50 pt-1">
                    <span className="font-mono">{currentLiveVideo.duration || '00:00'}</span>
                    <span>•</span>
                    <span className="capitalize">{currentLiveVideo.type === 'youtube' ? 'YouTube Link' : currentLiveVideo.isLocalOnly ? 'Fichier Local PC' : 'Fichier Serveur'}</span>
                    {currentLiveVideo.createdAt && (
                      <>
                        <span>•</span>
                        <span>Ajouté le {typeof (currentLiveVideo.createdAt as any)?.toDate === 'function' ? (currentLiveVideo.createdAt as any).toDate().toLocaleDateString('fr-FR') : new Date(currentLiveVideo.createdAt).toLocaleDateString('fr-FR')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setTagsEditingActive(!tagsEditingActive);
                      setEditingTagsInput(currentLiveVideo.tags?.join(', ') || '');
                    }}
                    className={cn(
                      "px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white/80 hover:text-white transition-all active:scale-95",
                      tagsEditingActive && "bg-nexus-blue/20 border-nexus-blue text-white"
                    )}
                  >
                    <Edit3 size={14} /> Gérer les Tags
                  </button>
                </div>
              </div>

              {/* Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="text-nexus-blue shrink-0" size={14} />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
                    Tags Métadonnées Associés
                  </span>
                </div>

                {tagsEditingActive ? (
                  <div className="space-y-4 bg-black/40 border border-white/5 p-5 rounded-2xl animate-fade-in">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          placeholder="Ajouter des tags séparés par des virgules (ex: Cyber, mTLS, Demo)..." 
                          className="w-full bg-neutral-800/80 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-nexus-blue outline-none text-xs text-white placeholder-white/30" 
                          value={editingTagsInput}
                          onChange={(e) => setEditingTagsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveActiveTags();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={saveActiveTags}
                          className="px-4 py-3 bg-[#00ffcc] hover:bg-[#00e6b8] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Check size={14} /> Enregistrer
                        </button>
                        <button 
                          onClick={() => setTagsEditingActive(false)}
                          className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-white/60 hover:text-white shrink-0"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>

                    {/* Tags suggestion cloud */}
                    {allTags.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-white/5">
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                          Tags existants dans la bibliothèque (cliquer pour basculer la sélection) :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allTags.map(tag => {
                            const parts = editingTagsInput.split(',').map(t => t.trim()).filter(Boolean);
                            const hasTag = parts.some(t => t.toLowerCase() === tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  let newTags;
                                  if (hasTag) {
                                    newTags = parts.filter(t => t.toLowerCase() !== tag.toLowerCase());
                                  } else {
                                    newTags = [...parts, tag];
                                  }
                                  setEditingTagsInput(newTags.join(', '));
                                }}
                                className={cn(
                                  "text-[10px] font-mono px-2 py-1 rounded transition-all border select-none",
                                  hasTag 
                                    ? "bg-nexus-blue/25 border-nexus-blue text-white font-bold" 
                                    : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20"
                                )}
                              >
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentLiveVideo.tags && currentLiveVideo.tags.length > 0 ? (
                      currentLiveVideo.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTag(tag);
                            setActiveVideo(null);
                            setTimeout(() => {
                              window.scrollTo({ top: 350, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="text-xs font-mono font-bold bg-white/5 hover:bg-nexus-blue/15 border border-white/10 hover:border-nexus-blue/30 text-white/80 hover:text-nexus-blue px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                          title={`Filtrer par #${tag}`}
                        >
                          <span>#{tag}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-white/30 italic">Aucun tag pour cet élément</span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      })() : filteredVideos.length === 0 ? (
        <div className="bg-white/5 rounded-[40px] p-20 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[400px]">
          <Play size={48} className="text-white/20 mb-4" />
          <h3 className="text-2xl font-display font-bold uppercase tracking-tight">Aucun contenu disponible</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative z-10">
          {filteredVideos.map((video, idx) => (
            <motion.div 
              key={video.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.05 }} 
              onClick={() => setActiveVideo(video)} 
              className="group cursor-pointer relative"
            >
              {/* Card Glow Effect */}
              <div className="absolute -inset-2 bg-nexus-blue/20 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:scale-105 group-hover:border-nexus-blue/50 transition-all duration-500 shadow-2xl">
                 <img src={video.thumbnail || null} className="w-full h-full object-cover brightness-75 group-hover:brightness-50 transition-all duration-700" alt="" />
                 
                 {/* Premium Overlay */}
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 p-5 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent">
                    <div className="flex gap-2 mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="p-2 bg-white text-black rounded-full shadow-xl">
                        <Play size={12} fill="currentColor" />
                      </div>
                      <button 
                        onClick={(e) => deleteVideo(video.id, e)}
                        disabled={deletingId === video.id}
                        className="p-2 bg-red-600/80 backdrop-blur-md rounded-full border border-red-500/20 text-white hover:bg-red-600 transition-colors"
                      >
                        {deletingId === video.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                    
                    <h5 className="font-bold text-sm uppercase tracking-tight truncate mb-1">{video.title}</h5>
                    
                    {/* Tags on card hover */}
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 max-h-12 overflow-hidden">
                        {video.tags.slice(0, 3).map(tag => (
                          <span 
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tag);
                              setTimeout(() => {
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }, 100);
                            }}
                            className="text-[9px] font-mono font-bold bg-white/10 hover:bg-nexus-blue/20 border border-white/5 hover:border-nexus-blue/30 text-white/80 hover:text-white px-1.5 py-0.5 rounded transition-all"
                            title={`Filtrer par #${tag}`}
                          >
                            #{tag}
                          </span>
                        ))}
                        {video.tags.length > 3 && (
                          <span className="text-[9px] font-mono text-white/45 px-1 py-0.5">
                            +{video.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                       <span className="text-accent-safe text-[10px] font-black uppercase tracking-widest">98% Match</span>
                       <span className="text-white/40 text-[10px] font-bold">{video.duration}</span>
                       <div className="px-1 border border-white/20 rounded-[2px] text-[8px] text-white/40 font-bold">HD</div>
                    </div>
                 </div>

                 {/* Static Badge */}
                 {!activeVideo && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[8px] font-black tracking-widest text-white/60 uppercase">
                        {video.isLocalOnly ? "📁 FICHIER PC" : "Nexus Archive"}
                      </span>
                    </div>
                 )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isAddingMode && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-neutral-900 border border-white/10 rounded-[32px] p-8 sm:p-12 w-full max-w-xl text-white relative shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin animate-glow"
            >
              <button onClick={() => { setIsAddingMode(false); setUploadFile(null); setUrlInput(''); setTitleInput(''); setAddTab('url'); }} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
                <X size={24}/>
              </button>
              
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight">Ajouter un Lien / Média</h2>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-mono">Enregistrement dans l'infrastructure mTLS</p>
                </div>

                {/* Segment Selector */}
                <div className="grid grid-cols-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => { setAddTab('url'); setUploadFile(null); setErrorStatus(null); }}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      addTab === 'url' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                    )}
                  >
                    Lien URL
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setAddTab('file'); setUrlInput(''); setErrorStatus(null); }}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      addTab === 'file' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                    )}
                  >
                    Importer Fichier PC
                  </button>
                </div>

                <div className="space-y-4">
                  {errorStatus && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-wider">
                      <AlertCircle size={16} />
                      {errorStatus}
                    </motion.div>
                  )}

                  {addTab === 'url' && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Adresse URL de la Vidéo</label>
                      <input 
                        type="text" 
                        placeholder="URL (YouTube ou flux MP4 direct...)" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-nexus-blue outline-none text-sm font-mono" 
                        value={urlInput} 
                        onChange={e => { setUrlInput(e.target.value); setErrorStatus(null); }} 
                      />
                    </div>
                  )}

                  {addTab === 'file' && (
                    <div className="space-y-4">
                      {uploadFile ? (
                        <div className="space-y-1 animate-fade-in">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Fichier Vidéo Sélectionné</label>
                          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileVideo className="text-[#00ffcc] shrink-0 animate-bounce" size={24} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate max-w-xs">{uploadFile.name}</p>
                                <p className="text-[10px] text-white/40 font-mono">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setUploadFile(null)} 
                              className="p-1 px-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase hover:bg-red-500/20"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('video/')) {
                              setUploadFile(file);
                              if (!titleInput) {
                                setTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                              }
                            } else {
                              setErrorStatus("Seuls les fichiers vidéo sont acceptés.");
                            }
                          }}
                          className={cn(
                            "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative select-none",
                            isDragging 
                              ? "border-[#00ffcc] bg-emerald-500/10 scale-[0.99] shadow-[0_0_30px_rgba(0,255,204,0.15)]" 
                              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          )}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'video/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                setUploadFile(file);
                                if (!titleInput) {
                                  setTitleInput(file.name.replace(/\.[^/.]+$/, ''));
                                }
                              }
                            };
                            input.click();
                          }}
                        >
                          <UploadCloud className={cn("text-white/40 transition-colors", isDragging && "text-[#00ffcc] scale-110")} size={40} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#00ffcc]">Glisser-déposer votre vidéo</p>
                            <p className="text-[10px] text-white/30 font-mono">Sélectionnez ou glissez un fichier de votre PC • Max 100MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Common Metadata Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Titre</label>
                      <input 
                        type="text" 
                        placeholder="Titre de la vidéo" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-nexus-blue outline-none text-xs" 
                        value={titleInput} 
                        onChange={e => { setTitleInput(e.target.value); setErrorStatus(null); }} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Durée (ex: 01:45)</label>
                      <input 
                        type="text" 
                        placeholder="Durée estimée" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-nexus-blue outline-none text-xs font-mono" 
                        value={durationInput} 
                        onChange={e => setDurationInput(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono block">Tags / Catégories</label>
                    <input 
                      type="text" 
                      placeholder="Séparez par des virgules (ex: ZTNA, mTLS...)" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-nexus-blue outline-none text-xs" 
                      value={tagsInput} 
                      onChange={e => setTagsInput(e.target.value)} 
                    />
                    
                    {/* Active tags preview chips */}
                    {tagsInput.split(',').map(t => t.trim()).filter(Boolean).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in">
                        {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map((t, idx) => (
                          <span key={idx} className="text-[10px] font-mono bg-white/10 border border-white/5 text-white/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            #{t}
                            <button 
                              type="button" 
                              onClick={() => {
                                const remaining = tagsInput.split(',')
                                  .map(tag => tag.trim())
                                  .filter(tag => tag !== t);
                                setTagsInput(remaining.join(', '));
                              }}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggestions Section */}
                    {allTags.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest font-bold">Suggestions de tags existants :</p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                          {allTags.map(tag => {
                            const trimmedInputParts = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                            const hasTag = trimmedInputParts.some(t => t.toLowerCase() === tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  let newTags;
                                  if (hasTag) {
                                    newTags = trimmedInputParts.filter(t => t.toLowerCase() !== tag.toLowerCase());
                                  } else {
                                    newTags = [...trimmedInputParts, tag];
                                  }
                                  setTagsInput(newTags.join(', '));
                                }}
                                className={cn(
                                  "text-[10px] font-mono px-2 py-1 rounded transition-all border select-none",
                                  hasTag 
                                    ? "bg-nexus-blue/20 border-nexus-blue text-white" 
                                    : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20"
                                )}
                              >
                                + {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Ring or Bar */}
                  {isSaving && uploadFile && (
                    <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider">
                        <span className="text-[#00ffcc]">Chiffrement et Upload...</span>
                        <span className="font-bold">{uploadProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-nexus-blue to-[#00ffcc] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={addVideo} 
                    disabled={isSaving}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                    {isSaving ? "Téléversement en cours..." : "Sauvegarder dans la bibliothèque"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
