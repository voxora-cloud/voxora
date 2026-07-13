const TOUR_STORAGE_PREFIX = "interaone.dashboardTour";

export interface TourStorageIdentity {
  orgId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
}

const normalizeKeyPart = (value: string | null | undefined, fallback: string) =>
  (value || fallback).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");

export function getTourStorageKey(
  routeKey: string,
  identity: TourStorageIdentity,
) {
  const orgId = normalizeKeyPart(identity.orgId, "no-org");
  const userId = normalizeKeyPart(identity.userId || identity.userEmail, "anonymous");
  return `${TOUR_STORAGE_PREFIX}.${orgId}.${userId}.${routeKey}`;
}

export function hasSeenTour(routeKey: string, identity: TourStorageIdentity) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(getTourStorageKey(routeKey, identity)) === "seen";
}

export function markTourSeen(routeKey: string, identity: TourStorageIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getTourStorageKey(routeKey, identity), "seen");
}
