import React, { useState } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  LogOut,
  Upload,
  Heart,
  Eye,
  Film,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Layers,
  Flame,
  TrendingUp,
  Bookmark,
  Clock,
} from 'lucide-react';
import { UserProfile, MediaItem } from '../types';
import { formatTimeAgo, formatNumber } from '../utils/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  userMedia: MediaItem[];
  savedMediaItems?: MediaItem[];
  onLogout: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onOpenUpload: () => void;
  onToggleSave?: (e: React.MouseEvent | null, item: MediaItem) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userMedia,
  savedMediaItems = [],
  onLogout,
  onSelectMedia,
  onOpenUpload,
  onToggleSave,
}) => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'library'>('uploads');

  if (!isOpen || !user) return null;

  // Real-time metrics calculated from user's media items in Firestore
  const totalViews = userMedia.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = userMedia.reduce((acc, curr) => acc + (curr.likes || 0), 0);
  const totalVideos = userMedia.filter((m) => m.mediaType === 'video').length;
  const totalImages = userMedia.filter((m) => m.mediaType === 'image').length;
  const avgViewsPerItem = userMedia.length > 0 ? Math.round(totalViews / userMedia.length) : 0;
  const avgLikesPerItem = userMedia.length > 0 ? (totalLikes / userMedia.length).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-cyan-950/30 overflow-hidden my-8">
        
        {/* Cover Accent Banner */}
        <div className="h-28 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 pb-6 relative z-10 -mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 shadow-xl bg-slate-950"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" /> {user.authProvider ? `${user.authProvider.toUpperCase()} Verified` : 'Verified'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                  {user.email ? (
                    <span className="font-mono text-slate-300">{user.email}</span>
                  ) : user.phoneNumber ? (
                    <span className="font-mono text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {user.phoneNumber}
                    </span>
                  ) : (
                    <span className="text-slate-400">Vault Member</span>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Member since {formatTimeAgo(user.joinedAt)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Performance Metrics: Total Views, Total Likes, Total Uploads & My Library */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Total Views Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Total Views</span>
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-cyan-400 font-sans tracking-tight">
                  {formatNumber(totalViews)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  across all uploads
                </div>
              </div>

              {/* Likes Received Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Likes Received</span>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-rose-400 font-sans tracking-tight">
                  {formatNumber(totalLikes)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  community likes
                </div>
              </div>

              {/* Total Uploads Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Total Uploads</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-slate-100 font-sans tracking-tight">
                  {userMedia.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {totalVideos} vids • {totalImages} imgs
                </div>
              </div>

              {/* My Library / Saved Card */}
              <div
                onClick={() => setActiveTab('library')}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-400">My Library</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Bookmark className="w-3.5 h-3.5 fill-amber-500/30" />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-amber-400 font-sans tracking-tight">
                  {savedMediaItems.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  saved for later
                </div>
              </div>

            </div>

            {/* Engagement Summary Strip */}
            {userMedia.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Firestore Cloud Impact:</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Avg. Views / Item: <strong className="text-slate-200">{avgViewsPerItem.toLocaleString()}</strong></span>
                  <span>Avg. Likes / Item: <strong className="text-slate-200">{avgLikesPerItem}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs: Your Uploads vs My Library */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('uploads')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'uploads'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Your Uploads</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {userMedia.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('library')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'library'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-amber-500/30" />
                  <span>My Library</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-amber-300 font-mono">
                    {savedMediaItems.length}
                  </span>
                </button>
              </div>

              {activeTab === 'uploads' && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenUpload();
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload New
                </button>
              )}
            </div>

            {/* Tab 1 Content: User's Uploaded Media Gallery */}
            {activeTab === 'uploads' && (
              <div>
                {userMedia.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                    {userMedia.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          onSelectMedia(item);
                        }}
                        className="group relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm"
                      >
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        
                        {/* Media Type Badge */}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                          {item.mediaType === 'video' ? (
                            <>
                              <Film className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{item.duration || 'Video'}</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-2.5 h-2.5 text-purple-400" />
                              <span>Image</span>
                            </>
                          )}
                        </div>

                        {/* Gradient & Overlay Info with Views & Likes */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
                        <div className="absolute bottom-1.5 left-2 right-2 text-left">
                          <div className="truncate text-[11px] font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2.5 text-[10px] text-slate-300 mt-0.5">
                            <span className="flex items-center gap-0.5 text-cyan-400 font-medium">
                              <Eye className="w-3 h-3" /> {formatNumber(item.views || 0)}
                            </span>
                            <span className="flex items-center gap-0.5 text-rose-400 font-medium">
                              <Heart className="w-3 h-3 fill-rose-400/40" /> {formatNumber(item.likes || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-500 space-y-2">
                    <p>You haven't uploaded any media yet.</p>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenUpload();
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload your first video or image</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2 Content: My Library (Saved / Watch Later Items) */}
            {activeTab === 'library' && (
              <div>
                {savedMediaItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                    {savedMediaItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          onSelectMedia(item);
                        }}
                        className="group relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all shadow-sm"
                      >
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        
                        {/* Media Type Badge */}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                          {item.mediaType === 'video' ? (
                            <>
                              <Film className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{item.duration || 'Video'}</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-2.5 h-2.5 text-purple-400" />
                              <span>Image</span>
                            </>
                          )}
                        </div>

                        {/* Remove from Library Bookmark Button */}
                        {onToggleSave && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSave(e, item);
                            }}
                            title="Remove from My Library"
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-950/80 hover:bg-rose-500/20 text-amber-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/40 backdrop-blur-sm transition-all cursor-pointer z-10"
                          >
                            <Bookmark className="w-3 h-3 fill-amber-400" />
                          </button>
                        )}

                        {/* Gradient & Overlay Info with Views & Likes */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
                        <div className="absolute bottom-1.5 left-2 right-2 text-left">
                          <div className="truncate text-[11px] font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                            <span className="truncate max-w-[110px]">{item.author}</span>
                            <span className="flex items-center gap-0.5 text-rose-400 font-medium shrink-0">
                              <Heart className="w-3 h-3 fill-rose-400/40" /> {formatNumber(item.likes || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <Bookmark className="w-5 h-5 fill-amber-500/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-200">Your Library is empty</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Click the bookmark icon on any video or image in the gallery to save it to your personal vault in Firestore.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
