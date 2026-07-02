import type { UltronUser } from './authSession';

function capitalizeWord(word: string): string {
  if (!word) {
    return '';
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Human-readable name from an email local part (e.g. adithya.meroju → Adithya Meroju). */
export function formatNameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split('@')[0] ?? '';
  if (!local) {
    return 'User';
  }
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return capitalizeWord(local);
  }
  return parts.map(capitalizeWord).join(' ');
}

function resolvedFullName(user: UltronUser): string {
  const trimmed = user.name.trim();
  if (trimmed && trimmed !== 'Signed in') {
    return trimmed;
  }
  if (user.email.trim()) {
    return formatNameFromEmail(user.email);
  }
  return 'Signed in';
}

/** Full display name from the signed-in account. */
export function displayNameFromUser(user: UltronUser): string {
  return resolvedFullName(user);
}

/** Compact header label — first name when the account name has multiple words. */
export function displayShortNameFromUser(user: UltronUser): string {
  const full = resolvedFullName(user);
  return full.split(/\s+/)[0] ?? full;
}

/** Avatar initial from the account name (falls back to email local part). */
export function displayInitialFromUser(user: UltronUser): string {
  const short = displayShortNameFromUser(user);
  return short.slice(0, 1).toUpperCase() || '?';
}
