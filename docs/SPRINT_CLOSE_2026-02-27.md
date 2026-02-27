# Sprint Close - 2026-02-27

- Release tag: `v1-pilot-ready-2026-02-27`
- Key commits:
  - `09d3376f3d05` - prod schema and migration version guard scripts + docs updates
  - `800e848` - canonicalized migration directory to `supabase/migrations`
- Production domain: `www.showfi.io`

## Verification Summary

- `GET /api/dashboard-metrics` on `https://www.showfi.io` returns HTTP `200`.
- Join telemetry path validated: `pass_writeback_state.join_click_count` increments after `/api/join`.
- Required production objects verified present/selectable:
  - `accounts`
  - `issuance_requests`
  - `embed_sessions`
  - `wallet_update_jobs`
  - `pass_writeback_state`
  - `audit_logs`
  - `support_roles`
  - `support_tickets`
  - `audit_log` view

## Notes

- `tmp/` validation artifacts were kept private and were not committed.
