import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { MediaCategory, MediaItem, UploadFormData, UserProfile } from '../types';
import { safeApiCall } from '../utils/api';
import { fileToDataUrl, generateVideoThumbnail, saveLocalMedia } from '../utils/storage';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newMedia: MediaItem) => void;
  categories: MediaCategory[];
  user: UserProfile | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  categories,
  user,
}) => {
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    mediaType: 'video',
    category: 'Tutorials',
    tags: [],
    author: user ? user.name : 'Community Creator',
    file: null,
    url: '',
    thumbnailUrl: '',
    duration: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<{ size: string; dimensions: string }>({ size: '', dimensions: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');

    if (!isVideo && !isImage) {
      setErrorMessage('Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file.');
      return;
    }

    setErrorMessage(null);
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);

    // Generate a default title from filename if empty
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    setFormData((prev) => ({
      ...prev,
      file,
      url: blobUrl,
      mediaType: isVideo ? 'video' : 'image',
      title: prev.title.trim() === '' ? cleanFileName : prev.title,
    }));

    setFileMeta({
      size: `${sizeInMB} MB`,
      dimensions: isVideo ? '1920x1080' : '1080x1080',
    });

    // Extract video duration and auto-generate thumbnail if video
    if (isVideo) {
      const tempVideo = document.createElement('video');
      tempVideo.src = blobUrl;
      tempVideo.onloadedmetadata = () => {
        const totalSeconds = Math.floor(tempVideo.duration || 0);
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        setFormData((prev) => ({ ...prev, duration: `${mins}:${secs}` }));
      };

      // Generate video thumbnail in background
      generateVideoThumbnail(file).then((thumb) => {
        if (thumb) {
          setFormData((prev) => ({ ...prev, thumbnailUrl: thumb }));
        }
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (!formData.tags.includes(newTag)) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  // AI Assistant Auto-Fill for Title & Tags with offline fallback
  const handleAIAssist = async () => {
    if (!formData.title && !formData.description) {
      setErrorMessage('Please enter an initial title/topic or select a file first.');
      return;
    }

    setIsGeneratingAI(true);
    setErrorMessage(null);

    const baseTitle = formData.title || 'Creative Showcase';

    try {
      const res = await safeApiCall('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: baseTitle,
          description: formData.description,
          mediaType: formData.mediaType,
          promptType: 'generateMeta',
        }),
      }, 7000);

      if (res.success && res.result) {
        const { title, description, tags, suggestedCategory } = res.result;
        setFormData((prev) => ({
          ...prev,
          title: title || prev.title,
          description: description || prev.description,
          tags: Array.isArray(tags) ? Array.from(new Set([...prev.tags, ...tags])) : prev.tags,
          category: (suggestedCategory && categories.includes(suggestedCategory as MediaCategory))
            ? (suggestedCategory as MediaCategory)
            : prev.category,
        }));
        setIsGeneratingAI(false);
        return;
      }
    } catch {
      // Fall through to local heuristic generator
    }

    // Smart heuristic generator for offline & APK mode
    const lower = baseTitle.toLowerCase();
    let suggestedCat: MediaCategory = 'Tutorials';
    let suggestedTags = ['Trending', 'HighQuality', formData.mediaType === 'video' ? 'Video' : 'Artwork'];

    if (lower.includes('wallpaper') || lower.includes('art') || lower.includes('draw')) {
      suggestedCat = 'Art & Design';
      suggestedTags = ['Wallpaper', '4K', 'Art', 'Aesthetic', 'Design'];
    } else if (lower.includes('game') || lower.includes('play') || lower.includes('fps')) {
      suggestedCat = 'Gaming';
      suggestedTags = ['Gaming', 'Gameplay', 'Gamer', 'Clips'];
    } else if (lower.includes('nature') || lower.includes('travel') || lower.includes('sunset')) {
      suggestedCat = 'Nature & Travel';
      suggestedTags = ['Nature', 'Landscape', 'Travel', 'Cinematic'];
    } else if (lower.includes('code') || lower.includes('tech') || lower.includes('ai') || lower.includes('app')) {
      suggestedCat = 'Technology';
      suggestedTags = ['Tech', 'Innovation', 'Future', 'Gadgets'];
    } else if (lower.includes('music') || lower.includes('sound') || lower.includes('song')) {
      suggestedCat = 'Music & Audio';
      suggestedTags = ['Music', 'Audio', 'Vibes', 'Soundtrack'];
    }

    setFormData((prev) => ({
      ...prev,
      description: prev.description || `High-definition ${prev.mediaType} featuring ${baseTitle}. Watch and share in full resolution.`,
      tags: Array.from(new Set([...prev.tags, ...suggestedTags])),
      category: prev.category === 'Tutorials' ? suggestedCat : prev.category,
    }));

    setIsGeneratingAI(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage('Please provide a name/title for your media.');
      return;
    }

    if (!previewUrl && !formData.url) {
      setErrorMessage('Please select an image or video file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Processing media file...');
    setErrorMessage(null);

    try {
      let persistentUrl = formData.url || previewUrl;
      let persistentThumb = formData.thumbnailUrl;

      // Convert file into persistent data URL for offline & APK persistence
      if (formData.file) {
        if (formData.mediaType === 'image') {
          setUploadStatus('Encoding high-resolution image...');
          try {
            const dataUrl = await fileToDataUrl(formData.file);
            persistentUrl = dataUrl;
            persistentThumb = dataUrl;
          } catch (e) {
            console.warn('Could not read image as data URL:', e);
          }
        } else if (formData.mediaType === 'video') {
          // If video thumbnail wasn't generated yet, generate now
          if (!persistentThumb) {
            setUploadStatus('Extracting video frame thumbnail...');
            try {
              persistentThumb = await generateVideoThumbnail(formData.file);
            } catch {
              // fallback
            }
          }

          // For video files under 20MB, convert to data URL so they can be saved completely offline
          if (formData.file.size <= 20 * 1024 * 1024) {
            setUploadStatus('Encoding video for offline playback...');
            try {
              const videoDataUrl = await fileToDataUrl(formData.file);
              persistentUrl = videoDataUrl;
            } catch {
              // fallback to object URL
            }
          }
        }
      }

      const newId = `${formData.mediaType === 'video' ? 'vid' : 'img'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newMediaItem: MediaItem = {
        id: newId,
        title: formData.title.trim(),
        description: (formData.description || '').trim(),
        mediaType: formData.mediaType,
        url: persistentUrl,
        thumbnailUrl: persistentThumb || (formData.mediaType === 'image' ? persistentUrl : undefined),
        category: formData.category,
        tags: formData.tags.length > 0 ? formData.tags : ['Uploaded', formData.mediaType],
        author: formData.author || (user ? user.name : 'Community Creator'),
        authorAvatar: user ? user.avatarUrl : undefined,
        fileSize: fileMeta.size || '2.4 MB',
        dimensions: fileMeta.dimensions || (formData.mediaType === 'video' ? '1920x1080' : '1080x1080'),
        duration: formData.duration || (formData.mediaType === 'video' ? '00:30' : undefined),
        views: 1,
        likes: 0,
        createdAt: new Date().toISOString(),
        comments: [],
      };

      setUploadStatus('Saving to Media Vault...');

      // Attempt to sync with server API using safeApiCall
      const serverPayload = {
        title: newMediaItem.title,
        description: newMediaItem.description,
        mediaType: newMediaItem.mediaType,
        url: newMediaItem.url,
        thumbnailUrl: newMediaItem.thumbnailUrl,
        category: newMediaItem.category,
        tags: newMediaItem.tags,
        author: newMediaItem.author,
        authorAvatar: newMediaItem.authorAvatar,
        fileSize: newMediaItem.fileSize,
        dimensions: newMediaItem.dimensions,
        duration: newMediaItem.duration,
      };

      let finalItem = newMediaItem;

      try {
        const apiRes = await safeApiCall<MediaItem>('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverPayload),
        }, 8000);

        if (apiRes.success && apiRes.data) {
          finalItem = apiRes.data;
        }
      } catch (syncErr) {
        console.warn('Server sync skipped, persisting locally:', syncErr);
      }

      // Always save to IndexedDB so item persists locally in APK and browser
      await saveLocalMedia(finalItem);

      onUploadSuccess(finalItem);
      onClose();
    } catch (err: any) {
      console.error('Upload handler error:', err);
      setErrorMessage('Could not complete upload: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Upload Platform</h2>
              <p className="text-xs text-slate-400">Share videos & images accessible to all users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* File Drag and Drop Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Video or Image File
            </label>

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 group-hover:border-cyan-500/50 flex items-center justify-center mx-auto text-slate-400 group-hover:text-cyan-400 transition-all mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Click to select or drag and drop your file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports MP4, WebM, MOV videos and PNG, JPG, WebP images
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                {formData.mediaType === 'video' ? (
                  <video src={previewUrl} controls className="max-h-64 w-full object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl('');
                    setFormData((prev) => ({ ...prev, file: null, url: '', thumbnailUrl: '' }));
                  }}
                  className="absolute top-3 right-3 p-1.5 bg-slate-900/90 text-rose-400 hover:text-rose-200 rounded-lg border border-slate-800 backdrop-blur-md text-xs font-medium cursor-pointer"
                >
                  Change File
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* Media Name / Video Title Field with AI Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Video or Media Name <span className="text-cyan-400">*</span>
              </label>
              
              <button
                type="button"
                onClick={handleAIAssist}
                disabled={isGeneratingAI}
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all cursor-pointer"
              >
                {isGeneratingAI ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>AI Enhance Title & Tags</span>
              </button>
            </div>

            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Mountain Sunset Drone Tour 4K"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Users can search and discover your upload directly by this video/media name.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about what viewers will see or learn..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* Category & Creator Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MediaCategory })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {categories.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Author / Creator Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Creator / Uploader Name
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Your name or channel"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tags (press Enter or comma)
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 flex-wrap">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-white ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={formData.tags.length === 0 ? "Add tags e.g. 'Tutorial', '4K'" : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-500 px-1"
              />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="text-xs text-slate-400">
              {isUploading && (
                <span className="flex items-center gap-2 text-cyan-400 animate-pulse font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadStatus || 'Uploading media...'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish Video/Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
