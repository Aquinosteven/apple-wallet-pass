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
