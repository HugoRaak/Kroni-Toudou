// HTML sanitization utility for task descriptions
import DOMPurify from 'isomorphic-dompurify';

// Allowed tags for task descriptions
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'span', 'br', 'p', 'mark'];

// Allowed attributes
const ALLOWED_ATTR = ['style'];

/**
 * Sanitizes HTML content for task descriptions.
 * Only allows specific tags and style attributes with color/background-color.
 */
export function sanitizeTaskDescription(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First pass: sanitize HTML and allow style attribute
  let sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });

  // Second pass: clean style attributes to only allow color and background-color
  // Use a regex to extract and clean style attributes
  sanitized = sanitized.replace(/style="([^"]*)"/gi, (match, styleContent) => {
    const allowedStyles: string[] = [];
    const stylePairs = styleContent.split(';').map((s: string) => s.trim()).filter(Boolean);
    
    for (const pair of stylePairs) {
      const [property, value] = pair.split(':').map((s: string) => s.trim());
      if (property === 'color' || property === 'background-color') {
        // Validate color value (hex, rgb, rgba, or named colors)
        // Accept hex colors (3, 4, 6, or 8 digits), rgb/rgba, hsl/hsla, or named colors
        const trimmedValue = value?.trim();
        if (trimmedValue && (
          /^#[0-9A-Fa-f]{3,8}$/.test(trimmedValue) || // Hex colors
          /^rgb\(/.test(trimmedValue) || // rgb()
          /^rgba\(/.test(trimmedValue) || // rgba()
          /^hsl\(/.test(trimmedValue) || // hsl()
          /^hsla\(/.test(trimmedValue) || // hsla()
          /^[a-z]+$/i.test(trimmedValue) // Named colors like "white", "red", etc.
        )) {
          allowedStyles.push(`${property}: ${trimmedValue}`);
        }
      }
    }
    
    return allowedStyles.length > 0 ? `style="${allowedStyles.join('; ')}"` : '';
  });

  return sanitized;
}

