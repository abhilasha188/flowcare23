import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmail,
  validateConfirmPassword,
  validateCycleLength,
  validateDateOfBirth,
  validateEmail,
  validateFullName,
  validateLoginForm,
  validatePassword,
  validatePeriodDuration,
  validateSignupForm,
} from './validation.js';

test('normalizes email without accepting malformed addresses', () => {
  assert.equal(normalizeEmail('  Example@Example.com '), 'example@example.com');
  assert.equal(validateEmail('  Example@Example.com '), '');
  assert.notEqual(validateEmail('not-an-email'), '');
});

test('accepts ordinary names and rejects blank or invalid names', () => {
  assert.equal(validateFullName("  Ana-Marie O'Neil  "), '');
  assert.equal(validateFullName('   '), 'Full name is required.');
  assert.notEqual(validateFullName('Ana123'), '');
});

test('accepts any password characters within 6 to 12 characters', () => {
  assert.equal(validatePassword('abc123'), '');
  assert.equal(validatePassword('123456'), '');
  assert.equal(validatePassword('ABCDEF'), '');
  assert.equal(validatePassword('!@#$%^'), '');
  assert.equal(validatePassword('123456789012'), '');
  assert.notEqual(validatePassword('abc12'), '');
  assert.notEqual(validatePassword('1234567890123'), '');
  assert.equal(validateConfirmPassword('abc123', 'abc123'), '');
  assert.notEqual(validateConfirmPassword('abc124', 'abc123'), '');
});

test('allows existing longer passwords at sign-in', () => {
  assert.deepEqual(validateLoginForm({ email: 'user@example.com', password: 'PreviouslyChosenPassword123!' }), {});
});

test('validates optional birth date and cycle values at their boundaries', () => {
  assert.equal(validateDateOfBirth(''), '');
  assert.equal(validateDateOfBirth('2002-05-15'), '');
  assert.notEqual(validateDateOfBirth('2026-02-30'), '');
  assert.notEqual(validateDateOfBirth('2999-01-01'), '');

  assert.equal(validateCycleLength('15'), '');
  assert.equal(validateCycleLength('60'), '');
  assert.notEqual(validateCycleLength('14'), '');
  assert.notEqual(validateCycleLength('28.5'), '');
  assert.equal(validatePeriodDuration('1'), '');
  assert.equal(validatePeriodDuration('15'), '');
  assert.notEqual(validatePeriodDuration('16'), '');
});

test('requires explicit terms acceptance at signup', () => {
  const errors = validateSignupForm({
    fullName: 'Example User',
    email: 'example@example.com',
    password: 'abc123',
    confirmPassword: 'abc123',
    dateOfBirth: '',
    averageCycleLength: '',
    averagePeriodDuration: '',
    acceptedTerms: false,
  });
  assert.equal(errors.acceptedTerms, 'You must accept the Terms and Privacy Policy.');
});
