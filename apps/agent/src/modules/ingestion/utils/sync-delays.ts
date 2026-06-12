const SYNC_DELAYS = {
  "1hour": 1 * 60 * 60 * 1000,
  "6hours": 6 * 60 * 60 * 1000,
  "daily": 24 * 60 * 60 * 1000,
} as const;

export type SyncFrequency = keyof typeof SYNC_DELAYS;

export function isValidSyncFrequency(value?: string): value is SyncFrequency {
  return !!value && Object.prototype.hasOwnProperty.call(SYNC_DELAYS, value);
}

export function getSyncDelay(syncFrequency?: string): number | null {
  if (!isValidSyncFrequency(syncFrequency)) return null;
  return SYNC_DELAYS[syncFrequency];
}

export function listSyncFrequencies(): SyncFrequency[] {
  return Object.keys(SYNC_DELAYS) as SyncFrequency[];
}

export { SYNC_DELAYS };
