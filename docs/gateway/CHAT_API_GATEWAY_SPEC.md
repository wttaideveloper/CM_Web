# `/chat-api` Gateway — Implementation Spec (for Backend/DevOps)

**Date:** 2026-08-16
**Status:** Ready to implement

---

## 1. Objective

Enable the web app (`app.invigor8.app`) to call Chat REST APIs hosted on
`chat.wisdomtooth.tech` using the existing HttpOnly **`access_token`** cookie,
without exposing that cookie to browser JS.

The deployed app **already has an API-gateway-style upstream router** (proven by
live probing):

| Probe | Result |
|---|---|
| `GET /api/v1/auth/integration` | `401` from `uvicorn` upstream (auth backend) → **routed** |
| `GET /api/v1/chat/test` | `502 {"success":false,"message":"No upstream configured for this API path"}` → **not routed yet** |
| `GET /api/v1/health` | `502 "No upstream configured for this API path"` |
| `GET /chat-api/test` | `307 → /en/chat-api/test` (caught by Next.js i18n catch-all, no proxy) |
| All responses | carry `apigw-requestid` (AWS API Gateway) + `X-Powered-By: Next.js` |

**Conclusion:** an upstream routing layer already exists (Next.js rewrites or an
edge/proxy config). We only need to **add one upstream entry** for `/chat-api/*`.

---

## 2. Route mapping

```
Request:   https://app.invigor8.app/chat-api/{path...}
Upstream:  https://chat.wisdomtooth.tech/api/v1/{path...}
```

Examples:
- `/chat-api/conversations/provider` → `https://chat.wisdomtooth.tech/api/v1/conversations/provider`
- `/chat-api/conversations/` → `.../api/v1/conversations/`
- `/chat-api/messages` → `.../api/v1/messages`

Method, query string, request body, and other headers pass through unchanged.

---

## 3. Authentication passthrough (the core requirement)

**Verified in the chat backend source** (`app/core/dependencies.py` `get_current_user`):
the backend already reads the `access_token` **cookie** as a native fallback
(`request.cookies.get(settings.WEB_SESSION_COOKIE_NAME)`), and the config comment
states the cookie is "accepted by REST and Socket.IO in addition to Authorization: Bearer".
No chat backend change needed.

So the gateway has **two valid modes** — passthrough is simplest:

### Mode 1 — Cookie passthrough (preferred)
1. Read the **`access_token`** cookie from the request.
2. **If missing** → respond `401 {"detail":"Not authenticated"}` locally; do NOT forward.
3. **If present** → forward the `Cookie` header upstream unchanged.
4. No `Authorization` header is injected; the backend authenticates from the cookie.
5. Forward to the mapped upstream URL.

### Mode 2 — Cookie → Bearer translation (fallback if upstream stops reading cookies)
1. Read the **`access_token`** cookie from the request.
2. **If missing** → respond `401 {"detail":"Not authenticated"}` locally; do NOT forward.
3. **If present** → inject header `Authorization: Bearer <access_token>` upstream.
4. **Drop the original `Cookie` header** before forwarding (do not leak other cookies upstream).
5. Forward to the mapped upstream URL.

Either mode produces an equivalent outcome; Mode 1 avoids parsing/injecting headers.

---

## 4. Implementation options

### Option A — nginx (if web host is fronted by nginx)
```nginx
# Map cookie to a bearer header; cookie passthrough is also valid (backend reads cookie).
map $cookie_access_token $chat_bearer {
    ""      "";
    default "Bearer $cookie_access_token";
}

location /chat-api/ {
    # no cookie -> 401 without touching upstream
    if ($chat_bearer = "") {
        return 401;
    }
    # Mode 2 (translate): uncomment Authorization + drop Cookie.
    proxy_set_header Authorization "$chat_bearer";
    proxy_set_header Cookie "";
    # Mode 1 (passthrough): keep Cookie, drop the two lines above.
    proxy_pass https://chat.wisdomtooth.tech/api/v1/;
    proxy_set_header Host chat.wisdomtooth.tech;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass_request_headers on;
}
```

