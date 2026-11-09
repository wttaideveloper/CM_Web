# Multi-stage image for ONE of the three IHP Next.js applications.
#
#   docker build --build-arg APP_NAME=shell            -t ihp-shell:staging .
#   docker build --build-arg APP_NAME=enterprise-admin -t ihp-enterprise-admin:staging .
#   docker build --build-arg APP_NAME=platform-admin   -t ihp-platform-admin:staging .
#
# Prefer building through deploy/docker/compose.frontend.yaml, which supplies every build argument.
#
# NOTE (handbook §14): Next.js evaluates `rewrites()` and inlines NEXT_PUBLIC_* values at BUILD time,
# so the upstream/public variables below are baked into the image. An image is therefore specific to
# the environment it was built for. See docs/architecture/adr/ADR-003-hostinger-frontend-deployment-exceptions.md.

# Node 22 LTS, pinned to an exact patch release AND digest so every build starts from identical bytes.
# To update: pick the new patch tag, resolve its digest, and change both together.
ARG NODE_IMAGE=node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9

# --- manifests: collect every package.json so the dependency layer is cached independently of source ---
FROM ${NODE_IMAGE} AS manifests
WORKDIR /ctx
COPY . .
RUN mkdir /out \
 && find apps packages -name package.json -not -path '*/node_modules/*' -exec cp --parents '{}' /out ';' \
 && cp package.json package-lock.json /out

# --- deps: reproducible install of the whole npm-workspaces monorepo from the lockfile ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo
COPY --from=manifests /out ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- builder: build exactly one application ---
FROM deps AS builder
ARG APP_NAME
WORKDIR /repo
COPY . .

# Public/non-secret build-time configuration. These are URLs and origins only; NEVER pass secrets
# as build arguments (they remain visible in `docker history`).
ARG AUTH_API_BASE_URL
ARG CHAT_API_BASE_URL
ARG EVENTS_API_BASE_URL
ARG WORKFLOW_API_BASE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_CHAT_API_BASE_URL
ARG NEXT_PUBLIC_CHAT_SOCKET_URL
ARG NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN
ARG NEXT_PUBLIC_SHELL_ORIGIN
ARG NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN
ARG NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN
ARG NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED
ARG NEXT_PUBLIC_ASSET_PREFIX
ENV NEXT_TELEMETRY_DISABLED=1 \
    AUTH_API_BASE_URL=${AUTH_API_BASE_URL} \
    CHAT_API_BASE_URL=${CHAT_API_BASE_URL} \
    EVENTS_API_BASE_URL=${EVENTS_API_BASE_URL} \
    WORKFLOW_API_BASE_URL=${WORKFLOW_API_BASE_URL} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_CHAT_API_BASE_URL=${NEXT_PUBLIC_CHAT_API_BASE_URL} \
    NEXT_PUBLIC_CHAT_SOCKET_URL=${NEXT_PUBLIC_CHAT_SOCKET_URL} \
    NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN=${NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN} \
    NEXT_PUBLIC_SHELL_ORIGIN=${NEXT_PUBLIC_SHELL_ORIGIN} \
    NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN=${NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN} \
    NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN=${NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN} \
    NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED=${NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED} \
    NEXT_PUBLIC_ASSET_PREFIX=${NEXT_PUBLIC_ASSET_PREFIX}

RUN case "${APP_NAME}" in shell|enterprise-admin|platform-admin) ;; \
      *) echo "APP_NAME build argument must be shell, enterprise-admin or platform-admin" >&2; exit 1 ;; esac \
 && node --no-warnings scripts/docker/check-env.mjs build "${APP_NAME}" \
 && mkdir -p "apps/${APP_NAME}/public" \
 && npm run build --workspace="@ihp/${APP_NAME}"

# --- runner: minimal, non-root runtime ---
FROM ${NODE_IMAGE} AS runner
ARG APP_NAME
ARG APP_PORT=3000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    APP_NAME=${APP_NAME} \
    PORT=${APP_PORT}
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs

# Standalone output is rooted at the monorepo (outputFileTracingRoot), so the server lives at
# apps/<app>/server.js. Static assets and public files are not traced and must be copied explicitly.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

# Start-up helpers. check-env.mjs imports the same validators as next.config.ts, so ship that one file.
COPY --from=builder --chown=nextjs:nodejs /repo/scripts/docker ./scripts/docker
COPY --from=builder --chown=nextjs:nodejs /repo/packages/shared/src/upstream-config.ts ./packages/shared/src/upstream-config.ts
RUN sed -i 's/\r$//' scripts/docker/entrypoint.sh \
 && chmod 0555 scripts/docker/entrypoint.sh \
 && mkdir -p "apps/${APP_NAME}/.next/cache" \
 && chown nextjs:nodejs "apps/${APP_NAME}/.next/cache"

USER nextjs
EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "/app/scripts/docker/healthcheck.mjs"]

ENTRYPOINT ["/app/scripts/docker/entrypoint.sh"]
