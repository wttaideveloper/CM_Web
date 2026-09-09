# Trainings API — Complete Backend Handoff

**Date:** 2026-09-06
**From:** Frontend team
**To:** Backend team
**Subject:** Trainings module — all API gaps discovered during frontend build + testing

---

## 🔴 CRITICAL (Blocks functionality)

### 1. `POST /trainings/` — 500 when `status` is in the create body

The `TrainingCreate` schema declares `status` (default `"draft"`), but sending `status: "pending_approval"` in the create body triggers an **HTTP 500**.

**Frontend workaround:** create as draft → `PATCH /trainings/{id}/status` to `pending_approval` (two requests instead of one).

**Ask:** Either accept non-draft status at create time, or remove `status` from `TrainingCreate` in the spec.

---

### 2. `POST /trainings/{id}/discussions` — 400 Bad Request (no error detail)

The discussion POST returns **400** when the user has no active enrolment. The response body has no useful error message — just `"Bad Request"`.

**Confirmed behavior:** Active enrolment is required to post discussions. This is expected.

**Impact:** The error message is not descriptive. Users see a generic error.

**Ask:** Return a descriptive error message (e.g., `"Active enrolment required to post discussions"`) instead of a generic 400.

---

### 3. `POST /trainings/{id}/live-sessions/{sid}/attendance` — 403 Forbidden

Enterprise owner can create live sessions and discussions, but **cannot mark attendance**. The backend returns **403 Forbidden** with "Active enrolment required".

**Confirmed:** 
- Enrolled a user (john@gmail.com) via `POST /trainings/{id}/enrol` → status shows "Enrolled"
- When marking attendance with the same email (john@gmail.com) → still 403
- The backend's "active enrolment" check doesn't recognize the enrolment we just created

**Impact:** Attendance tracking is completely broken for enterprise owners.

**Ask:** Either:
- Fix the "active enrolment" check to recognize enrolments created via the enrol endpoint, OR
- Grant enterprise owners permission to mark attendance for their own training sessions, OR
- Document which role/status is required so the frontend can show/hide the button conditionally

---

## 🟡 MEDIUM (Degrades UX)

### 4. No request-changes / send-back endpoint for trainings

Events have a request-changes flow; trainings only have approve, reject, and publish.

The platform approval queue has a **"Requested Changes"** tab that filters by `status=needs_revision`, but there's no admin endpoint to set that status with a reason.

**Ask:** Add `POST /admin/trainings/{id}/request-changes` (accepting a body with `reason`) that sets `status: "needs_revision"` — mirroring the events flow.

---

### 5. `GET /trainings/{id}` — 401 for admin/super-admin sessions

The training detail endpoint returns **401** under the super-admin (Keycloak) session.

This forces the approval review dossier to fall back to list-item data (title, category, delivery_mode, status) rather than the richer detail response (description, phases, pricing, ownership).

**Ask:** Open `GET /trainings/{id}` to admin-role sessions, or document the permission scope.

---

### 6. `GET /trainings/{id}/assignments` — 405 Method Not Allowed

The backend returns **405** for `GET /trainings/{id}/assignments`. Only `POST` (create) is supported.

**Impact:** Assignments can be created but not listed or deleted in the UI.

**Ask:** Add `GET /trainings/{id}/assignments` to return the list of assignments.

---

### 7. `GET /trainings/{id}/certificate` — 422 Unprocessable Entity

The certificate endpoint requires `participant_email` as a query param, but the frontend was calling it without it (now fixed on our side).

**Frontend fix:** Updated to pass `participant_email` query param.

**Note:** This endpoint is per-participant, not per-training. The admin UI doesn't know which participant's certificate to fetch — so the button is hidden in admin view.

**Ask:** Confirm whether there's a way for an admin to list all certificates for a training, or if this is purely a learner-facing endpoint.

---

## 🟢 LOW (Documentation / Cleanup)

### 8. Admin endpoint schemas undocumented

The following admin routes have no documented request/response schemas:

| Endpoint | Status |
|---|---|
| `GET /admin/trainings/pending` | No response schema |
| `POST /admin/trainings/{id}/approve` | No body, no response schema |
| `POST /admin/trainings/{id}/reject` | Untyped body (`additionalProperties: true`) |
| `POST /admin/trainings/{id}/publish` | No body, no response schema |

**Ask:** Document schemas for all four admin endpoints. Specifically, confirm whether `reject` accepts and persists a `reason` field.

---

### 9. Missing CRUD endpoints for assignments

| Missing Endpoint | Purpose |
|---|---|
| `GET /trainings/{id}/assignments` | List assignments |
| `DELETE /trainings/{id}/assignments/{aid}` | Delete assignment |
| `GET /trainings/{id}/assignments/{aid}` | Get single assignment |
| `PUT /trainings/{id}/assignments/{aid}` | Update assignment |

**Ask:** Add at minimum `GET` (list) and `DELETE` for assignments — same pattern as assessments.

---

### 10. `POST /trainings/{id}/discussions` — undocumented status restriction

The 400 suggests discussions only work on published trainings with active enrolments, but this is not documented anywhere in the spec.

**Ask:** Document the business rules for when discussions can be created (training status, user role, enrolment requirement).

---

## Summary

| # | Gap | HTTP | Impact | Effort |
|---|---|---|---|---|
| 1 | Create-with-status 500 | 500 | Can't submit in one click | Low |
| 2 | Discussion create 400 (no detail) | 400 | Unclear error when no enrolment | Low |
| 3 | Attendance mark 403 | 403 | Attendance tracking broken (enrolment check bug) | Low |
| 4 | No request-changes endpoint | — | Admins can't send back for edits | Low |
| 5 | Admin detail 401 | 401 | Approval dossier is surface-level | Low |
| 6 | Assignments GET 405 | 405 | Can't list assignments | Low |
| 7 | Certificate 422 (fixed on frontend) | 422 | ~~Broken~~ ✅ Fixed | — |
| 8 | Undocumented admin schemas | — | Frontend guesses at request shapes | Low |
| 9 | Missing assignment CRUD | — | No list/delete/update | Low |
| 10 | Discussion status restriction undocumented | — | Frontend guesses business rules | Low |

**Top 3 to fix first:** #3 (attendance 403), #2 (discussion 400), #1 (create 500)
