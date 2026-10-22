import React from 'react';
import { Film, Image as ImageIcon, Flame, Eye, Layers } from 'lucide-react';
import { MediaCategory, MediaItem } from '../types';

interface StatsBarProps {
  categories: MediaCategory[];
  selectedCategory: MediaCategory;
  onSelectCategory: (cat: MediaCategory) => void;
  mediaItems: MediaItem[];
  searchQuery: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  mediaItems,
  searchQuery,
}) => {
  const totalVideos = mediaItems.filter(m => m.mediaType === 'video').length;
  const totalImages = mediaItems.filter(m => m.mediaType === 'image').length;
  const totalViews = mediaItems.reduce((acc, curr) => acc + (curr.views || 0), 0);

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/60 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Categories Pill Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Key Metrics Counter */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total: <strong className="text-slate-200">{mediaItems.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>Videos: <strong className="text-slate-200">{totalVideos}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Images: <strong className="text-slate-200">{totalImages}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Views: <strong className="text-slate-200">{totalViews.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Active Search Context Indicator */}
        {searchQuery && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Showing results matching video or media name: <strong className="text-cyan-400">"{searchQuery}"</strong>
            </span>
            <span className="text-slate-500 font-mono">
              {mediaItems.length} {mediaItems.length === 1 ? 'item' : 'items'} found
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
