import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBillingGateState } from '../lib/threadA/accountSubscription.js';

test('computeBillingGateState allows access when subscription is active', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'trial', created_at: '2026-02-01T00:00:00.000Z' },
    subscription: { status: 'active', metadata: {} },
    now: new Date('2026-02-27T00:00:00.000Z'),
  });

  assert.equal(gate.canAccessDashboard, true);
  assert.equal(gate.requiresPayment, false);
  assert.equal(gate.subscriptionStatus, 'active');
});

test('computeBillingGateState requires payment after trial expiry', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'trial', created_at: '2026-01-01T00:00:00.000Z' },
    subscription: { status: 'inactive', metadata: {} },
    now: new Date('2026-02-27T00:00:00.000Z'),
  });

  assert.equal(gate.trialActive, false);
  assert.equal(gate.canAccessDashboard, false);
  assert.equal(gate.requiresPayment, true);
});

test('computeBillingGateState does not grant an implicit trial without trial metadata', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'trial', created_at: '2026-02-20T00:00:00.000Z' },
    subscription: { status: 'inactive', metadata: {} },
    now: new Date('2026-02-27T00:00:00.000Z'),
  });

  assert.equal(gate.trialEndsAt, null);
  assert.equal(gate.trialActive, false);
  assert.equal(gate.canAccessDashboard, false);
});

test('computeBillingGateState honors an explicit active trial window', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'trial', created_at: '2026-02-20T00:00:00.000Z' },
    subscription: {
      status: 'inactive',
      metadata: { trial_ends_at: '2026-03-05T00:00:00.000Z' },
    },
    now: new Date('2026-02-27T00:00:00.000Z'),
  });

  assert.equal(gate.trialEndsAt, '2026-03-05T00:00:00.000Z');
  assert.equal(gate.trialActive, true);
  assert.equal(gate.canAccessDashboard, true);
  assert.equal(gate.requiresPayment, false);
});

test('computeBillingGateState preserves access during a scheduled cancellation window', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'active', created_at: '2026-02-20T00:00:00.000Z' },
    subscription: {
      status: 'active',
      current_period_end: '2026-03-20T00:00:00.000Z',
      metadata: {
        cancel_at_period_end: true,
        cancel_requested_at: '2026-03-01T00:00:00.000Z',
      },
    },
    now: new Date('2026-03-05T00:00:00.000Z'),
  });

  assert.equal(gate.cancelAtPeriodEnd, true);
  assert.equal(gate.cancellationPending, true);
  assert.equal(gate.accessEndsAt, '2026-03-20T00:00:00.000Z');
  assert.equal(gate.canAccessDashboard, true);
  assert.equal(gate.requiresPayment, false);
});

test('computeBillingGateState ends access after a scheduled cancellation window closes', () => {
  const gate = computeBillingGateState({
    account: { billing_state: 'active', created_at: '2026-02-20T00:00:00.000Z' },
    subscription: {
      status: 'canceled',
      current_period_end: '2026-03-20T00:00:00.000Z',
      metadata: {
        cancel_at_period_end: true,
        cancel_requested_at: '2026-03-01T00:00:00.000Z',
      },
    },
    now: new Date('2026-03-25T00:00:00.000Z'),
  });

  assert.equal(gate.cancellationEffective, true);
  assert.equal(gate.canAccessDashboard, false);
  assert.equal(gate.requiresPayment, true);
});
