// Server-side HTML sanitization using sanitize-html
import sanitizeHtml from "sanitize-html";

export function sanitizeServer(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return sanitizeHtml(html, {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'span', 'p', 'br', 'mark'],
    allowedAttributes: {
      '*': ['style'],
    },
    allowedStyles: {
      '*': {
        color: [/^#/, /^rgb/, /^rgba/, /^hsl/, /^hsla/, /^[a-z]+$/i],
        'background-color': [/^#/, /^rgb/, /^rgba/, /^hsl/, /^hsla/, /^[a-z]+$/i],
      },
    },
  });
}

