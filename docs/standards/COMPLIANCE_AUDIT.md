# Frontend compliance audit

**Authority:** `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx` (Engineering Coding Standards — Revision 3.2 — Final Consolidated Edition).

**Scope:** static audit of the current frontend monorepo: `apps/shell`, `apps/enterprise-admin`, `apps/platform-admin`, and all `packages/*` / `packages/features/*` source and configuration. This is an audit only; no application behavior, dependency, API, UI, routing, or authentication change was made.

**Method and limits:** inspected 288 TypeScript/TSX source files; repository manifests/configuration; app and shared-package boundaries; direct API, storage, logging, and configuration references. No secret values were read or recorded. Server-side cookie attributes, Keycloak policy, API enforcement, production headers, deployment topology, and coverage results cannot be established from this frontend repository alone.

## 1. Executive summary

The repository has a useful workspace/package structure, strict TypeScript compiler settings in the portal applications, versioned `/api/v1` calls, relative Auth/Tenant integration, and some semantic/ARIA controls. It does **not** currently meet the handbook’s frontend architecture, security, server-state, localization, documentation, testing, CI, or delivery gates.

The most urgent risks are: a Marketplace demo bearer token persisted in `sessionStorage`; development logging that can emit chat/realtime payloads or raw API error text; no React Query despite pervasive manually managed remote state; no test or CI/coverage/axe gates; and no Module Federation-based runtime micro-frontend composition. The newly added Enterprise Settings Team & Users implementation is a direct §5 server-state violation because it owns members/roles/permissions requests, cache state, loading, and errors with `useEffect`/`useState`.

## 2. Compliance scorecard

| Area | Status | Evidence / assessment |
|---|---|---|
| §1 TypeScript and general principles | PARTIAL | App TypeScript configs are strict, but 28 source files exceed 250 lines and the largest is 5,688 lines. |
| §3 API contract integration | PARTIAL | `/api/v1` and typed service APIs exist; response validation is inconsistent and frontend use of client-selected `tenant_id` remains. |
| §5 React/server state | NON-COMPLIANT | No TanStack React Query dependency or usage; 39 files use `useEffect`, and remote state is manually managed. |
| §5.1–5.3 micro-frontends | NON-COMPLIANT | Three Next apps and shared packages exist, but no Module Federation/runtime remotes, remote contracts, independent remote deployment evidence, or remote boundaries. |
| §6 navigation/performance | PARTIAL | Next App Router is appropriate for web, but no central typed route registry, route budget enforcement, or performance budget tooling. |
| §7–10 security, tokens, data | NON-COMPLIANT | Demo token in sessionStorage, potentially sensitive console payload/error logging, absent visible CSP/header configuration, and hardcoded API fallbacks. |
| §13 naming/documentation | NON-COMPLIANT | Naming is generally readable, but zero TSDoc blocks were found for 538 exported declarations; file-size rule is widely breached. |
| §14 configuration | NON-COMPLIANT | Environment variables are used, but hardcoded/stale endpoint fallbacks and no committed environment template were found. |
| §16 i18n | NON-COMPLIANT | No i18n runtime/resources; extensive hardcoded user-facing UI text. |
| §17 testing/delivery/platform | NON-COMPLIANT | Zero test files, no coverage config, no axe assertions, no `.github` CI workflows, and no observed security/commitlint gates. |
| §19 dependencies/licensing | NON-COMPLIANT | Lockfile exists, but no license scanning/allowlist enforcement, dependency approval record, or CI evidence. |

## 3. Critical findings

