# ADR-003: Enterprise Payments page pagination exception

- Status: Accepted as a narrowly scoped, time-boxed endpoint exception
- Date: 2026-11-02
- Review target: 2026-11-30
- Owners: To be assigned
- Review triggers: Backend publishes and deploys a documented cursor-pagination contract for Payments.

## Context

The deployed Payments collection used by Super Admin and Enterprise Admin accepts `page` and `page_size`. The shared Commerce package already models these parameters and the paginated response. The deployed endpoint does not currently provide a cursor continuation contract.

The Invigorate Health Coding Standards Handbook V5.0 §3 requires cursor-based pagination for collection endpoints. Adding `cursor`, `limit`, or continuation metadata in the frontend without backend support would be an undocumented and incompatible request.

## Decision

The Enterprise Admin Payments List will use the existing deployed `page` / `page_size` contract through its authenticated, read-only Enterprise Commerce BFF. The implementation will preserve backend totals and monetary strings and will not derive financial data locally.

This exception applies only to the Enterprise Admin Payments List (`GET /api/v1/payments`). It does not change the handbook or establish page-based pagination as the default for any other endpoint or application.

## Expiration and migration

Review this exception no later than 2026-11-30. It expires earlier when the backend introduces and deploys a documented cursor-pagination contract for Payments. At that point, coordinate the frontend migration to the deployed contract. Do not extend this exception to another endpoint without a separate decision.

## References

- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx` — §3 API pagination rule.
- `packages/features/commerce/src/payments.types.ts` — shared Payments page parameters and response model.
- `packages/features/commerce/src/payments.service.ts` — shared Payments list service.
