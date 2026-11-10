# ADR-006: Enterprise Financial Report Pagination Exception

- Status: Accepted
- Date: 2026-11-03
- Scope owner: Enterprise Admin Finance
- Review deadline: 2026-11-30, or earlier if cursor pagination is deployed

## Context

The handbook requires cursor pagination for collection APIs. The existing shared Commerce report parameter and response contracts use `page` / `page_size` for Payment, Refund and Settlement reports. Sending cursor parameters without a deployed cursor contract would be incompatible. Currency and Tax reports do not expose pagination fields in their shared request contracts.

## Decision

Use the existing page-based contract only for these Enterprise Admin report resources:

- `GET /api/v1/payment-reports/payments`
- `GET /api/v1/payment-reports/refunds`
- `GET /api/v1/payment-reports/settlements`

This exception does not cover Currency or Tax reports, other report endpoints, or any other API. The BFF omits `tenant_id`; the backend derives merchant scope from the authenticated Enterprise session.

## Expiration and migration trigger

Review no later than 30 November 2026, or earlier if the backend publishes and deploys documented cursor-pagination contracts for these report endpoints. Migrate those endpoints when available. No other API is included without a separate decision.

## References

- `docs/standards/Invigorate_Health_Coding_Standards_Handbook_V5.0.docx`, pagination standard (§3)
- `packages/features/commerce/src/settlements-reports.types.ts`
- `packages/features/commerce/src/reports.service.ts`
