# ADR-003: Hostinger frontend deployment — handbook exceptions

- Status: **Proposed — requires platform owner approval. Nothing here is approved yet.**
- Date: 2026-11-05
- Time box: every exception below expires on **2027-02-03** (90 days) unless renewed or remediated.
- Owners: To be assigned by the platform owner.
- Authority: Engineering Coding Standards handbook (`docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx`; its title page reads "Revision 3.2" — see [BLOCKERS.md](../../deployment/BLOCKERS.md) item 1). Handbook §20: deviations need a written, time-boxed exception approved by the platform owner and recorded as an ADR.

## Context

The three Next.js applications are being prepared to run as Docker containers on the Hostinger VPS
(see [HOSTINGER_FRONTEND_DEPLOYMENT.md](../../deployment/HOSTINGER_FRONTEND_DEPLOYMENT.md)). Delivering that
safely required a few choices that deviate from the handbook. They are listed here so they are explicit,
owned, and time-boxed rather than silent.

## Exception E1 — environment-specific images (handbook §14, "one immutable artifact")

**Rule:** one build artifact is promoted dev → staging → prod and never rebuilt per environment.

**Deviation:** Next.js evaluates `rewrites()` and inlines `NEXT_PUBLIC_*` values during `next build`. The
Shell, Enterprise Admin and Platform Admin proxy `/api/v1/*` to upstreams through such rewrites, and the
cross-app origins, Socket.IO origin and media origin are `NEXT_PUBLIC_*`. Each image is therefore bound to the
environment it was built for (Hostinger staging vs AWS production).

**Mitigations in this change:** every upstream is explicit configuration with no built-in default; images are
tagged per environment (`hostinger-staging`); a missing mandatory variable fails the build or start-up by name;
the AWS-style rewrite tables were verified byte-identical to the previous behaviour.

**Remediation (preferred):** move upstream selection to request time (a Next.js `proxy.ts` rewrite or route
handlers that read `process.env`) and serve browser-visible values from a runtime configuration endpoint, so
a single image can be promoted. Requires platform decision and a regression pass over the 114 rewrite rules
(Shell 30, Enterprise Admin 45, Platform Admin 39 when every optional upstream is configured).

## Exception E2 — `style-src 'unsafe-inline'` in the Content-Security-Policy (handbook §7)

**Rule:** strict CSP with no `unsafe-inline` / `unsafe-eval`; `script-src` limited to self and nonced/hashed scripts.

**Deviation:** `script-src` is strict (per-request nonce + `strict-dynamic`, no `unsafe-eval` in production,
`frame-ancestors 'none'`, `object-src 'none'`). `style-src` keeps `'unsafe-inline'`, because shipped libraries
(for example the DOCX lesson previewer) inject `<style>` elements at runtime and React renders inline `style`
attributes; this could not be verified end to end without the production backend.

**Remediation:** audit style injection, move to nonce/hash-based `style-src`, drop the exception. A report-only
switch (`CSP_REPORT_ONLY=true`) exists as a rollout kill-switch, not as a default.

## Exception E3 — `dangerouslySetInnerHTML` retained, now sanitized (handbook §7)

**Rule:** `dangerouslySetInnerHTML` is prohibited; rendered rich text is sanitized with DOMPurify.

**Deviation:** three usages remain in the eBook editor (`TrainingDetailsSections.tsx`). Every one of them, and the
three direct `innerHTML =` assignments of stored page content, now passes through `sanitizeEbookHtml`
(DOMPurify with a tag/attribute allowlist, inline-style property allowlist, and a fail-closed server path).

**New dependency (handbook §19 — approval required before merge):** `dompurify@3.4.17`, licence
`(MPL-2.0 OR Apache-2.0)`; its only dependency is `@types/trusted-types` (MIT, types only). The Apache-2.0 option
is on the handbook allowlist; the MPL-2.0 option would need architecture review, so the Apache-2.0 election must be
recorded by the reviewer. Maintenance, security history and transitive footprint sign-off is still **pending**.

**Remediation:** refactor the editors to ref-based rendering so `dangerouslySetInnerHTML` is no longer needed.

## Exception E4 — demo token in `sessionStorage` (handbook §7, §8) — blocked on Identity

**Rule:** no tokens in web storage; Keycloak is the only identity provider; no hand-rolled auth.

**Deviation:** Shell chat/realtime still uses a temporary bearer token obtained from the Marketplace `dev-token`
endpoint through `/internal/demo-auth/login` and stored in `sessionStorage`. This change makes the route **disabled
by default** (`MARKETPLACE_DEMO_AUTH_ENABLED`), removes its hard-coded AWS fallback and adds validation and a timeout,
but deliberately does **not** replace the mechanism: that needs an Identity-team decision (see BLOCKERS.md item 2).

## Exception E5 — HSTS from the application (handbook §7)

The applications send `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` as the handbook
requires. Browsers ignore it over plain HTTP, and TLS termination is still pending, so it is inert until HTTPS is
in place. The platform owner must confirm that `preload` is acceptable for the final staging domain before that
domain is ever submitted to a preload list, and the reverse proxy should send the header as well.

## Consequences

- Production remains safe because nothing in AWS production is modified and the AWS-style configuration still
  produces identical rewrite tables when its variables are set explicitly.
- The exceptions above are visible, owned and expire on 2027-02-03.

## Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Platform owner | _pending_ | _pending_ | |
| Security reviewer | _pending_ | _pending_ | |
