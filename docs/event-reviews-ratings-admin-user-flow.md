# Web Admin Reviews & Ratings Flow

## Scope and evidence

This document covers the IHP web repository only. Mobile code was not inspected or modified. Trainings are out of scope.

The repository contains no dedicated Reviews & Ratings feature, review/rating client, or pending-review endpoint. Existing `review` matches belong to Event approval/revision or unrelated application-review flows. The attached Reviews & Ratings API guide was not present inside this web repository, so a field-by-field comparison against that guide remains unresolved until the guide is made available in the repository or supplied in an accessible form. The findings below are based on the web implementation and its referenced API paths; they do not assume that an undocumented pending-review endpoint exists.

Relevant evidence inspected:

- Navigation: `packages/enterprise-layout/src/enterprise-navigation.ts`, `packages/platform-layout/src/platform-navigation.ts`.
- Route ownership: `apps/shell/src/routing/route-ownership.ts`.
- Enterprise Event UI/API: `packages/features/enterprise-events/src/EnterpriseEventsScreen.tsx`, `EventDetailsScreen.tsx`, and `events.service.ts`.
- Super Admin Event moderation: `packages/features/platform-configuration/src/PlatformApprovalQueueScreen.tsx`, `event-approval-queries.tsx`, `event-approval.service.ts`.
- Super Admin Event BFF: `apps/platform-admin/src/app/api/platform-super-admin/events/`.
- Authentication and role data: `packages/auth/src/types.ts`, `capabilities.ts`, and the Enterprise/Super Admin route guards.

## Current simple admin flow

### Enterprise Admin

1. Sign in through the authenticated Shell session and open **My Events** at `/admin/events`.
2. Select an Event to open `/admin/events/{eventId}`.
3. Use **Feedback** to view submitted Event feedback. The current view is read-only.
4. Use the existing Event edit/resubmit controls when the Event lifecycle permits it.

This is an Event feedback flow, not a customer review or rating moderation flow.

### Super Admin

1. Sign in to the Platform Admin session.
2. Open **Approval Queue** at `/approval-queue`.
3. Select the **Events** tab and choose **Pending Approval**, **Requested Changes**, or **Approved**.
4. Select an Event and use the read-only review panel.
5. Approve, request changes, or reject through the existing Event approval actions; inspect backend audit history when needed.

This is Event submission moderation, not Reviews & Ratings moderation. There is currently no step for listing, opening, approving, rejecting, hiding, or restoring user reviews or ratings.

## Screen-by-screen flow

| Screen | Route | Existing behavior | Reviews & Ratings status |
|---|---|---|---|
| Enterprise Admin shell | `/admin/*` | `EnterpriseAdminAuthGuard` requires the authenticated tenant session; the backend remains authoritative for tenant ownership and permissions. | No Reviews & Ratings entry in navigation. |
| Enterprise Event list | `/admin/events` | Lists the authenticated enterprise's Events with search, lifecycle/time filters, pagination, and links to Event details. | No review/rating counts, filters, or moderation state. |
| Enterprise Event detail | `/admin/events/{eventId}` | Loads the Event by ID and exposes Overview, Details, Sessions, Registrations, Attendance, Feedback, Reports, Orders, and Fulfilment as applicable to the Event status/modules. | The **Feedback** tab is the only relevant surface; it is not a review/rating UI. |
| Event Feedback tab | `/admin/events/{eventId}` with the Feedback tab selected | Calls `getEventFeedback(eventId)` and renders the response read-only. It has loading, retryable error, empty, and JSON/text display states. | Uses `/api/v1/events/{eventId}/feedback`; no typed review/rating model or moderation actions. |
| Super Admin shell | Platform routes such as `/dashboard` and `/approval-queue` | `PlatformAdminShell` is paired with a dedicated Super Admin session/BFF. | No Reviews & Ratings navigation entry. |
| Event approval queue | `/approval-queue` | Events are listed by status: `pending_approval`, `needs_revision`, or `approved`; the selected Event opens an inline review panel. | Moderates Event publication/submission state only. |
| Event approval review panel | Inline on `/approval-queue` | Loads the Event dossier, can approve, request changes, reject, and show backend audit history. | No user review/rating content or review moderation state. |
| Published Event catalogue | `/events` | Super Admin can browse published Events across enterprises with search and temporal filters. Cards are read-only and have no Event detail route. | No review/rating surface. |

Existing related item list/detail routes are:

- Enterprise Admin: `/admin/products` and `/admin/products/{id}`, `/admin/services` and `/admin/services/{id}`, `/admin/events` and `/admin/events/{eventId}`.
- Super Admin: `/products`, `/services`, and `/events` are catalogue/list routes. Event approval detail is an inline panel on `/approval-queue`; the BFF has an API detail route at `/api/platform-super-admin/events/{eventId}`, but there is no matching browser page route.

## Role permissions by module

These are the permissions exposed by the current web flow. API authorization is authoritative; navigation visibility is not a security boundary.

| Module | Enterprise Admin | Super Admin |
|---|---|---|
| Events | Tenant-scoped list, create, edit, detail, operational management, feedback read, and lifecycle actions permitted by the backend. Internal provider users are restricted by the existing listing guard where applicable. | Cross-enterprise Event catalogue; approval queue; Event detail review; approve, request changes, reject, and audit history through the Platform BFF. |
| Products / Services | Enterprise list/detail/create/edit surfaces. `internal_user` is treated as read-only by the existing UI guards. | Platform catalogue/list administration surfaces exist. |
| Event feedback | Read-only on the Event detail Feedback tab. | No dedicated feedback/review screen found. |
| Reviews & Ratings | No UI or permission model found. | No UI or permission model found. |
| Review moderation | Not implemented. | Not implemented. |

