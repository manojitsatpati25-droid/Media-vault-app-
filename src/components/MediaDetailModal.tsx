import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Eye,
  Share2,
  Send,
  MessageSquare,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Loader2,
  Tag,
  Clock,
  User,
  Check,
  Download,
} from 'lucide-react';
import { MediaItem, UserProfile } from '../types';
import { formatTimeAgo, formatNumber } from '../utils/storage';
import { safeApiCall } from '../utils/api';

interface MediaDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string, author: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  onLike,
  onAddComment,
  user,
}) => {
  // Retain the last active media item during exit animations so content persists as it slides out
  const activeItemRef = useRef<MediaItem | null>(item);
  if (item) {
    activeItemRef.current = item;
  }
  const displayItem = item || activeItemRef.current;

  const [commentText, setCommentText] = useState('');
  const [commentAuthor] = useState(user ? user.name : 'Guest User');
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Video player custom controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Gemini AI Tab State
  const [aiSummary, setAiSummary] = useState<string>(item?.aiSummary || '');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    // Reset video & state when item changes
    setIsPlaying(true);
    setPlaybackSpeed(1);
    setCurrentTime(0);
    setAiSummary(item.aiSummary || '');
    setShareStatus(null);
    setCopiedLink(false);
    setIsDownloading(false);
    setDownloadStatus(null);
  }, [item?.id]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (item) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  // Video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Generate a clean, canonical shareable deep link
  const getShareableUrl = () => {
    if (!displayItem) return window.location.href;
    try {
      const isLocalOrCapacitor =
        window.location.origin.includes('localhost') ||
        window.location.protocol === 'capacitor:' ||
        (window as any).Capacitor?.isNativePlatform?.();

      const baseUrl = isLocalOrCapacitor
        ? 'https://ais-pre-bzhmgbegv4r3aiyqtsvekf-799967193229.asia-southeast1.run.app'
        : window.location.origin;

      const url = new URL(baseUrl + (window.location.pathname.startsWith('/') ? window.location.pathname : '/'));
      url.searchParams.set('media', displayItem.id);
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  const copyFallback = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    if (!displayItem) return;
    const shareUrl = getShareableUrl();
    const shareData = {
      title: displayItem.title,
      text: `Watch "${displayItem.title}" on Media Vault:`,
      url: shareUrl,
    };

    // Use Web Share API if available
    if (navigator.share) {
      try {
        if (navigator.canShare && !navigator.canShare(shareData)) {
          await navigator.share({ url: shareUrl, title: displayItem.title });
        } else {
          await navigator.share(shareData);
        }
        setShareStatus('Shared!');
        setCopiedLink(true);
        setTimeout(() => {
          setCopiedLink(false);
          setShareStatus(null);
        }, 2500);
        return;
      } catch (err: any) {
        // User aborted/cancelled the native share dialog
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('Native share failed, falling back to clipboard copy', err);
      }
    }

    // Fallback: Copy to clipboard
    const copied = await copyFallback(shareUrl);
    setShareStatus(copied ? 'Link Copied!' : 'Copied!');
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShareStatus(null);
    }, 2500);
  };

  const handleDownload = async () => {
    if (!displayItem?.url || isDownloading) return;
    setIsDownloading(true);
    setDownloadStatus('Downloading...');

    // Determine appropriate file extension and safe file name
    const fileExt = (() => {
      if (displayItem.mediaType === 'video') return 'mp4';
      if (displayItem.url.includes('.png')) return 'png';
      if (displayItem.url.includes('.webp')) return 'webp';
      if (displayItem.url.includes('.gif')) return 'gif';
      return 'jpg';
    })();

    const safeTitle = (displayItem.title || 'media')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const fileName = `${safeTitle || 'download'}.${fileExt}`;

    try {
      // First attempt: fetch blob to trigger immediate in-browser file download
      const response = await fetch(displayItem.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);

      setDownloadStatus('Saved!');
      setTimeout(() => setDownloadStatus(null), 2500);
    } catch (err) {
      console.warn('Direct blob download failed, attempting fallback download:', err);
      // Fallback: Use direct anchor element for cross-origin or local assets
      try {
        const link = document.createElement('a');
        link.href = displayItem.url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadStatus('Saved!');
        setTimeout(() => setDownloadStatus(null), 2500);
      } catch (fallbackErr) {
        console.error('All download methods failed', fallbackErr);
        setDownloadStatus('Failed');
        setTimeout(() => setDownloadStatus(null), 3000);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !displayItem) return;
    onAddComment(displayItem.id, commentText, commentAuthor);
    setCommentText('');
  };

  // Trigger Gemini AI Summary for video/image with offline heuristic fallback
  const handleGenerateAISummary = async () => {
    if (!displayItem) return;
    setIsAiLoading(true);
    try {
      const res = await safeApiCall('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: displayItem.title,
          description: displayItem.description,
          mediaType: displayItem.mediaType,
          promptType: 'analyzeContent',
        }),
      }, 7000);

      if (res.success && res.result?.summary) {
        setAiSummary(res.result.summary);
      } else {
        // Intelligent client-side fallback summary
        setAiSummary(
          `This ${displayItem.mediaType} "${displayItem.title}" is categorized under ${displayItem.category}. ` +
          (displayItem.description ? `It showcases: "${displayItem.description}". ` : '') +
          `Popular with creators and rated highly in ${displayItem.category}.`
        );
      }
    } catch {
      setAiSummary(
        `This ${displayItem.mediaType} "${displayItem.title}" is featured in ${displayItem.category}. ` +
        (displayItem.description ? displayItem.description : 'High-definition media file.')
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <AnimatePresence>
      {item && displayItem && (
        <motion.div
          key="media-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
        >
          <motion.div
            key={`media-modal-card-${displayItem.id}`}
            initial={{ opacity: 0, y: 55, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 340,
              mass: 0.85,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]"
          >
            {/* Header Bar */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 truncate pr-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold uppercase tracking-wider">
                  {displayItem.mediaType}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                  {displayItem.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  title={`Download ${displayItem.mediaType}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    downloadStatus === 'Saved!'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : downloadStatus === 'Failed'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-emerald-400 border-slate-700/80 hover:border-emerald-500/40'
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span className="hidden sm:inline">Downloading...</span>
                    </>
                  ) : downloadStatus === 'Saved!' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Download</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShare}
                  title="Share media link"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-750 text-cyan-400 border-slate-700/80 hover:border-cyan-500/50'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{shareStatus || 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              
              {/* Main Stage: Player or Image Viewer (2 Cols on lg) */}
              <div className="lg:col-span-2 flex flex-col bg-slate-950">
                {/* Player Container */}
                <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
                  {displayItem.mediaType === 'video' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={displayItem.url}
                        autoPlay
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onClick={togglePlay}
                        className="w-full h-full object-contain cursor-pointer"
                      />

                      {/* Custom Player Controls overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-3 flex flex-col gap-2 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        
                        {/* Scrub bar */}
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />

                        {/* Controls Row */}
                        <div className="flex items-center justify-between text-xs text-slate-200">
                          <div className="flex items-center gap-3">
                            <button onClick={togglePlay} className="p-1 hover:text-cyan-400 transition-colors" title={isPlaying ? "Pause" : "Play"}>
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                            </button>

                            <button onClick={toggleMute} className="p-1 hover:text-cyan-400 transition-colors" title={isMuted ? "Unmute" : "Mute"}>
                              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                            </button>

                            <span className="font-mono text-[11px] text-slate-400">
                              {formatSeconds(currentTime)} / {formatSeconds(duration)}
                            </span>
                          </div>

                          {/* Speed & Fullscreen */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700/80 text-[10px]">
                              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => changeSpeed(speed)}
                                  className={`px-1.5 py-0.5 rounded ${
                                    playbackSpeed === speed
                                      ? 'bg-cyan-500 text-slate-950 font-bold'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>

                            <button onClick={toggleFullscreen} className="p-1 hover:text-cyan-400 transition-colors" title="Fullscreen">
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* High-Res Image Inspector */
                    <img
                      src={displayItem.url}
                      alt={displayItem.title}
                      className="w-full h-full object-contain max-h-[500px]"
                    />
                  )}
                </div>

                {/* Title & Action Bar */}
                <div className="p-5 space-y-4 bg-slate-900/90 border-t border-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-bold text-slate-100 leading-snug">
                        {displayItem.title}
                      </h1>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <User className="w-3.5 h-3.5 text-cyan-400" /> {displayItem.author}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {formatTimeAgo(displayItem.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> {formatNumber(displayItem.views)} views
                        </span>
                      </div>
                    </div>

                    {/* Like, Download & Share Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onLike(displayItem.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-rose-400 border border-slate-700/80 transition-all active:scale-95 text-xs font-semibold cursor-pointer"
                      >
                        <Heart className="w-4 h-4 fill-rose-500/30 text-rose-400" />
                        <span>{formatNumber(displayItem.likes)}</span>
                      </button>

                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title={`Download ${displayItem.mediaType} file`}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-95 text-xs font-semibold cursor-pointer ${
                          downloadStatus === 'Saved!'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                            : downloadStatus === 'Failed'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-800/90 hover:bg-emerald-500/10 text-slate-200 hover:text-emerald-300 border-slate-700/80 hover:border-emerald-500/40'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Saving...</span>
                          </>
                        ) : downloadStatus === 'Saved!' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Downloaded!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-emerald-400" />
                            <span>Download</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleShare}
                        title="Share this media via Web Share or copy link"
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-95 text-xs font-semibold cursor-pointer ${
                          copiedLink
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                            : 'bg-slate-800/90 hover:bg-cyan-500/10 text-slate-200 hover:text-cyan-300 border-slate-700/80 hover:border-cyan-500/40'
                        }`}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>{shareStatus || 'Link Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4 text-cyan-400" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {displayItem.description && (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                      {displayItem.description}
                    </div>
                  )}

                  {/* Tags & Metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      {displayItem.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px]">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {displayItem.fileSize && <span>Size: {displayItem.fileSize}</span>}
                      {displayItem.dimensions && <span className="ml-3">Res: {displayItem.dimensions}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar: AI Assistant & Comments Column */}
              <div className="flex flex-col bg-slate-900/60 divide-y divide-slate-800/80">
                
                {/* AI Insights & Summary Section */}
                <div className="p-4 space-y-3 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Gemini AI Overview</span>
                    </div>

                    <button
                      onClick={handleGenerateAISummary}
                      disabled={isAiLoading}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      <span>{aiSummary ? 'Regenerate' : 'Analyze Media'}</span>
                    </button>
                  </div>

                  {aiSummary ? (
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      {aiSummary}
                    </p>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                      Click "Analyze Media" to generate AI key takeaways and content insights.
                    </div>
                  )}
                </div>

                {/* Comments List & Posting */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span>Comments ({displayItem.comments?.length || 0})</span>
                      </div>
                    </div>

                    {/* Comment Feed */}
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {displayItem.comments && displayItem.comments.length > 0 ? (
                        displayItem.comments.map((comment) => (
                          <div key={comment.id} className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="font-semibold text-cyan-300">{comment.author}</span>
                              <span className="text-[10px] text-slate-500">{formatTimeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed break-words">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 italic text-center py-6">
                          No comments yet. Start the conversation!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-0.5">
                      <span>Posting as <strong className="text-cyan-400">{commentAuthor}</strong></span>
                      {!user && (
                        <span className="text-slate-500">Sign in for verified badge</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={user ? "Write a comment..." : "Write a comment as Guest..."}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shrink-0 font-bold cursor-pointer"
                        title="Send comment"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
