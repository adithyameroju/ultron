/** Staff domains allowed to sign in to this internal studio. */
export function isAckoStaffEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith('@acko.com') || e.endsWith('@acko.tech');
}
