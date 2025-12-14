'use client';

// Client-side HTML sanitization using DOMPurify
import createDOMPurify from 'isomorphic-dompurify';

let DOMPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

function getDOMPurify() {
  if (!DOMPurifyInstance) {
    if (typeof window === 'undefined') {
      return null;
    }
    DOMPurifyInstance = createDOMPurify();
  }
  return DOMPurifyInstance;
}

export function sanitizeClient(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const DOMPurify = getDOMPurify();

  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'span', 'br', 'p', 'mark'],
    ALLOWED_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
