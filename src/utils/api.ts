// API Helper utility with safe JSON parsing and fallback for mobile & offline environments

export function getApiBaseUrl(): string {
  // If explicitly specified in environment
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Detect if running inside a Capacitor native app or file/custom scheme
  if (typeof window !== 'undefined') {
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && !!(window as any).Capacitor?.isNativePlatform?.()) ||
      window.location.hostname === 'com.mediavault.app';

    if (isCapacitor) {
      // Connect to the deployed Cloud Run instance for backend sync
      return 'https://ais-pre-bzhmgbegv4r3aiyqtsvekf-799967193229.asia-southeast1.run.app';
    }
  }

  // Standard web browser deployment - use relative path
  return '';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  result?: any;
  likes?: number;
  views?: number;
  comments?: any[];
}

export async function safeApiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';

    // Guard: If response is HTML (e.g. 404 SPA fallback or Cloud Run redirect), do NOT run res.json()
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      const isHtml = text.trim().toLowerCase().startsWith('<!doctype') || text.includes('<html');
      return {
        success: false,
        error: isHtml
          ? `Server returned HTML page (${res.status}) instead of JSON. Server may be warming up or offline.`
          : `Unexpected response format (${res.status}): ${text.slice(0, 100)}`,
      };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Network request timed out. Please check your connection.',
      };
    }
    return {
      success: false,
      error: err.message || 'Network request failed',
    };
  }
}
