"use client";

// Client-side HTML sanitization using DOMPurify
import createDOMPurify from "isomorphic-dompurify";

const DOMPurify = createDOMPurify();

export function sanitizeClient(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "span", "br", "p", "mark"],
    ALLOWED_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
