/**
 * Lightweight performance timer.
 * Usage:
 *   const timer = new LatencyTracker();
 *   timer.start();
 *   ... work ...
 *   const ms = timer.stopMs();
 */
export class LatencyTracker {
  private startAt: number | undefined;

  start(): void {
    this.startAt = performance.now();
  }

  /** Returns elapsed milliseconds since start(), rounded to 2dp */
  stopMs(): number {
    if (this.startAt === undefined) return 0;
    return Math.round((performance.now() - this.startAt) * 100) / 100;
  }
}
