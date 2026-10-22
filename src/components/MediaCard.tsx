import React, { useState, useRef } from 'react';
import { Play, Heart, Eye, Film, Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { formatTimeAgo, formatNumber } from '../utils/storage';

interface MediaCardProps {
  item: MediaItem;
  searchQuery?: string;
  onSelect: (item: MediaItem) => void;
  onLike: (e: React.MouseEvent, id: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  searchQuery = '',
  onSelect,
  onLike,
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

        {/* Media Type Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md border shadow-sm">
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

        {/* Category Pill */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/70 text-slate-300 text-[10px] font-medium border border-slate-800 backdrop-blur-sm">
          {item.category}
        </div>
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

          {/* Engagement Counters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Views">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatNumber(item.views)}</span>
            </div>

            <button
              onClick={(e) => onLike(e, item.id)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors p-1 -m-1 rounded"
              title="Like"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500/70 hover:fill-rose-500 transition-all" />
              <span>{formatNumber(item.likes)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
