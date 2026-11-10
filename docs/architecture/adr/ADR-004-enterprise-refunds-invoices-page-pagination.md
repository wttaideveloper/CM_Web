# ADR-004: Enterprise Refunds and Invoices page-pagination exception

- Status: Accepted as a narrowly scoped, time-boxed endpoint exception
- Date: 2026-11-03
- Review target: 2026-11-30
- Owners: To be assigned
- Review triggers: Backend publishes and deploys documented cursor-pagination contracts for Refunds and Invoices.

## Context

The Commerce backend and shared Commerce services use `page` and `page_size` for the Refunds and Invoices collections. The repository handbook V5.0 §3 requires cursor pagination for collection endpoints. Sending cursor parameters without a deployed backend contract would be incompatible and unsupported.

The approved integration decision permits Enterprise Admin to read only its own business's refunds and invoices. The Enterprise BFF omits `tenant_id` and relies on backend authorization for business scoping.

## Decision

The Enterprise Admin Refunds and Invoices lists will use the existing backend `page` / `page_size` contract through the authenticated Enterprise Commerce BFF. This exception applies only to:

- `GET /api/v1/refunds`
- `GET /api/v1/invoices`

It does not apply to detail, template, PDF, or any other endpoint. The UI preserves backend totals and monetary decimal strings and performs no financial calculations.

## Expiration and migration

Review this exception no later than 2026-11-30. It expires earlier when the backend publishes and deploys documented cursor-pagination contracts for both collections. Coordinate migration to the deployed contract at that time. Do not extend this exception to another endpoint or application without a separate decision.

## References

- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx` — §3 API pagination rule.
- `packages/features/commerce/src/refunds-invoices.types.ts` — shared collection parameters and response models.
- `packages/features/commerce/src/refunds-invoices.service.ts` — shared read-only services.
