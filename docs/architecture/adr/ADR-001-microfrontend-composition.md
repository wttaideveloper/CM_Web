# ADR-001: Micro-frontend composition strategy

- Status: Accepted as an interim build-time composition strategy
- Date: 2026-08-17
- Owners: To be assigned
- Review triggers: See [Runtime federation migration triggers](#runtime-federation-migration-triggers).

## Context

IHP is an npm-workspaces monorepo with three independently startable and buildable Next.js applications: Shell, Platform Admin, and Enterprise Admin. Shared functionality is published inside the repository as private workspace packages.

The current implementation composes UI at build time. Each application declares the shared packages it consumes and lists them in Next.js `transpilePackages`. There is no Module Federation configuration, remote entry, remote manifest, runtime remote loader, or remote deployment contract in this repository.

The Invigorate Health Coding Standards Handbook V5.0 (§5.1–§5.3) makes runtime Webpack/Rspack Module Federation the target for web portals, and permits build-time composition only as a fallback where runtime loading cannot meet the §6.2 budgets. This ADR records the present build-time approach as an explicit interim decision; it does not claim full micro-frontend compliance.

## Decision

Continue using build-time workspace-package composition while the applications remain in this monorepo. Treat each application route as a thin host adapter and keep reusable domain behaviour in packages. Do not introduce runtime Module Federation until an approved deployment, security, compatibility, observability, and rollback design exists.

This decision is an interim boundary, not a declaration that the three applications are independently deployable runtime micro-frontends.

## Current architecture

- The root `package.json` defines npm workspaces for `apps/*`, `packages/*`, and `packages/features/*`.
- `apps/shell`, `apps/platform-admin`, and `apps/enterprise-admin` each have their own Next.js dev and build scripts.
- Each application compiles selected workspace packages through `transpilePackages` in its `next.config.ts`.
- The applications use frontend-relative rewrites for API access where configured; this is a proxy mechanism, not runtime UI federation.
- There is no `remoteEntry`, remote manifest, runtime remote version resolver, runtime remote timeout, or cross-remote event-bus contract.
- The shared packages are source-linked private workspace packages rather than independently deployed runtime remotes.

## Application responsibilities

### Shell

Shell owns Web Auth entry, callback validation, cookie-backed session coordination, and safe cross-application return handling through `@ihp/auth`. It should own cross-application navigation, authenticated navigator composition, theme/locale coordination, and appropriate error/suspense boundaries—not domain business logic.

Shell currently retains compatibility and domain responsibilities that should be reduced over time. A domain change should not require a Shell release merely because the domain is hosted by another application.

### Platform Admin

Platform Admin owns its Platform routes and visual shell. Its protected builder route group hosts `/form-builder-new` and `/workflow-builder-new` as thin adapters over the shared Workflow packages. The temporary Platform access gate is scoped to that route group and must not become a global Platform Admin guard.

### Enterprise Admin

Enterprise Admin owns Enterprise routes and its Enterprise visual shell. Its Workflow Lab routes host the same shared Forms/Workflow capabilities through Enterprise-specific route adapters and configuration.

## Dependency rules

The permitted direction is:

```text
Application route or adapter
        ↓
Shared feature or domain package
        ↓
Runtime, shared auth, UI, and utility packages
```

- Applications must not import another application's source.
- Shared packages must not import application source.
- Shared packages expose typed public APIs and remain host-neutral.
- Platform and Enterprise adapters may provide host-specific presentation, navigation, and capabilities without moving those concerns into the shared domain package.
- Direct app-to-app imports and package-to-app imports are prohibited even when a relative filesystem path makes them possible.
- Shared package reuse alone is not a reason to create a runtime remote; this follows Handbook §5.1.

## Forms/Workflow hosting model

`@ihp/workflow-runtime` owns typed Forms/Workflow API and schema-normalization concerns. `@ihp/workflow-admin` owns reusable authoring workspaces and their local query-provider boundary. Neither package may contain Platform- or Enterprise-specific routes, user IDs, browser storage, authorization decisions, host wording, or host-origin logic.

- Enterprise Admin hosts Workflow Lab adapters under its Enterprise route tree.
- Platform Admin hosts Form Builder New and Workflow Builder New in the `(protected-builders)` route group.
- Platform adapters hide Platform-inappropriate technical presentation while preserving the shared implementation's default behaviour for other hosts.
- Requests and persisted payloads must follow typed, authoritative backend evidence. Do not invent `definition`, `flowDefinition`, or other API schema properties not supported by the backend contract.

## Authentication and authorization boundaries

Web authentication uses the shared cookie-backed Web Auth implementation in `@ihp/auth`; applications must not create separate auth clients or token persistence mechanisms. Shell validates safe return destinations for Platform and Enterprise before cross-application navigation.

The Platform builder route group mounts its `AuthProvider` and temporary access gate locally. That gate is a presentation and routing control only. It is not authoritative authorization: backend APIs must enforce permissions and tenancy for every request, as required by Handbook §5.3 and §7.

The current temporary Platform builder gate compares the authenticated user against an environment-configured user ID. It is a development/interim control and must be replaced by backend-authoritative authorization before production use.

## Loading and failure isolation

The Platform `(protected-builders)` route group now has scoped App Router `loading.tsx` and `error.tsx` boundaries. They apply only to `/form-builder-new` and `/workflow-builder-new`, provide an accessible skeleton/status while loading, and offer a safe retry without exposing error details.

This is scoped route isolation, not runtime-remote isolation. If runtime remotes are introduced, every remote must meet Handbook §5.3 requirements for a loading boundary, error boundary, scoped fallback, retry behaviour, explicit timeout, and no shell-wide navigation failure.

## Security requirements

- Keycloak remains the single identity provider; hand-rolled authentication, password storage, and token issuance are prohibited (Handbook §8).
- Production authentication must not place tokens, PHI, PII, or secrets in `localStorage`, `sessionStorage`, or IndexedDB (Handbook §7).
- Cookie-backed session requests use the established shared Web Auth architecture; no application may add a bearer-token store, manually write auth cookies, or create global authorization headers for Web Auth.
- Frontend validation and gates improve UX only. They are never the trust boundary; backend authorization and tenant isolation remain authoritative (Handbook §7 and §5.3).
- API types and payloads must be based on approved OpenAPI/runtime evidence, preserve compatibility, and avoid undocumented request schemas (Handbook §3).
- Error UI and logs must not expose tokens, identifiers, API bodies, stack traces, or personal data.

## Consequences

### Positive

- Shell, Platform Admin, and Enterprise Admin can be started and built separately from their own workspace scripts.
- Shared Forms/Workflow behaviour is reused without duplicating a Platform or Enterprise implementation.
- Host-specific presentation and route ownership stay in thin adapters.
- The Platform builder auth, query state, loading, and failure boundaries are scoped to the builder route group rather than mounted globally.
- Build-time source composition avoids introducing runtime remote security and deployment machinery before it is designed and operated.

### Negative and accepted limitations

- There is no runtime remote manifest, remote entry, or remote contract.
- Packages are not independently deployed runtime remotes and do not have independent remote rollback pipelines.
- Shell still contains compatibility/domain responsibilities that should be reduced.
- Complete CI/test enforcement is not evidenced: host/remote contract tests, coverage gates, and axe assertions are not established for this model.
- Full CSP and frontend-version observability evidence is not established.
- Runtime-remote SRI, origin allowlisting, and remote load timeouts are not applicable until runtime remotes exist.
- Build-time composition still requires bundle-size, shared-dependency, and performance-budget governance.

## Prohibited patterns

- Direct application-to-application imports.
- Shared packages importing application source.
- Host-specific IDs, origins, routes, permissions, storage, or wording inside host-neutral packages.
- Duplicated authentication implementations.
- Browser persistence of production tokens, secrets, or personal data.
- Treating client-only gates, hidden controls, or route visibility as the authorization boundary.
- Undocumented API payload schemas or frontend-invented Forms/Workflow fields.
- Unbounded global providers for domain-specific state.
- Introducing Module Federation without an approved deployment, security, compatibility, observability, and rollback design.

## Runtime federation migration triggers

Re-evaluate this interim decision when one or more of the following is confirmed:

1. Independent deployment becomes a confirmed product or operational requirement.
2. Separate teams need independent release cadence and ownership for a domain.
3. Build or bundle coupling exceeds agreed performance budgets.
4. Runtime remote failure isolation becomes necessary.
5. An approved Next.js/Rspack/Module Federation deployment design is available.
6. Authentication, CSP, origin allowlisting, SRI, compatibility, observability, timeout, and rollback contracts are ready.

## Unresolved production blockers

- The temporary exact-user-ID Platform builder gate is not backend-authoritative role/permission enforcement.
- The legacy Marketplace demo authentication service still persists a chat token in `sessionStorage` and is invoked from the Web Auth callback. This conflicts with Handbook §7 and is not production-ready.
- Complete CI enforcement for import boundaries, coverage, axe assertions, API contracts, performance budgets, and dependency/singleton policy is not evidenced.
- Runtime-remote deployment, version compatibility, SRI/origin allowlisting, timeout, observability, and rollback contracts do not yet exist.

## Validation and enforcement

This ADR records a decision; it does not waive Handbook requirements.

- Preserve npm-workspace dependency direction and reject app-to-app and package-to-app imports through review now and import-lint enforcement later.
- Keep route ownership explicit and adapters thin.
- Keep remote server state inside the owning feature/package query boundary; do not introduce a shared global query cache as a substitute for a runtime contract.
- Continue app-level lint, type-check, and production build validation. Add CI gates for these checks, contract tests, accessibility assertions, bundle budgets, and dependency singleton verification.
- Review this ADR at every migration trigger and before any production rollout of the temporary Platform builder access model.

## References

- `package.json` — npm workspace definition and app scripts.
- `apps/shell/next.config.ts`, `apps/platform-admin/next.config.ts`, and `apps/enterprise-admin/next.config.ts` — build-time package composition and rewrites.
- `apps/shell/src/app/auth/login/page.tsx` and `apps/shell/src/app/auth/validate/page.tsx` — Shell auth and return coordination.
- `packages/auth/src/cross-app.ts` — safe cross-application return URL handling.
- `apps/platform-admin/src/app/(protected-builders)/` — scoped Platform Forms/Workflow hosting and route boundaries.
- `packages/workflow-admin/` and `packages/workflow-runtime/` — host-neutral shared Forms/Workflow implementation.
- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx` — Handbook §§3, 5.1–5.3, 7, 8, 13, and 17.
- `docs/standards/COMPLIANCE_AUDIT.md` — prior repository evidence and outstanding standards gaps.
