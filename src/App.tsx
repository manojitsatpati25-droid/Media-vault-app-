import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { MediaGrid } from './components/MediaGrid';
import { UploadModal } from './components/UploadModal';
import { MediaDetailModal } from './components/MediaDetailModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MediaItem, MediaType, MediaCategory, UserProfile, AuthMode, SavedItem } from './types';
import { INITIAL_MEDIA_ITEMS } from './data/sampleMedia';
import { getLocalMedia, saveLocalMedia, updateLocalMediaItem } from './utils/storage';
import { safeApiCall } from './utils/api';
import { toggleSaveMediaInFirestore } from './lib/savedMedia';
import { shareMediaItem } from './utils/share';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  setDoc,
} from 'firebase/firestore';
import { Check, X } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrors';

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
  const [authMode, setAuthMode] = useState<AuthMode>('login');
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

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            setUser(profile);
            localStorage.setItem('mv_user_profile', JSON.stringify(profile));
            return;
          }
        } catch (e) {
          console.warn('Could not retrieve Firestore user document:', e);
        }

        const fallbackProfile: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Vault Member',
          email: fbUser.email || undefined,
          avatarUrl:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.uid)}`,
          joinedAt: fbUser.metadata.creationTime || new Date().toISOString(),
          isVerified: true,
          authProvider: (fbUser.providerData[0]?.providerId.includes('google')
            ? 'google'
            : 'password') as any,
        };
        setUser(fallbackProfile);
        localStorage.setItem('mv_user_profile', JSON.stringify(fallbackProfile));
      } else {
        // If no active Firebase session, retain any existing verified vault profile
        try {
          const saved = localStorage.getItem('mv_user_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id) {
              setUser(parsed);
            }
          }
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Open Auth modal with specific initial mode (login or register)
  const handleOpenAuth = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  // Save or clear user session in localStorage
  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    try {
      localStorage.setItem('mv_user_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save user session to localStorage');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Error signing out from Firebase:', e);
    }
    setUser(null);
    setSavedMediaMap({});
    setUserLikedMediaIds(new Set());
    try {
      localStorage.removeItem('mv_user_profile');
    } catch (e) {
      console.warn('Could not clear user session');
    }
  };

  // Real-time Share Toast notification state
  const [shareToast, setShareToast] = useState<{ message: string; url?: string } | null>(null);

  // User liked items tracking for instant 1-like-per-user responsiveness
  const [userLikedMediaIds, setUserLikedMediaIds] = useState<Set<string>>(() => {
    try {
      const savedUser = localStorage.getItem('mv_user_profile');
      const uid = savedUser ? JSON.parse(savedUser).id : 'guest';
      const cached = localStorage.getItem(`mv_user_liked_${uid}`);
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Re-sync user's liked items when user changes
  useEffect(() => {
    if (!user?.id) {
      setUserLikedMediaIds(new Set());
      return;
    }
    try {
      const cached = localStorage.getItem(`mv_user_liked_${user.id}`);
      if (cached) {
        setUserLikedMediaIds(new Set(JSON.parse(cached)));
      }
    } catch {}
  }, [user?.id]);

  // Real-time share handler with mobile Web Share API & clipboard toast fallback
  const handleShareMedia = async (e: React.MouseEvent | null, item: MediaItem) => {
    if (e) e.stopPropagation();
    const res = await shareMediaItem(item);
    if (res.method === 'cancelled') return;

    if (res.method === 'clipboard') {
      setShareToast({
        message: `Link copied to clipboard! Anyone with this link can view "${item.title}" in real time.`,
        url: res.url,
      });
    } else {
      setShareToast({
        message: `Shared "${item.title}" successfully!`,
        url: res.url,
      });
    }
    setTimeout(() => {
      setShareToast(null);
    }, 3500);
  };

  // Helper to check if current user has liked a media item
  const isMediaLiked = (id: string): boolean => {
    if (!user) return false;
    const item = mediaItems.find((m) => m.id === id);
    return Boolean(
      (item?.likedBy && item.likedBy.includes(user.id)) ||
      userLikedMediaIds.has(id)
    );
  };

  // Saved / Watch Later items state (synced with Firestore /users/{userId}/saved)
  const [savedMediaMap, setSavedMediaMap] = useState<Record<string, SavedItem>>({});

  // Sync saved items in real time from Firestore sub-collection /users/{userId}/saved
  useEffect(() => {
    if (!user?.id) {
      setSavedMediaMap({});
      return;
    }

    try {
      const cached = localStorage.getItem(`mv_saved_${user.id}`);
      if (cached) {
        setSavedMediaMap(JSON.parse(cached));
      }
    } catch {}

    const savedColRef = collection(db, 'users', user.id, 'saved');
    const unsubscribeSaved = onSnapshot(
      savedColRef,
      (snapshot) => {
        const map: Record<string, SavedItem> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data() as SavedItem;
        });
        setSavedMediaMap(map);
        try {
          localStorage.setItem(`mv_saved_${user.id}`, JSON.stringify(map));
        } catch {}
      },
      (error) => {
        console.warn('Firestore saved items onSnapshot notice:', error);
      }
    );

    return () => unsubscribeSaved();
  }, [user?.id]);

  // Toggle save / bookmark for a media item in Firestore
  const handleToggleSave = async (e: React.MouseEvent | null, item: MediaItem) => {
    if (e) {
      e.stopPropagation();
    }

    if (!user) {
      handleOpenAuth('login');
      return;
    }

    const isCurrentlySaved = Boolean(savedMediaMap[item.id]);

    // Optimistically update local state & cache
    setSavedMediaMap((prev) => {
      const next = { ...prev };
      if (isCurrentlySaved) {
        delete next[item.id];
      } else {
        next[item.id] = {
          mediaId: item.id,
          userId: user.id,
          savedAt: new Date().toISOString(),
          media: item,
        };
      }
      try {
        localStorage.setItem(`mv_saved_${user.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await toggleSaveMediaInFirestore(user.id, item, isCurrentlySaved);
    } catch (err) {
      console.error('Failed to toggle saved item in Firestore:', err);
    }
  };

  // Seed initial community items to Firestore so all users see full gallery immediately
  const seedInitialMedia = async () => {
    try {
      for (const item of INITIAL_MEDIA_ITEMS) {
        await setDoc(doc(db, 'media', item.id), item, { merge: true });
      }
    } catch (e) {
      console.warn('Initial Firestore seeding notice:', e);
    }
  };

  // Fetch media items from server and merge with local storage as instant cache
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

  // Real-time Firestore sync: All users see all videos and images uploaded by everyone!
  useEffect(() => {
    fetchServerMedia();

    // Subscribe to live changes in Firestore 'media' collection
    const mediaColRef = collection(db, 'media');
    const unsubscribeMedia = onSnapshot(
      mediaColRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreItems: MediaItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MediaItem;
            firestoreItems.push({
              ...data,
              id: docSnap.id,
            });
          });

          // Sort newest first
          firestoreItems.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setMediaItems(firestoreItems);
          setIsLoading(false);
        } else {
          // If Firestore collection is empty, seed initial community items
          seedInitialMedia();
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot listener notice:', error);
      }
    );

    return () => unsubscribeMedia();
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

  // Compute media uploaded by the currently logged-in user from Firestore items
  const userMedia = useMemo(() => {
    if (!user) return [];
    return mediaItems.filter((m) => {
      if (m.userId && m.userId === user.id) return true;
      if (m.author && user.name && m.author.toLowerCase() === user.name.toLowerCase()) return true;
      if (user.email && m.author && m.author.toLowerCase() === user.email.toLowerCase()) return true;
      if (user.phoneNumber && m.author && user.phoneNumber.length >= 4 && m.author.includes(user.phoneNumber.slice(-4))) {
        return true;
      }
      return false;
    });
  }, [mediaItems, user]);

  // Saved media items materialized for "My Library" tab
  const savedMediaList = useMemo(() => {
    return (Object.values(savedMediaMap) as SavedItem[])
      .map((s: SavedItem) => s.media || mediaItems.find((m) => m.id === s.mediaId))
      .filter(Boolean) as MediaItem[];
  }, [savedMediaMap, mediaItems]);

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

    // Notify Firestore for real-time live sync
    try {
      updateDoc(doc(db, 'media', item.id), {
        views: increment(1),
      }).catch(() => {});
    } catch {}

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

  // Handle like/upvote (1 like per user toggle)
  const handleLikeMedia = async (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();

    if (!user) {
      handleOpenAuth('login');
      return;
    }

    const targetItem = mediaItems.find((m) => m.id === id);
    if (!targetItem) return;

    const isAlreadyLiked = isMediaLiked(id);
    const newLikes = isAlreadyLiked ? Math.max(0, targetItem.likes - 1) : targetItem.likes + 1;
    const newLikedBy = isAlreadyLiked
      ? (targetItem.likedBy || []).filter((uid) => uid !== user.id)
      : [...(targetItem.likedBy || []).filter((uid) => uid !== user.id), user.id];

    // Optimistically update media items list
    setMediaItems((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, likes: newLikes, likedBy: newLikedBy };
        }
        return m;
      })
    );

    // Optimistically update currently open modal if active
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia((prev) => (prev ? { ...prev, likes: newLikes, likedBy: newLikedBy } : null));
    }

    // Update local user liked cache
    setUserLikedMediaIds((prev) => {
      const next = new Set(prev);
      if (isAlreadyLiked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(`mv_user_liked_${user.id}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    // Persist likes and likedBy locally in IndexedDB
    updateLocalMediaItem(id, { likes: newLikes, likedBy: newLikedBy });

    // Update in Firestore for live real-time sync across all users
    try {
      updateDoc(doc(db, 'media', id), {
        likes: newLikes,
        likedBy: isAlreadyLiked ? arrayRemove(user.id) : arrayUnion(user.id),
      }).catch((err) => {
        console.warn('Firestore like toggle sync error:', err);
      });
    } catch (err) {
      console.warn('Failed to update like in Firestore:', err);
    }

    // Persist to backend if available
    safeApiCall(`/api/media/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isLiked: !isAlreadyLiked }),
    }).catch(() => {});
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

    // Persist comment to Firestore in real time
    try {
      updateDoc(doc(db, 'media', mediaId), {
        comments: arrayUnion(newComment),
      }).catch(() => {});
    } catch {}

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
            handleOpenAuth('register');
          } else {
            setIsUploadOpen(true);
          }
        }}
        user={user}
        onOpenAuth={(mode) => handleOpenAuth(mode || 'login')}
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
              handleOpenAuth('register');
            } else {
              setIsUploadOpen(true);
            }
          }}
          isMediaSaved={(id) => Boolean(savedMediaMap[id])}
          onToggleSave={handleToggleSave}
          isMediaLiked={isMediaLiked}
          onShareMedia={handleShareMedia}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong className="text-slate-400">Media Vault</strong> — Modern Shared Image & Video Upload Hub
          </p>
          <p className="text-slate-600">
            Firebase Authentication • Secure Encrypted Vault • AI Content Assistant
          </p>
        </div>
      </footer>

      {/* Firebase Authentication Modal (Login & Register) */}
      <FirebaseAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />

      {/* User Profile Drawer/Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        userMedia={userMedia}
        savedMediaItems={savedMediaList}
        onLogout={handleLogout}
        onSelectMedia={handleSelectMedia}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleSave={handleToggleSave}
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
        isLiked={selectedMedia ? isMediaLiked(selectedMedia.id) : false}
        onAddComment={handleAddComment}
        user={user}
        onOpenAuth={() => handleOpenAuth('login')}
        isSaved={selectedMedia ? Boolean(savedMediaMap[selectedMedia.id]) : false}
        onToggleSave={(item) => handleToggleSave(null, item)}
      />

      {/* Floating Share Notification Toast */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-cyan-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-100">{shareToast.message}</p>
            <p className="text-slate-400 text-[10px] truncate max-w-xs">{shareToast.url}</p>
          </div>
          <button
            onClick={() => setShareToast(null)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 ml-2 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
