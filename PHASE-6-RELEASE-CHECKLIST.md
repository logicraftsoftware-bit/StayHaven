# Phase 6 release verification

Phase 6 is **not** certified complete by a successful build. Use a test property and test customer. Never use a real guest or live charge for exploratory testing.

## Automated checks

1. Run `npm run build` at the repository root and in `backend/`.
2. Run `npm test -- --runInBand` in `backend/`.
3. Confirm the GitHub VPS deployment for the intended commit succeeds and `/api/health` reports a connected database.

## Booking and inventory

1. Configure rooms, prices and inventory for a test property in the owner portal.
2. Check availability on the public property page for open and sold-out dates.
3. Sign in as a test customer, create a booking, and verify that the owner sees it only after a confirmed payment.
4. Verify the owner overview and Analysis & Report show the paid booking's revenue, room nights, and check-in counts in India time. Pending or cancelled bookings must not inflate them.

## Gateway and wallet (run separately for Razorpay and Cashfree)

1. Configure the chosen gateway's test credentials, webhook secret, and callback URL in Super Admin. Select it as the active checkout gateway.
2. Complete one successful test checkout. Verify the provider order ID, payment confirmation, booking state, owner pending balance, and idempotency after replaying the webhook.
3. Exercise failed/abandoned checkout. Verify there is no wallet credit or confirmed booking.
4. After checkout, run the settlement process and verify the owner wallet credit once only.
5. Configure a test payout account and the selected payout gateway's credentials. Request a payout and verify provider reference, final status, wallet debit, and webhook reconciliation. Test provider failure and retry without duplicate withdrawal.
6. Repeat after switching gateways. Check that earlier transactions retain their original provider references.

## Verified reviews

1. Open the property review link as a customer with a completed eligible booking. Submit one review and confirm it appears in the owner Ratings & Reviews panel.
2. Confirm the same booking cannot create a duplicate review and an ineligible/unauthenticated customer cannot submit one.
3. Reply as the owner, then verify the response and access controls (another owner or team member without permission must be denied).

## Remaining product work

- Property visits and conversion require first-party visit-event collection and a verified counting policy; the owner dashboard intentionally displays “—” until this exists.
- Provider money movement cannot be certified without configured credentials and a successful provider-side test. Record the tested gateway, environment, booking ID, payout ID, timestamp, and result before declaring Phase 6 complete.