| Standard section | Rule | Current implementation | Files | Status / severity | Recommended remediation |
|---|---|---|---|---|---|
| §7, §8, §10 | Tokens/secrets must never be persisted in browser storage; access tokens stay in memory and refresh uses HttpOnly cookies. | Marketplace demo authentication writes its access token, expiry, and user data to `sessionStorage`; Shell API client then sends it as `Authorization: Bearer`. | `apps/shell/src/services/marketplace-demo-auth.service.ts`, `apps/shell/src/services/api-client.ts`, `apps/shell/src/app/internal/demo-auth/login/route.ts` | **NON-COMPLIANT — CRITICAL** | Replace the demo token path with the approved session/BFF model, remove persisted token storage, and add security tests. Requires product/platform decision because it is currently used by Chat. |
| §9, §10 | T1/T2 data, conversation content, tokens, and raw errors must not be logged. | Chat/realtime paths log arbitrary socket payloads and raw response `errorText`; payloads can contain notification or conversation data. | `packages/realtime/src/RealtimeProvider.tsx`, `packages/features/messaging/src/EnterpriseMessagesScreen.tsx`, `packages/features/messaging/src/chat.service.ts`, `apps/shell/src/services/api-client.ts` | **NON-COMPLIANT — CRITICAL** | Remove/redact payload and response-body logs; replace with approved structured telemetry containing only correlation IDs, event type, status, and non-sensitive counters. Review all diagnostics with privacy/security. |
| §17.2, §20 | Tests, coverage gates, axe assertions, security scans, and CI are release gates. | No test files, coverage configuration, test runner configuration, axe assertions, or GitHub workflow directory were found. | Repository root; all apps/packages | **NON-COMPLIANT — CRITICAL** | Establish CI gates before feature expansion: lint, typecheck, unit/component/E2E tests, coverage thresholds, axe, dependency/SAST scans, and a protected PR workflow. |

## 4. High findings

| Standard section | Rule | Current implementation | Files | Status / severity | Recommended remediation |
|---|---|---|---|---|---|
| §5 | TanStack React Query is required for all remote data; ad-hoc `useEffect`/`useState` server state is prohibited. | No `@tanstack/react-query` dependency or source use exists. Remote state is manually fetched and cached in contexts/screens. The new Team & Users UI manually loads members, roles, and permissions with effects and local loading/error/data state. | `packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx`, `packages/enterprise-runtime/src/TenantContext.tsx`, `packages/enterprise-runtime/src/CurrentEnterpriseContext.tsx`, `packages/auth/src/AuthProvider.tsx`, feature screens/services across `packages/features/*` | **NON-COMPLIANT — HIGH** | Introduce the approved QueryClient per remote/app and migrate one domain at a time to typed query/mutation hooks with query keys, retry policy, stale times, invalidation, and skeleton/error states. Do not change behavior until migration is planned. |
| §5.1–§5.3 | Web portals require runtime Module Federation behind a thin shell; remotes require typed contracts, independent release capability, and failure isolation. | The repository has separate Next apps and source-shared workspace packages via `transpilePackages`; no Module Federation, remote entry, remote contract, remote timeout/SRI, or remote loading/error boundary was found. Shared packages are private `0.1.0` packages rather than independently versioned remotes. | `apps/*/next.config.ts`, root `package.json`, `packages/*/package.json`, `packages/features/*/package.json` | **NON-COMPLIANT — HIGH** | Decide whether the intended architecture is true runtime MFEs or the handbook’s documented build-time fallback. Record an ADR, define owned domains/service manifest, remote contract/version policy, singleton config, remote pipeline, and scoped boundary strategy. |
| §5.1 | Shell may own routing, authenticated navigation, theme, locale, and boundaries only; business logic in Shell is prohibited. | Shell owns registration orchestration, marketplace demo-token lifecycle, bearer API client, internal demo login route, and service-provider option integration. | `apps/shell/src/services/registration-ui.service.ts`, `apps/shell/src/services/marketplace-demo-auth.service.ts`, `apps/shell/src/services/api-client.ts`, `apps/shell/src/app/internal/demo-auth/login/route.ts`, `apps/shell/src/services/service-provider-options.service.ts`, `apps/shell/src/components/auth/register/*` | **NON-COMPLIANT — HIGH** | Move each domain into an owned feature/shared package or remote. Keep only route composition, host context, theme, locale, and boundaries in Shell. The Chat demo path needs a separate security migration. |
| §7, §10 | Web portals must emit strict CSP and required security headers. | Next configurations contain rewrites and package transpilation but no visible CSP, `frame-ancestors`, HSTS, `nosniff`, or Referrer-Policy header configuration. | `apps/shell/next.config.ts`, `apps/enterprise-admin/next.config.ts`, `apps/platform-admin/next.config.ts` | **NON-COMPLIANT — HIGH** | Confirm reverse-proxy/CDN headers with platform. If not supplied there, implement headers at the appropriate web edge and test them. |
| §16 | User-facing text must reside in i18next/react-i18next locale resources and use ICU messages. | No i18n dependency, locale resource directory, or translation runtime was found. UI text is hardcoded throughout portal apps and shared screens. | Examples: `apps/shell/src/app/auth/login/page.tsx`, `packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx`, `packages/enterprise-layout/src/EnterpriseAdminLayout.tsx`, `packages/features/messaging/src/EnterpriseMessagesScreen.tsx` | **NON-COMPLIANT — HIGH** | Select and configure the shared i18n runtime, introduce namespaced bundles per domain, then extract strings incrementally with locale/RTL tests. |
| §13 | TSDoc is required for every exported TypeScript function, hook, and prop interface. | Static scan found 538 exported declarations and zero TSDoc comment blocks. | All `apps/**/*.{ts,tsx}`, `packages/**/*.{ts,tsx}`; examples `packages/enterprise-runtime/src/tenant.service.ts`, `packages/auth/src/account.service.ts`, feature service files | **NON-COMPLIANT — HIGH** | Add a TSDoc lint rule and remediate public API surfaces package by package, starting with Auth, tenant/runtime, and shared UI contracts. |
| §3, §10 | Tenant identity must be server-derived; frontend must not choose arbitrary `tenant_id`. | Some create/search flows accept or send client-side tenant IDs. Enterprise product/service creation gets a tenant from context, but the Enterprise create screen exposes a tenant form value and sends `tenant_id`; search uses a tenant ID query. | `packages/features/enterprises/src/screens/EnterpriseCreateScreen.tsx`, `packages/features/enterprises/src/services/enterprise.service.ts`, `packages/features/products/src/screens/ProductCreateScreen.tsx`, `packages/features/services/src/screens/ServiceCreateScreen.tsx` | **PARTIAL — HIGH** | Confirm backend authorization and whether platform administration is an approved cross-tenant exception. Otherwise remove client-selected tenancy and derive it from verified claims. Record any exception as an ADR. |

