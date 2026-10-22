import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_MEDIA_ITEMS } from './src/data/sampleMedia.js';
import { MediaItem } from './src/types.js';

dotenv.config();

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data_store.json');

// Initialize store with INITIAL_MEDIA_ITEMS if file doesn't exist
let mediaStore = [...INITIAL_MEDIA_ITEMS];

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      mediaStore = parsed;
    }
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mediaStore, null, 2), 'utf-8');
  }
} catch (err) {
  console.error('Error initializing data store:', err);
}

function persistStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mediaStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting data store:', err);
  }
}

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  // Increase payload limit to handle base64 uploads cleanly
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Enable CORS for external requests (e.g. Android APK, Capacitor, web previews)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API ROUTES
  
  // GET /api/media - Fetch all media or filter by query, type, category
  app.get('/api/media', (req, res) => {
    try {
      const { search, type, category, sort } = req.query;
      let items = [...mediaStore];

      // Filter by search query (video/media name, description, tags, author)
      if (typeof search === 'string' && search.trim() !== '') {
        const query = search.toLowerCase().trim();
        items = items.filter(
          item =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query)) ||
            item.author.toLowerCase().includes(query)
        );
      }

      // Filter by media type
      if (type === 'image' || type === 'video') {
        items = items.filter(item => item.mediaType === type);
      }

      // Filter by category
      if (typeof category === 'string' && category !== 'All') {
        items = items.filter(item => item.category === category);
      }

      // Sorting
      if (sort === 'popular' || sort === 'mostLiked') {
        items.sort((a, b) => b.likes - a.likes);
      } else if (sort === 'alphabetical') {
        items.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // Default newest
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      res.json({ success: true, count: items.length, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/media/:id - Fetch single media item
  app.get('/api/media/:id', (req, res) => {
    const item = mediaStore.find(m => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }
    res.json({ success: true, data: item });
  });

  // POST /api/media - Upload new image or video
  app.post('/api/media', (req, res) => {
    try {
      const {
        title,
        description,
        mediaType,
        url,
        thumbnailUrl,
        category,
        tags,
        author,
        authorAvatar,
        fileSize,
        dimensions,
        duration,
        aiSummary,
      } = req.body;

      if (!title || !mediaType || !url) {
        return res.status(400).json({
          success: false,
          error: 'Title, mediaType, and media URL/data are required.',
        });
      }

      const newItem: MediaItem = {
        id: `${mediaType === 'video' ? 'vid' : 'img'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        description: (description || '').trim(),
        mediaType: mediaType === 'video' ? 'video' : 'image',
        url,
        thumbnailUrl: thumbnailUrl || (mediaType === 'image' ? url : undefined),
        category: category || 'All',
        tags: Array.isArray(tags) ? tags : [],
        author: author || 'Anonymous Creator',
        authorAvatar:
          authorAvatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        views: 1,
        likes: 0,
        createdAt: new Date().toISOString(),
        fileSize: fileSize || 'Unknown size',
        dimensions: dimensions || (mediaType === 'video' ? '1920x1080' : '1080x1080'),
        duration: duration || (mediaType === 'video' ? '00:30' : undefined),
        comments: [],
        aiSummary,
      };

      mediaStore.unshift(newItem);
      persistStore();

      res.status(201).json({ success: true, data: newItem });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/media/:id/like - Upvote media
  app.post('/api/media/:id/like', (req, res) => {
    const item = mediaStore.find(m => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }
    item.likes += 1;
    persistStore();
    res.json({ success: true, likes: item.likes });
  });

  // POST /api/media/:id/view - Increment view count
  app.post('/api/media/:id/view', (req, res) => {
    const item = mediaStore.find(m => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }
    item.views += 1;
    persistStore();
    res.json({ success: true, views: item.views });
  });

  // POST /api/media/:id/comments - Add comment to video or image
  app.post('/api/media/:id/comments', (req, res) => {
    const item = mediaStore.find(m => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }
    const { author, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    const newComment = {
      id: `c-${Date.now()}`,
      author: author || 'Guest Viewer',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=100&auto=format&fit=crop&q=80`,
    };

    item.comments.push(newComment);
    persistStore();

    res.status(201).json({ success: true, data: newComment, comments: item.comments });
  });

  // POST /api/ai/analyze - Generate AI title suggestions, tags, or media analysis using Gemini
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { title, description, mediaType, promptType } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          success: false,
          error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Secrets panel.',
        });
      }

      let prompt = '';
      if (promptType === 'generateMeta') {
        prompt = `You are an AI video and media editor assistant for a content hub.
Given the initial draft name/topic "${title}" and media type "${mediaType}":
1. Suggest a catchy, high-engagement final title (video/image name).
2. Write a concise 2-sentence description.
3. Suggest 5 relevant trending tags.
4. Recommend the best category from: [Tutorials, Gaming, Nature & Travel, Music & Audio, Short Clips, Art & Design, Technology].

Respond ONLY in JSON format with keys: "title", "description", "tags" (array of strings), "suggestedCategory".`;
      } else if (promptType === 'analyzeContent') {
        prompt = `Analyze this ${mediaType} titled "${title}" with description: "${description || 'None'}".
Provide a 2-3 sentence AI summary highlighting what viewers will see/learn, key highlights, and audience appeal.
Respond ONLY in JSON format with key: "summary".`;
      } else {
        prompt = `Provide 5 smart tags for a ${mediaType} named "${title}". Respond ONLY in JSON format with key: "tags" (array of strings).`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let jsonResult = {};
      try {
        jsonResult = JSON.parse(response.text || '{}');
      } catch (e) {
        jsonResult = { rawText: response.text };
      }

      res.json({ success: true, result: jsonResult });
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      res.status(500).json({ success: false, error: err.message || 'AI request failed' });
    }
  });

  // Catch-all for unknown /api routes to prevent returning HTML index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.path} not found.`,
    });
  });

  // VITE MIDDLEWARE OR STATIC SERVING
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Media Vault server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
