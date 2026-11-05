import DOMPurify from "isomorphic-dompurify";

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
}

const DEFAULT_ALLOWED_TAGS = [
  "p",
  "b",
  "i",
  "u",
  "em",
  "strong",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "br",
  "img",
  "span",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "sub",
  "sup",
  "del",
  "s",
  "strike",
];

const DEFAULT_ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "class",
  "width",
  "height",
  "loading",
];

/**
 * Strict, SSR-safe and client-safe HTML sanitizer for Blog and News content.
 * Prevents XSS, removes unsafe tags, blocks event handlers and javascript: URIs.
 */
export function sanitizeBlogPostHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";

  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "applet", "base", "link", "form", "input", "button", "svg", "math"],
    FORBID_ATTR: ["style"],
  });

  if (typeof clean !== "string") return "";

  // Enforce rel="noopener noreferrer" for any external links
  return clean.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
    if (/target\s*=\s*["']_blank["']/i.test(attrs) && !/rel\s*=/i.test(attrs)) {
      return `<a ${attrs} rel="noopener noreferrer">`;
    }
    return match;
  });
}

/**
 * Strips all HTML tags and returns safe plain text. Works identically in SSR and browser.
 */
export function plainTextFromHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";
  const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return typeof clean === "string" ? clean.trim() : "";
}

/**
 * Safely sanitizes custom field string values, preventing XSS injection while preserving safe formatting.
 */
export function sanitizeCustomFieldValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    // If it looks like HTML, sanitize it; otherwise return trimmed string
    if (/<[a-z][\s\S]*>/i.test(value)) {
      return sanitizeBlogPostHtml(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCustomFieldValue(item));
  }
  return value;
}