## 5. Medium findings

| Standard section | Rule | Current implementation | Files | Status / severity | Recommended remediation |
|---|---|---|---|---|---|
| §14 | Config must be environment-driven; no stale hardcoded API fallback. | Shell and Platform Admin default the Identity host to the old AWS endpoint. Platform Admin defaults its platform API host; Chat runtime and internal demo route also have hardcoded fallback hosts. | `apps/shell/next.config.ts`, `apps/platform-admin/next.config.ts`, `packages/chat-runtime/src/config.ts`, `apps/shell/src/app/internal/demo-auth/login/route.ts` | **NON-COMPLIANT — MEDIUM** | Require environment-supplied base URLs, fail safely when absent, and create a non-secret `.env.example` containing names/descriptions only. |
| §14 | Avoid environment-specific behavior without approved exception; flags need central typed governance. | Development-only auth/proxy diagnostics and demo behaviors use `NODE_ENV`; no typed feature-flag service, owner/removal policy, or flag audit was found. | `packages/auth/src/login.ts`, `packages/auth/src/session.ts`, `apps/shell/next.config.ts`, `apps/shell/src/services/marketplace-demo-auth.service.ts` | **PARTIAL — MEDIUM** | Classify diagnostics separately from product behavior, add approved logging controls, and establish a typed, auditable feature-flag service before progressive rollouts. |
| §3 | Typed contracts must handle documented success/error shapes; collection endpoints use documented pagination and concurrency controls. | Service functions generally type successes, but many parse `unknown` manually and throw raw response text. No observed shared RFC 9457 parser, cursor-pagination abstraction, ETag/`If-Match`, or idempotency-key integration. | `packages/auth/src/account.service.ts`, `packages/enterprise-runtime/src/tenant.service.ts`, `packages/features/*/src/services/*`, `apps/shell/src/services/registration-ui.service.ts` | **PARTIAL — MEDIUM** | Standardize generated/reviewed OpenAPI types and an error adapter; add paging, ETag, and idempotency support where backend contracts expose them. |
| §6, §5.3 | Enforce web performance budgets, lazy remote loading, and skeleton fallbacks. | No bundle-budget or Web Vitals enforcement found. Numerous screens display text spinners/blank waits rather than reusable skeletons. | `apps/*`, `packages/features/*`; examples `packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx`, `packages/features/services/src/screens/*`, `packages/features/products/src/screens/*` | **PARTIAL — MEDIUM** | Establish bundle/Web Vitals CI budgets and reusable skeleton primitives; apply through the React Query migration and remote boundaries. |
| §7, §9 | Browser storage must not contain T1/T2 data without an approved protected model. | Onboarding form drafts are stored in localStorage. The data classification of form snapshots is not established in this repo. | `packages/features/onboarding-forms/src/screens/OnboardingFormCreateScreen.tsx` | **PARTIAL — MEDIUM** | Classify the draft schema. If it can contain T1/T2, remove browser persistence or replace it with an approved protected draft model. |
| §13 | Files split around 250 lines; focused components/hooks are required. | 28 TS/TSX files exceed 250 lines. Notable examples: Messaging 5,688 lines; onboarding create/edit 1,719/1,893; enterprise details 1,231; realtime provider 851; settings 379. | See §10 inventory below. | **NON-COMPLIANT — MEDIUM** | Split by domain behavior into components, hooks, and services after tests establish baseline behavior. Prioritize messaging, onboarding, and realtime. |
| §17, §19 | Conventional commits, GitHub Flow branch format, CI scans, license policy, and dependency review are required. | Current branch is `feature/microfrontend-refactor`, not `feature/INV-###`; recent commit `worrking into local` is not conventional. No commitlint, workflow, Snyk/Semgrep/license scan/SBOM configuration found. | Git metadata, root `package.json`, app/package manifests | **NON-COMPLIANT — MEDIUM** | Add commitlint/husky or CI enforcement, protected PR checks, dependency/license/SBOM scanning, and feature branch/ticket policy. |

