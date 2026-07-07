import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthenticatedRequest } from "@shared/security/middleware";

vi.mock("@modules/analytics/analytics.service", () => ({
  AnalyticsService: {
    getOwnerSummary: vi.fn(),
    getOwnerTrends: vi.fn(),
  },
}));

import { AnalyticsController } from "@modules/analytics/analytics.controller";
import { AnalyticsService } from "@modules/analytics/analytics.service";

const createResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as unknown as Response;

const createRequest = (
  orgRole: "owner" | "admin" | "agent",
  query: Record<string, string> = {},
) =>
  ({
    query,
    user: {
      userId: "user-123",
      email: "user@example.com",
      activeOrganizationId: "org-456",
      orgRole,
    },
  }) as unknown as AuthenticatedRequest;

describe("AnalyticsController role scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AnalyticsService.getOwnerSummary).mockResolvedValue({} as never);
    vi.mocked(AnalyticsService.getOwnerTrends).mockResolvedValue({} as never);
  });

  it.each(["owner", "admin"] as const)(
    "loads organization summary data for %s",
    async (role) => {
      const res = createResponse();

      await AnalyticsController.getSummary(createRequest(role), res);

      expect(AnalyticsService.getOwnerSummary).toHaveBeenCalledWith(
        "org-456",
        30,
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    },
  );

  it("limits agent summary data to the authenticated agent", async () => {
    const res = createResponse();

    await AnalyticsController.getSummary(createRequest("agent"), res);

    expect(AnalyticsService.getOwnerSummary).toHaveBeenCalledWith(
      "org-456",
      30,
      "user-123",
    );
  });

  it("limits agent trends and clamps invalid date ranges", async () => {
    const res = createResponse();

    await AnalyticsController.getTrends(createRequest("agent", { days: "500" }), res);

    expect(AnalyticsService.getOwnerTrends).toHaveBeenCalledWith(
      "org-456",
      90,
      "user-123",
    );
  });
});
