/* Shared prerequisite handling for browser QA that may encounter the lock. */

export function passcodeForLockedQa(locked, environment = process.env) {
  if (!locked) return null;
  const passcode = environment.PB_PASSCODE || '';
  if (!passcode) {
    throw new Error('PB_PASSCODE is required when the lock gate is present; gated QA did not run.');
  }
  return passcode;
}