## 6. Low findings

| Standard section | Rule | Current implementation | Files | Status / severity | Recommended remediation |
|---|---|---|---|---|---|
| §6, §16 | Web routing needs a central typed registry; user-facing routes should be maintainable and safe. | Next App Router route files are present, but route strings are distributed across components and shared helpers. | `apps/*/src/app/**`, `packages/auth/src/cross-app.ts`, layout/navigation packages | **PARTIAL — LOW** | Define a web-appropriate typed route ownership/route-builder contract; do not apply React Native `React Navigation` requirements directly to Next portals. |
| §5 accessibility | WCAG 2.2 AA and axe assertions are required. | Many controls are semantic and use ARIA labels/dialog roles, but there are no axe tests or CI gate; keyboard/focus-trap coverage cannot be verified. | `packages/ui/src/layout/*`, `packages/auth/src/components/*Modal.tsx`, `packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx`, all UI packages | **PARTIAL — LOW** | Add axe component/E2E tests, keyboard tests, focus management requirements, and an accessibility review checklist. |
| §13 | TODO/FIXME must include ticket IDs. | No active TODO/FIXME findings were detected in the static source scan. | `apps`, `packages` | **COMPLIANT — LOW** | Keep the lint rule when introduced. |

## 7. Standards currently implemented correctly

| Standard section | Current evidence | Status |
|---|---|---|
| §1 | All three app `tsconfig.json` files enable strict TypeScript. | COMPLIANT |
| §5 | Source uses functional components and hooks; no class component pattern was identified. | COMPLIANT |
| §3 | Auth/Tenant calls are frontend-relative and API versioned under `/api/v1`; tenant/auth services use typed interfaces and `credentials: "include"`. | PARTIAL |
| §5.2 | No direct imports from one `apps/*` tree into another were found; apps consume `@ihp/*` packages. | COMPLIANT |
| §7 | No use of `dangerouslySetInnerHTML`, `eval`, or dynamic `Function` was found in TS/TSX source. | COMPLIANT |
| §8 | Web Auth is centralized in `packages/auth` and uses Keycloak-oriented session/cookie flow rather than Identity bearer storage. | PARTIAL — Marketplace demo path is the exception. |
| §5 accessibility | Existing UI includes semantic landmarks, native buttons, dialog roles, and many aria labels. | PARTIAL |
| §13 | Interface/component naming is generally PascalCase and frontend variables/functions are generally camelCase. | PARTIAL |

