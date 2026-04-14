import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStatsById } from '../api/events.js';
import {
  buildRegistrantResponse,
  formatIssuedAtLabel,
  mapPassStatusToTicketStatus,
} from '../api/registrants.js';

test('buildEventStatsById aggregates issued, claimed, and checked-in counts', async () => {
  const statsById = await buildEventStatsById({
    from(table) {
      if (table === 'passes') {
        return {
          select() {
            return {
              in: async () => ({
                data: [
                  {
                    event_id: 'event-1',
                    created_at: '2026-04-03T15:00:00.000Z',
                    claimed_at: null,
                    status: 'issued',
                  },
                  {
                    event_id: 'event-1',
                    created_at: '2026-04-03T16:00:00.000Z',
                    claimed_at: '2026-04-03T17:00:00.000Z',
                    status: 'checked_in',
                  },
                ],
                error: null,
              }),
            };
          },
        };
      }

      if (table === 'claim_events') {
        return {
          select() {
            return {
              in() {
                return {
                  in: async () => ({
                    data: [{ event_id: 'event-1', event_type: 'apple_wallet_added' }],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }, [{ id: 'event-1' }]);

  assert.deepEqual(statsById.get('event-1'), {
    ticketsIssued: 2,
    walletAdds: 1,
    checkIns: 1,
    lastIssuedAt: '2026-04-03T16:00:00.000Z',
  });
});

test('mapPassStatusToTicketStatus derives the dashboard status from pass data', () => {
  assert.equal(mapPassStatusToTicketStatus({ status: 'checked_in' }), 'checked_in');
  assert.equal(mapPassStatusToTicketStatus({ status: 'expired' }), 'expired');
  assert.equal(mapPassStatusToTicketStatus({ claimed_at: '2026-04-03T12:00:00.000Z' }), 'added');
  assert.equal(mapPassStatusToTicketStatus({ status: 'issued' }), 'issued');
});

test('buildRegistrantResponse maps event names and issued labels', () => {
  const result = buildRegistrantResponse(
    {
      id: 'registrant-1',
      event_id: 'event-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: null,
      source: 'manual_dashboard',
      created_at: '2026-04-03T18:30:00.000Z',
    },
    {
      id: 'pass-1',
      claim_token: 'claim-token',
      claimed_at: null,
      status: 'issued',
    },
    new Map([['event-1', 'Demo Event']]),
  );

  assert.equal(result.eventName, 'Demo Event');
  assert.equal(result.status, 'issued');
  assert.equal(result.claimToken, 'claim-token');
  assert.equal(result.issuedAtLabel, formatIssuedAtLabel('2026-04-03T18:30:00.000Z'));
});
