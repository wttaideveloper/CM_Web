import assert from "node:assert/strict";
import test from "node:test";

import { getSafePlatformAdminReturnUrl } from "./cross-app.ts";

test("platform return URLs preserve Blog approval deep links", () => {
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/blog-approval-queue?post_id=blog-post-1"),
    "http://localhost:3002/blog-approval-queue?post_id=blog-post-1",
  );
});

test("platform return URLs preserve safe Commerce filters", () => {
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/commerce/transactions?status=succeeded&page=2"),
    "http://localhost:3002/commerce/transactions?status=succeeded&page=2",
  );
});

test("platform return URLs reject unapproved query data", () => {
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/commerce/transactions?access_token=secret"),
    null,
  );
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/commerce/transactions?search=customer-name"),
    null,
  );
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/commerce/transactions?status=arbitrary-value"),
    null,
  );
  assert.equal(
    getSafePlatformAdminReturnUrl("http://localhost:3002/blog-approval-queue?post_id=post-1&post_id=post-2"),
    null,
  );
});

test("platform return URLs continue rejecting unsafe origins, paths and fragments", () => {
  assert.equal(getSafePlatformAdminReturnUrl("https://attacker.example/commerce"), null);
  assert.equal(getSafePlatformAdminReturnUrl("http://localhost:3002/commerce-elsewhere"), null);
  assert.equal(getSafePlatformAdminReturnUrl("http://localhost:3002/commerce#section"), null);
});
