import React from 'react';
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
} from 'lucide-react';
import { UserProfile, MediaItem } from '../types';
import { formatTimeAgo, formatNumber } from '../utils/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  userMedia: MediaItem[];
  onLogout: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onOpenUpload: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userMedia,
  onLogout,
  onSelectMedia,
  onOpenUpload,
}) => {
  if (!isOpen || !user) return null;

  const totalViews = userMedia.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = userMedia.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Cover Accent Banner */}
        <div className="h-28 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white rounded-xl backdrop-blur-md transition-colors"
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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" /> Phone Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-slate-300">{user.phoneNumber}</span>
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* User Performance Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
            <div>
              <span className="text-xs text-slate-400 block">Total Uploads</span>
              <strong className="text-lg font-bold text-slate-100">{userMedia.length}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Total Views</span>
              <strong className="text-lg font-bold text-cyan-400">{formatNumber(totalViews)}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Likes Received</span>
              <strong className="text-lg font-bold text-rose-400">{formatNumber(totalLikes)}</strong>
            </div>
          </div>

          {/* User's Uploaded Media Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">Your Uploaded Media</h3>
              <button
                onClick={() => {
                  onClose();
                  onOpenUpload();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> Upload New
              </button>
            </div>

            {userMedia.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {userMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onSelectMedia(item);
                    }}
                    className="group relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-1.5 left-2 right-2 truncate text-[11px] font-semibold text-slate-100">
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-500">
                You haven't uploaded any media yet. Share your first video or image!
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
