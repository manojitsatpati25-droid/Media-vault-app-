import React from 'react';
import { Film, Image as ImageIcon, SlidersHorizontal, SearchX, Plus, Sparkles } from 'lucide-react';
import { MediaItem, MediaType, MediaCategory } from '../types';
import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: MediaItem[];
  searchQuery: string;
  selectedMediaType: MediaType;
  selectedCategory: MediaCategory;
  sortBy: 'newest' | 'popular' | 'alphabetical';
  onSortChange: (sort: 'newest' | 'popular' | 'alphabetical') => void;
  onSelectMedia: (item: MediaItem) => void;
  onLikeMedia: (e: React.MouseEvent, id: string) => void;
  onClearSearch: () => void;
  onOpenUpload: () => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  searchQuery,
  selectedMediaType,
  selectedCategory,
  sortBy,
  onSortChange,
  onSelectMedia,
  onLikeMedia,
  onClearSearch,
  onOpenUpload,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>
              {selectedCategory === 'All' ? 'Community Media Gallery' : `${selectedCategory}`}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchQuery
              ? `Filtered by video name: "${searchQuery}"`
              : 'Discover community videos and images uploaded by creators'}
          </p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="alphabetical">Video Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Media Cards Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              searchQuery={searchQuery}
              onSelect={onSelectMedia}
              onLike={onLikeMedia}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-slate-900/30 rounded-3xl border border-slate-800/80 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <SearchX className="w-8 h-8 text-cyan-500/80" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200">No media found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No videos or images matching "${searchQuery}" were found. Try another search term or upload a new file.`
                : 'No media matches the current filter settings.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Clear Search Filter
              </button>
            )}
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload Video/Image</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
