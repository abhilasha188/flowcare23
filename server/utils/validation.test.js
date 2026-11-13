const assert = require('node:assert/strict');
const test = require('node:test');
const { validationResult } = require('express-validator');
const {
  isValidDateOfBirth,
  isValidEmail,
  isValidFullName,
  isValidOptionalInteger,
  isValidPassword,
  loginValidators,
} = require('./validation');

test('validates names and normalized email values', () => {
  assert.equal(isValidFullName("Ana-Marie O'Neil"), true);
  assert.equal(isValidFullName('  '), false);
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('accepts any password characters within 6 to 12 characters', () => {
  assert.equal(isValidPassword('abc123'), true);
  assert.equal(isValidPassword('123456'), true);
  assert.equal(isValidPassword('ABCDEF'), true);
  assert.equal(isValidPassword('!@#$%^'), true);
  assert.equal(isValidPassword('123456789012'), true);
  assert.equal(isValidPassword('abc12'), false);
  assert.equal(isValidPassword('1234567890123'), false);
  assert.equal(isValidPassword(''), false);
});

test('allows existing longer passwords through sign-in validation', async () => {
  const request = {
    body: {
      email: 'person@example.com',
      password: 'PreviouslyChosenPassword123!',
    },
  };
  await Promise.all(loginValidators.map((validator) => validator.run(request)));
  assert.equal(validationResult(request).isEmpty(), true);
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
