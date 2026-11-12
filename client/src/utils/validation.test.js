import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmail,
  validateConfirmPassword,
  validateCycleLength,
  validateDateOfBirth,
  validateEmail,
  validateFullName,
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

test('enforces every password strength requirement and confirmation', () => {
  assert.equal(validatePassword('Example@123'), '');
  assert.notEqual(validatePassword('example@123'), '');
  assert.notEqual(validatePassword('Example123'), '');
  assert.notEqual(validatePassword('A1@shrt'), '');
  assert.equal(validateConfirmPassword('Example@123', 'Example@123'), '');
  assert.notEqual(validateConfirmPassword('Example@124', 'Example@123'), '');
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
    password: 'Example@123',
    confirmPassword: 'Example@123',
    dateOfBirth: '',
    averageCycleLength: '',
    averagePeriodDuration: '',
    acceptedTerms: false,
  });
  assert.equal(errors.acceptedTerms, 'You must accept the Terms and Privacy Policy.');
});
