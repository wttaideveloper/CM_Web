# Event Discussions API Specification & Frontend Integration Contract

**Base URL**: `https://chat.wisdomtooth.tech/api/v1`  
**Socket.IO URL**: `wss://chat.wisdomtooth.tech/api/socket.io`

---

## 1. Endpoints & Route Definitions

| Capability | Method | Endpoint Path | Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| **Access Gating** | `GET` | `/events/{event_id}/discussion/access` | None. Returns `{ can_read, can_post, role, locked_reason, message }` |
| **List Discussions** | `GET` | `/events/{event_id}/discussion/messages` | `?order=newest\|oldest`, `?parent_id=`, `?page=1`, `?page_size=20` |
| **My Messages** | `GET` | `/events/{event_id}/discussion/messages/mine` | `?status=published\|pending_review\|blocked`, pagination |
| **Post Root / Reply**| `POST` | `/events/{event_id}/discussion/messages` | Body: `{ body: string, parent_id?: string \| null, is_announcement?: boolean }` |
| **Thread Details** | `GET` | `/events/{event_id}/discussion/messages/{message_id}` | Returns message with threaded `replies: []` (marks replies read) |
| **Edit Blocked** | `PUT` | `/events/{event_id}/discussion/messages/{message_id}` | Body: `{ body: string }` (author only, while blocked/pending_moderation) |
| **Appeal Blocked** | `POST` | `/events/{event_id}/discussion/messages/{message_id}/appeal` | Body: `{ reason?: string }` (moves blocked -> pending_review) |
| **Admin Queue** | `GET` | `/events/{event_id}/discussion/moderation/queue` | `?status=pending_review` (Enterprise Admin only) |
| **Moderate Message**| `POST` | `/events/{event_id}/discussion/messages/{message_id}/decision` | Body: `{ action: "approve" \| "delete", note?: string }` |
| **Audit History** | `GET` | `/events/{event_id}/discussion/moderation/history` | Enterprise Admin: full history. Super Admin: read-only |
| **Cross-Event Queue**| `GET`| `/event-discussions/flagged` | `?event_id=`, `?tenant_id=`, `?status=` |
| **Cross-Event Stats**| `GET`| `/event-discussions/activity` | `?tenant_id=` |

---

## 2. Access Gating & Locked States

Before rendering the Discussion tab or Composer, query:
`GET /api/v1/events/{event_id}/discussion/access`

```json
{
  "can_read": true,
  "can_post": true,
  "role": "registered_participant",
  "locked_reason": null,
  "message": null
}
```

### Locked Reasons
- `NOT_REGISTERED`: Attendee has not registered for this event. Lock Discussion tab or show registration prompt.
- `REGISTRATION_CANCELLED`: Registration was refunded or cancelled. Lock posting and viewing.
- `NOT_EVENT_ADMIN`: Admin moderation or announcement privileges denied.
- `NOT_SIGNED_IN`: Anonymous session. Prompt to authenticate.
- **Event Closed**: Closed events block new posts (`can_post = false, can_read = true`).

---

## 3. Post & Moderation Response Lifecycle

Discussion posting uses a 3-tier pre-publishing moderation architecture. Moderation never returns an HTTP error for content (FastAPI `422` is reserved only for validation errors such as missing `body` or empty text).

| HTTP Status | `message.moderation_status` | Behavior | UI Presentation |
| :--- | :--- | :--- | :--- |
| `201 Created` | `"published"` | Message is safe | Appears immediately in discussion feed |
| `201 Created` | `"pending_review"` | AI flagged violation | Sender sees card marked **Pending Review** with `user_message`. Hidden from other attendees until admin approves |
| `201 Created` | `"blocked"` | Extreme policy violation | Message blocked. Author can edit in-place (`PUT .../messages/{id}`) or appeal (`POST .../appeal`) |
| `201 Created` | `"pending_moderation"` | AI service unavailable | Message unpublished until checked |
| `404 Not Found` | `MESSAGE_UNAVAILABLE` | Deleted message | Display deleted/unavailable tombstone |

---

## 4. Super Admin Oversight

- **Access Level**: Super Admin has read-only access to discussion content, moderation queue, and audit history across all enterprise events.
- **Enforcement**: Any mutation call (`/decision`, `approve`, `delete`) by a Super Admin returns `403 Forbidden` with error code `SUPER_ADMIN_READ_ONLY`.

---

## 5. Real-Time Socket.IO & Push Notifications

Discussion real-time delivery uses the platform's consolidated notification feed:

- **Socket Event**: `notification`
- **Notification Types**:
  - `event_discussion_reply`: Sent to thread participants when a reply is posted.
  - `event_discussion_announcement`: Sent to all registered attendees for official organizer announcements.
  - `event_discussion_flagged`: Sent to Enterprise Admins when an AI flag requires manual review.
  - `event_discussion_pending_review`: Sent to author acknowledging pending review status.
  - `event_discussion_message_approved`: Sent to author when admin approves flagged message.
  - `event_discussion_message_deleted`: Sent when admin deletes a message.
  - `event_discussion_unread_reply`: Server-driven nudge after 12h unread reply.
- **Payload Deep Links**: Each notification carries a `deep_link` directing the user to `/admin/events/{event_id}?tab=discussions&thread={message_id}` or `&subview=moderation`.
