const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidDateOfBirth,
  isValidEmail,
  isValidFullName,
  isValidOptionalInteger,
  isValidPassword,
} = require('./validation');

test('validates names and normalized email values', () => {
  assert.equal(isValidFullName("Ana-Marie O'Neil"), true);
  assert.equal(isValidFullName('  '), false);
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('enforces password strength and size limits', () => {
  assert.equal(isValidPassword('Example@123'), true);
  assert.equal(isValidPassword('example@123'), false);
  assert.equal(isValidPassword(`A1@${'a'.repeat(62)}`), false);
});

test('validates optional integer ranges and date values', () => {
  assert.equal(isValidOptionalInteger('', 15, 60), true);
  assert.equal(isValidOptionalInteger('15', 15, 60), true);
  assert.equal(isValidOptionalInteger('60', 15, 60), true);
  assert.equal(isValidOptionalInteger('14', 15, 60), false);
  assert.equal(isValidOptionalInteger('28.5', 15, 60), false);
  assert.equal(isValidOptionalInteger([28], 15, 60), false);
  assert.equal(isValidOptionalInteger(true, 15, 60), false);
  assert.equal(isValidDateOfBirth('2002-05-15'), true);
  assert.equal(isValidDateOfBirth('2026-02-30'), false);
  assert.equal(isValidDateOfBirth('2999-01-01'), false);
});
