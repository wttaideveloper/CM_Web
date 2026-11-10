# Hostinger VPS — frontend deployment runbook

Applies to the three Next.js apps in this npm-workspaces monorepo. **Status: prepared, not deployed.**
Read [BLOCKERS.md](BLOCKERS.md) first: several items (domain/TLS, Identity decision, ADR-003 approval, Docker first-build)
are still open. This document never contains secrets; real values live only in `deploy/docker/frontend.env` on the server.

## 1. What runs where

| Application | Workspace | Image | Container name | Container port | Host binding |
|---|---|---|---|---:|---|
| Shell | `@ihp/shell` | `ihp-shell:<tag>` | `ihp-frontend-shell` | 3000 | `127.0.0.1:3100` |
| Enterprise Admin | `@ihp/enterprise-admin` | `ihp-enterprise-admin:<tag>` | `ihp-frontend-enterprise-admin` | 3001 | `127.0.0.1:3101` |
| Platform Admin | `@ihp/platform-admin` | `ihp-platform-admin:<tag>` | `ihp-frontend-platform-admin` | 3002 | `127.0.0.1:3102` |

- Default tag: `hostinger-staging`. Each app has its own tag variable (`SHELL_IMAGE_TAG`, `ENTERPRISE_ADMIN_IMAGE_TAG`,
  `PLATFORM_ADMIN_IMAGE_TAG`), so each is versioned and rolled back independently.
- Host ports are bound to **loopback only**. Ports 3000 and 3001 on the host belong to another project and are not used.
- Compose project name: `ihp-frontend` (separate from the backend project).
- Network: the existing **external** network `classifieds-marketplace-internal`. The compose file never creates or changes it.
- Backend reachable from the containers: `http://classifieds-marketplace-api:8000` (REST) and
  `http://classifieds-marketplace-socket:8001` (Socket.IO, path `/api/socket.io` — used by the *reverse proxy*, not by browsers directly).
  **These two names are placeholders — confirm them first** with `docker network inspect classifieds-marketplace-internal`
  (see BLOCKERS.md D); they are baked into the images at build time.
- Not touched by this work: the backend Compose file/containers, PostgreSQL, Redis, Nginx, DNS, TLS, UFW, AWS.

## 2. Architecture of the image

One root `Dockerfile`, selected per app with `--build-arg APP_NAME=<shell|enterprise-admin|platform-admin>`:

1. **manifests** – gathers every `package.json` so the dependency layer caches independently of source changes.
2. **deps** – `npm ci` from `package-lock.json` (workspaces and shared packages preserved).
3. **builder** – `npm run build --workspace=@ihp/<app>` with Next.js `output: "standalone"` and `outputFileTracingRoot` set to the monorepo root.
4. **runner** – `node:22.23.2-bookworm-slim` pinned by digest; non-root user `nextjs` (uid 1001); only the standalone server,
   `.next/static`, `public`, and the start-up scripts. No `.env*`, `.git`, `.kilo`, `.next` cache or `node_modules` from the build context
   (see `.dockerignore`). `init: true` in Compose provides a proper PID 1.

Start-up: `entrypoint.sh` → `check-env.mjs runtime <app>` (fails with variable **names only** if a mandatory variable is missing or malformed)
→ `exec node apps/<app>/server.js`.

Health: `GET /api/health` returns `{"status":"ok","service":"<app>"}` and does no database or upstream call. The Docker health check
(`scripts/docker/healthcheck.mjs`, interval 30 s, timeout 5 s, 3 retries, 40 s start period) calls it.

## 3. Environment variables (names only)

Full annotated list: `deploy/docker/frontend.env.example`. There are **no default endpoints**: missing mandatory values fail the build or container start by name.

| Variable | Stage | Used by | Notes |
|---|---|---|---|
| `CHAT_API_BASE_URL` | build + runtime, required | all | Marketplace API incl. `/api/v1` (internal `http://` allowed for private hosts only) |
| `CHAT_PROXY_TARGET` | runtime, required | shell, enterprise-admin | Marketplace API origin for server-side chat/media proxies |
| `AUTH_API_BASE_URL` | build + runtime, required | all | Identity API (`/api/v1/auth`, `/api/v1/tenant`) |
| `SUPER_ADMIN_AUTH_API_BASE_URL` | runtime, required | shell, platform-admin | Super Admin gateway |
| `PLATFORM_TRUSTED_UPSTREAM_ORIGINS` | runtime, required | platform-admin | Exact origins allowed to receive the Super Admin bearer token: the Marketplace API origin **and** the Workflow API origin (if `WORKFLOW_API_BASE_URL` is set); an unlisted origin is never sent the token (503) |
| `EVENTS_API_BASE_URL` | build, optional | shell, enterprise-admin | Shell falls back to `CHAT_API_BASE_URL` |
| `WORKFLOW_API_BASE_URL` | build + runtime, optional | enterprise-admin, platform-admin | Workflow features off when unset |
| `CHAT_TOKEN_UPSTREAM_URL` | runtime, optional | enterprise-admin | Only if chat-token is served elsewhere than `CHAT_PROXY_TARGET` |
| `SUPER_ADMIN_SESSION_COOKIE_DOMAIN`, `SUPER_ADMIN_UPSTREAM_TIMEOUT_MS` | runtime, optional | shell / platform-admin | Cookie scope; upstream timeout (default 15000 ms) |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | build | shell, enterprise-admin | Public Socket.IO origin; realtime is disabled when empty |
| `NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN` | build | all | Public origin inside backend media URLs |
| `NEXT_PUBLIC_SHELL_ORIGIN`, `NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN`, `NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN` | build | all | Cross-app login redirects (pending domain) |
| `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CHAT_API_BASE_URL`, `NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED`, `NEXT_PUBLIC_ASSET_PREFIX` | build | various | Usually left at defaults |
| `CSP_REPORT_ONLY` | runtime | all | `true` = report-only CSP (rollout kill-switch) |
| `MARKETPLACE_DEMO_AUTH_ENABLED`, `MARKETPLACE_API_BASE_URL` | runtime | shell | Legacy demo-token bridge; **keep disabled** (see BLOCKERS.md B) |

