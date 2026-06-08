import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStatsById } from '../api/events.js';
import {
  buildRegistrantResponse,
  formatIssuedAtLabel,
  loadRegistrantResponsesForEvents,
  mapPassStatusToTicketStatus,
} from '../api/registrants.js';

test('buildEventStatsById counts generated tickets by issued pass and wallet adds by unique pass', async () => {
  const statsById = await buildEventStatsById({
    from(table) {
      if (table === 'passes') {
        return {
          select() {
            return {
              in: async () => ({
                data: [
                  {
                    id: 'pass-1',
                    event_id: 'event-1',
                    registrant_id: 'registrant-1',
                    created_at: '2026-04-03T15:00:00.000Z',
                    claimed_at: null,
                    status: 'issued',
                  },
                  {
                    id: 'pass-1b',
                    event_id: 'event-1',
                    registrant_id: 'registrant-1',
                    created_at: '2026-04-03T15:30:00.000Z',
                    claimed_at: null,
                    status: 'issued',
                  },
                  {
                    id: 'pass-2',
                    event_id: 'event-1',
                    registrant_id: 'registrant-2',
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
                    data: [
                      { event_id: 'event-1', event_type: 'apple_wallet_added', pass_id: 'pass-1' },
                      { event_id: 'event-1', event_type: 'google_wallet_saved', pass_id: 'pass-1' },
                      { event_id: 'event-1', event_type: 'apple_wallet_added', pass_id: 'pass-2' },
                    ],
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
    ticketsIssued: 3,
    claimedPasses: 1,
    walletAdds: 2,
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

test('loadRegistrantResponsesForEvents returns one row per issued pass by event scope', async () => {
  const passFilters = [];
  const result = await loadRegistrantResponsesForEvents({
    from(table) {
      if (table === 'passes') {
        return {
          select() {
            return {
              order() {
                return this;
              },
              in(column, values) {
                throw new Error(`Expected single-event query to use eq, not in(${column}, ${values})`);
              },
              eq(column, value) {
                assert.equal(column, 'event_id');
                assert.equal(value, 'event-1');
                passFilters.push({ column, value });
                return {
                  order: async () => ({
                    data: [
                      {
                        id: 'pass-latest',
                        event_id: 'event-1',
                        registrant_id: 'registrant-1',
                        claim_token: 'latest-token',
                        claimed_at: null,
                        status: 'issued',
                        created_at: '2026-04-03T19:00:00.000Z',
                      },
                      {
                        id: 'pass-older',
                        event_id: 'event-1',
                        registrant_id: 'registrant-1',
                        claim_token: 'older-token',
                        claimed_at: null,
                        status: 'issued',
                        created_at: '2026-04-03T18:00:00.000Z',
                      },
                    ],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === 'registrants') {
        return {
          select() {
            return {
              order() {
                return this;
              },
              in(column, values) {
                throw new Error(`Expected single-event query to use eq, not in(${column}, ${values})`);
              },
              eq(column, value) {
                assert.equal(column, 'event_id');
                assert.equal(value, 'event-1');
                return {
                  order: async () => ({
                    data: [
                      {
                        id: 'registrant-1',
                        event_id: 'event-1',
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                        phone: null,
                        source: 'manual_dashboard',
                        created_at: '2026-04-03T18:30:00.000Z',
                      },
                    ],
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
  }, [{ id: 'event-1', name: 'S8 sal' }]);

  assert.deepEqual(passFilters, [{ column: 'event_id', value: 'event-1' }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].eventName, 'S8 sal');
  assert.equal(result[0].id, 'pass-latest');
  assert.equal(result[0].passId, 'pass-latest');
  assert.equal(result[0].claimToken, 'latest-token');
  assert.equal(result[0].attendeeName, 'Jane Doe');
  assert.equal(result[1].id, 'pass-older');
  assert.equal(result[1].passId, 'pass-older');
  assert.equal(result[1].attendeeName, 'Jane Doe');
});
