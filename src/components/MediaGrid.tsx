import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Film,
  Image as ImageIcon,
  SlidersHorizontal,
  SearchX,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  CheckCircle2,
  ArrowUp,
  Infinity as InfinityIcon,
  Layers,
} from 'lucide-react';
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
  isMediaSaved?: (id: string) => boolean;
  onToggleSave?: (e: React.MouseEvent, item: MediaItem) => void;
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
  isMediaSaved,
  onToggleSave,
}) => {
  // Browsing Mode: 'infinite' (continuous auto-loading) vs 'pages' (standard pagination)
  const [browseMode, setBrowseMode] = useState<'infinite' | 'pages'>(() => {
    try {
      const saved = localStorage.getItem('mv_browse_mode');
      return saved === 'pages' ? 'pages' : 'infinite';
    } catch {
      return 'infinite';
    }
  });

  // Page size selection
  const [pageSize, setPageSize] = useState<number>(12);
  // Current page for 'pages' mode (1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Batch multiplier for 'infinite' scroll mode (1-indexed)
  const [batchIndex, setBatchIndex] = useState<number>(1);
  // Loading state for smooth transitions
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const gridTopRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Persist browse mode
  const handleSetBrowseMode = (mode: 'infinite' | 'pages') => {
    setBrowseMode(mode);
    try {
      localStorage.setItem('mv_browse_mode', mode);
    } catch {}
  };

  // Reset pagination whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
    setBatchIndex(1);
  }, [searchQuery, selectedMediaType, selectedCategory, sortBy, items.length]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Items to display based on mode
  const displayedItems = useMemo(() => {
    if (items.length === 0) return [];
    if (browseMode === 'pages') {
      const startIndex = (currentPage - 1) * pageSize;
      return items.slice(startIndex, startIndex + pageSize);
    } else {
      // Infinite scroll: show accumulated batches
      const maxCount = Math.min(items.length, batchIndex * pageSize);
      return items.slice(0, maxCount);
    }
  }, [items, browseMode, currentPage, batchIndex, pageSize]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (browseMode !== 'infinite') return;
    if (displayedItems.length >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setBatchIndex((prev) => prev + 1);
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '300px' }
    );

    const target = sentinelRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [browseMode, displayedItems.length, items.length, isLoadingMore]);

  // Scroll to grid top
  const scrollToGridTop = () => {
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Page change handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    scrollToGridTop();
  };

  // Manual Load More handler for infinite mode
  const handleLoadMoreManual = () => {
    if (isLoadingMore || displayedItems.length >= items.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setBatchIndex((prev) => prev + 1);
      setIsLoadingMore(false);
    }, 250);
  };

  // Calculate items range being shown
  const startIndex =
    browseMode === 'pages'
      ? items.length === 0
        ? 0
        : (currentPage - 1) * pageSize + 1
      : 1;
  const endIndex =
    browseMode === 'pages'
      ? Math.min(currentPage * pageSize, items.length)
      : Math.min(displayedItems.length, items.length);

  // Pagination buttons generator
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    let last = 0;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        if (last && i - last === 2) {
          range.push(last + 1);
        } else if (last && i - last !== 1) {
          range.push('...');
        }
        range.push(i);
        last = i;
      }
    }
    return range;
  }, [currentPage, totalPages]);

  return (
    <div ref={gridTopRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>
                {selectedCategory === 'All' ? 'Community Media Gallery' : `${selectedCategory}`}
              </span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 font-mono">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            {items.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">
                • Showing {startIndex}–{endIndex}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `Filtered by video name: "${searchQuery}"`
              : 'Discover community videos and images uploaded by creators'}
          </p>
        </div>

        {/* View mode toggle, page size, and Sort */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap self-stretch md:self-auto justify-between md:justify-end">
          
          {/* Browse Mode Switcher: Infinite vs Pages */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleSetBrowseMode('infinite')}
              title="Infinite Scroll (Auto-load as you scroll)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                browseMode === 'infinite'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Infinite</span>
            </button>
            <button
              onClick={() => handleSetBrowseMode('pages')}
              title="Paginated View (Navigate page by page)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                browseMode === 'pages'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pages</span>
            </button>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="hidden lg:inline text-slate-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
                setBatchIndex(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="alphabetical">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Media Cards Grid */}
      {items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                searchQuery={searchQuery}
                onSelect={onSelectMedia}
                onLike={onLikeMedia}
                isSaved={isMediaSaved ? isMediaSaved(item.id) : false}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>

          {/* INFINITE SCROLL CONTROLS & SENTINEL */}
          {browseMode === 'infinite' && (
            <div className="pt-4 flex flex-col items-center justify-center space-y-4">
              {displayedItems.length < items.length ? (
                <>
                  {/* Invisible sentinel observed by IntersectionObserver */}
                  <div ref={sentinelRef} className="h-4 w-full pointer-events-none opacity-0" />
                  
                  {/* Loader indicator & fallback manual Load More button */}
                  <div className="flex flex-col items-center gap-2">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 text-xs font-medium animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Loading next batch of uploads...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleLoadMoreManual}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-2"
                      >
                        <span>Load More Media ({items.length - displayedItems.length} remaining)</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* All items loaded indicator */
                <div className="flex items-center justify-between w-full pt-4 border-t border-slate-900 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>All {items.length} media items loaded from the vault</span>
                  </div>
                  <button
                    onClick={scrollToGridTop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Back to Top</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAGINATION CONTROLS (Pages mode) */}
          {browseMode === 'pages' && totalPages > 1 && (
            <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Status text */}
              <div className="text-xs text-slate-400 order-2 sm:order-1">
                Page <span className="font-bold text-slate-200">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-200">{totalPages}</span> ({items.length} total)
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
                
                {/* First page button */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous page button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous Page"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numbered page buttons */}
                {paginationRange.map((page, idx) =>
                  page === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 text-xs text-slate-600">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      onClick={() => handlePageChange(page as number)}
                      className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                {/* Next page button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page button */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last Page"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scroll to Top helper in paginated view */}
              <div className="order-3 hidden sm:block">
                <button
                  onClick={scrollToGridTop}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Top</span>
                </button>
              </div>

            </div>
          )}
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
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
