/* Run: node --test --experimental-strip-types src/scripts/ar-math.test.ts
   (Node >= 22.12 strips the TS types; no test-runner dependency needed.) */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clamp01, easeOutBack, easeOutCubic, isTap, lerp } from './ar-math.ts';

test('clamp01 clamps to [0,1]', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(0.5), 0.5);
});

test('easeOutCubic hits its endpoints and eases out', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5); // decelerating → past halfway by the midpoint
});

test('easeOutBack overshoots past 1 then lands on 1', () => {
  assert.equal(easeOutBack(1), 1);
  assert.ok(Math.abs(easeOutBack(0)) < 1e-9);
  assert.ok(easeOutBack(0.8) > 1); // the overshoot is the point
});

test('lerp interpolates', () => {
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(2, 4, 0), 2);
  assert.equal(lerp(2, 4, 1), 4);
});

test('isTap: still + quick is a tap; moved or slow is a drag', () => {
  assert.equal(isTap(3, 100, 8, 350), true);
  assert.equal(isTap(40, 100, 8, 350), false); // travelled too far
  assert.equal(isTap(3, 500, 8, 350), false); // held too long
});
