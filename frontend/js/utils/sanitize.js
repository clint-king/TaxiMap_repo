/**
 * Frontend XSS protection utilities using DOMPurify
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param {string} dirty - The potentially unsafe HTML string
 * @param {object} options - DOMPurify options
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(dirty, options = {}) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(dirty, { ...defaultOptions, ...options });
}

/**
 * Sanitize text content - removes all HTML tags
 * @param {string} text - Text that may contain HTML
 * @returns {string} - Plain text without HTML
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove all HTML tags
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHTML(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely set innerHTML with sanitization
 * @param {HTMLElement} element - DOM element
 * @param {string} content - HTML content to set
 * @param {object} options - DOMPurify options
 */
export function safeSetHTML(element, content, options = {}) {
  if (!element) return;
  
  const sanitized = sanitizeHTML(content, options);
  element.innerHTML = sanitized;
}

/**
 * Safely set textContent (prevents XSS)
 * @param {HTMLElement} element - DOM element
 * @param {string} text - Text content to set
 */
export function safeSetText(element, text) {
  if (!element) return;
  
  element.textContent = text || '';
}

