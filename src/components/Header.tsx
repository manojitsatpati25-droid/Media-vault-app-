import React from 'react';
import { Search, Upload, Film, Image as ImageIcon, Sparkles, X, Clapperboard, Phone, User as UserIcon, ShieldCheck } from 'lucide-react';
import { MediaType, UserProfile } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onOpenUpload: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedMediaType,
  onMediaTypeChange,
  onOpenUpload,
  user,
  onOpenAuth,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 transition-all shadow-xl shadow-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-cyan-500/20 overflow-hidden shrink-0">
              <img
                src="/src/assets/images/media_vault_logo_1792679073689.jpg"
                alt="Media Vault"
                className="w-full h-full object-cover rounded-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight flex items-center gap-1.5">
                  Media Vault <span className="text-sm">📹</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  HUB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                Upload & Discover Image / Video Names
              </p>
            </div>
          </div>

          {/* Search Bar - High contrast focus on Video/Media Names */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by video name, image name, topic, creator..."
                className="w-full pl-10 pr-10 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Group: Filter, Upload, Phone Auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Desktop Media Type Filter Pills */}
            <div className="hidden md:flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onMediaTypeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedMediaType === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onMediaTypeChange('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedMediaType === 'video'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Videos</span>
              </button>
              <button
                onClick={() => onMediaTypeChange('image')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedMediaType === 'image'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images</span>
              </button>
            </div>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Phone Authentication Account Button */}
            {user ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-all cursor-pointer group"
                title="Your Phone Profile"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover border border-cyan-500/40"
                />
                <div className="text-left hidden lg:block">
                  <span className="text-xs font-bold text-slate-200 block truncate max-w-[100px] group-hover:text-cyan-300">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone Login</span>
              </button>
            )}

          </div>
        </div>

        {/* Mobile Filter Row */}
        <div className="flex md:hidden py-2 border-t border-slate-800/50 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onMediaTypeChange('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              selectedMediaType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 bg-slate-950'
            }`}
          >
            All Media
          </button>
          <button
            onClick={() => onMediaTypeChange('video')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
              selectedMediaType === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-950'
            }`}
          >
            <Film className="w-3 h-3" /> Videos
          </button>
          <button
            onClick={() => onMediaTypeChange('image')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
              selectedMediaType === 'image' ? 'bg-purple-600 text-white' : 'text-slate-400 bg-slate-950'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Images
          </button>
        </div>
      </div>
    </header>
  );
};
