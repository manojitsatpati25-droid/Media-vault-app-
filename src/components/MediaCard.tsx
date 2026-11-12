import React, { useState, useRef } from 'react';
import { Play, Heart, Eye, Film, Image as ImageIcon, MessageSquare, Sparkles, Bookmark, Share2 } from 'lucide-react';
import { MediaItem } from '../types';
import { formatTimeAgo, formatNumber } from '../utils/storage';

interface MediaCardProps {
  item: MediaItem;
  searchQuery?: string;
  onSelect: (item: MediaItem) => void;
  onLike: (e: React.MouseEvent, id: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent, item: MediaItem) => void;
  onShare?: (e: React.MouseEvent, item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  searchQuery = '',
  onSelect,
  onLike,
  isLiked = false,
  isSaved = false,
  onToggleSave,
  onShare,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.mediaType === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (item.mediaType === 'video' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Helper to highlight matching text in title
  const renderTitle = (title: string, query: string) => {
    if (!query || !query.trim()) return title;
    const parts = title.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-cyan-500/30 text-cyan-200 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Media Preview Thumbnail / Video Player */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {item.mediaType === 'video' ? (
          <>
            {/* Poster or Hover Video Playback */}
            {item.thumbnailUrl && !isHovered ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <video
                ref={videoRef}
                src={item.url}
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            )}

            {/* Video Play Icon Overlay */}
            <div className={`absolute inset-0 bg-slate-950/30 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
              <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-700/80 flex items-center justify-center text-white shadow-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </div>
            </div>

            {/* Duration Badge */}
            {item.duration && (
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/85 text-slate-200 text-[11px] font-mono font-medium border border-slate-800/80 backdrop-blur-sm">
                {item.duration}
              </div>
            )}
          </>
        ) : (
          /* Image Media */
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        )}

        {/* Media Type & Category Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md border shadow-sm">
            {item.mediaType === 'video' ? (
              <span className="bg-indigo-950/80 text-indigo-300 border-indigo-500/40 flex items-center gap-1">
                <Film className="w-3 h-3 text-indigo-400" /> Video
              </span>
            ) : (
              <span className="bg-purple-950/80 text-purple-300 border-purple-500/40 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-purple-400" /> Image
              </span>
            )}
          </div>
          <div className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-950/70 text-slate-300 text-[10px] font-medium border border-slate-800 backdrop-blur-sm">
            {item.category}
          </div>
        </div>

        {/* Floating Bookmark / Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(e, item);
          }}
          title={isSaved ? 'Saved in My Library (Click to remove)' : 'Save / Watch Later'}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer z-20 ${
            isSaved
              ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20'
              : 'bg-slate-950/75 text-slate-400 hover:text-amber-300 border-slate-800 hover:border-slate-700'
          }`}
          aria-label={isSaved ? 'Remove from Saved' : 'Save for later'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Card Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Media / Video Name / Title */}
          <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 line-clamp-2 transition-colors leading-snug">
            {renderTitle(item.title, searchQuery)}
          </h3>

          {/* Description snippet */}
          {item.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author & Metrics Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {/* Creator */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={item.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
              alt={item.author}
              className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-700"
            />
            <span className="truncate text-slate-300 font-medium text-[11px]">
              {item.author}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">
              {formatTimeAgo(item.createdAt)}
            </span>
          </div>

          {/* Engagement Counters: Views, Like (1-like-per-user), Share, and Bookmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Views">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatNumber(item.views)}</span>
            </div>

            {/* Like Button (1-like-per-user toggle) */}
            <button
              onClick={(e) => onLike(e, item.id)}
              className={`flex items-center gap-1 text-[11px] transition-all p-1 -m-1 rounded cursor-pointer ${
                isLiked ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-rose-400'
              }`}
              title={isLiked ? 'You liked this (Click to unlike)' : 'Like this post'}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-all ${
                  isLiked
                    ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'text-rose-500/70 hover:fill-rose-500/40 hover:scale-105'
                }`}
              />
              <span>{formatNumber(item.likes)}</span>
            </button>

            {/* Real-time Share Button */}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(e, item);
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 transition-colors p-1 -m-1 rounded cursor-pointer"
                title="Share this media"
                aria-label="Share"
              >
                <Share2 className="w-3.5 h-3.5 hover:scale-105 transition-transform" />
              </button>
            )}

            {/* Bookmark / Watch Later Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(e, item);
              }}
              className={`flex items-center gap-1 text-[11px] transition-colors p-1 -m-1 rounded cursor-pointer ${
                isSaved ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
              }`}
              title={isSaved ? 'Saved in My Library (Click to remove)' : 'Save / Watch Later'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
