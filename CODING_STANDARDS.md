# Invigorate Health coding standards

The original handbook at
`docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx`
is authoritative. If this summary conflicts with the handbook, the handbook wins.

This is the frontend-focused working guide for this repository. Raise a handbook conflict before implementation; do not silently make an exception.

## TypeScript and React

- Use strict TypeScript and explicit, descriptive names. Avoid ambiguous abbreviations and unvalidated `unknown`/`any` flows at API boundaries.
- Use functional React components and hooks only. Class components are prohibited.
- Keep files focused. Split components, hooks, and helpers before they exceed roughly 250 lines.
- Use PascalCase for components, interfaces, and types; camelCase for frontend functions and variables; UPPER_SNAKE_CASE for constants and environment variable names.
- Add TSDoc to every exported function, hook, interface, and non-obvious prop contract.
- Comments explain *why* (constraints, safety, trade-offs), never restate implementation. TODO/FIXME comments require a ticket ID such as `TODO(INV-123)`. Delete dead code; do not comment it out.

## Server and local state

- TanStack React Query is required for all remote/server state: fetching, caching, background refresh, retries, mutations, and invalidation.
- Do not use ad-hoc `useEffect` plus `useState`/loading/error state to manage API data. Remote queries belong in typed query hooks.
- Set deliberate query keys, stale times, retry policy, error handling, and mutation invalidation. Do not share a QueryClient across runtime remotes.
- `useState` is for local component UI state only. Context is limited to appropriate cross-app concerns such as theme, locale, and host-provided auth/tenant context.

## Micro-frontends

- Split by business domain and team ownership, never technical layer. Reusable code belongs in a versioned shared package, not a remote.
- The host shell owns routing, authenticated navigation, theme, locale, and error/loading boundaries only. It must not contain domain business logic.
- Web portals compose runtime remotes through Webpack/Rspack Module Federation. Build-time package composition is permitted only as the documented fallback when runtime loading cannot meet the performance budget; iframe composition is prohibited for PHI surfaces.
- Remotes expose typed, reviewed mount/unmount and prop contracts, deploy/version independently, remain compatible with the two prior host versions, and own a route prefix.
- Never directly import another remote's store or reach into its state. Use host context (auth, tenant, locale, theme) or a typed, versioned event bus.
- React, React DOM, React Query, the design system, and i18n runtime are pinned singleton dependencies. Every remote needs scoped error and loading boundaries, a load timeout, retry fallback, route-level lazy loading, and contract/E2E tests.

## Security, identity, and data

- Never put tokens, secrets, PHI, or PII in localStorage, sessionStorage, IndexedDB, logs, URLs, analytics, or error messages. Access tokens stay in memory; refresh happens through HttpOnly cookies.
- Never log access/refresh tokens, JWTs, passwords, OTPs, cookies, authorization headers, PHI, PII, raw health metrics, or conversation content.
- Keycloak is the only identity provider. Do not create hand-rolled authentication, token issuance, or password storage.
- Treat server authorization as authoritative. Hiding UI, mounting a remote, and feature flags are presentation controls, not authorization.
- Use secure, HttpOnly, SameSite=Strict session cookies. State changes must not use GET and require the browser CSRF protection pattern approved by the platform.
- Do not use `dangerouslySetInnerHTML`, `eval`, or dynamic `Function`. Sanitize any allowed rich text with DOMPurify and an allowlist.
- Web responses require strict CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors 'none'`.
- Classify data: T1 PHI and T2 PII must be protected and redacted from logs; production PHI never enters non-production fixtures.

## Configuration and API integration

- Configuration is environment-driven; never commit or embed secrets. Do not add stale hardcoded API-host fallbacks.
- Use one immutable artifact through local, CI, staging, and production. Environment-specific production code paths require an approved exception.
- Feature flags are typed, owned, time-boxed, auditable configuration with a kill switch—not authorization.
- Follow reviewed, versioned OpenAPI contracts. Use typed request/response models; handle documented success and RFC 9457 error shapes.
- Use versioned endpoints, ISO-8601 UTC timestamps, UUID identifiers, cursor pagination, ETags/`If-Match` for mutations, and idempotency keys for state-changing requests where the API contract provides them.
- Never choose arbitrary `tenant_id` from the client when tenant identity is server-derived.

## Localization, accessibility, and performance

- All production user-facing strings belong in namespaced locale resources using i18next/react-i18next and ICU MessageFormat. Use `Intl` for locale-sensitive dates, numbers, and units; verify RTL layouts.
- Meet WCAG 2.2 AA. Use semantic HTML, keyboard-operable controls, correct ARIA only where needed, and axe assertions in CI.
- Use skeleton loading states, not blank pages or full-screen waiting states. Keep LCP at or below 2.5 s, INP at or below 200 ms, CLS at or below 0.1, and initial web JS at or below 250 KB gzipped; lazy-load remotes/routes.

## Testing, delivery, and dependencies

- Coverage gates: UI components at least 80% with axe assertions; shared libraries at least 95% with mutation score at least 70%; core services at least 90%.
- Required gates are lint, type check, tests, security scans, and applicable AI evaluations. Use GitHub Flow (`feature/INV-###`), PR review, and Conventional Commits: `type(scope): summary [INV-###]`.
- Keep PRs near 400 changed lines; justify and split larger changes where feasible. Auth, PHI, tenancy, and semantic changes require two reviewers including a Senior Engineer.
- New runtime dependencies require reviewer approval for license, maintenance, security history, and transitive footprint. Allowed without review: MIT, BSD, Apache-2.0, ISC; GPL/AGPL/unknown licenses are prohibited.
