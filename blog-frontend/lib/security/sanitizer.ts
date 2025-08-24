import DOMPurify from 'isomorphic-dompurify';

// Configure DOMPurify for safe HTML rendering
const sanitizerConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'src', 'alt', 'title',
    'class', 'id', 'style', 'width', 'height',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
  FORCE_BODY: true,
  SANITIZE_DOM: true,
  SAFE_FOR_TEMPLATES: true,
  RETURN_TRUSTED_TYPE: false,
};

export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side sanitization
    return DOMPurify.sanitize(dirty, sanitizerConfig);
  }
  
  // Client-side sanitization with additional checks
  const clean = DOMPurify.sanitize(dirty, {
    ...sanitizerConfig,
    ADD_TAGS: ['iframe'], // Allow iframes for embeds
    ADD_ATTR: ['allowfullscreen', 'frameborder'],
    FORBID_TAGS: ['script', 'style'], // Explicitly forbid dangerous tags
    FORBID_ATTR: ['onerror', 'onload', 'onclick'], // Forbid event handlers
  });

  return clean;
}

export function sanitizeText(text: string): string {
  // Remove all HTML tags and return plain text
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [], 
    KEEP_CONTENT: true 
  });
}

export function sanitizeUrl(url: string): string {
  // Validate and sanitize URLs
  try {
    const parsed = new URL(url);
    
    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '#';
    }
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (url.startsWith('/') || url.startsWith('#')) {
      return url;
    }
    
    return '#';
  }
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

// XSS prevention for user inputs
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

// Content Security Policy header generator
export function generateCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Remove unsafe-eval in production
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' http://localhost:4000", // Add your API URL
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  
  return directives.join('; ');
}