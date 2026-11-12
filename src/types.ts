export type MediaType = 'all' | 'image' | 'video';

export type MediaCategory = 
  | 'All'
  | 'Tutorials'
  | 'Gaming'
  | 'Nature & Travel'
  | 'Music & Audio'
  | 'Short Clips'
  | 'Art & Design'
  | 'Technology';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  category: MediaCategory;
  tags: string[];
  author: string;
  authorAvatar?: string;
  views: number;
  likes: number;
  likedBy?: string[];
  userId?: string;
  createdAt: string;
  fileSize?: string;
  dimensions?: string;
  duration?: string;
  comments: Comment[];
  aiSummary?: string;
  isFeatured?: boolean;
}

export interface FilterOptions {
  searchQuery: string;
  mediaType: MediaType;
  category: MediaCategory;
  sortBy: 'newest' | 'popular' | 'mostLiked' | 'alphabetical';
  selectedTag?: string;
}

export interface UploadFormData {
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  category: MediaCategory;
  tags: string[];
  author: string;
  file: File | null;
  url?: string;
  thumbnailUrl?: string;
  duration?: string;
}

export interface AIAnalysisRequest {
  title: string;
  description?: string;
  mediaType: 'image' | 'video';
  imageBase64?: string;
  promptType?: 'generateMeta' | 'analyzeContent' | 'transcribe' | 'suggestTags';
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  avatarUrl: string;
  joinedAt: string;
  bio?: string;
  isVerified: boolean;
  authProvider?: 'google' | 'password' | 'phone';
}

export interface SavedItem {
  mediaId: string;
  userId: string;
  savedAt: string;
  media?: MediaItem;
}

export type AuthMode = 'login' | 'register';
export type AuthStep = 'auth' | 'phone' | 'otp' | 'profile' | 'success';

export interface AIAnalysisResponse {
  title?: string;
  description?: string;
  tags?: string[];
  summary?: string;
  transcript?: string;
  suggestedCategory?: MediaCategory;
}
