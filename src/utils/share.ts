import { MediaItem } from '../types';

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'cancelled' | 'failed';
  url: string;
}

/**
 * Builds a clean canonical deep-link URL for sharing a specific media item.
 */
export function getMediaShareUrl(mediaId: string): string {
  try {
    if (typeof window === 'undefined') return '';

    // Check if running in mobile Capacitor or custom scheme
    const isLocalOrCapacitor =
      window.location.hostname === 'localhost' ||
      window.location.protocol.startsWith('capacitor') ||
      (window as any).Capacitor?.isNativePlatform?.();

    // Use current origin or default cloud URL if in Android localhost
    const baseUrl = isLocalOrCapacitor
      ? 'https://ais-pre-bzhmgbegv4r3aiyqtsvekf-799967193229.asia-southeast1.run.app'
      : window.location.origin;

    const url = new URL(baseUrl + (window.location.pathname.startsWith('/') ? window.location.pathname : '/'));
    url.searchParams.set('media', mediaId);
    return url.toString();
  } catch {
    return window.location.href;
  }
}

/**
 * Copies text to clipboard with modern API and reliable legacy textarea fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Proceed to fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Real-time share function for any media item:
 * 1. Invokes Web Share API if supported (mobile, Chrome Android, Safari).
 * 2. Falls back to clipboard copy if Web Share is not supported or declined.
 */
export async function shareMediaItem(item: MediaItem): Promise<ShareResult> {
  const shareUrl = getMediaShareUrl(item.id);
  const shareData = {
    title: item.title,
    text: `Check out "${item.title}" by ${item.author} on Media Vault:`,
    url: shareUrl,
  };

  // 1. Try Web Share API (native sheet on Android/iOS/modern desktop)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (navigator.canShare && !navigator.canShare(shareData)) {
        await navigator.share({ url: shareUrl, title: item.title });
      } else {
        await navigator.share(shareData);
      }
      return { success: true, method: 'native', url: shareUrl };
    } catch (err: any) {
      // User cancelled share sheet
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled', url: shareUrl };
      }
      console.warn('Native Web Share notice, falling back to clipboard copy:', err);
    }
  }

  // 2. Clipboard copy fallback
  const copied = await copyToClipboard(shareUrl);
  return {
    success: copied,
    method: 'clipboard',
    url: shareUrl,
  };
}