Build-time variables are baked into the image (E1 in ADR-003): **rebuild after changing any of them**. Never put secrets in build variables.

## 4. Build and start (on the VPS, from the repository root)

```bash
git fetch origin && git checkout feature/hostinger-frontend-deployment   # or the approved release tag
cp deploy/docker/frontend.env.example deploy/docker/frontend.env          # then edit values; never commit this file
export COMPOSE="docker compose --env-file deploy/docker/frontend.env -f deploy/docker/compose.frontend.yaml"

$COMPOSE config --quiet            # validates interpolation; fails by name if a required variable is missing
$COMPOSE build                      # or: $COMPOSE build shell   (one app at a time)
$COMPOSE up -d                      # or: $COMPOSE up -d shell
```

Requires Docker Engine with BuildKit and Compose v2 (the Dockerfile uses a cache mount). Images are built one app at a time through `APP_NAME`.

## 5. Verify

```bash
$COMPOSE ps                                                    # STATUS should become "healthy" within ~40–60 s
curl -fsS http://127.0.0.1:3100/api/health                      # {"status":"ok","service":"shell"}
curl -fsS http://127.0.0.1:3101/api/health                      # enterprise-admin
curl -fsS http://127.0.0.1:3102/api/health                      # platform-admin
ss -ltn | grep -E ':310[0-2]\b'                                 # every line must show 127.0.0.1, never 0.0.0.0 or [::]

# Container → backend over the internal network (backend root /health does not query the database)
docker exec ihp-frontend-shell node -e "fetch('http://classifieds-marketplace-api:8000/health',{signal:AbortSignal.timeout(5000)}).then(r=>console.log('backend',r.status)).catch(e=>{console.error('unreachable');process.exit(1)})"

# Security headers on the page document
curl -sI http://127.0.0.1:3100/ | grep -iE 'content-security-policy|strict-transport|x-content-type|referrer-policy|x-frame'

# The image must not contain secrets or env files
docker run --rm --entrypoint sh ihp-shell:hostinger-staging -c 'find / -xdev \( -name ".env*" -o -name "*.env" \) -not -path "/proc/*" 2>/dev/null | grep . && exit 1 || echo "no env files"'
docker image ls --format '{{.Repository}}:{{.Tag}}  {{.Size}}' | grep '^ihp-'
```

First staging rollout: set `CSP_REPORT_ONLY=true`, exercise the apps, read browser-console CSP reports, then set it back to `false`.

## 6. Logs, restart, stop

```bash
$COMPOSE logs -f --tail=100 shell                 # one app; logs are rotated (10 MB × 5 per container)
docker inspect --format '{{json .State.Health}}' ihp-frontend-shell
$COMPOSE restart shell                             # restart one app only
$COMPOSE stop enterprise-admin                     # stop one app only
```

Application logs deliberately contain no upstream URLs, query strings, tokens or response bodies. Restart policy: `unless-stopped`.
`docker compose` here only addresses the `ihp-frontend` project; it cannot restart the backend, PostgreSQL or Redis.

## 7. Rollback (per app, no effect on the others)

Always tag the running image before replacing it:

```bash
docker tag ihp-shell:hostinger-staging ihp-shell:previous-$(date +%Y%m%d%H%M)       # before building a new version
```

To roll back one application, point its tag variable at the earlier image and recreate only that service:

```bash
SHELL_IMAGE_TAG=previous-202611051200 $COMPOSE up -d --no-build shell
$COMPOSE ps shell && curl -fsS http://127.0.0.1:3100/api/health
```

Rolling back never touches the other two apps, the backend or the network.

## 8. Not done here (by design)

No Nginx change, DNS, TLS, firewall change, AWS change, backend/DB/Redis restart, migration, or public port exposure.
The production cutover is not part of this change; the command list in the hand-over report is for a later, approved step.
