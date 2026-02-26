# 0011 Outbound Webhooks Signing Model

## Date
2026-02-23

## Status
Accepted

## Context
Tenants need to receive referral events in external systems. The delivery mechanism
must be tenant-configurable and secure enough to validate payload integrity without
introducing custom API keys per host.

## Decision
Provide outbound webhooks managed in Linksy with per-webhook shared secrets and
HMAC-SHA256 signatures. Each delivery includes:
- `X-Linksy-Event`
- `X-Linksy-Timestamp`
- `X-Linksy-Signature` (`t=<unix_ts>,v1=<hex_hmac>`)

The initial event set is focused on referral tickets:
- `ticket.created`
- `ticket.status_changed`

Delivery logs and retries are stored in `linksy_webhook_deliveries` for audit and
debugging.

## Consequences
- Consumers must implement signature verification to trust payloads.
- Linksy retains delivery history for troubleshooting and replays.
- Additional storage and background dispatch logic is required, but avoids adding
  OAuth or API-key management overhead for webhook consumers.

## Links
- `docs/INTEGRATIONS.md`
- `supabase/migrations/20260223120000_create_webhooks_system.sql`
