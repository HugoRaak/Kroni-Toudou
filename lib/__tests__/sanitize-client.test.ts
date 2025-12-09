import { describe, it, expect } from 'vitest';
import { sanitizeClient } from '../sanitize-client';

describe('sanitizeClient', () => {
  it('should sanitize HTML and allow safe tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeClient(html);

    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('<strong>');
    expect(result).toContain('</strong>');
  });

  it('should remove dangerous script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeClient(html);

    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
  });

  it('should remove dangerous event handlers', () => {
    const html = '<p onclick="alert(\'xss\')">Hello</p>';
    const result = sanitizeClient(html);

    expect(result).not.toContain('onclick');
    expect(result).toContain('Hello');
  });

  it('should allow allowed tags', () => {
    const html =
      '<b>bold</b> <i>italic</i> <u>underline</u> <em>emphasis</em> <br> <p>paragraph</p> <span>span</span> <mark>mark</mark>';
    const result = sanitizeClient(html);

    expect(result).toContain('<b>');
    expect(result).toContain('<i>');
    expect(result).toContain('<u>');
    expect(result).toContain('<em>');
    expect(result).toContain('<br>');
    expect(result).toContain('<p>');
    expect(result).toContain('<span>');
    expect(result).toContain('<mark>');
  });

  it('should allow style attribute', () => {
    const html = '<span style="color: red;">Red text</span>';
    const result = sanitizeClient(html);

    expect(result).toContain('style');
    expect(result).toContain('color: red');
  });

  it('should remove disallowed tags', () => {
    const html = '<div>Hello</div><p>World</p>';
    const result = sanitizeClient(html);

    // div is not in ALLOWED_TAGS, so it should be removed
    expect(result).not.toContain('<div>');
    expect(result).toContain('Hello'); // Content should remain
    expect(result).toContain('<p>'); // p is allowed
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeClient('')).toBe('');
  });

  it('should return empty string for null input', () => {
    // @ts-expect-error - Testing null input
    expect(sanitizeClient(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    // @ts-expect-error - Testing undefined input
    expect(sanitizeClient(undefined)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    // @ts-expect-error - Testing non-string input
    expect(sanitizeClient(123)).toBe('');

    // @ts-expect-error - Testing non-string input
    expect(sanitizeClient({})).toBe('');

    // @ts-expect-error - Testing non-string input
    expect(sanitizeClient([])).toBe('');
  });

  it('should handle plain text without HTML', () => {
    const text = 'Plain text without HTML';
    const result = sanitizeClient(text);

    expect(result).toBe(text);
  });

  it('should preserve text content when removing dangerous tags', () => {
    const html = '<script>alert("xss")</script>Hello<div>World</div>';
    const result = sanitizeClient(html);

    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('<div>');
  });

  it('should handle nested allowed tags', () => {
    const html = '<p>Hello <strong>world</strong> <em>test</em></p>';
    const result = sanitizeClient(html);

    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('test');
  });

  it('should handle complex HTML with mixed safe and unsafe content', () => {
    const html =
      '<p>Safe <strong>content</strong></p><iframe src="evil.com"></iframe><script>bad()</script>';
    const result = sanitizeClient(html);

    expect(result).toContain('Safe');
    expect(result).toContain('content');
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).not.toContain('<iframe>');
    expect(result).not.toContain('<script>');
  });

  it('should handle HTML entities', () => {
    const html = '<p>Hello &amp; World &lt;test&gt;</p>';
    const result = sanitizeClient(html);

    // Entities should be preserved or properly handled
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });
});
