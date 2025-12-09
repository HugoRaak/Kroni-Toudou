import { describe, it, expect } from 'vitest';
import { sanitizeServer } from '../sanitize-server';

describe('sanitizeServer', () => {
  it('should sanitize HTML and allow safe tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('<strong>');
    expect(result).toContain('</strong>');
  });

  it('should remove dangerous script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeServer(html);
    
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
  });

  it('should remove dangerous event handlers', () => {
    const html = '<p onclick="alert(\'xss\')">Hello</p>';
    const result = sanitizeServer(html);
    
    expect(result).not.toContain('onclick');
    expect(result).toContain('Hello');
  });

  it('should allow allowed tags', () => {
    const html = '<b>bold</b> <i>italic</i> <u>underline</u> <em>emphasis</em> <br> <p>paragraph</p> <span>span</span> <mark>mark</mark>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('<b>');
    expect(result).toContain('<i>');
    expect(result).toContain('<u>');
    expect(result).toContain('<em>');
    expect(result).toMatch(/<br ?\/?>/);
    expect(result).toContain('<p>');
    expect(result).toContain('<span>');
    expect(result).toContain('<mark>');
  });

  it('should allow style attribute with color values', () => {
    const html = '<span style="color: red;">Red text</span>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('style');
    expect(result).toContain('color');
  });

  it('should allow style attribute with background-color values', () => {
    const html = '<span style="background-color: #fff;">White background</span>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('style');
    expect(result).toContain('background-color');
  });

  it('should allow various color formats in style', () => {
    const html = '<span style="color: #ff0000; background-color: rgb(255, 0, 0);">Red</span>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('color');
    expect(result).toContain('background-color');
  });

  it('should remove disallowed tags', () => {
    const html = '<div>Hello</div><p>World</p>';
    const result = sanitizeServer(html);
    
    // div is not in allowedTags, so it should be removed
    expect(result).not.toContain('<div>');
    expect(result).toContain('Hello'); // Content should remain
    expect(result).toContain('<p>'); // p is allowed
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeServer('')).toBe('');
  });

  it('should return empty string for null input', () => {
    // @ts-expect-error - Testing null input
    expect(sanitizeServer(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    // @ts-expect-error - Testing undefined input
    expect(sanitizeServer(undefined)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    // @ts-expect-error - Testing non-string input
    expect(sanitizeServer(123)).toBe('');
    
    // @ts-expect-error - Testing non-string input
    expect(sanitizeServer({})).toBe('');
    
    // @ts-expect-error - Testing non-string input
    expect(sanitizeServer([])).toBe('');
  });

  it('should handle plain text without HTML', () => {
    const text = 'Plain text without HTML';
    const result = sanitizeServer(text);
    
    expect(result).toBe(text);
  });

  it('should preserve text content when removing dangerous tags', () => {
    const html = '<script>alert("xss")</script>Hello<div>World</div>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('<div>');
  });

  it('should handle nested allowed tags', () => {
    const html = '<p>Hello <strong>world</strong> <em>test</em></p>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('test');
  });

  it('should handle complex HTML with mixed safe and unsafe content', () => {
    const html = '<p>Safe <strong>content</strong></p><iframe src="evil.com"></iframe><script>bad()</script>';
    const result = sanitizeServer(html);
    
    expect(result).toContain('Safe');
    expect(result).toContain('content');
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).not.toContain('<iframe>');
    expect(result).not.toContain('<script>');
  });

  it('should handle HTML entities', () => {
    const html = '<p>Hello &amp; World &lt;test&gt;</p>';
    const result = sanitizeServer(html);
    
    // Entities should be preserved or properly handled
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should filter dangerous style values', () => {
    // sanitize-html should filter dangerous style values
    const html = '<span style="color: expression(alert(\'xss\'))">Text</span>';
    const result = sanitizeServer(html);
    
    // The dangerous expression should be removed
    expect(result).not.toContain('expression');
  });
});