## 8. React Query audit, including Enterprise Settings

**Finding:** **NON-COMPLIANT — HIGH (§5).** No TanStack React Query dependency or usage is present.

`packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx` manually owns server data in local state:

- `getTenantMembers()` is called from a `useEffect`, with `members`, `isLoadingMembers`, and `membersError` state.
- `getTenantRoles()` and `getTenantPermissions()` are called through `Promise.all` in another `useEffect`, with roles, permissions, loading, and error state.
- The component has no query cache, request deduplication across consumers, stale-time policy, retry policy, invalidation, or shared mutation coordination.

The same pattern occurs in Auth/Tenant providers and many feature screens. This is exactly the handbook’s prohibited ad-hoc remote-state pattern. No migration was performed in this audit.

## 9. Micro-frontend, routing, and Shell assessment

### Micro-frontends

The architecture is **separate Next applications plus build-time workspace package composition**, not demonstrated runtime micro-frontends:

- `apps/shell`, `apps/enterprise-admin`, and `apps/platform-admin` build separately and import shared `@ihp/*` packages.
- `transpilePackages` in each Next config compiles shared source into each application build.
- No `ModuleFederationPlugin`, `nextjs-mf`, remote entry, remote `exposes`/`remotes`, runtime manifest, SRI allowlist, remote timeout, or remote-specific error/loading boundary was found.
- Independent app build commands exist, but there is no evidence of independent remote SemVer, canary/rollback pipelines, host compatibility policy, service manifest, contract tests, or per-remote QueryClient.
- No direct app-to-app source import was detected, which is a positive boundary signal. Shared packages are used instead.

This does not meet §5.1–5.3 unless platform records and enforces the handbook’s **build-time fallback** exception through an ADR and adds the missing ownership, contract, deployment, and performance controls.

### Shell business logic

Shell contains material domain logic beyond routing/host boundaries:

- registration API/error handling and owner/organization flow (`apps/shell/src/services/registration-ui.service.ts`, `apps/shell/src/components/auth/register/*`);
- Marketplace demo-token lifecycle and token storage (`apps/shell/src/services/marketplace-demo-auth.service.ts`);
- Marketplace bearer API client and retry behavior (`apps/shell/src/services/api-client.ts`);
- server-side internal demo token bridge (`apps/shell/src/app/internal/demo-auth/login/route.ts`);
- service-provider option composition (`apps/shell/src/services/service-provider-options.service.ts`).

### Routing applicability

The React Navigation/root-stack requirements in §6.1 are **React Native-specific and not applicable** to these Next web portals. Applicable web requirements remain: protected route structure, safe deep links, no token/PII URL parameters, centralized route ownership, remote route-prefix registration, and web performance budgets. Next App Router is valid for web, but the handbook’s typed central route-registry equivalent and MFE route-prefix ownership are not present.

## 10. Files above the 250-line split threshold

