import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeEbookHtml, sanitizeInlineStyle } from "./ebook-html-sanitizer.ts";

test("keeps presentational declarations the rich-text editor produces", () => {
  assert.equal(
    sanitizeInlineStyle("text-align: center; font-size: 18px; color: rgb(31, 106, 88)"),
    "text-align:center;font-size:18px;color:rgb(31, 106, 88)",
  );
  assert.equal(sanitizeInlineStyle("display:block;max-width:100%;width:70%;object-fit:contain;margin:16px 0"), "display:block;max-width:100%;width:70%;object-fit:contain;margin:16px 0");
});

test("keeps every style the editor writes for blockquotes, headings and images so reloads do not lose formatting", () => {
  assert.equal(
    sanitizeInlineStyle("border-left:4px solid #83b9a4;padding-left:16px;margin:16px 0;font-style:italic;color:#52736a"),
    "border-left:4px solid #83b9a4;padding-left:16px;margin:16px 0;font-style:italic;color:#52736a",
  );
  assert.equal(
    sanitizeInlineStyle("font-size:1.5rem;line-height:2rem;font-weight:800;margin:0.75rem 0"),
    "font-size:1.5rem;line-height:2rem;font-weight:800;margin:0.75rem 0",
  );
  assert.equal(
    sanitizeInlineStyle("max-width:100%;width:100%;height:260px;object-fit:cover;object-position:center;display:block;margin:16px 0"),
    "max-width:100%;width:100%;height:260px;object-fit:cover;object-position:center;display:block;margin:16px 0",
  );
});

test("drops layout-escaping and resource-loading declarations", () => {
  assert.equal(sanitizeInlineStyle("position:fixed;top:0;left:0;z-index:9999;width:100vw;height:100vh"), "width:100vw;height:100vh");
  assert.equal(sanitizeInlineStyle("background-image:url(https://evil.example/x.png)"), "");
  assert.equal(sanitizeInlineStyle("color:red;background-color:url(javascript:alert(1))"), "color:red");
  assert.equal(sanitizeInlineStyle("width:expression(alert(1))"), "");
  assert.equal(sanitizeInlineStyle("transform:scale(1000);filter:blur(5px);content:'x'"), "");
  assert.equal(sanitizeInlineStyle("color:red\\;"), "");
  assert.equal(sanitizeInlineStyle("display:flex"), "");
});

test("style sanitization is idempotent so editor round-trips do not churn", () => {
  const once = sanitizeInlineStyle("Text-Align : CENTER ;font-size:18px;;position:absolute");
  assert.equal(sanitizeInlineStyle(once), once);
});

test("fails closed without a DOM: never returns the raw input", () => {
  // Node has no `window`; DOMPurify would hand back its input unchanged, so the wrapper must not.
  const hostile = '<p>hello</p><img src=x onerror="alert(1)"><script>alert(1)</script>';
  assert.equal(sanitizeEbookHtml(hostile), "");
  assert.equal(sanitizeEbookHtml(""), "");
  assert.equal(sanitizeEbookHtml(null), "");
  assert.equal(sanitizeEbookHtml(undefined), "");
});
