---
name: skill-stripe-integration
description: Integrate Stripe Checkout, Billing, subscriptions, Customer Portal, invoices, trials, coupons, webhook handling, entitlement sync, and SaaS payment state management.
category: payments
risk: medium
source: official-docs-plus-local-saas-patterns
last_verified: 2026-08-06
---

# skill-stripe-integration

## Workflow

1. Inspect existing backend boundaries, env naming, Stripe SDK usage, price/product mapping, subscription tables, and entitlement tables.
2. Keep Stripe secret keys and webhook secrets in server-only code. Browser code may only receive publishable keys and backend-created session/portal URLs.
3. Create Checkout or Portal sessions on the backend with authenticated actor context and stable metadata.
4. Verify webhook signatures with the raw request body before parsing business data.
5. Deduplicate events by Stripe event ID and store relevant Stripe IDs for support: customer, checkout session, subscription, invoice, payment intent, price, and product.
6. Sync product access from backend subscription/payment state and local entitlement policy, not from the success redirect alone.
7. Validate with Stripe test mode, CLI/webhook events, and the project build/typecheck.

## Guardrails

1. Use official Stripe libraries for webhook signature verification.
2. Configure the framework route so the webhook endpoint receives the raw body.
3. Listen only to required event types.
4. Return a 2xx quickly; move heavy processing to a queue/job when possible.
5. Re-fetch critical Stripe objects when event ordering or stale local state matters.
6. Keep plan and entitlement rules in local product tables; Stripe prices/products are billing evidence, not the whole access model.
7. Never log secret keys, webhook secrets, complete card/payment details, or unnecessary PII.

## API Versioning

- Pin the Stripe API version in the server SDK/client or endpoint configuration instead of relying silently on the account default.
- The current Stripe API version at verification time is `2026-02-25.clover`; treat this as a maintenance reference, not a reason to upgrade production automatically.
- Review the Stripe changelog and run a test-mode webhook migration before adopting a new breaking release. Monthly releases within a major release are designed to be backward-compatible, but twice-yearly major releases can require code changes.

## Typical SaaS Events

- `checkout.session.completed`: first checkout completion and customer/subscription linking.
- `invoice.paid`: renewal succeeded; extend access.
- `invoice.payment_failed`: mark past due or start grace policy.
- `customer.subscription.updated`: sync status, period, cancellation flags, price changes.
- `customer.subscription.deleted`: revoke or expire access according to policy.

## Data Contract

- Map internal plans to Stripe price IDs per environment.
- Store Stripe IDs on server records, not as frontend-only state.
- Track subscription status, current period, cancellation flags, trial dates, grace policy, and last sync timestamp.
- Add audit logs for plan changes, portal cancellations, payment failures, refunds, and admin overrides.

## Verification

- Use Stripe test mode and CLI/webhook test events.
- Confirm webhook route is HTTPS in production.
- Confirm live mode uses live price IDs, live keys, and live webhook endpoint secret.
- Check dashboard event deliveries before assuming frontend checkout failed.
- Verify duplicate events do not duplicate payments, extend access twice, or create duplicate audit rows.
- Verify the webhook endpoint's configured API version matches the SDK's event types and deserialization expectations.

## Official References

- https://docs.stripe.com/api/versioning
- https://docs.stripe.com/webhooks/versioning
- https://docs.stripe.com/webhooks/signature
