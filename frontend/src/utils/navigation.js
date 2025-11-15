/**
 * Navigation helper for AI-generated redirect links
 */
import { useNavigate } from 'react-router-dom';

/**
 * Navigate to a URL path
 * Can be used programmatically or as a click handler
 */
export function navigateTo(path) {
  // If we're in a React component, useNavigate hook
  // Otherwise, use window.location
  if (typeof window !== 'undefined') {
    // Remove query params if navigating to same path
    const currentPath = window.location.pathname;
    if (path.startsWith(currentPath)) {
      window.location.href = path;
    } else {
      window.location.pathname = path;
    }
  }
}

/**
 * Handle AI-generated redirect links
 * Extracts path from full URL or relative path
 */
export function handleAILink(url) {
  if (!url) return;

  // If it's a full URL, extract path
  try {
    const urlObj = new URL(url, window.location.origin);
    navigateTo(urlObj.pathname + urlObj.search);
  } catch {
    // If it's already a path, use it directly
    navigateTo(url);
  }
}

/**
 * Create a clickable link component data
 */
export function createLinkData(url, text) {
  return {
    type: 'link',
    url,
    text: text || 'View',
    onClick: () => handleAILink(url),
  };
}

