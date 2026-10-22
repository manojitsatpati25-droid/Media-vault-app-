import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { MediaGrid } from './components/MediaGrid';
import { UploadModal } from './components/UploadModal';
import { MediaDetailModal } from './components/MediaDetailModal';
import { PhoneAuthModal } from './components/PhoneAuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MediaItem, MediaType, MediaCategory, UserProfile } from './types';
import { INITIAL_MEDIA_ITEMS } from './data/sampleMedia';
import { getLocalMedia, saveLocalMedia, updateLocalMediaItem } from './utils/storage';
import { safeApiCall } from './utils/api';

const CATEGORIES: MediaCategory[] = [
  'All',
  'Tutorials',
  'Gaming',
  'Nature & Travel',
  'Music & Audio',
  'Short Clips',
  'Art & Design',
  'Technology',
];

export default function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('all');
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'alphabetical'>('newest');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated User Profile state
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mv_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Save or clear user session in localStorage
  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    try {
      localStorage.setItem('mv_user_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save user session to localStorage');
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('mv_user_profile');
    } catch (e) {
      console.warn('Could not clear user session');
    }
  };

  // Fetch media items from server and merge with local storage
  const fetchServerMedia = async () => {
    setIsLoading(true);
    try {
      const localItems = await getLocalMedia();
      const apiRes = await safeApiCall<MediaItem[]>('/api/media', {}, 6000);

      if (apiRes.success && Array.isArray(apiRes.data)) {
        const combined = [...apiRes.data];
        // Merge any locally uploaded items not yet on the server
        localItems.forEach((local) => {
          if (!combined.some((m) => m.id === local.id)) {
            combined.unshift(local);
          }
        });
        setMediaItems(combined);
      } else {
        // Server unreachable or offline: fallback to local + initial items
        if (localItems.length > 0) {
          const combined = [...localItems];
          INITIAL_MEDIA_ITEMS.forEach((init) => {
            if (!combined.some((c) => c.id === init.id)) {
              combined.push(init);
            }
          });
          setMediaItems(combined);
        }
      }
    } catch (err) {
      console.warn('Backend API offline, falling back to local storage and samples.');
      const localItems = await getLocalMedia();
      if (localItems.length > 0) {
        setMediaItems([...localItems, ...INITIAL_MEDIA_ITEMS]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerMedia();
  }, []);

  // Filter media based on search query (video/media name), type, and category
  const filteredMedia = useMemo(() => {
    return mediaItems
      .filter((item) => {
        // Search filter matching title (video name), description, tags, or author
        const matchesSearch =
          !searchQuery.trim() ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
          item.author.toLowerCase().includes(searchQuery.toLowerCase().trim());

        // Type filter (all / video / image)
        const matchesType =
          selectedMediaType === 'all' || item.mediaType === selectedMediaType;

        // Category filter
        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return b.likes - a.likes;
        }
        if (sortBy === 'alphabetical') {
          return a.title.localeCompare(b.title);
        }
        // Default newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [mediaItems, searchQuery, selectedMediaType, selectedCategory, sortBy]);

  // Compute media uploaded by the currently logged-in user
  const userMedia = useMemo(() => {
    if (!user) return [];
    return mediaItems.filter(
      (m) =>
        m.author.toLowerCase() === user.name.toLowerCase() ||
        m.author.includes(user.phoneNumber.slice(-4))
    );
  }, [mediaItems, user]);

  // Check for shared media deep-link in URL search params (e.g., ?media=...)
  useEffect(() => {
    if (mediaItems.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const mediaId = params.get('media');
      if (mediaId && (!selectedMedia || selectedMedia.id !== mediaId)) {
        const found = mediaItems.find((m) => m.id === mediaId);
        if (found) {
          handleSelectMedia(found);
        }
      }
    } catch (e) {
      console.warn('Could not parse media query parameter:', e);
    }
  }, [mediaItems]);

  // Handle media selection (and increment view count)
  const handleSelectMedia = async (item: MediaItem) => {
    setSelectedMedia(item);

    // Update URL query parameter to keep shareable deep link in sync
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('media', item.id);
      window.history.replaceState({}, '', url.toString());
    } catch {}

    // Optimistically update views count in state
    const newViews = item.views + 1;
    setMediaItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, views: newViews } : m))
    );

    // Persist view count locally in IndexedDB
    updateLocalMediaItem(item.id, { views: newViews });

    // Notify backend if available
    safeApiCall(`/api/media/${item.id}/view`, { method: 'POST' }).catch(() => {});
  };

  const handleCloseMedia = () => {
    setSelectedMedia(null);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('media')) {
        url.searchParams.delete('media');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
      }
    } catch {}
  };

  // Handle like/upvote
  const handleLikeMedia = async (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();

    let newLikes = 0;
    setMediaItems((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          newLikes = m.likes + 1;
          return { ...m, likes: newLikes };
        }
        return m;
      })
    );

    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia((prev) => (prev ? { ...prev, likes: prev.likes + 1 } : null));
    }

    // Persist likes count locally in IndexedDB
    if (newLikes > 0) {
      updateLocalMediaItem(id, { likes: newLikes });
    }

    // Persist to backend if available
    safeApiCall(`/api/media/${id}/like`, { method: 'POST' }).catch(() => {});
  };

  // Handle upload completion
  const handleUploadSuccess = (newMedia: MediaItem) => {
    setMediaItems((prev) => [newMedia, ...prev]);
    saveLocalMedia(newMedia);
    // Automatically select the newly uploaded item to open viewer
    setSelectedMedia(newMedia);
  };

  // Handle adding a comment
  const handleAddComment = async (mediaId: string, text: string, author: string) => {
    const newComment = {
      id: `c-${Date.now()}`,
      author: user ? user.name : (author || 'Guest'),
      text,
      createdAt: new Date().toISOString(),
    };

    let updatedComments: any[] = [];

    setMediaItems((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          updatedComments = [...m.comments, newComment];
          return { ...m, comments: updatedComments };
        }
        return m;
      })
    );

    if (selectedMedia && selectedMedia.id === mediaId) {
      setSelectedMedia((prev) =>
        prev ? { ...prev, comments: [...prev.comments, newComment] } : null
      );
    }

    // Persist comments locally in IndexedDB
    if (updatedComments.length > 0) {
      updateLocalMediaItem(mediaId, { comments: updatedComments });
    }

    // Send to backend if available
    safeApiCall(`/api/media/${mediaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: newComment.author, text }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header Navigation */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMediaType={selectedMediaType}
        onMediaTypeChange={setSelectedMediaType}
        onOpenUpload={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsUploadOpen(true);
          }
        }}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Stats & Category Filter Bar */}
      <StatsBar
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        mediaItems={mediaItems}
        searchQuery={searchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        <MediaGrid
          items={filteredMedia}
          searchQuery={searchQuery}
          selectedMediaType={selectedMediaType}
          selectedCategory={selectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectMedia={handleSelectMedia}
          onLikeMedia={handleLikeMedia}
          onClearSearch={() => setSearchQuery('')}
          onOpenUpload={() => {
            if (!user) {
              setIsAuthOpen(true);
            } else {
              setIsUploadOpen(true);
            }
          }}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong className="text-slate-400">Media Vault</strong> — Modern Shared Image & Video Upload Hub
          </p>
          <p className="text-slate-600">
            Phone Verified Accounts • SMS Verification OTP • AI Content Assistant
          </p>
        </div>
      </footer>

      {/* Phone Authentication Modal */}
      <PhoneAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* User Profile Drawer/Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        userMedia={userMedia}
        onLogout={handleLogout}
        onSelectMedia={handleSelectMedia}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Upload Platform Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        categories={CATEGORIES}
        user={user}
      />

      {/* Media Detail & Player Modal */}
      <MediaDetailModal
        item={selectedMedia}
        onClose={handleCloseMedia}
        onLike={(id) => handleLikeMedia(null, id)}
        onAddComment={handleAddComment}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
    </div>
  );
}
