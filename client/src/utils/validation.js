const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateFullName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'Full name is required.';
  if (name.length < 2 || name.length > 50) return 'Use 2 to 50 characters.';
  if (!namePattern.test(name)) return 'Use letters, spaces, hyphens, or apostrophes.';
  return '';
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return 'Email address is required.';
  if (email.length > 254 || !emailPattern.test(email)) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 6 || value.length > 12) return 'Use 6 to 12 characters.';
  return '';
}

export function validateConfirmPassword(value, password) {
  if (!value) return 'Please confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return '';
}

export function validateDateOfBirth(value) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date.';

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return 'Enter a valid date.';
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const earliest = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  if (date > todayUtc) return 'Date of birth cannot be in the future.';
  if (date < earliest) return 'Enter a date within the last 120 years.';
  return '';
}

function validateOptionalInteger(value, minimum, maximum, label) {
  if (value === '') return '';
  if (!/^\d+$/.test(value)) return `${label} must be a whole number.`;
  const number = Number(value);
  if (number < minimum || number > maximum) {
    return `${label} must be between ${minimum} and ${maximum}.`;
  }
  return '';
}

export function validateCycleLength(value) {
  return validateOptionalInteger(value, 15, 60, 'Average cycle length');
}

export function validatePeriodDuration(value) {
  return validateOptionalInteger(value, 1, 15, 'Average period duration');
}

export function validateSignupForm(values) {
  const errors = {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirmPassword: validateConfirmPassword(values.confirmPassword, values.password),
    dateOfBirth: validateDateOfBirth(values.dateOfBirth),
    averageCycleLength: validateCycleLength(values.averageCycleLength),
    averagePeriodDuration: validatePeriodDuration(values.averagePeriodDuration),
  };
  if (!values.acceptedTerms) errors.acceptedTerms = 'You must accept the Terms and Privacy Policy.';
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateLoginForm(values) {
  const errors = {
    email: validateEmail(values.email),
    password: values.password ? '' : 'Password is required.',
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateSignupField(name, value, values) {
  const validators = {
    fullName: validateFullName,
    email: validateEmail,
    password: validatePassword,
    confirmPassword: (fieldValue) => validateConfirmPassword(fieldValue, values.password),
    dateOfBirth: validateDateOfBirth,
    averageCycleLength: validateCycleLength,
    averagePeriodDuration: validatePeriodDuration,
  };
  return validators[name]?.(value) || '';
}
