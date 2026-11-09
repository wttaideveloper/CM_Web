import DOMPurify from "dompurify";

/**
 * Sanitization for eBook page HTML (handbook §7: rendered rich text is sanitized with
 * DOMPurify against an allowlist). Stored page content is authored by users and later rendered
 * and edited in other users' browsers, so it must never reach the DOM unsanitized.
 */

const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "div", "em", "figcaption", "figure", "font", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span", "strike", "strong", "sub", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul",
];

// `class` and `id` are deliberately excluded: classes would expose the host page's utility CSS to
// stored content, and ids enable DOM clobbering. `data-*` and `asset_id` are written by the editor.
const ALLOWED_ATTRIBUTES = [
  "href", "src", "alt", "title", "style", "colspan", "rowspan", "width", "height", "align", "color", "face", "size",
  "target", "rel", "asset_id",
];

// DOMPurify's default URI policy plus `blob:`, which the editor uses for in-progress upload previews.
const ALLOWED_URI_PATTERN = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const ALLOWED_STYLE_PROPERTIES = new Set([
  "color", "background-color", "font-family", "font-size", "font-style", "font-weight", "line-height", "letter-spacing",
  "text-align", "text-decoration", "text-indent", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "width", "max-width", "min-width",
  "height", "max-height", "min-height", "object-fit", "object-position", "display", "list-style-type", "vertical-align",
  "white-space", "overflow-wrap", "word-break", "text-transform", "box-sizing", "border", "border-top", "border-right",
  "border-bottom", "border-left", "border-color", "border-style", "border-width", "border-radius",
]);

const ALLOWED_DISPLAY_VALUES = new Set(["block", "inline", "inline-block"]);
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[\\<>]/i;

/**
 * Reduces an inline `style` attribute to an allowlist of presentational properties.
 *
 * Drops layout-escaping properties (`position`, `z-index`, `transform`, …) that could overlay
 * the surrounding application, and any value that can load a resource (`url()`, `@import`).
 * Output is canonical (`property:value;…`) so the function is idempotent.
 *
 * @returns the filtered declaration list, or an empty string when nothing is allowed
 */
export function sanitizeInlineStyle(style: string): string {
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!property || !value || !ALLOWED_STYLE_PROPERTIES.has(property) || UNSAFE_STYLE_VALUE.test(value)) continue;
    if (property === "display" && !ALLOWED_DISPLAY_VALUES.has(value.toLowerCase())) continue;
    kept.push(`${property}:${value}`);
  }
  return kept.join(";");
}

type Purifier = ReturnType<typeof DOMPurify>;
let purifier: Purifier | null = null;

function getPurifier(): Purifier | null {
  if (typeof window === "undefined") return null;
  if (purifier) return purifier;

  // A dedicated instance keeps these hooks from affecting any other DOMPurify user.
  const instance = DOMPurify(window);
  if (!instance.isSupported) return null;

  instance.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const filtered = sanitizeInlineStyle(data.attrValue);
    if (filtered) data.attrValue = filtered;
    else data.keepAttr = false;
  });
  instance.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("target")) node.setAttribute("rel", "noopener noreferrer");
  });

  purifier = instance;
  return purifier;
}

/**
 * Sanitizes eBook page HTML for rendering or for assignment to a DOM node.
 *
 * Fails closed: without a DOM (server rendering) the result is an empty string. DOMPurify
 * itself returns its input unchanged when no DOM exists, so that case is handled here.
 */
export function sanitizeEbookHtml(html: string | null | undefined): string {
  if (!html) return "";
  const instance = getPurifier();
  if (!instance) return "";

  return instance.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true,
    ALLOWED_URI_REGEXP: ALLOWED_URI_PATTERN,
    KEEP_CONTENT: true,
  });
}