The auth model contains `tenantRole`, `tenantRbacRoles`, `tenantPermissions`, and `userRole` for tenant users. Super Admin identity is separately represented by `isSuperAdmin` and uses the Platform Admin server-side session. No review-specific permission name was found.

## API mapping

### Existing Event APIs

| UI operation | Browser request | Upstream behavior / purpose |
|---|---|---|
| Enterprise Event list | `GET /api/v1/events/?...` | Tenant-authenticated Event collection; filters include enterprise/tenant, status, search, and pagination. |
| Enterprise Event detail | `GET /api/v1/events/{eventId}` | Loads the authenticated Event resource. |
| Event feedback | `GET /api/v1/events/{eventId}/feedback` | Loads submitted Event feedback. The client intentionally models the response as `unknown` because the documented response schema is empty/unspecified. |
| Event admin note | `GET /api/v1/events/{eventId}/admin-notes` | Loads the latest Platform review note shown for `needs_revision` or `rejected`; this is workflow feedback, not a user rating. |
| Super Admin approval list | `GET /api/platform-super-admin/events?status=...&page=...&page_size=20&search=...` | Platform BFF forwards the allow-listed query to upstream `GET /api/v1/events/` using server-side Super Admin auth. |
| Super Admin Event dossier | `GET /api/platform-super-admin/events/{eventId}` | BFF reads upstream `GET /api/v1/events/{eventId}`. |
| Approve | `PATCH /api/platform-super-admin/events/{eventId}/status` | BFF forwards `PATCH /api/v1/events/{eventId}/status` with `{ "status": "approved" }`. |
| Request changes | `POST /api/platform-super-admin/events/{eventId}/request-changes` | BFF forwards `POST /api/v1/admin/events/{eventId}/request-changes`. |
| Reject | `POST /api/platform-super-admin/events/{eventId}/reject` | BFF forwards `POST /api/v1/admin/events/{eventId}/reject`. |
| Approval history | `GET /api/platform-super-admin/events/{eventId}/audit` | BFF reads upstream `GET /api/v1/admin/event-audits/{eventId}`. |

### Reviews & Ratings API mapping

No web client or route was found for any of the following operations:

- list pending reviews;
- list reviews for an Event, Product, or Service;
- read a review/rating detail;
- approve, reject, hide, restore, or otherwise moderate a review;
- retrieve rating aggregates or review counts;
- record a moderation reason or audit history.

The existing Event feedback request must not be treated as a pending-review endpoint. Its response is untyped and is rendered as submitted feedback only.

## Loading, empty, error, and moderation states

### States implemented today

- Event lists use React Query loading states, retryable load errors, empty search/filter results, and pagination.
- Event Feedback shows a loading skeleton, `No feedback submitted yet`, a retryable `Unable to load event feedback` error, and a read-only response view.
- Super Admin Event approval has loading skeletons, retryable list/detail/history errors, status-specific empty copy, and decision dialogs for approve, request changes, and reject.
- Approval statuses represented in the web UI are `pending_approval`, `needs_revision`, `approved`, and `rejected` where returned by the Event API. Audit history records status transitions and notes.

### States required for a future Reviews & Ratings flow

The API guide and backend contract must define the canonical values and transitions before implementation. At minimum, the web flow needs explicit states for:

- pending moderation;
- approved/published;
- rejected or declined, including reason visibility;
- hidden/removed and restorable, if supported;
- reported/flagged, if supported;
- loading, empty, authorization failure, validation failure, rate limit, and retryable server failure;
- pagination/cursor behavior and stale-update/concurrency handling.

These states are not currently represented by the Event Feedback or Event Approval components.

## Backend gaps and unresolved decisions

1. **Guide availability:** the referenced Reviews & Ratings API guide is not present in the web repository, so endpoint names, schemas, roles, status values, pagination, and mutation semantics cannot be confirmed from repository evidence.
2. **Pending-review endpoint:** no pending-review endpoint was found. Backend ownership must provide and document one before a pending-review admin queue can be implemented.
3. **Review resource model:** the repository has no typed review/rating resource, author/subject relationship, rating scale, moderation reason, or audit model.
4. **Event review versus feedback:** product decisions must define whether Event feedback is a free-form post-event response, a review with a star/score, or both. The current web code treats it only as submitted feedback and does not expose a rating.
5. **Scope and tenancy:** the backend must specify whether Enterprise Admins can see only feedback/reviews for their own Events and whether Super Admins can moderate across all enterprises.
6. **Moderation authorization:** review-specific roles/permissions are absent from the web role model. Backend permissions and the guide must define who may approve, reject, hide, restore, or edit moderation decisions.
7. **Event detail coverage:** Super Admin has an Event approval dossier and published catalogue, but no standalone Event detail page route. A review-management design must choose whether moderation lives in `/approval-queue`, a new Event detail route, or a dedicated Reviews & Ratings route.
8. **Data access and privacy:** the backend must define whether reviewer identity, free-text content, attachments, and ratings are PII/PHI-sensitive and which fields may be displayed to each admin role.

## Conclusion

The current web repository supports Event submission approval and read-only Event feedback. It does not support Reviews & Ratings administration, and there is no evidence of a pending-review API endpoint. The next implementation step is blocked on the authoritative API guide/backend contract, especially the review list endpoint, review schema, moderation transitions, and role permissions.
