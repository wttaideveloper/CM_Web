# Hostinger frontend deployment — open decisions, blockers and unverified items

Branch: `feature/hostinger-frontend-deployment` (local commits only: not pushed, not merged, not deployed).
Nothing in this file has been decided on anyone's behalf.

## A. Decisions needed from the manager / platform owner

| # | Decision | Why it matters | Needed from |
|---|---|---|---|
| 1 | **Which handbook revision is authoritative.** The file is named `…Handbook_V5.0.docx`, but its title page reads **"Revision 3.2 — Final Consolidated Edition"**; `COMPLIANCE_AUDIT.md` cites Revision 3.2 while `ADR-001` cites "V5.0". This was **not** resolved silently. All rules applied in this work were read from the document as it exists in the repository (Rev 3.2 text). If a V5.0 with different rules exists, the security/config choices below must be re-checked against it. | Standards basis for every change | Manager |
| 2 | **Approve or reject ADR-003** (`docs/architecture/adr/ADR-003-hostinger-frontend-deployment-exceptions.md`): E1 environment-specific images, E2 `style-src 'unsafe-inline'`, E3 sanitized `dangerouslySetInnerHTML`, E4 demo-token storage, E5 HSTS `preload`. Each expires 2027-02-03. | Handbook §20 forbids silent exceptions | Platform owner |
| 3 | **Domain, Nginx, DNS and TLS** for the three apps (deliberately postponed). Until decided, the `NEXT_PUBLIC_*_ORIGIN`, `NEXT_PUBLIC_CHAT_SOCKET_URL` and `NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN` values cannot be final, cross-app login redirects cannot work in a browser, and the `Secure`/`SameSite=Strict` cookies need HTTPS. Images are built per environment (E1), so they must be **rebuilt once these values exist**. | Browser login, realtime chat, media | Manager + infrastructure |
| 4 | **Where Identity, Super Admin and Workflow run for staging.** Today `AUTH_API_BASE_URL` and `SUPER_ADMIN_AUTH_API_BASE_URL` point at the existing AWS-hosted services. The Hostinger frontends are only independent of AWS if those services are moved or deliberately kept. | Remaining AWS dependency | Identity team / manager |
| 5 | **Reviewer sign-off for the new dependency `dompurify@3.4.17`** (handbook §19): licence `(MPL-2.0 OR Apache-2.0)` — record the **Apache-2.0** election (allowlisted); the MPL-2.0 option would require architecture review. Maintenance health, security history and transitive footprint (`@types/trusted-types`, MIT, types only) still need the reviewer's recorded sign-off. | Handbook §19 | Reviewer |

## B. Blocked on the Identity team (isolated, not redesigned)

**Replacement for the Shell chat demo-token path.** `apps/shell/src/app/internal/demo-auth/login/route.ts` forwards an
unauthenticated POST to the Marketplace `dev-token` endpoint (documented in the backend as local-testing-only and gated by
`ENABLE_DEV_TOKEN`) for a shared demo identity, and `marketplace-demo-auth.service.ts` keeps that token in `sessionStorage`.
Shell chat/realtime still consumes it.

What was done: the route is **off by default** (`MARKETPLACE_DEMO_AUTH_ENABLED` must be exactly `true`), has no hard-coded AWS
fallback, validates its configured URL and has a timeout. With the default, no demo token is issued or stored.

What was deliberately not done: replacing the mechanism, or moving the token to memory (a full-page navigation right after
login would drop it and silently break chat). Questions for the Identity team:

1. Which Keycloak-issued credential should Shell chat/realtime use? Enterprise Admin already uses the cookie-to-chat-token
   exchange (`POST /auth/chat-token` via `@ihp/chat-runtime`); is that the approved model for Shell too?
2. Is `ENABLE_DEV_TOKEN` enabled on the Hostinger backend? If not, the legacy bridge cannot work there regardless.
3. Retirement owner and ticket for the bridge.

**Effect on AWS production:** if production currently depends on this bridge it must set `MARKETPLACE_DEMO_AUTH_ENABLED=true`
and `MARKETPLACE_API_BASE_URL` **before** it is rebuilt from this branch. Otherwise Shell chat/realtime will be inactive.

## C. Required changes to AWS-production configuration before it is rebuilt from this branch

The AWS-style rewrite tables are byte-identical to the previous behaviour **when variables are set explicitly**. The previous
silent defaults are gone, so AWS builds must now set:

