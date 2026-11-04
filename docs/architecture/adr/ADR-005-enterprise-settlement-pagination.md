# ADR-005: Enterprise Settlement List Pagination Exception

- Status: Accepted
- Date: 2026-11-03
- Scope owner: Enterprise Admin Finance
- Review deadline: 2026-11-30, or earlier if cursor pagination is deployed

## Context

The repository coding standards handbook requires cursor-based pagination for collection APIs. The existing Commerce settlement list contract and shared client use `page` and `page_size`; the settlement response type also carries an authoritative `total` and optional page metadata. Replacing this in the Enterprise client with cursor parameters unsupported by the current API would make the list incompatible.

## Decision

For the Enterprise Admin Settlements List only, `GET /api/v1/settlements` may use the documented existing `page` / `page_size` contract. This is a narrowly scoped exception. It does not apply to settlement details, configuration, verification, export, or any other endpoint.

The Enterprise BFF rejects browser-supplied tenant selection and forwards only the authenticated merchant session, so the backend remains responsible for tenant scoping.

## Expiration and migration trigger

Review this exception no later than 30 November 2026, or earlier if the backend deploys a documented and deployed cursor-pagination contract. At that point, migrate the Enterprise list to cursor pagination and remove this exception. No extension to other APIs is approved without a separate decision.

## References

- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx`, pagination standard (§3)
- `packages/features/commerce/src/settlements-reports.types.ts`
- `packages/features/commerce/src/settlements.service.ts`