| Lines | File |
|---:|---|
| 5,688 | `packages/features/messaging/src/EnterpriseMessagesScreen.tsx` |
| 1,893 | `packages/features/onboarding-forms/src/screens/OnboardingFormEditScreen.tsx` |
| 1,719 | `packages/features/onboarding-forms/src/screens/OnboardingFormCreateScreen.tsx` |
| 1,231 | `packages/features/enterprises/src/screens/EnterpriseDetailsScreen.tsx` |
| 1,133 | `packages/features/enterprises/src/screens/EnterpriseCreateScreen.tsx` |
| 1,024 | `packages/features/services/src/screens/ServiceCreateScreen.tsx` |
| 923 | `packages/features/products/src/screens/ProductCreateScreen.tsx` |
| 909 | `packages/features/services/src/screens/ServiceEditScreen.tsx` |
| 851 | `packages/realtime/src/RealtimeProvider.tsx` |
| 750 | `packages/features/products/src/screens/ProductEditScreen.tsx` |
| 693 | `apps/shell/src/components/auth/register/OwnerDetailsStep.tsx` |
| 669 | `packages/features/enterprises/src/screens/EnterpriseEditScreen.tsx` |
| 594 | `packages/features/enterprises/src/screens/EnterprisesListScreen.tsx` |
| 565 | `packages/features/attributes/src/screens/AttributesScreen.tsx` |
| 448 | `apps/shell/src/components/layout/AppHeader.tsx` |
| 413 | `packages/features/products/src/screens/ProductDetailsScreen.tsx` |
| 406 | `packages/features/onboarding-forms/src/lib/builder.helpers.ts` |
| 393 | `packages/features/products/src/screens/ProductsListScreen.tsx` |
| 392 | `packages/features/platform-configuration/src/PlatformCategoriesScreen.tsx` |
| 379 | `packages/features/enterprise-settings/src/EnterpriseSettingsScreen.tsx` |
| 373 | `packages/features/services/src/screens/ServiceDetailsScreen.tsx` |
| 367 | `apps/shell/src/app/auth/login/page.tsx` |
| 358 | `packages/features/enterprise-dashboard/src/EnterpriseDashboardScreen.tsx` |
| 349 | `packages/features/platform-configuration/src/PlatformApprovalQueueScreen.tsx` |
| 308 | `packages/features/platform-configuration/src/PlatformSubAdminsScreen.tsx` |
| 306 | `packages/auth/src/components/PasswordResetModal.tsx` |
| 288 | `packages/features/messaging/src/chat.service.ts` |
| 275 | `packages/features/services/src/screens/ServicesListScreen.tsx` |
| 256 | `apps/shell/src/components/layout/AppSidebar.tsx` |
| 256 | `apps/shell/src/services/marketplace-demo-auth.service.ts` |

## 11. Recommended remediation order

1. **Contain security risks:** remove persisted demo bearer tokens and redact/disable sensitive logging; confirm CSP, cookie, CSRF, and edge headers.
2. **Create delivery gates:** CI, tests, coverage thresholds, axe, SAST/dependency/license/SBOM scanning, commitlint, protected PR workflow.
3. **Resolve architecture:** platform ADR deciding runtime Module Federation versus an allowed build-time fallback; document ownership, contracts, deployments, and boundaries.
4. **Adopt shared platform foundations:** i18n runtime/resources, typed feature flags, runtime configuration, common API/RFC 9457 adapter, design-system and route contracts.
5. **Migrate server state:** install/approve React Query and migrate Auth/Tenant then Enterprise Settings as a pilot, followed by feature domains.
6. **Fix tenancy/API contracts:** resolve client-controlled tenant ID flows with backend/platform; add pagination/concurrency/idempotency support where specified.
7. **Reduce complexity:** test then split oversized messaging, onboarding, realtime, and shell files into hooks/components/domain packages.
8. **Add TSDoc and enforce it:** begin with exported Auth/runtime/shared interfaces and functions.
9. **Measure performance and accessibility:** add Core Web Vitals/bundle budgets, skeleton standards, keyboard/focus tests, and axe CI.

## 12. Items requiring backend or platform-team clarification

- Whether production sets Secure, HttpOnly, SameSite=Strict cookies; the CSRF token-header pattern; token TTL/rotation/reuse detection; Keycloak MFA and inactivity policies.
- Whether CSP, HSTS, `frame-ancestors`, `nosniff`, and Referrer-Policy are supplied by Vercel/CDN/reverse proxy; if so, provide the tested configuration.
- Whether `tenant_id` in enterprise/product/service flows is an approved platform-administration exception, and the server-side BOLA/RLS enforcement that protects it.
- Whether the current separate-Next-app/package structure is an intentional §5.1 build-time fallback; if yes, approve an ADR and define remote/domain ownership, independent release, contracts, shared singleton policy, and service manifest.
- The approved replacement for Marketplace/Chat demo authentication, its token issuer, production status, and retirement owner/ticket.
- The authoritative OpenAPI generation/type workflow, RFC 9457 error shape rollout, pagination/ETag/idempotency roadmap, and backend response compatibility policy.
- Data classification for onboarding draft snapshots and notification/socket payloads; whether any can contain T1/T2 data.
- The organization’s approved i18n, feature-flag, observability, dependency/license scanning, test/coverage, and CI platforms.
