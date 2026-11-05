#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';
import { passcodeForLockedQa } from './qa-gate.mjs';

test('gated QA fails clearly when its passcode prerequisite is absent', () => {
  assert.throws(
    () => passcodeForLockedQa(true, {}),
    /PB_PASSCODE is required when the lock gate is present; gated QA did not run/
  );
  assert.equal(passcodeForLockedQa(false, {}), null);
  assert.equal(passcodeForLockedQa(true, { PB_PASSCODE: 'authorized-test-value' }), 'authorized-test-value');
});
