import { useCallback, useEffect, useRef } from "react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import {
  getDashboardTourRouteKey,
  getDashboardTourSteps,
} from "@/shared/tours/dashboard-tour-registry";
import {
  hasSeenTour,
  markTourSeen,
  type TourStorageIdentity,
} from "@/shared/tours/tour-storage";

interface UseDashboardTourOptions {
  pathname: string;
  enabled: boolean;
  identity: TourStorageIdentity;
}

const selectorExists = (step: DriveStep) => {
  if (!step.element) return true;
  if (typeof step.element === "string") {
    return Boolean(document.querySelector(step.element));
  }
  if (typeof step.element === "function") {
    return Boolean(step.element());
  }
  return step.element.isConnected;
};

export function useDashboardTour({
  pathname,
  enabled,
  identity,
}: UseDashboardTourOptions) {
  const driverRef = useRef<Driver | null>(null);
  const suppressSeenMarkRef = useRef(false);
  const routeKey = getDashboardTourRouteKey(pathname);

  const destroyActiveTour = useCallback((markSeen = false) => {
    if (!driverRef.current) return;
    suppressSeenMarkRef.current = !markSeen;
    driverRef.current.destroy();
    driverRef.current = null;
  }, []);

  const startTour = useCallback((force = false) => {
    if (!enabled) return;
    if (!force && hasSeenTour(routeKey, identity)) return;

    const visibleSteps = getDashboardTourSteps(pathname).filter(selectorExists);
    if (visibleSteps.length === 0) return;

    destroyActiveTour(false);
    suppressSeenMarkRef.current = false;

    const markSeenAndDestroy = (tour: Driver) => {
      markTourSeen(routeKey, identity);
      suppressSeenMarkRef.current = true;
      tour.destroy();
      driverRef.current = null;
    };

    const tour = driver({
      steps: visibleSteps,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      allowScroll: true,
      overlayOpacity: 0.56,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "interaone-driver-popover",
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      onCloseClick: (_element, _step, { driver: activeDriver }) => {
        markSeenAndDestroy(activeDriver);
      },
      onDoneClick: (_element, _step, { driver: activeDriver }) => {
        markSeenAndDestroy(activeDriver);
      },
      onDestroyed: () => {
        if (!suppressSeenMarkRef.current) {
          markTourSeen(routeKey, identity);
        }
        suppressSeenMarkRef.current = false;
        driverRef.current = null;
      },
    });

    driverRef.current = tour;
    tour.drive();
  }, [destroyActiveTour, enabled, identity, pathname, routeKey]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timeoutId = window.setTimeout(() => {
      startTour(false);
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
      destroyActiveTour(false);
    };
  }, [destroyActiveTour, enabled, pathname, startTour]);

  return {
    replayTour: () => startTour(true),
  };
}