- `AUTH_API_BASE_URL`, `CHAT_API_BASE_URL` (all apps), `CHAT_PROXY_TARGET` (shell, enterprise-admin) — previously defaulted to AWS hosts.
- `NEXT_PUBLIC_CHAT_SOCKET_URL` — previously defaulted to the AWS chat host.
- `NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN` — previously hard-coded to the AWS chat host (client and server).
- `PLATFORM_TRUSTED_UPSTREAM_ORIGINS` (platform-admin) — replaces the hard-coded host checks. It must list the Marketplace API origin
  **and the Workflow API origin** (when `WORKFLOW_API_BASE_URL` is set): the Workflow proxy now refuses an origin that is not listed
  (HTTP 503, no token sent), whereas it previously sent the Super Admin token to whatever `WORKFLOW_API_BASE_URL` pointed at.
  An existing AWS deployment that uses the Workflow proxy must add its Workflow origin before it is rebuilt from this branch.
- `CHAT_TOKEN_UPSTREAM_URL` (enterprise-admin) only if `POST /auth/chat-token` is served by a different origin than `CHAT_PROXY_TARGET`.
- `CHAT_API_BASE_URL` is now mandatory for Enterprise Admin (it used to silently omit all Marketplace rewrites when unset).
- Cleartext `http://` upstreams are accepted only for private/internal hosts; a public `http://` value (including the old demo IP) is rejected.

## D. Not verified here (environment limits)

- **Docker could not be run on the development machine** (Docker is not installed; WSL cannot start because virtualization is
  unavailable). The Dockerfile, Compose file, entrypoint and health check were **not built or executed under Docker**. The same
  application steps were exercised natively (clean `npm ci`, `next build` with standalone output, the standalone server, health
  endpoints, response headers). The first `docker compose build` on the VPS is therefore the first real test of the image layers,
  the non-root user, the entrypoint and the health check. Image sizes and in-container network checks are unmeasured.
- No browser-level regression run of the CSP against the real backend. Use `CSP_REPORT_ONLY=true` for the first staging rollout and
  watch the browser console, then switch to enforcement.
- Container-to-backend connectivity (`classifieds-marketplace-api:8000`, the external network) can only be tested on the VPS.
- **The backend DNS names are assumptions, not verified facts.** `classifieds-marketplace-api` and
  `classifieds-marketplace-socket` are placeholders that match the stated network name. They do not appear in the backend
  repository, whose compose files call the services just `api` and `socket` (no `container_name`). The real names on the VPS
  must be read from `docker network inspect classifieds-marketplace-internal` **before the first build**, because
  `CHAT_API_BASE_URL` is baked into the image at build time (ADR-003 E1): a wrong name means a rebuild.

## E. Risks and recommendations (not changed)

- `@zxing/library@0.23.0` (via `@zxing/browser`, used by the attendance QR scanner) declares `node >= 24`; the target is Node 22.
  npm only warns and the library is browser-side, but it should be confirmed by the owner of that feature.
- Eleven existing tests fail under bare `node --test`: ten test files fail to load (extensionless relative imports →
  `ERR_MODULE_NOT_FOUND`) and one assertion fails (`workflow history preserves Event notification type, category, and
  metadata` in `packages/realtime/src/workflow-notifications.test.ts`). This is **pre-existing**: the identical set of 11
  fails on unmodified `main` (579e7d5: 323 tests, 312 pass, 11 fail; this branch: 368 tests, 357 pass, the same 11 fail).
  They are unrelated to this work; the load failures need a proper test runner and the assertion needs its own fix.
- **Resolved after the first review (security-fix commit):** (1) the Shell and Enterprise chat proxies and the Platform Workflow
  proxy now validate the raw and decoded path and re-encode it (`packages/shared/src/safe-proxy-path.ts`), so `..%2f..%2fadmin`
  and its encoded, double-encoded, backslash and malformed variants answer 400 and are never forwarded; (2) the Platform Workflow
  proxy sends the Super Admin bearer only to an origin listed in `PLATFORM_TRUSTED_UPSTREAM_ORIGINS`, checked before the token is
  even requested; (3) the Platform event-media proxy only fetches one `/api/v1/events/media/<asset>` path from the trusted origin.
- Container hardening not applied for lack of a way to test it: read-only root filesystem (needs a writable `.next/cache`), image
  scanning and SBOM in CI (handbook §17), a CI pipeline and test-coverage gates (still absent, see `COMPLIANCE_AUDIT.md`).
- The "frontend deployment readiness report" mentioned in the task is not present in the repository; only `COMPLIANCE_AUDIT.md` was available.
- Shell's page title is still the scaffold default ("Create Next App").