### Option B — AWS API Gateway (host already uses it — `apigw-requestid` present)
- Add a resource `/chat-api/{proxy+}` with `ANY` method.
- Integration: HTTP proxy to `https://chat.wisdomtooth.tech/api/v1/{proxy}`.
- **Passthrough** (preferred): forward the `Cookie` header as-is — the backend
  reads `access_token` from it. Return `401` from a lightweight Lambda authorizer
  when the cookie is absent.
- **Translate** (fallback): an Integration Request VTL mapping that reads
  `input.params('Cookie')`, parses `access_token=...`, and sets
  `Authorization: Bearer <token>`; drop the `Cookie` header upstream.
- (Note: injecting a custom header upstream requires `AllowHeaders`/CORS to permit
  it, or use VTL mapping — verify in your stage config. Passthrough avoids this.)

### Option C — Small reverse-proxy service (if neither fits)
A minimal FastAPI/Express route at `/chat-api/*` that reads the cookie, 401s if absent,
forwards via HTTP with the `Cookie` header (Mode 1) or an injected Bearer (Mode 2).
Deploy alongside the app.

---

## 5. Socket.IO (verify with chat team)

Chat also exposes Socket.IO (real-time). Socket clients authenticate via the
**chat-scoped token** (`token_use:"chat"`), not the raw Web token. The REST gateway
above does NOT cover socket auth.

Two paths to close:
- **(a)** Also proxy `/api/socket.io` (or `wss://`) with the same cookie auth
  (the backend reads the `access_token` cookie for Socket.IO handshakes) IF the
  socket handshake accepts the raw Web token; OR
- **(b)** keep using the existing `POST /api/v1/auth/chat-token` endpoint
  (cookie→5-min chat token) purely for socket auth, while the REST gateway handles
  all chat REST calls.

Recommend **(b)** for sockets — it is already built, tested, and scoped.

---

## 6. Frontend change (required once gateway is live)

Point chat REST calls at the same-origin gateway path. In the deployed web app's
chat client config, replace the chat base URL:

```
was:  https://chat.wisdomtooth.tech/api/v1
now:  /chat-api
```

i.e. requests go to `https://app.invigor8.app/chat-api/conversations/...` — the
gateway forwards the cookie (or injects Bearer). All existing `Authorization: Bearer <chat-token>`
calls keep working because the backend accepts both auth forms.

---

## 7. Acceptance tests

| # | Test | Expected |
|---|---|---|
| 1 | `GET /chat-api/conversations/provider` (no cookie) | `401` |
| 2 | `GET /chat-api/conversations/provider` (valid cookie) | `200`, provider inbox |
| 3 | `GET /chat-api/conversations/` (valid cookie) | `200` |
| 4 | Expired/invalid cookie | `401` (upstream passthrough) |
| 5 | Non-GET methods (`POST /chat-api/messages`) | works, body preserved |
| 6 | Mode 1 (passthrough): `Cookie` header present upstream | forwarded as-is |
| 6b | Mode 2 (translate): `Cookie` header absent upstream, `Authorization: Bearer <token>` present | expected |

Test #6 depends on which mode (see §3) DevOps implements; #6 is for Mode 1,
#6b is for Mode 2.

---

## 8. Notes / decisions for DevOps

- Web host responses carry `apigw-requestid` **and** `X-Powered-By: Next.js`, so the
  gateway lives between the edge and the Next.js app OR is implemented as a Next.js
  rewrite with cookie passthrough (Node/`middleware.ts` can read cookies and forward
  the header before `fetch`). A **Next.js `rewrites()` + `middleware.ts`**
  implementation is the least-infrastructure option and keeps everything in one app.
- Mode 1 (preferred): forward the `Cookie` header upstream unchanged — the backend
  reads `access_token` from it. Mode 2: drop `Cookie`, inject `Authorization: Bearer <token>`.
  Pick one mode for all routes; do not mix.
- Keep the chat token short-lived; no change needed to the 5-min `chat-token` flow.
