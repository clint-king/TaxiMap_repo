/**
 * Input sanitization utilities to prevent XSS and SQL injection
 */

/**
 * Sanitize string input - removes HTML tags and dangerous characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous JavaScript event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs that could be used for XSS
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize object recursively - sanitizes all string values in an object
 * @param {any} obj - The object to sanitize
 * @returns {any} - Sanitized object
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize SQL input - validates and sanitizes input for SQL queries
 * Only allows alphanumeric characters, spaces, and basic punctuation
 * @param {string} input - The input string to sanitize
 * @param {boolean} allowSpecialChars - Whether to allow special characters
 * @returns {string} - Sanitized string safe for SQL
 */
export function sanitizeSQL(input, allowSpecialChars = false) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (allowSpecialChars) {
    // Allow alphanumeric, spaces, and common punctuation
    return input.replace(/[^a-zA-Z0-9\s\-_.,!?@#$%&*()]/g, '');
  }

  // Only allow alphanumeric and spaces
  return input.replace(/[^a-zA-Z0-9\s]/g, '');
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate and sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();

  if (emailRegex.test(sanitized)) {
    return sanitized;
  }

  return null;
}

/**
 * Validate and sanitize numeric input
 * @param {any} input - Input to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {number|null} - Validated number or null
 */
export function sanitizeNumber(input, min = null, max = null) {
  const num = Number(input);
  
  if (isNaN(num)) {
    return null;
  }

  if (min !== null && num < min) {
    return null;
  }

  if (max !== null && num > max) {
    return null;
  }

  return num;
}

/**
 * Validate and sanitize integer input
 * @param {any} input - Input to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {number|null} - Validated integer or null
 */
export function sanitizeInteger(input, min = null, max = null) {
  const num = sanitizeNumber(input, min, max);
  
  if (num === null) {
    return null;
  }

  return Math.floor(num);
}

/**
 * Escape HTML entities to prevent XSS
 * @param {string} input - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return input.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
}

