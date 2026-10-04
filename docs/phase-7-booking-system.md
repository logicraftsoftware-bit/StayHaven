# Phase 7 transactional marketplace audit

Status: **in progress**, not production-signed-off. This document describes the current repository, not a claim that every Phase 7 requirement is complete. Existing Phase 1–6 functionality must remain intact.

## Architecture and current collections

One Next.js frontend, one NestJS API, and one MongoDB database serve multiple hostname-resolved marketplace sites. Customer and owner identities are global. Existing Phase 7-related collections are `gw_bookings`, `gw_room_inventory`, `gw_owner_wallets`, `gw_wallet_transactions`, `gw_withdrawals`, and `gw_guest_reviews`. Property, site, owner, and customer collections already exist. This phase has **not** created speculative collections for offers, coupons, notifications, or payment history.

Booking records include site, property, room, owner, and customer IDs; guest contact; stay dates; a server-calculated amount in paise; payment provider references; commission and owner net amount; and cancellation/refund state. New indexes support site/status/date, property/room/date overlap, and customer history queries. The owner/property/date index and unique gateway order references already existed.

## Existing lifecycle and gaps

| Area | Current behavior | Phase 7 gap |
| --- | --- | --- |
| Booking | Online orders begin `PAYMENT_PENDING`; backend provider verification/webhook marks them `CONFIRMED`. Pay-at-hotel bookings are confirmed immediately. Customer and owner cancellations require a reason. | No append-only booking status history, booking expiry, no-show/completed transitions, or full admin booking workspace. |
| Site isolation | Public property, availability, and review reads resolve the site from the hostname. New booking creation now also resolves the hostname and requires the selected property to belong to that site. Account booking history remains global. | Multi-domain authenticated E2E testing is still required. |
| Availability | `gw_room_inventory` supplies per-day counts, blocked counts, and rates; availability subtracts overlapping confirmed and pending bookings. Cancellation removes the hold from the availability query. | The read-check-create sequence is **not atomic**. Concurrent customers can overbook. There is no durable inventory lock or expiration record. This is a release-blocking Phase 7A gap. |
| Pricing | Server calculates room nights, extra guests, property tax, commission, and owner net amount. Date-specific room rates come from inventory. | No reusable pricing quote, policy-based taxes/fees, discount engine, or price snapshot/nightly breakdown. |
| Payment | Razorpay and Cashfree order creation, server verification, signed webhooks, and a selectable active provider exist. No card data is stored. | No dedicated payment transaction/webhook journal; payment timeout/reconciliation and complete idempotency tests remain. Provider order creation precedes booking persistence for new online orders. |
| Refund | Paid future bookings request a full provider refund before cancellation completes; provider status is stored on booking. Pay-at-hotel cancellation has no refund. | No flexible/moderate/strict policy, partial/no-refund calculation, separate refund history, or real-provider refund sign-off. |
| Settlement | Commission is calculated from property type; paid bookings remain on hold until checkout. Owner wallet ledger, bank account, and payout flows exist. | No dedicated settlement statements; full reconciliation and accounting audit remain. |
| Reviews | Completed paid stays are eligible; one review per booking; owner replies and public summary exist. | No moderation states/admin actions. Public reviews are currently displayed without an approval gate. |
| Offers/coupons | None found in the transaction backend. | Offer and coupon rules, redemption safety, and UI are not implemented. |
| Notifications | Existing auth OTP delivery is separate from booking events. | Centralized customer/owner/admin booking notifications and templates are not implemented. |
| Analytics/reports | Owner payment analytics and owner booking export exist. Admin dashboard summarizes platform entities. | Transactional admin booking/revenue/refund analytics, CSV reports, and full owner occupancy/ADR reports remain. |

## API overview

- Public: `GET /api/v1/properties`, `GET /api/v1/properties/:slug`, `GET /api/v1/properties/:slug/availability`, public reviews.
- Customer (JWT): `POST /api/v1/customer/bookings/order`, `POST /pay-at-hotel`, `POST /:id/pay-now`, payment verification, `GET /`, `GET /:id`, and `POST /:id/cancel` under the customer bookings prefix.
- Owner (JWT/ownership guard): booking list, analytics, wallet/withdrawal actions, and `POST /api/v1/owner/payments/bookings/:id/cancel`.
- Payment provider callbacks: Razorpay and Cashfree webhook endpoints under `/api/v1/payments`.

The new-booking endpoints derive the active site from the request hostname; the request body cannot choose a site. An owner can still manage their properties across sites. Swagger is configured in the backend, but full Phase 7 endpoint/response documentation remains.

## Verification and deployment

Run `npm run build` in the repository root and backend; run `npm test -- --runInBand` in backend. No live charge or refund should be made solely to satisfy a smoke test. The existing `.github/workflows/deployment.yml` deploys `main` to the VPS, builds both apps, restarts PM2, and probes backend health. Production credentials stay in VPS/platform settings; `.env.example` files contain no credentials.

Do not mark Phase 7 complete until atomic inventory reservation, cancellation/refund policy, transaction journals, notifications, offers/coupons, moderation, admin reporting, E2E/security/multi-domain suites, and live provider reconciliation are implemented and verified. After deployment, separately smoke-test `/api/health`, homepage, property listing/detail, authenticated customer and owner booking views, and new-booking site isolation. Authenticated or paid flows cannot be claimed verified from unauthenticated checks.

## Next implementation order

1. Phase 7A: atomic per-room/per-night admission and expiring payment locks, backward-compatible with existing bookings; concurrency and cancellation tests.
2. Phase 7B–D: price quote snapshots, cancellation policy enforcement, provider transaction/refund journal, and settlement reconciliation.
3. Phase 7E–H: event-driven notifications, review moderation, offers/coupons, admin analytics and reports.
4. Phase 7I–J: E2E/security/multi-domain tests, production smoke tests, and signed final audit.
