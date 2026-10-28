# ADR-002: Group Audit Trail page pagination exception

- Status: Accepted as a time-boxed endpoint exception
- Date: 2026-10-25
- Review target: 2027-01-23
- Owners: To be assigned
- Review triggers: Backend introduces cursor support for the endpoint or the next API contract revision.

## Context

The Group Chat Audit Trail is exposed by the deployed endpoint:

`GET /api/v1/groups/{group_id}/audit`

The confirmed Swagger contract accepts `page` (integer >= 1) and `page_size` (integer 1–200), and returns `{ items, total }`. The endpoint does not expose a cursor, `limit`, `meta.next_cursor`, or `meta.has_more` contract.

The Engineering Coding Standards Handbook V5.0 §3 prefers cursor-based pagination for collection endpoints. The frontend cannot add cursor pagination without backend support because it would require an undocumented request parameter and an authoritative continuation token that the API does not provide.

## Decision

Implement the Group Chat Audit Trail using the deployed page-based contract exactly as documented: `page` and `page_size`, with a maximum page size of 200 and a response total supplied by the backend.

This exception is limited to `GET /api/v1/groups/{group_id}/audit`. It does not change the handbook, establish a general page-pagination policy, or authorize page pagination for other endpoints.

There is no automatic migration. A future migration requires backend cursor support and a revised API contract first.

## Review

Review this exception on 2027-01-23, or earlier if the backend introduces cursor support or publishes the next API contract revision. At review, either retain the exception with current evidence or plan a coordinated backend/frontend migration.

## References

- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx` — §3 API pagination rule.
- `packages/features/messaging/src/group-chat/group-chat.service.ts` — authenticated Group Chat transport.
- `packages/features/messaging/src/EnterpriseGroupAuditTrailScreen.tsx` — endpoint consumer.
