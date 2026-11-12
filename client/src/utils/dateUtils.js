export function dateOnlyToLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDateToDateOnly(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = dateOnlyToLocalDate(value);
  return date
    ? new Intl.DateTimeFormat(undefined, options).format(date)
    : 'Not recorded';
}

export function formatMonth(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(value);
}

export function getDateRange(startDate, endDate) {
  const start = dateOnlyToLocalDate(startDate);
  const end = dateOnlyToLocalDate(endDate);
  if (!start || !end || end < start) return [];

  const days = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (current <= end) {
    days.push(localDateToDateOnly(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'F';
}
