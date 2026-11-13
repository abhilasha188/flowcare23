const { body } = require('express-validator');

const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const passwordPattern = /^[\s\S]{6,12}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidFullName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.length >= 2 && name.length <= 50 && namePattern.test(name);
}

function isValidEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 && emailPattern.test(email);
}

function isValidPassword(value) {
  return typeof value === 'string' && passwordPattern.test(value);
}

function isValidDateOfBirth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;

  const today = new Date();
  const earliest = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  return date <= new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    && date >= earliest;
}

function isValidOptionalInteger(value, minimum, maximum) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && !/^\d+$/.test(value)) return false;
  return Number.isInteger(Number(value)) && Number(value) >= minimum && Number(value) <= maximum;
}

const registerValidators = [
  body('fullName')
    .isString().withMessage('Full name is required.')
    .bail()
    .trim()
    .custom(isValidFullName).withMessage('Enter a name between 2 and 50 characters.'),
  body('email')
    .isString().withMessage('Email address is required.')
    .bail()
    .trim()
    .toLowerCase()
    .custom(isValidEmail).withMessage('Enter a valid email address.'),
  body('password')
    .isString().withMessage('Password is required.')
    .bail()
    .custom(isValidPassword)
    .withMessage('Use 6 to 12 characters.'),
  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .isString().withMessage('Enter a valid date of birth.')
    .bail()
    .custom(isValidDateOfBirth).withMessage('Date of birth must be valid and not in the future.'),
  body('averageCycleLength')
    .optional({ checkFalsy: true })
    .custom((value) => isValidOptionalInteger(value, 15, 60))
    .withMessage('Average cycle length must be a whole number from 15 to 60.'),
  body('averagePeriodDuration')
    .optional({ checkFalsy: true })
    .custom((value) => isValidOptionalInteger(value, 1, 15))
    .withMessage('Average period duration must be a whole number from 1 to 15.'),
  body('acceptedTerms')
    .isBoolean().withMessage('Terms acceptance is required.')
    .bail()
    .toBoolean()
    .custom((accepted) => accepted === true)
    .withMessage('You must accept the Terms and Privacy Policy.'),
];

// Keep sign-in compatible with existing passwords; only new passwords use the shorter limit.
const loginValidators = [
  body('email')
    .isString().withMessage('Email address is required.')
    .bail()
    .trim()
    .toLowerCase()
    .custom(isValidEmail).withMessage('Enter a valid email address.'),
  body('password')
    .isString().withMessage('Password is required.')
    .bail()
    .notEmpty().withMessage('Password is required.'),
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('Remember me must be a boolean.')
    .bail()
    .toBoolean(),
];

const cyclePreferenceValidators = [
  body('averageCycleLength')
    .optional({ nullable: true })
    .custom((value) => value === '' || isValidOptionalInteger(value, 15, 60))
    .withMessage('Average cycle length must be a whole number from 15 to 60.'),
  body('averagePeriodDuration')
    .optional({ nullable: true })
    .custom((value) => value === '' || isValidOptionalInteger(value, 1, 15))
    .withMessage('Average period duration must be a whole number from 1 to 15.'),
];

module.exports = {
  cyclePreferenceValidators,
  isValidDateOfBirth,
  isValidEmail,
  isValidFullName,
  isValidOptionalInteger,
  isValidPassword,
  loginValidators,
  registerValidators,
};
